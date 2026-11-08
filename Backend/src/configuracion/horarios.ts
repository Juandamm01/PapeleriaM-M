/** Horarios de atención y franjas de recogida. Colombia no tiene horario de verano: UTC−5 todo el año. */

export type DiaHorario = { abierto: boolean; desde: string; hasta: string };

export type Horarios = {
  /** 7 días, empezando por el domingo (0) */
  dias: DiaHorario[];
  duracionFranjaMinutos: number;
  capacidadPorFranja: number;
  /** Cuántos días hacia adelante se pueden reservar, contando hoy */
  diasAnticipacion: number;
  /** Tiempo mínimo entre el pedido y el inicio de la franja */
  anticipacionMinimaMinutos: number;
  /** Fechas sin atención (festivos, vacaciones), AAAA-MM-DD */
  fechasCerradas: string[];
};

/** Horario real del negocio: L-V 8:00–19:00, sábados 9:00–17:00, domingos cerrado. */
export const HORARIOS_POR_DEFECTO: Horarios = {
  dias: [
    { abierto: false, desde: '09:00', hasta: '17:00' },
    { abierto: true, desde: '08:00', hasta: '19:00' },
    { abierto: true, desde: '08:00', hasta: '19:00' },
    { abierto: true, desde: '08:00', hasta: '19:00' },
    { abierto: true, desde: '08:00', hasta: '19:00' },
    { abierto: true, desde: '08:00', hasta: '19:00' },
    { abierto: true, desde: '09:00', hasta: '17:00' },
  ],
  duracionFranjaMinutos: 60,
  capacidadPorFranja: 6,
  diasAnticipacion: 7,
  anticipacionMinimaMinutos: 60,
  fechasCerradas: [],
};

const OFFSET_MS = 5 * 60 * 60_000;
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const minutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

/** Convierte una fecha y hora locales de Colombia a un instante UTC. */
export const instanteLocal = (fecha: string, minutoDelDia: number) => {
  const [y, mes, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, mes - 1, d, 0, minutoDelDia) + OFFSET_MS);
};

const fechaLocal = (instante: Date) => new Date(instante.getTime() - OFFSET_MS).toISOString().slice(0, 10);

const etiquetaHora = (minutoDelDia: number) => {
  const h = Math.floor(minutoDelDia / 60);
  const m = minutoDelDia % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};

/** Normaliza y valida los horarios que llegan del admin. Devuelve los horarios o un mensaje de error. */
export function normalizarHorarios(entrada: unknown): Horarios | string {
  if (!entrada || typeof entrada !== 'object') return 'Los horarios no son válidos.';
  const h = entrada as Record<string, unknown>;
  if (!Array.isArray(h.dias) || h.dias.length !== 7) return 'Configura los 7 días de la semana.';
  const dias: DiaHorario[] = [];
  for (let i = 0; i < 7; i++) {
    const d = h.dias[i] as Record<string, unknown> | null;
    if (!d || typeof d.abierto !== 'boolean' || typeof d.desde !== 'string' || typeof d.hasta !== 'string') {
      return `El horario del ${NOMBRES_DIA[i].toLowerCase()} no es válido.`;
    }
    if (!HORA.test(d.desde) || !HORA.test(d.hasta)) return `Usa horas en formato 24 h (por ejemplo 08:00) para el ${NOMBRES_DIA[i].toLowerCase()}.`;
    if (d.abierto && minutos(d.hasta) <= minutos(d.desde)) {
      return `El ${NOMBRES_DIA[i].toLowerCase()} la hora de cierre debe ser después de la de apertura.`;
    }
    dias.push({ abierto: d.abierto, desde: d.desde, hasta: d.hasta });
  }
  const entero = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
  if (!entero(h.duracionFranjaMinutos, 15, 240)) return 'Cada franja debe durar entre 15 y 240 minutos.';
  if (!entero(h.capacidadPorFranja, 1, 200)) return 'La capacidad por franja debe estar entre 1 y 200 pedidos.';
  if (!entero(h.diasAnticipacion, 1, 30)) return 'Se puede reservar entre 1 y 30 días hacia adelante.';
  if (!entero(h.anticipacionMinimaMinutos, 0, 2880)) return 'La anticipación mínima debe estar entre 0 y 2880 minutos.';
  if (!Array.isArray(h.fechasCerradas) || h.fechasCerradas.length > 100) return 'Puedes registrar hasta 100 fechas cerradas.';
  const fechasCerradas = [...new Set(h.fechasCerradas)];
  for (const f of fechasCerradas) {
    if (typeof f !== 'string' || !FECHA.test(f) || Number.isNaN(Date.parse(`${f}T00:00:00Z`))) {
      return 'Las fechas cerradas van en formato AAAA-MM-DD.';
    }
  }
  return {
    dias,
    duracionFranjaMinutos: h.duracionFranjaMinutos as number,
    capacidadPorFranja: h.capacidadPorFranja as number,
    diasAnticipacion: h.diasAnticipacion as number,
    anticipacionMinimaMinutos: h.anticipacionMinimaMinutos as number,
    fechasCerradas: (fechasCerradas as string[]).sort(),
  };
}

export type Franja = { inicio: string; fin: string; etiqueta: string; cupos: number; disponible: boolean };
export type DiaDisponible = { fecha: string; nombre: string; franjas: Franja[] };

/**
 * Calcula las franjas de los próximos días.
 * `ocupadas` cuenta los pedidos que ya reservaron cada franja (clave: inicio en ISO).
 */
export function calcularFranjas(horarios: Horarios, ahora: Date, ocupadas: Map<string, number>): DiaDisponible[] {
  const resultado: DiaDisponible[] = [];
  const minimo = ahora.getTime() + horarios.anticipacionMinimaMinutos * 60_000;
  const hoy = fechaLocal(ahora);
  for (let i = 0; i < horarios.diasAnticipacion; i++) {
    const fecha = fechaLocal(new Date(instanteLocal(hoy, 12 * 60).getTime() + i * 24 * 60 * 60_000));
    const diaSemana = new Date(`${fecha}T12:00:00Z`).getUTCDay();
    const dia = horarios.dias[diaSemana];
    if (!dia.abierto || horarios.fechasCerradas.includes(fecha)) continue;
    const franjas: Franja[] = [];
    for (let m = minutos(dia.desde); m + horarios.duracionFranjaMinutos <= minutos(dia.hasta); m += horarios.duracionFranjaMinutos) {
      const inicio = instanteLocal(fecha, m);
      const fin = instanteLocal(fecha, m + horarios.duracionFranjaMinutos);
      if (inicio.getTime() < minimo) continue;
      const cupos = Math.max(0, horarios.capacidadPorFranja - (ocupadas.get(inicio.toISOString()) ?? 0));
      franjas.push({
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        etiqueta: `${etiquetaHora(m)} – ${etiquetaHora(m + horarios.duracionFranjaMinutos)}`,
        cupos,
        disponible: cupos > 0,
      });
    }
    if (franjas.length > 0) {
      const nombre = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : NOMBRES_DIA[diaSemana];
      resultado.push({ fecha, nombre, franjas });
    }
  }
  return resultado;
}
