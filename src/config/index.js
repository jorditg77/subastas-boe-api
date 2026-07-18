import { config } from 'dotenv';

config();

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  // Por defecto se escucha SOLO en localhost: la API queda accesible
  // únicamente a través del túnel de Cloudflare (cloudflared corre en la misma
  // máquina), no desde otros equipos de la red local. Cierra el bypass por LAN.
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
  rapidApiProxySecret: process.env.RAPIDAPI_PROXY_SECRET || '',
  // Secretos adicionales de otros gateways/marketplaces (p. ej. Zyla),
  // separados por comas. Cada marketplace recibe su propio secreto para poder
  // rotarlos de forma independiente.
  extraProxySecrets: (process.env.GATEWAY_EXTRA_SECRETS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
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
  // Rate limit propio como TECHO de protección del servidor (no de la
  // facturación, que la gestiona el marketplace). Frena el martilleo de
  // peticiones sin secreto y a un atacante que llegara con un secreto filtrado
  // desde su propia IP. El límite es holgado: a la escala del producto, el
  // tráfico legítimo (que llega con la IP del gateway vía CF-Connecting-IP)
  // nunca lo alcanza.
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};
