import { test } from 'node:test';
import assert from 'node:assert';
import { paginate, __testing__ } from '../src/services/auctionsService.js';

const { withSingleFlight, searchCacheKey } = __testing__;

test('searchCacheKey: ignora page/limit y normaliza filtros (regresión de fragmentación de caché)', () => {
  // La misma búsqueda con paginaciones distintas debe compartir clave.
  const k1 = searchCacheKey({ province: '08', status: 'celebrandose', type: 'inmuebles', page: 1, limit: 50 });
  const k2 = searchCacheKey({ province: '08', status: 'celebrandose', type: 'inmuebles', page: 5, limit: 10 });
  assert.strictEqual(k1, k2);

  // type ausente (MCP) y type 'todos' (REST) deben colapsar a la misma clave,
  // para que REST y MCP compartan la caché.
  assert.strictEqual(searchCacheKey({ province: '28' }), searchCacheKey({ province: '28', type: 'todos' }));

  // Filtros distintos => claves distintas.
  assert.notStrictEqual(searchCacheKey({ province: '08' }), searchCacheKey({ province: '28' }));
});

test('paginate: corta el conjunto completo y conserva el total real', () => {
  const full = {
    results: Array.from({ length: 85 }, (_, i) => ({ id: `r${i}` })),
    total: 85,
    metadata: { source: 'x', cached: true },
  };

  const p1 = paginate(full, 1, 50);
  assert.strictEqual(p1.data.length, 50);
  assert.strictEqual(p1.data[0].id, 'r0');
  assert.strictEqual(p1.pagination.total, 85, 'el total refleja TODOS los resultados, no solo la página');
  assert.strictEqual(p1.metadata.cached, true);

  const p2 = paginate(full, 2, 50);
  assert.strictEqual(p2.data.length, 35, 'la segunda página tiene el resto');
  assert.strictEqual(p2.data[0].id, 'r50');

  const p3 = paginate(full, 99, 50);
  assert.strictEqual(p3.data.length, 0, 'página fuera de rango => vacío, sin error');
});

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
