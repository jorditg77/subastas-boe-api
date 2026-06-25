import { z } from 'zod';
import { searchAuctionsCached, getAuctionDetailCached } from '../../services/auctionsService.js';

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
  app.get('/', async (request) => {
    const query = searchQuerySchema.parse(request.query);
    return searchAuctionsCached(query);
  });

  app.get('/:id', async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return getAuctionDetailCached(id);
  });
}
