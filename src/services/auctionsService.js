import { memoryCache } from '../cache/memory.js';
import { env } from '../config/index.js';
import { searchAuctions } from '../scrapers/search.js';
import { getAuctionDetail } from '../scrapers/detail.js';

// Protección contra "cache stampede": si varias peticiones concurrentes
// llegan para la MISMA clave mientras todavía no hay nada cacheado (p. ej.
// una ráfaga de clientes pidiendo la misma provincia justo cuando expira el
// TTL), comparten la misma petición en curso al BOE en vez de disparar una
// petición real cada una. Verificado en carga real: sin esto, 50 conexiones
// concurrentes a una clave fría se convertían en 50 búsquedas reales,
// serializadas por boeLimit, provocando timeouts en cascada para todas.
const inFlight = new Map();

async function withSingleFlight(cacheKey, fetcher) {
  const cached = memoryCache.get(cacheKey);
  if (cached) return { ...cached, metadata: { ...cached.metadata, cached: true } };

  if (inFlight.has(cacheKey)) {
    const result = await inFlight.get(cacheKey);
    return { ...result, metadata: { ...result.metadata, cached: true } };
  }

  const promise = fetcher();
  inFlight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(cacheKey);
  }
}

// Clave de caché normalizada SOLO por los filtros que afectan a la consulta
// real al BOE (provincia, estado, tipo). page/limit NO entran: paginamos en
// memoria sobre el conjunto completo ya cacheado. Así una misma búsqueda
// pedida con paginaciones distintas —o desde REST y desde MCP— comparte una
// única petición al portal.
function searchCacheKey({ province, status, type }) {
  return `search:${type || 'todos'}|${province || ''}|${status || ''}`;
}

export function paginate(fullResult, page = 1, limit = 50) {
  const start = (page - 1) * limit;
  return {
    data: fullResult.results.slice(start, start + limit),
    pagination: { page, limit, total: fullResult.total },
    metadata: { ...fullResult.metadata, cached: fullResult.metadata.cached ?? false },
  };
}

// Capa compartida entre la API REST y el servidor MCP: ambas pasan por la
// misma caché en RAM, así un agente de IA y un cliente REST consultando la
// misma subasta no duplican carga sobre el BOE.
export async function searchAuctionsCached(query) {
  const cacheKey = searchCacheKey(query);
  const full = await withSingleFlight(cacheKey, async () => {
    const result = await searchAuctions(query);
    result.metadata.cached = false;
    memoryCache.set(cacheKey, result, env.cache.searchTtlSeconds);
    return result;
  });
  return paginate(full, query.page, query.limit);
}

export async function getAuctionDetailCached(id) {
  const cacheKey = `auction:${id}`;
  return withSingleFlight(cacheKey, async () => {
    const result = await getAuctionDetail(id);
    result.metadata.cached = false;
    memoryCache.set(cacheKey, result, env.cache.auctionTtlSeconds);
    return result;
  });
}

export const __testing__ = { withSingleFlight, inFlight, searchCacheKey };
