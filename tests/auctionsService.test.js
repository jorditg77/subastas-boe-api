import { test } from 'node:test';
import assert from 'node:assert';
import { __testing__ } from '../src/services/auctionsService.js';

const { withSingleFlight } = __testing__;

test('withSingleFlight: peticiones concurrentes a la misma clave fría comparten una única llamada (regresión del cache stampede)', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 30));
    return { value: 'x', metadata: { cached: false } };
  };

  // Simula la ráfaga real observada en la prueba de carga: 50 peticiones
  // concurrentes a una clave que todavía no está en caché.
  const results = await Promise.all(Array.from({ length: 50 }, () => withSingleFlight('clave-fria', fetcher)));

  assert.strictEqual(calls, 1, 'el fetcher solo debe invocarse una vez, no 50');
  for (const r of results) {
    assert.strictEqual(r.value, 'x');
  }
});

test('withSingleFlight: tras resolverse, libera la entrada de "en curso"', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return { value: calls, metadata: { cached: false } };
  };

  await withSingleFlight('clave-b', fetcher);
  await withSingleFlight('clave-b', fetcher);

  // Sin caché real de por medio (no se usa memoryCache.set en este test),
  // cada llamada SECUENCIAL (no concurrente) debe generar su propia
  // invocación: la deduplicación es solo para solapes en vuelo, no permanente.
  assert.strictEqual(calls, 2);
});

test('withSingleFlight: si el fetcher falla, todas las peticiones en curso reciben el mismo error', async () => {
  const fetcher = async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    throw new Error('BOE caído');
  };

  const attempts = Array.from({ length: 5 }, () => withSingleFlight('clave-error', fetcher).catch((err) => err.message));
  const results = await Promise.all(attempts);

  for (const r of results) {
    assert.strictEqual(r, 'BOE caído');
  }
});
