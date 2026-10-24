import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { rm } from 'fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'path';
import { PrismaService } from '../prisma.service';

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;
const LOTE = 100;

function diasDesdeEntorno(nombre: string, porDefecto: number) {
  const valor = Number(process.env[nombre]);
  return Number.isInteger(valor) && valor > 0 ? valor : porDefecto;
}

/**
 * Borra del disco los archivos de los pedidos que ya no se necesitan:
 * N días después de entregados (por defecto 7) y, en todo caso, a los M días de creados (por defecto 30).
 * El registro del pedido se conserva; solo se marcan los archivos como eliminados.
 */
@Injectable()
export class RetencionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetencionService.name);
  private intervalo?: NodeJS.Timeout;
  private arranque?: NodeJS.Timeout;
  private ejecutando = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.RETENCION_DESACTIVADA === 'true') return;
    this.arranque = setTimeout(() => void this.limpiar(), 30_000);
    this.intervalo = setInterval(() => void this.limpiar(), HORA_MS);
    this.arranque.unref();
    this.intervalo.unref();
  }

  onModuleDestroy() {
    clearTimeout(this.arranque);
    clearInterval(this.intervalo);
  }

  async limpiar(ahora = new Date()) {
    if (this.ejecutando) return 0;
    this.ejecutando = true;
    const diasEntregado = diasDesdeEntorno('RETENCION_DIAS_ENTREGADO', 7);
    const diasMaximo = diasDesdeEntorno('RETENCION_DIAS_MAXIMO', 30);
    let eliminados = 0;

    try {
      for (;;) {
        const pedidos = await this.prisma.pedido.findMany({
          where: {
            archivosEliminadosAt: null,
            OR: [
              { entregadoAt: { lt: new Date(ahora.getTime() - diasEntregado * DIA_MS) } },
              { createdAt: { lt: new Date(ahora.getTime() - diasMaximo * DIA_MS) } },
            ],
          },
          select: { id: true, archivoRuta: true, comprobanteRuta: true },
          take: LOTE,
        });
        if (pedidos.length === 0) break;

        for (const pedido of pedidos) {
          await this.borrar(pedido.archivoRuta);
          if (pedido.comprobanteRuta) await this.borrar(pedido.comprobanteRuta);
          await this.prisma.pedido.update({
            where: { id: pedido.id },
            data: { archivosEliminadosAt: ahora },
          });
          eliminados++;
        }
        if (pedidos.length < LOTE) break;
      }
      if (eliminados > 0) {
        this.logger.log(`Retención: se eliminaron los archivos de ${eliminados} pedido(s).`);
      }
    } catch (error) {
      this.logger.error(
        `Retención: falló la limpieza (${error instanceof Error ? error.message : 'error desconocido'}).`,
      );
    } finally {
      this.ejecutando = false;
    }
    return eliminados;
  }

  /** Borra solo si la ruta queda dentro de uploads/ (las rutas antiguas son absolutas). */
  private async borrar(ruta: string) {
    const uploads = resolve(join(process.cwd(), 'uploads'));
    const destino = resolve(uploads, ruta);
    const desdeUploads = relative(uploads, destino);
    if (!desdeUploads || desdeUploads.startsWith(`..${sep}`) || desdeUploads === '..' || isAbsolute(desdeUploads)) {
      return;
    }
    await rm(destino, { force: true });
  }
}
