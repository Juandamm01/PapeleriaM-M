/**
 * Pruebas de la preparación de impresiones en el servidor y de las franjas de recogida.
 * Ejecutar con:  bun test/impresion.check.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { prepararImpresion } from '../src/pedidos/impresion';
import { calcularFranjas, HORARIOS_POR_DEFECTO, normalizarHorarios } from '../src/configuracion/horarios';
import { normalizarTarifas } from '../src/configuracion/configuracion.service';
import { TARIFAS_VACIAS, type Tarifas } from '../src/compartido/precios';

const archivo = (nombre: string, mimetype = 'application/pdf') =>
  ({ buffer: readFileSync(join(__dirname, 'pdf', nombre)), mimetype, originalname: nombre }) as Express.Multer.File;
const tarifas: Tarifas = { ...TARIFAS_VACIAS, precioPaginaBn: 200, precioPaginaColor: 1000, limitePaginasPedido: 20 };
const base = { tipoImpresion: 'BN' as const, copias: 1, tamano: 'CARTA' as const };

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
const rechaza = async (fn: () => Promise<unknown>, fragmento: string) => {
  try {
    await fn();
  } catch (error) {
    const mensaje = (error as { message?: string }).message ?? '';
    assert.ok(mensaje.includes(fragmento), `esperaba "${fragmento}" y llegó "${mensaje}"`);
    return;
  }
  assert.fail(`esperaba un error con "${fragmento}"`);
};

(async () => {
  await caso('PDF en B/N: el servidor cuenta las páginas y calcula el precio', async () => {
    const r = await prepararImpresion({ ...base, copias: 2, paginas: '1, 3-4' }, archivo('carta.pdf'), tarifas);
    assert.equal(r.paginasDocumento, 4);
    assert.equal(r.paginasImprimir, 3);
    assert.equal(r.paginasSeleccion, '1, 3-4');
    assert.equal(r.precioCentavos, 3 * 2 * 200 * 100);
    assert.equal(r.precioAutomatico, true);
  });
  await caso('modo mixto: solo las páginas a color se cobran a color', async () => {
    const r = await prepararImpresion({ ...base, tipoImpresion: 'MIXTO', paginasColor: '3' }, archivo('objstm.pdf'), tarifas);
    assert.equal(r.precioCentavos, (3 * 200 + 1000) * 100);
    assert.equal(r.paginasColor, '3');
  });
  await caso('mixto sin páginas a color, o con una página fuera de la selección', async () => {
    await rechaza(() => prepararImpresion({ ...base, tipoImpresion: 'MIXTO' }, archivo('carta.pdf'), tarifas), 'a color');
    await rechaza(
      () => prepararImpresion({ ...base, tipoImpresion: 'MIXTO', paginas: '1-2', paginasColor: '4' }, archivo('carta.pdf'), tarifas),
      'no está entre',
    );
  });
  await caso('rango fuera del documento', async () => {
    await rechaza(() => prepararImpresion({ ...base, paginas: '1-9' }, archivo('carta.pdf'), tarifas), 'no existe');
  });
  await caso('límite de páginas aplicado aunque no haya tarifas', async () => {
    await rechaza(() => prepararImpresion({ ...base, copias: 80 }, archivo('carta.pdf'), TARIFAS_VACIAS), 'hasta 300');
    await rechaza(() => prepararImpresion({ ...base, copias: 6 }, archivo('carta.pdf'), tarifas), 'hasta 20');
  });
  await caso('sin tarifas: el pedido se acepta con precio manual', async () => {
    const r = await prepararImpresion(base, archivo('carta.pdf'), TARIFAS_VACIAS);
    assert.equal(r.precioCentavos, null);
    assert.equal(r.precioAutomatico, false);
    assert.equal(r.paginasImprimir, 4);
  });
  await caso('Word o PDF cifrado: se guarda lo indicado y el admin cotiza', async () => {
    const word = await prepararImpresion({ ...base, paginas: '1-3' }, archivo('carta.pdf', 'application/msword'), tarifas);
    assert.equal(word.paginasDocumento, null);
    assert.equal(word.paginasSeleccion, '1-3');
    assert.equal(word.precioCentavos, null);
    const cifrado = await prepararImpresion(base, archivo('cifrado.pdf'), tarifas);
    assert.equal(cifrado.precioCentavos, null);
  });
  await caso('notas por página: se normalizan y se validan contra el documento', async () => {
    const r = await prepararImpresion(
      { ...base, notasPaginas: JSON.stringify([{ paginas: ' 3 ', nota: 'Esta en color brillante' }]) },
      archivo('carta.pdf'),
      tarifas,
    );
    assert.deepEqual(r.notasPaginas, [{ paginas: '3', nota: 'Esta en color brillante' }]);
    await rechaza(
      () => prepararImpresion({ ...base, notasPaginas: JSON.stringify([{ paginas: '9', nota: 'x' }]) }, archivo('carta.pdf'), tarifas),
      'no existe',
    );
    await rechaza(() => prepararImpresion({ ...base, notasPaginas: '{roto' }, archivo('carta.pdf'), tarifas), 'no son válidas');
  });
  await caso('franjas: respeta horario, anticipación, cupos y fechas cerradas', () => {
    // Sábado 7 de noviembre de 2026, 10:30 a. m. en Colombia (15:30 UTC)
    const ahora = new Date('2026-11-07T15:30:00Z');
    const ocupadas = new Map([['2026-11-07T18:00:00.000Z', 6]]);
    const horarios = { ...HORARIOS_POR_DEFECTO, fechasCerradas: ['2026-11-09'] };
    const dias = calcularFranjas(horarios, ahora, ocupadas);
    assert.equal(dias[0].nombre, 'Hoy');
    // Sábado 9–17 h, con 60 min de anticipación: la primera franja es 12:00 p. m.
    assert.equal(dias[0].franjas[0].etiqueta, '12:00 p. m. – 1:00 p. m.');
    assert.equal(dias[0].franjas[0].inicio, '2026-11-07T17:00:00.000Z');
    const llena = dias[0].franjas.find((f) => f.inicio === '2026-11-07T18:00:00.000Z');
    assert.equal(llena?.disponible, false);
    assert.equal(dias[0].franjas.at(-1)?.etiqueta, '4:00 p. m. – 5:00 p. m.');
    // Domingo cerrado y lunes 9 marcado como festivo
    assert.ok(!dias.some((d) => d.fecha === '2026-11-08' || d.fecha === '2026-11-09'));
    assert.equal(dias[1].fecha, '2026-11-10');
    assert.equal(dias[1].franjas[0].etiqueta, '8:00 a. m. – 9:00 a. m.');
  });
  await caso('validación de horarios y tarifas desde el admin', () => {
    assert.equal(typeof normalizarHorarios(HORARIOS_POR_DEFECTO), 'object');
    const malo = { ...HORARIOS_POR_DEFECTO, dias: HORARIOS_POR_DEFECTO.dias.map((d, i) => (i === 1 ? { ...d, hasta: '07:00' } : d)) };
    assert.ok(String(normalizarHorarios(malo)).includes('lunes'));
    assert.ok(String(normalizarHorarios({ ...HORARIOS_POR_DEFECTO, fechasCerradas: ['25/12/2026'] })).includes('AAAA-MM-DD'));
    const t = normalizarTarifas({ precioPaginaBn: '200', precioPaginaColor: '', descuentos: [{ desdePaginas: 50, porcentaje: 5 }] });
    assert.deepEqual(typeof t === 'object' && [t.precioPaginaBn, t.precioPaginaColor, t.limitePaginasPedido], [200, null, 300]);
    assert.equal(typeof normalizarTarifas({ precioPaginaBn: 2.5 }), 'string');
  });

  console.log(`\n${ok}/${ok + mal} pruebas pasaron`);
  if (mal > 0) process.exit(1);
})();
