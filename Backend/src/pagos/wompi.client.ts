import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export type EstadoWompi = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export type TransaccionWompi = {
  id: string;
  reference: string;
  status: EstadoWompi;
  status_message?: string | null;
  amount_in_cents: number;
  currency: string;
  payment_method_type?: string;
};

export type ContratoAceptacion = { token: string; permalink: string };

type RespuestaComercio = {
  data?: {
    presigned_acceptance?: { acceptance_token?: string; permalink?: string };
    presigned_personal_data_auth?: { acceptance_token?: string; permalink?: string };
  };
};

const URL_SANDBOX = 'https://sandbox.wompi.co/v1';
const URL_PRODUCCION = 'https://production.wompi.co/v1';
const TIEMPO_MAXIMO_MS = 10_000;

/** Cliente mínimo de la API de Wompi. Los secretos solo se leen del entorno y nunca se registran. */
@Injectable()
export class WompiClient {
  private readonly logger = new Logger(WompiClient.name);
  private aceptacionCache?: { valor: { aceptacion: ContratoAceptacion; datosPersonales: ContratoAceptacion }; vence: number };

  get llavePublica() {
    return process.env.WOMPI_PUBLIC_KEY ?? '';
  }

  private get llavePrivada() {
    return process.env.WOMPI_PRIVATE_KEY ?? '';
  }

  get secretoIntegridad() {
    return process.env.WOMPI_INTEGRITY_SECRET ?? '';
  }

  get secretoEventos() {
    return process.env.WOMPI_EVENTS_SECRET ?? '';
  }

  /** Sandbox o producción según el prefijo de la llave pública, salvo que WOMPI_API_URL lo fije. */
  get urlBase() {
    const configurada = process.env.WOMPI_API_URL?.trim().replace(/\/+$/, '');
    if (configurada) return configurada;
    return this.llavePublica.startsWith('pub_prod_') ? URL_PRODUCCION : URL_SANDBOX;
  }

  get habilitado() {
    return Boolean(this.llavePublica && this.llavePrivada && this.secretoIntegridad && this.secretoEventos);
  }

  /** Las llaves deben ser del mismo ambiente (todas _test_ o todas _prod_). */
  ambienteConsistente() {
    const llaves = [this.llavePublica, this.llavePrivada, this.secretoIntegridad, this.secretoEventos];
    const prueba = llaves.every((llave) => llave.includes('_test_'));
    const produccion = llaves.every((llave) => llave.includes('_prod_'));
    return prueba || produccion;
  }

  private asegurarHabilitado() {
    if (!this.habilitado) {
      throw new ServiceUnavailableException('Los pagos con Nequi no están disponibles en este momento.');
    }
  }

  private async solicitar<T>(ruta: string, init: RequestInit & { llave: 'publica' | 'privada' }): Promise<T> {
    const { llave, ...resto } = init;
    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.urlBase}${ruta}`, {
        ...resto,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${llave === 'publica' ? this.llavePublica : this.llavePrivada}`,
          ...(resto.headers ?? {}),
        },
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      });
    } catch {
      this.logger.warn(`Wompi no respondió a ${init.method ?? 'GET'} ${ruta.split('/').slice(0, 2).join('/')}`);
      throw new ServiceUnavailableException('No pudimos comunicarnos con Wompi. Inténtalo de nuevo.');
    }

    const cuerpo = (await respuesta.json().catch(() => null)) as T | { error?: { type?: string } } | null;
    if (!respuesta.ok) {
      const tipo =
        cuerpo && typeof cuerpo === 'object' && 'error' in cuerpo ? (cuerpo.error?.type ?? 'desconocido') : 'desconocido';
      // Solo el código y el tipo de error: nunca cuerpos, llaves ni datos del cliente
      this.logger.warn(`Wompi respondió ${respuesta.status} (${tipo}) en ${ruta.split('/').slice(0, 2).join('/')}`);
      throw new ServiceUnavailableException('Wompi rechazó la solicitud de pago.');
    }
    return cuerpo as T;
  }

  /** Contratos que el cliente debe aceptar antes de pagar (se refrescan cada 10 minutos). */
  async contratosDeAceptacion() {
    this.asegurarHabilitado();
    if (this.aceptacionCache && this.aceptacionCache.vence > Date.now()) {
      return this.aceptacionCache.valor;
    }
    const respuesta = await this.solicitar<RespuestaComercio>(`/merchants/${this.llavePublica}`, {
      method: 'GET',
      llave: 'publica',
    });
    const aceptacion = respuesta.data?.presigned_acceptance;
    const datos = respuesta.data?.presigned_personal_data_auth;
    if (!aceptacion?.acceptance_token || !aceptacion.permalink || !datos?.acceptance_token || !datos.permalink) {
      throw new ServiceUnavailableException('Wompi no devolvió los términos de aceptación.');
    }
    const valor = {
      aceptacion: { token: aceptacion.acceptance_token, permalink: aceptacion.permalink },
      datosPersonales: { token: datos.acceptance_token, permalink: datos.permalink },
    };
    this.aceptacionCache = { valor, vence: Date.now() + 10 * 60_000 };
    return valor;
  }

  async crearTransaccionNequi(datos: {
    referencia: string;
    montoCentavos: number;
    firma: string;
    correo: string;
    telefono: string;
    tokenAceptacion: string;
    tokenDatosPersonales: string;
  }) {
    this.asegurarHabilitado();
    const respuesta = await this.solicitar<{ data: TransaccionWompi }>('/transactions', {
      method: 'POST',
      llave: 'privada',
      body: JSON.stringify({
        acceptance_token: datos.tokenAceptacion,
        accept_personal_auth: datos.tokenDatosPersonales,
        amount_in_cents: datos.montoCentavos,
        currency: 'COP',
        signature: datos.firma,
        customer_email: datos.correo,
        reference: datos.referencia,
        payment_method: { type: 'NEQUI', phone_number: datos.telefono },
      }),
    });
    return respuesta.data;
  }

  async consultarTransaccion(id: string) {
    this.asegurarHabilitado();
    const respuesta = await this.solicitar<{ data: TransaccionWompi }>(
      `/transactions/${encodeURIComponent(id)}`,
      { method: 'GET', llave: 'publica' },
    );
    return respuesta.data;
  }
}
