import { LRUCache } from 'lru-cache';
import { env } from '../config/index.js';
import { logger } from '../api/middleware/logger.js';

// Límite por BYTES REALES, no por número de entradas: una búsqueda con 50
// resultados o el detalle de una subasta multi-lote con decenas de bienes
// pesan órdenes de magnitud más que una simple, así que un tope de "nº de
// entradas" no acota la memoria realmente usada en un hardware de 4GB.
export function createMemoryCache({ maxMemoryMB, memoryPressureThresholdMB } = {}) {
  const cache = new LRUCache({
    maxSize: maxMemoryMB * 1024 * 1024,
    sizeCalculation: (value) => Buffer.byteLength(JSON.stringify(value)),
  });

  return {
    get(key) {
      return cache.get(key) ?? null;
    },

    set(key, value, ttlSeconds) {
      const ttl = (ttlSeconds || 3600) * 1000;
      cache.set(key, value, { ttl });
    },

    delete(key) {
      cache.delete(key);
    },

    clear() {
      cache.clear();
      logger.warn('Cache cleared');
    },

    size() {
      return cache.size;
    },

    // Bytes reales actualmente ocupados por la caché (no heap total del proceso).
    calculatedSize() {
      return cache.calculatedSize;
    },

    // Válvula de emergencia: si el heap del proceso (no solo la caché, también
    // objetos temporales del parseo, etc.) crece por encima del umbral, se
    // vacía la caché para liberar memoria antes de que el proceso colapse.
    checkMemoryPressure() {
      // != null (no ?? / truthiness): un umbral de 0 debe disparar siempre,
      // no tratarse como "deshabilitado" por ser falsy.
      if (memoryPressureThresholdMB == null) return;
      const usedMB = process.memoryUsage().heapUsed / 1024 / 1024;
      if (usedMB > memoryPressureThresholdMB) {
        logger.warn({ usedMB }, 'Memory pressure detected, clearing cache');
        this.clear();
      }
    },
  };
}

export const memoryCache = createMemoryCache({
  maxMemoryMB: env.cache.maxMemoryMB,
  memoryPressureThresholdMB: env.cache.memoryPressureThresholdMB,
});

// unref() para que este temporizador de fondo no impida la salida limpia del
// proceso (tests, scripts puntuales, señales de apagado).
setInterval(() => memoryCache.checkMemoryPressure(), 30000).unref();
