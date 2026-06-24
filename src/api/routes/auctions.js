import { z } from 'zod';
import { memoryCache } from '../../cache/memory.js';
import { env } from '../../config/index.js';
import { searchAuctions } from '../../scrapers/search.js';
import { getAuctionDetail } from '../../scrapers/detail.js';

const searchQuerySchema = z.object({
  province: z.string().length(2).optional(),
  status: z.enum(['proxima', 'celebrandose', 'suspendida', 'finalizada']).optional(),
  type: z.enum(['inmuebles', 'vehiculos', 'muebles', 'todos']).default('todos'),
  minValue: z.coerce.number().min(0).optional(),
  maxValue: z.coerce.number().min(0).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export async function auctionsRoutes(app) {
  app.get('/', async (request, reply) => {
    const query = searchQuerySchema.parse(request.query);
    const cacheKey = `search:${JSON.stringify(query)}`;

    const cached = memoryCache.get(cacheKey);
    if (cached) {
      cached.metadata.cached = true;
      return cached;
    }

    const result = await searchAuctions(query);
    result.metadata.cached = false;
    memoryCache.set(cacheKey, result, env.cache.searchTtlSeconds);
    return result;
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const cacheKey = `auction:${id}`;

    const cached = memoryCache.get(cacheKey);
    if (cached) {
      cached.metadata.cached = true;
      return cached;
    }

    const result = await getAuctionDetail(id);
    result.metadata.cached = false;
    memoryCache.set(cacheKey, result, env.cache.auctionTtlSeconds);
    return result;
  });
}
