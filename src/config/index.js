import { config } from 'dotenv';

config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  rapidApiProxySecret: process.env.RAPIDAPI_PROXY_SECRET || '',
  cache: {
    maxMemoryMB: parseInt(process.env.CACHE_MAX_MEMORY_MB || '1500', 10),
    auctionTtlSeconds: parseInt(process.env.CACHE_AUCTION_TTL_SECONDS || '14400', 10),
    searchTtlSeconds: parseInt(process.env.CACHE_SEARCH_TTL_SECONDS || '7200', 10),
    provincesTtlSeconds: parseInt(process.env.CACHE_PROVINCES_TTL_SECONDS || '86400', 10),
    // Válvula de emergencia a nivel de proceso, independiente del límite de
    // la caché: si el heap crece por cualquier motivo (no solo la caché) por
    // encima de esto, se vacía la caché para liberar memoria.
    memoryPressureThresholdMB: parseInt(process.env.CACHE_MEMORY_PRESSURE_THRESHOLD_MB || '2500', 10),
  },
  boe: {
    maxConcurrentRequests: parseInt(process.env.BOE_MAX_CONCURRENT_REQUESTS || '3', 10),
    requestDelayMs: parseInt(process.env.BOE_REQUEST_DELAY_MS || '1000', 10),
    retryAttempts: parseInt(process.env.BOE_RETRY_ATTEMPTS || '3', 10),
    retryBackoffMs: parseInt(process.env.BOE_RETRY_BACKOFF_MS || '2000', 10),
    // Timeout por petición al BOE: evita que una conexión colgada retenga un
    // slot del limitador (y deje en espera a todos los clientes que comparten
    // esa misma petición vía single-flight) de forma indefinida.
    requestTimeoutMs: parseInt(process.env.BOE_REQUEST_TIMEOUT_MS || '20000', 10),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};
