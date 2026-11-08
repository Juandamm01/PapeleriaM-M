/**
 * Pruebas del lector de PDF, los rangos de páginas y el cálculo de precios.
 * Ejecutar con:  bun test/compartido.check.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync, constants } from 'node:zlib';
import { analizarPdf, advertenciasPdf } from '../src/compartido/pdf-analisis';
import { parsearRangos, formatearRangos } from '../src/compartido/rangos';
import { cotizar, TARIFAS_VACIAS, validarTarifas, type Tarifas } from '../src/compartido/precios';

const inflar = async (d: Uint8Array) => new Uint8Array(inflateSync(d, { finishFlush: constants.Z_SYNC_FLUSH }));
const fx = (n: string) => new Uint8Array(readFileSync(join(__dirname, 'pdf', n)));
let ok = 0, mal = 0;
const caso = async (nombre: string, fn: () => unknown) => {
  try { await fn(); ok++; console.log('✔', nombre); } catch (e) { mal++; console.log('✘', nombre, '\n  ', (e as Error).message); }
};

(async () => {
  for (const archivo of ['carta.pdf', 'objstm.pdf', 'sincomp.pdf']) {
    await caso(`${archivo}: 4 páginas, la 2 en blanco`, async () => {
      const r = await analizarPdf(fx(archivo), inflar);
      assert.ok(r.ok, JSON.stringify(r));
      if (!r.ok) return;
      assert.equal(r.totalPaginas, 4);
      assert.deepEqual(r.paginas.map((p) => p.posiblementeEnBlanco), [false, true, false, false]);
      assert.deepEqual([r.paginas[0].ancho, r.paginas[0].alto], [612, 792]);
    });
  }
  await caso('a4.pdf: 2 páginas, tamaño A4 y una horizontal', async () => {
    const r = await analizarPdf(fx('a4.pdf'), inflar);
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.totalPaginas, 2);
    assert.ok(r.paginas[1].ancho > r.paginas[1].alto);
    const adv = advertenciasPdf(r.paginas, [1, 2], 'CARTA');
    console.log('   ', adv.map((a) => a.mensaje).join(' | '));
    assert.ok(adv.some((a) => a.tipo === 'tamano'));
    assert.ok(adv.some((a) => a.tipo === 'orientacion'));
  });
  await caso('carta.pdf en carta: solo aviso de la página en blanco', async () => {
    const r = await analizarPdf(fx('carta.pdf'), inflar);
    assert.ok(r.ok);
    if (!r.ok) return;
    const adv = advertenciasPdf(r.paginas, [1, 2, 3, 4], 'CARTA');
    assert.deepEqual(adv.map((a) => a.tipo), ['en-blanco']);
    assert.deepEqual(advertenciasPdf(r.paginas, [1, 3], 'CARTA'), []);
  });
  await caso('pil.pdf (imagen): 1 página con contenido', async () => {
    const r = await analizarPdf(fx('pil.pdf'), inflar);
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.totalPaginas, 1);
    assert.equal(r.paginas[0].posiblementeEnBlanco, false);
  });
  await caso('cifrado.pdf: se informa como cifrado', async () => {
    const r = await analizarPdf(fx('cifrado.pdf'), inflar);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, 'cifrado');
  });
  await caso('archivo que no es PDF', async () => {
    const r = await analizarPdf(new TextEncoder().encode('MZ hola'), inflar);
    assert.equal(r.ok, false);
  });
  await caso('PDF truncado o basura no lanza excepción', async () => {
    const b = fx('carta.pdf');
    for (const corte of [20, 300, 900, Math.floor(b.length / 2)]) await analizarPdf(b.subarray(0, corte), inflar);
    const basura = new Uint8Array(5000).map((_, i) => (i * 7919) % 256);
    basura.set(new TextEncoder().encode('%PDF-1.4 1 0 obj << /Kids [ 1 0 R ] /Type /Pages >> endobj'), 0);
    await analizarPdf(basura, inflar);
  });
  await caso('rangos válidos y normalización', () => {
    const r = parsearRangos('1-5, 8, 10-12', 12);
    assert.ok(r.ok);
    if (r.ok) { assert.equal(r.paginas.length, 9); assert.equal(r.normalizado, '1-5, 8, 10-12'); }
    const r2 = parsearRangos(' 3 ; 1–2  4,4 ', 10);
    assert.ok(r2.ok && r2.normalizado === '1-4' && r2.habiaRepetidas);
    const todas = parsearRangos('', 3);
    assert.ok(todas.ok && todas.paginas.length === 3);
    assert.equal(formatearRangos([7, 1, 2, 3, 5, 8]), '1-3, 5, 7-8');
  });
  await caso('rangos inválidos', () => {
    for (const [t, frag] of [['5-2', 'al revés'], ['13', 'no existe'], ['0', 'empiezan'], ['1-a', 'no es'], ['2..4', 'no es']] as const) {
      const r = parsearRangos(t, 12);
      assert.ok(!r.ok && r.error.includes(frag), `${t}: ${JSON.stringify(r)}`);
    }
  });
  const tarifas: Tarifas = { precioPaginaBn: 200, precioPaginaColor: 1000, recargoOficio: 50, cargoFijo: 0, descuentos: [{ desdePaginas: 100, porcentaje: 10 }, { desdePaginas: 50, porcentaje: 5 }], limitePaginasPedido: 300 };
  await caso('cotización mixta con descuento y oficio', () => {
    const c = cotizar(tarifas, { paginasBn: 9, paginasColor: 1, copias: 6, tamano: 'OFICIO' });
    assert.ok(c.ok);
    if (!c.ok) return;
    // 54 B/N × 200 = 10.800; 6 color × 1000 = 6.000; oficio 60 × 50 = 3.000; total caras 60 → 5 %
    assert.equal(c.carasImpresas, 60);
    assert.equal(c.subtotal, 19800);
    assert.deepEqual(c.descuento, { porcentaje: 5, valor: 990 });
    assert.equal(c.total, 18810);
  });
  await caso('cotización sin tarifas y por encima del límite', () => {
    const sin = cotizar(TARIFAS_VACIAS, { paginasBn: 3, paginasColor: 0, copias: 1, tamano: 'CARTA' });
    assert.ok(!sin.ok && sin.motivo === 'sin-tarifa');
    const lim = cotizar(tarifas, { paginasBn: 100, paginasColor: 0, copias: 4, tamano: 'CARTA' });
    assert.ok(!lim.ok && lim.motivo === 'limite');
    const inv = cotizar(tarifas, { paginasBn: 0, paginasColor: 0, copias: 1, tamano: 'CARTA' });
    assert.ok(!inv.ok && inv.motivo === 'invalida');
  });
  await caso('validación de tarifas', () => {
    assert.equal(validarTarifas(tarifas), null);
    assert.ok(validarTarifas({ ...tarifas, precioPaginaBn: -1 }));
    assert.ok(validarTarifas({ ...tarifas, descuentos: [{ desdePaginas: 0, porcentaje: 5 }] }));
  });
  console.log(`\n${ok}/${ok + mal} pruebas pasaron`);
  if (mal) process.exit(1);
})();
