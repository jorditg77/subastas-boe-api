import { z } from 'zod';
import { memoryCache } from '../../cache/memory.js';
import { env } from '../../config/index.js';
import { searchAuctions } from '../../scrapers/search.js';
import { getAuctionDetail } from '../../scrapers/detail.js';

const searchQuerySchema = z.object({
  province: z.string().regex(/^\d{2}$/, 'province debe ser el código numérico de 2 dígitos').optional(),
  status: z.enum(['proxima', 'celebrandose', 'suspendida', 'cancelada', 'concluida', 'finalizada']).optional(),
  type: z.enum(['inmuebles', 'vehiculos', 'muebles', 'todos']).default('todos'),
  minValue: z.coerce.number().min(0).optional(),
  maxValue: z.coerce.number().min(0).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// El identificador de subasta del BOE tiene forma SUB-XX-AAAA-...; validarlo
// evita reenviar entradas arbitrarias del usuario al portal y que la caché se
// llene de claves basura.
const idParamSchema = z.object({
  id: z.string().regex(/^SUB-[A-Z]{2}-\d{4}-[A-Za-z0-9]+$/, 'id de subasta no válido'),
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
    const { id } = idParamSchema.parse(request.params);
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
