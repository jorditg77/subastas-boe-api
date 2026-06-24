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
  assert.strictEqual(parseCurrency('305.348,00 EUR'), 305348.00);
  assert.strictEqual(parseCurrency('1.234,56'), 1234.56);
  assert.strictEqual(parseCurrency('sin valor'), null);
});

test('redactPii removes NIF', () => {
  const text = 'El deudor Juan Pérez con NIF 12345678Z participa en la subasta.';
  const redacted = redactPii(text);
  assert.ok(!redacted.includes('12345678Z'));
  assert.ok(redacted.includes('[NIF REDACTED]'));
});
