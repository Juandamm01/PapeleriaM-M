import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EstadoNotificacion, Prisma, TipoNotificacion } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { WhatsAppClient } from './whatsapp.client';

const MAX_INTENTOS = 3;
const ESPERAS_MS = [5 * 60_000, 30 * 60_000];
const REVISION_MS = 2 * 60_000;
const ENVIO_COLGADO_MS = 10 * 60_000;

@Injectable()
export class NotificacionesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificacionesService.name);
  private intervalo?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppClient,
  ) {}

  onModuleInit() {
    this.intervalo = setInterval(() => void this.reintentarPendientes(), REVISION_MS);
    this.intervalo.unref();
  }

  onModuleDestroy() {
    clearInterval(this.intervalo);
  }

  get whatsappHabilitado() {
    return this.whatsapp.habilitado;
  }

  /**
   * Se llama cuando un pedido pasa a LISTO. Crea como mucho una notificación por pedido:
   * si el pedido vuelve a LISTO más tarde, no se envía otro mensaje.
   */
  async pedidoListo(pedidoId: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: { id: true, telefono: true, whatsappAutorizado: true },
    });
    if (!pedido) return;

    let estado: EstadoNotificacion = EstadoNotificacion.PENDIENTE;
    let detalle: string | null = null;
    if (!pedido.whatsappAutorizado) {
      estado = EstadoNotificacion.OMITIDA;
      detalle = 'El cliente no pidió aviso por WhatsApp.';
    } else if (!pedido.telefono) {
      estado = EstadoNotificacion.OMITIDA;
      detalle = 'El pedido no tiene celular.';
    } else if (!this.whatsapp.habilitado) {
      estado = EstadoNotificacion.OMITIDA;
      detalle = 'WhatsApp automático no está configurado: avisa con el botón manual.';
    }

    try {
      const creada = await this.prisma.notificacion.create({
        data: { pedidoId, tipo: TipoNotificacion.PEDIDO_LISTO, estado, detalle },
      });
      if (estado === EstadoNotificacion.PENDIENTE) setImmediate(() => void this.enviar(creada.id));
    } catch (error) {
      // P2002: ya existe la notificación de este pedido; no se duplica
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }
  }

  /** Envía una notificación pendiente o fallida. Toma la notificación de forma atómica para no enviarla dos veces. */
  async enviar(id: string) {
    const { count } = await this.prisma.notificacion.updateMany({
      where: {
        id,
        estado: { in: [EstadoNotificacion.PENDIENTE, EstadoNotificacion.FALLIDA] },
        intentos: { lt: MAX_INTENTOS },
      },
      data: { estado: EstadoNotificacion.ENVIANDO, intentos: { increment: 1 }, siguienteIntentoAt: null },
    });
    if (count === 0) return;

    const notificacion = await this.prisma.notificacion.findUniqueOrThrow({
      where: { id },
      include: { pedido: { select: { nombre: true, codigo: true, telefono: true } } },
    });
    const { pedido } = notificacion;
    const primerNombre = pedido.nombre.trim().split(/\s+/)[0] || pedido.nombre;
    const resultado = await this.whatsapp.enviarPlantilla(pedido.telefono ?? '', this.whatsapp.plantillaListo, [
      primerNombre,
      pedido.codigo,
    ]);

    if (resultado.ok) {
      await this.prisma.notificacion.update({
        where: { id },
        data: { estado: EstadoNotificacion.ENVIADA, mensajeId: resultado.mensajeId, enviadaAt: new Date(), detalle: null },
      });
      return;
    }
    const otraVez = resultado.reintentable && notificacion.intentos < MAX_INTENTOS;
    const espera = ESPERAS_MS[Math.min(notificacion.intentos - 1, ESPERAS_MS.length - 1)];
    await this.prisma.notificacion.update({
      where: { id },
      data: {
        estado: EstadoNotificacion.FALLIDA,
        detalle: resultado.detalle,
        siguienteIntentoAt: otraVez ? new Date(Date.now() + espera) : null,
      },
    });
    this.logger.warn(`Aviso de pedido ${pedido.codigo} no enviado (${resultado.codigo}).`);
  }

  /** Reintento manual desde el admin: solo para avisos fallidos. */
  async reintentar(pedidoId: string) {
    const notificacion = await this.prisma.notificacion.findUnique({
      where: { pedidoId_tipo: { pedidoId, tipo: TipoNotificacion.PEDIDO_LISTO } },
    });
    if (!notificacion || notificacion.estado !== EstadoNotificacion.FALLIDA) return notificacion;
    await this.prisma.notificacion.update({
      where: { id: notificacion.id },
      data: { intentos: Math.min(notificacion.intentos, MAX_INTENTOS - 1) },
    });
    await this.enviar(notificacion.id);
    return this.prisma.notificacion.findUnique({ where: { id: notificacion.id } });
  }

  private async reintentarPendientes() {
    try {
      // Un envío que quedó a medias (p. ej. se reinició el servidor) no se reintenta solo:
      // WhatsApp pudo haberlo entregado y no queremos duplicarlo.
      await this.prisma.notificacion.updateMany({
        where: { estado: EstadoNotificacion.ENVIANDO, updatedAt: { lt: new Date(Date.now() - ENVIO_COLGADO_MS) } },
        data: { estado: EstadoNotificacion.FALLIDA, detalle: 'El envío quedó sin confirmar. Revisa si el cliente recibió el mensaje.' },
      });
      const vencidas = await this.prisma.notificacion.findMany({
        where: {
          estado: EstadoNotificacion.FALLIDA,
          intentos: { lt: MAX_INTENTOS },
          siguienteIntentoAt: { lte: new Date() },
        },
        select: { id: true },
        take: 20,
      });
      for (const { id } of vencidas) await this.enviar(id);
    } catch (error) {
      this.logger.error(`No se pudieron revisar los avisos pendientes (${error instanceof Error ? error.message : 'error'}).`);
    }
  }
}
