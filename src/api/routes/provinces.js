import { PROVINCES } from '../../config/constants.js';
import { memoryCache } from '../../cache/memory.js';
import { env } from '../../config/index.js';

export async function provincesRoutes(app) {
  app.get('/', async () => {
    const cacheKey = 'provinces';
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached;

    const result = { provinces: PROVINCES };
    memoryCache.set(cacheKey, result, env.cache.provincesTtlSeconds);
    return result;
  });
}
