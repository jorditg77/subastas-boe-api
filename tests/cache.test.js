import { test } from 'node:test';
import assert from 'node:assert';
import { createMemoryCache } from '../src/cache/memory.js';

test('get/set/delete/clear básico', () => {
  const cache = createMemoryCache({ maxMemoryMB: 1 });
  cache.set('a', { foo: 'bar' }, 3600);
  assert.deepStrictEqual(cache.get('a'), { foo: 'bar' });

  cache.delete('a');
  assert.strictEqual(cache.get('a'), null);

  cache.set('b', { x: 1 }, 3600);
  cache.clear();
  assert.strictEqual(cache.get('b'), null);
  assert.strictEqual(cache.size(), 0);
});

test('expira por TTL (no por nº de entradas)', async () => {
  const cache = createMemoryCache({ maxMemoryMB: 10 });
  cache.set('temp', { x: 1 }, 0.05); // 50ms
  assert.deepStrictEqual(cache.get('temp'), { x: 1 });

  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.strictEqual(cache.get('temp'), null, 'debe haber expirado');
});

test('expulsa por BYTES reales, no por número de entradas (regresión)', () => {
  // Límite minúsculo (en MB) para forzar eviction tras pocas entradas. Esto
  // reproduce el fallo original: el límite anterior asumía 10KB/entrada fijo,
  // por lo que una entrada mucho más pesada (p.ej. una subasta multi-lote con
  // decenas de bienes) no se contabilizaba correctamente.
  const maxBytes = 500;
  const cache = createMemoryCache({ maxMemoryMB: maxBytes / (1024 * 1024) });

  // Cada entrada pesa ~300 bytes en JSON; tres no caben en 500 bytes.
  const entry = () => ({ v: 'x'.repeat(290) });
  cache.set('e1', entry(), 3600);
  cache.set('e2', entry(), 3600);
  cache.set('e3', entry(), 3600);

  assert.ok(cache.calculatedSize() <= maxBytes, 'el tamaño calculado respeta el límite de bytes');
  assert.ok(cache.size() < 3, 'no las tres entradas caben; al menos una fue expulsada');
});

test('checkMemoryPressure vacía la caché si se supera el umbral de heap', () => {
  const cache = createMemoryCache({ maxMemoryMB: 10, memoryPressureThresholdMB: 0 });
  cache.set('a', { x: 1 }, 3600);
  cache.checkMemoryPressure(); // heap actual > 0MB siempre es cierto
  assert.strictEqual(cache.get('a'), null);
});

test('checkMemoryPressure no hace nada si no hay umbral configurado', () => {
  const cache = createMemoryCache({ maxMemoryMB: 10 }); // sin memoryPressureThresholdMB
  cache.set('a', { x: 1 }, 3600);
  cache.checkMemoryPressure();
  assert.deepStrictEqual(cache.get('a'), { x: 1 });
});
