import { memoryCache } from '../cache/memory.js';
import { env } from '../config/index.js';
import { searchAuctions } from '../scrapers/search.js';
import { getAuctionDetail } from '../scrapers/detail.js';

// Capa compartida entre la API REST y el servidor MCP: ambas pasan por la
// misma caché en RAM, así un agente de IA y un cliente REST consultando la
// misma subasta no duplican carga sobre el BOE.
export async function searchAuctionsCached(query) {
  const cacheKey = `search:${JSON.stringify(query)}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return { ...cached, metadata: { ...cached.metadata, cached: true } };

  const result = await searchAuctions(query);
  result.metadata.cached = false;
  memoryCache.set(cacheKey, result, env.cache.searchTtlSeconds);
  return result;
}

export async function getAuctionDetailCached(id) {
  const cacheKey = `auction:${id}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return { ...cached, metadata: { ...cached.metadata, cached: true } };

  const result = await getAuctionDetail(id);
  result.metadata.cached = false;
  memoryCache.set(cacheKey, result, env.cache.auctionTtlSeconds);
  return result;
}
