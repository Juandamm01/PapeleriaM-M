/**
 * Pruebas de las solicitudes de digitación (con una base de datos simulada en memoria).
 * Ejecutar con:  bun test/digitacion.check.ts
 */
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CrearDigitacionDto } from '../src/digitacion/dto/digitacion.dto';
import { DigitacionService } from '../src/digitacion/digitacion.service';

type Fila = Record<string, unknown> & { id: string; codigo: string; estado: string };
const filas: Fila[] = [];
const coincide = (f: Fila, where: Record<string, unknown>) =>
  Object.entries(where).every(([k, v]) => (v && typeof v === 'object' && 'not' in v ? f[k] !== (v as { not: unknown }).not : f[k] === v));
const prisma = {
  solicitudDigitacion: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const fila = { id: `id-${filas.length + 1}`, estado: 'RECIBIDO', precioCentavos: null, ...data } as unknown as Fila;
      filas.push(fila);
      return { codigo: fila.codigo, estado: fila.estado };
    },
    findUnique: async ({ where }: { where: Record<string, unknown> }) => filas.find((f) => coincide(f, where)) ?? null,
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const afectadas = filas.filter((f) => coincide(f, where));
      afectadas.forEach((f) => Object.assign(f, data));
      return { count: afectadas.length };
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const f = filas.find((x) => x.id === where.id)!;
      Object.assign(f, data);
      return f;
    },
  },
};
const servicio = new DigitacionService(prisma as never);
const errores = (obj: object) =>
  validateSync(plainToInstance(CrearDigitacionDto, obj)).flatMap((e) => Object.values(e.constraints ?? {}));
const base = {
  nombre: 'Luis',
  telefono: '313 839 5365',
  tipoTrabajo: 'Hoja de vida',
  descripcion: 'Necesito pasar mi hoja de vida a Word',
  formatoEntrega: 'Archivo Word',
  aceptaPolitica: 'true',
};

let ok = 0;
let mal = 0;
const caso = async (nombre: string, fn: () => unknown) => {
  try {
    await fn();
    ok++;
    console.log(`✔ ${nombre}`);
  } catch (error) {
    mal++;
    console.error(`✘ ${nombre}\n  ${error instanceof Error ? error.message : String(error)}`);
  }
};
const falla = async (fn: () => Promise<unknown>, fragmento: string) => {
  try {
    await fn();
  } catch (error) {
    assert.ok(String((error as Error).message).includes(fragmento), (error as Error).message);
    return;
  }
  assert.fail(`esperaba error con "${fragmento}"`);
};

(async () => {
  await caso('formulario válido y errores claros', () => {
    assert.deepEqual(errores(base), []);
    assert.ok(errores({ ...base, tipoTrabajo: 'Poema' }).includes('Elige el tipo de trabajo.'));
    assert.ok(errores({ ...base, descripcion: 'corto' }).some((e) => e.includes('detalle')));
    assert.ok(errores({ ...base, aceptaPolitica: 'false' }).some((e) => e.includes('política')));
    assert.ok(errores({ ...base, telefono: '12345' }).some((e) => e.includes('10 dígitos')));
  });
  await caso('exige al menos un medio de contacto', async () => {
    await falla(() => servicio.crear({ ...base, telefono: undefined, aceptaPolitica: true } as never, []), 'celular o un correo');
  });
  await caso('fecha límite en el pasado se rechaza', async () => {
    await falla(() => servicio.crear({ ...base, aceptaPolitica: true, fechaLimite: '2020-01-01' } as never, []), 'fecha futura');
  });
  await caso('flujo: recibido → cotizado (exige precio) → aceptado por el cliente', async () => {
    const creada = await servicio.crear({ ...base, telefono: '3138395365', aceptaPolitica: true } as never, []);
    assert.match(creada.codigo, /^DG-[A-Z0-9]{6}$/);
    const id = filas[0].id;
    await falla(() => servicio.actualizar(id, { estado: 'COTIZADO' } as never), 'precio');
    await falla(() => servicio.aceptar(creada.codigo), 'no tiene una cotización');
    await servicio.actualizar(id, { estado: 'COTIZADO', precio: 25000, notaCliente: 'Incluye 2 revisiones' } as never);
    assert.equal(filas[0].precioCentavos, 2_500_000);
    const aceptada = await servicio.aceptar(creada.codigo);
    assert.equal(aceptada.estado, 'ACEPTADO');
    await falla(() => servicio.actualizar(id, { precio: 30000 } as never), 'ya aceptó');
    await falla(() => servicio.actualizar(id, { estado: 'RECIBIDO' } as never), 'no está permitido');
    await servicio.actualizar(id, { estado: 'FINALIZADO' } as never);
    assert.equal(filas[0].estado, 'FINALIZADO');
  });

  console.log(`\n${ok}/${ok + mal} pruebas pasaron`);
  if (mal > 0) process.exit(1);
})();
