import { Injectable, Logger } from '@nestjs/common';

export type ResultadoEnvio =
  | { ok: true; mensajeId: string }
  | { ok: false; codigo: string; detalle: string; reintentable: boolean };

const TIEMPO_MAXIMO_MS = 10_000;
// Códigos de la API de WhatsApp Cloud que no se arreglan reintentando
const NO_REINTENTABLES = new Set(['100', '131026', '131031', '131047', '132000', '132001', '190']);

/**
 * Cliente mínimo de WhatsApp Business Platform (Cloud API).
 * Envía mensajes de plantilla aprobada: es lo único permitido fuera de la ventana de 24 h.
 * El token solo se lee del entorno y nunca se registra.
 */
@Injectable()
export class WhatsAppClient {
  private readonly logger = new Logger(WhatsAppClient.name);

  private get token() {
    return process.env.WHATSAPP_TOKEN ?? '';
  }

  private get numeroId() {
    return process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
  }

  get plantillaListo() {
    return process.env.WHATSAPP_PLANTILLA_LISTO ?? '';
  }

  private get idioma() {
    return process.env.WHATSAPP_PLANTILLA_IDIOMA || 'es';
  }

  private get version() {
    return process.env.WHATSAPP_API_VERSION || 'v21.0';
  }

  get habilitado() {
    return Boolean(this.token && this.numeroId && this.plantillaListo);
  }

  /** `telefono`: celular colombiano de 10 dígitos. `parametros`: variables del cuerpo de la plantilla, en orden. */
  async enviarPlantilla(telefono: string, plantilla: string, parametros: string[]): Promise<ResultadoEnvio> {
    if (!this.habilitado) {
      return { ok: false, codigo: 'no-configurado', detalle: 'WhatsApp no está configurado.', reintentable: false };
    }
    if (!/^3\d{9}$/.test(telefono)) {
      return { ok: false, codigo: 'telefono', detalle: 'El celular del cliente no es válido.', reintentable: false };
    }

    let respuesta: Response;
    try {
      respuesta = await fetch(`https://graph.facebook.com/${this.version}/${encodeURIComponent(this.numeroId)}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: `57${telefono}`,
          type: 'template',
          template: {
            name: plantilla,
            language: { code: this.idioma },
            components: parametros.length
              ? [{ type: 'body', parameters: parametros.map((texto) => ({ type: 'text', text: texto.slice(0, 200) })) }]
              : [],
          },
        }),
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      });
    } catch {
      return { ok: false, codigo: 'red', detalle: 'No se pudo conectar con WhatsApp.', reintentable: true };
    }

    const cuerpo = (await respuesta.json().catch(() => null)) as {
      messages?: { id?: string }[];
      error?: { code?: number | string; message?: string };
    } | null;
    const id = cuerpo?.messages?.[0]?.id;
    if (respuesta.ok && id) return { ok: true, mensajeId: id };

    const codigo = String(cuerpo?.error?.code ?? respuesta.status);
    // Solo el código: el mensaje de error de Meta puede incluir el número del cliente
    this.logger.warn(`WhatsApp respondió ${respuesta.status} (código ${codigo}).`);
    return {
      ok: false,
      codigo,
      detalle: describirError(codigo),
      reintentable: !NO_REINTENTABLES.has(codigo) && (respuesta.status >= 500 || respuesta.status === 429 || codigo === '130429' || codigo === '131000'),
    };
  }
}

function describirError(codigo: string) {
  switch (codigo) {
    case '131026':
      return 'El número no tiene WhatsApp o no puede recibir mensajes.';
    case '132000':
    case '132001':
      return 'La plantilla no existe, no está aprobada o sus variables no coinciden.';
    case '131047':
      return 'WhatsApp exige una plantilla aprobada para escribirle a este cliente.';
    case '190':
      return 'El token de WhatsApp venció o no es válido.';
    case '130429':
      return 'WhatsApp limitó los envíos por ahora; se reintentará.';
    default:
      return `WhatsApp rechazó el envío (código ${codigo}).`;
  }
}
