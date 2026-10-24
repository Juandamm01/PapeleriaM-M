/**
 * Pruebas de las firmas de Wompi, sin dependencias de test.
 * Ejecutar con:  bun test/firmas.check.ts
 */
import assert from 'node:assert/strict';
import { eventoEsAutentico, firmaDeIntegridad } from '../src/pagos/firma';
import { estadoDesdeWompi } from '../src/pagos/pagos.service';

const casos: [string, () => void][] = [];
const prueba = (nombre: string, fn: () => void) => casos.push([nombre, fn]);

// Ejemplo de la documentación de eventos de Wompi
const SECRETO = 'prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z';
const CHECKSUM_DOC = '5a18ec5e8fdb7df463e9f94774cba8f583ba21bd04a09ceff2ea68a4bc0aefbe';
const evento = () => ({
  event: 'transaction.updated',
  data: {
    transaction: {
      id: '1234-1610641025-49201',
      status: 'APPROVED',
      amount_in_cents: 4490000,
      reference: 'MM-4K7Q2X-1',
    },
  },
  signature: {
    properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
    checksum: CHECKSUM_DOC,
  },
  timestamp: 1530291411,
});

prueba('acepta el evento del ejemplo oficial', () => {
  assert.equal(eventoEsAutentico(evento(), SECRETO), true);
});

prueba('acepta el checksum en la cabecera X-Event-Checksum (sin importar mayúsculas)', () => {
  const sinFirmaEnCuerpo = { ...evento(), signature: { ...evento().signature, checksum: undefined } };
  assert.equal(eventoEsAutentico(sinFirmaEnCuerpo, SECRETO, CHECKSUM_DOC.toUpperCase()), true);
});

prueba('rechaza un monto alterado', () => {
  const e = evento();
  e.data.transaction.amount_in_cents = 100;
  assert.equal(eventoEsAutentico(e, SECRETO), false);
});

prueba('rechaza un estado alterado', () => {
  const e = evento();
  e.data.transaction.status = 'DECLINED';
  assert.equal(eventoEsAutentico(e, SECRETO), false);
});

prueba('rechaza si el timestamp cambia', () => {
  assert.equal(eventoEsAutentico({ ...evento(), timestamp: 1530291412 }, SECRETO), false);
});

prueba('rechaza con otro secreto o sin secreto', () => {
  assert.equal(eventoEsAutentico(evento(), 'test_events_otro'), false);
  assert.equal(eventoEsAutentico(evento(), ''), false);
});

prueba('respeta el orden de signature.properties', () => {
  const e = evento();
  e.signature.properties = ['transaction.status', 'transaction.id', 'transaction.amount_in_cents'];
  assert.equal(eventoEsAutentico(e, SECRETO), false);
});

prueba('rechaza propiedades inexistentes, objetos o checksum malformado', () => {
  const e1 = evento();
  e1.signature.properties = ['transaction.noexiste'];
  assert.equal(eventoEsAutentico(e1, SECRETO), false);
  const e2 = evento();
  e2.signature.properties = ['transaction'];
  assert.equal(eventoEsAutentico(e2, SECRETO), false);
  assert.equal(eventoEsAutentico({ ...evento(), signature: { properties: [], checksum: CHECKSUM_DOC } }, SECRETO), false);
  assert.equal(eventoEsAutentico(evento(), SECRETO, 'no-es-hex'), false);
});

prueba('firma de integridad: SHA-256 de referencia + monto + moneda + secreto', () => {
  assert.equal(
    firmaDeIntegridad('MM-4K7Q2X-1', 1500000, 'COP', 'test_integrity_abc'),
    '151c13013fbf8e079ae39fea3a273103d935888b132e53bc14466529ee22933b',
  );
});

prueba('mapea los estados de Wompi a los nuestros', () => {
  assert.equal(estadoDesdeWompi('PENDING'), 'PENDIENTE');
  assert.equal(estadoDesdeWompi('APPROVED'), 'APROBADO');
  assert.equal(estadoDesdeWompi('DECLINED'), 'RECHAZADO');
  assert.equal(estadoDesdeWompi('ERROR'), 'RECHAZADO');
  assert.equal(estadoDesdeWompi('VOIDED'), 'ANULADO');
});

let fallas = 0;
for (const [nombre, fn] of casos) {
  try {
    fn();
    console.log(`✔ ${nombre}`);
  } catch (error) {
    fallas++;
    console.error(`✘ ${nombre}\n  ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log(`\n${casos.length - fallas}/${casos.length} pruebas pasaron`);
if (fallas > 0) process.exit(1);
