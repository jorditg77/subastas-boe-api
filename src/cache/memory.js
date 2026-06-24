import QuickLRU from 'quick-lru';
import { env } from '../config/index.js';
import { logger } from '../api/middleware/logger.js';

// Estimación aproximada: 1 entrada = 10 KB máximo
const MAX_ENTRIES = Math.floor((env.cache.maxMemoryMB * 1024) / 10);

const cache = new QuickLRU({ maxSize: MAX_ENTRIES });

export const memoryCache = {
  get(key) {
    const item = cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      cache.delete(key);
      return null;
    }

    return item.value;
  },

  set(key, value, ttlSeconds) {
    const ttl = ttlSeconds || 3600;
    cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
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

  // Memory guard: si el proceso usa más de threshold, limpia la caché
  checkMemoryPressure() {
    const usedMB = process.memoryUsage().heapUsed / 1024 / 1024;
    if (usedMB > 2500) {
      logger.warn({ usedMB }, 'Memory pressure detected, clearing cache');
      this.clear();
    }
  },
};

// Chequeo periódico de presión de memoria
setInterval(() => memoryCache.checkMemoryPressure(), 30000);
