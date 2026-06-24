import { test } from 'node:test';
import assert from 'node:assert';
import { calculateAuctionMetrics, parseCurrency } from '../src/scrapers/utils/calculations.js';
import { redactPii } from '../src/scrapers/utils/pii.js';

test('calculateAuctionMetrics', () => {
  const result = calculateAuctionMetrics(100000);
  assert.strictEqual(result.reference70, 70000);
  assert.strictEqual(result.reference50, 50000);
  assert.strictEqual(result.deposit, 5000);
});

test('parseCurrency', () => {
  assert.strictEqual(parseCurrency('305.348,00 EUR'), 305348.0);
  assert.strictEqual(parseCurrency('1.234,56'), 1234.56);
  assert.strictEqual(parseCurrency('sin valor'), null);
});

test('redactPii redacta DNI y NIE', () => {
  assert.ok(redactPii('El deudor con NIF 12345678Z participa').includes('[DNI REDACTED]'));
  assert.ok(!redactPii('NIF 12345678Z').includes('12345678Z'));
  assert.ok(redactPii('extranjero X1234567L').includes('[NIE REDACTED]'));
  assert.ok(redactPii('cuenta ES9121000418450200051332').includes('[IBAN REDACTED]'));
});

test('redactPii NO destruye direcciones, topónimos ni marcas (regresión)', () => {
  // El fallo original redactaba cualquier secuencia en mayúsculas que
  // contuviera un nombre de pila común, arruinando datos de altísimo valor.
  assert.strictEqual(redactPii('CALLE DEL CARMEN 14'), 'CALLE DEL CARMEN 14');
  assert.strictEqual(redactPii('AVENIDA SAN JOSE 23'), 'AVENIDA SAN JOSE 23');
  assert.strictEqual(redactPii('PLAZA DEL PILAR'), 'PLAZA DEL PILAR');
  assert.strictEqual(redactPii('MERCEDES BENZ CLASE A'), 'MERCEDES BENZ CLASE A');
  assert.ok(!redactPii('CALLE DEL CARMEN 14').includes('REDACTED'));
});
