import { z } from 'zod';
import { PROVINCES } from '../config/constants.js';
import { calculateAuctionMetrics } from '../scrapers/utils/calculations.js';
import { searchAuctionsCached, getAuctionDetailCached } from '../services/auctionsService.js';
import { logger } from '../api/middleware/logger.js';

const PROVINCE_CODE = z
  .string()
  .regex(/^\d{2}$/, 'código de provincia de 2 dígitos, ver la tool list_provinces')
  .optional();

const STATUS_ENUM = z.enum(['proxima', 'celebrandose', 'suspendida', 'cancelada', 'concluida', 'finalizada']).optional();
const TYPE_ENUM = z.enum(['inmuebles', 'vehiculos', 'muebles', 'todos']).optional();
const AUCTION_ID = z.string().regex(/^SUB-[A-Z]{2}-\d{4}-[A-Za-z0-9]+$/, 'id de subasta no válido, formato SUB-XX-AAAA-...');

function textResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

function errorResult(err) {
  logger.error({ error: err.message }, 'MCP tool error');
  return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
}

export const searchAuctionsTool = {
  name: 'search_auctions',
  config: {
    title: 'Buscar subastas del BOE',
    description:
      'Busca subastas judiciales, notariales y tributarias en el portal del BOE (subastas.boe.es), filtrando por provincia, estado y tipo de bien. Devuelve un listado consolidado en JSON.',
    inputSchema: {
      province: PROVINCE_CODE,
      status: STATUS_ENUM,
      type: TYPE_ENUM,
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(50),
    },
  },
  handler: async (args) => {
    try {
      const result = await searchAuctionsCached(args);
      return textResult(result);
    } catch (err) {
      return errorResult(err);
    }
  },
};

export const getAuctionDetailTool = {
  name: 'get_auction_detail',
  config: {
    title: 'Detalle consolidado de una subasta',
    description:
      'Obtiene el detalle completo y consolidado de una subasta del BOE (datos generales, autoridad gestora, bienes/lotes con sus valores económicos y umbrales legales, y estado de las pujas), a partir de su identificador.',
    inputSchema: {
      id: AUCTION_ID,
    },
  },
  handler: async ({ id }) => {
    try {
      const result = await getAuctionDetailCached(id);
      return textResult(result);
    } catch (err) {
      return errorResult(err);
    }
  },
};

export const calculateAuctionMetricsTool = {
  name: 'calculate_auction_metrics',
  config: {
    title: 'Calcular umbrales legales de una subasta',
    description:
      'Calcula los umbrales de referencia del 70% y 50% del valor indicado (habitualmente la tasación) y una estimación del depósito (5%), útil para evaluar hipotéticos sin tener que consultar una subasta real.',
    inputSchema: {
      value: z.number().positive('debe ser un importe positivo en euros'),
    },
  },
  handler: async ({ value }) => {
    try {
      return textResult(calculateAuctionMetrics(value));
    } catch (err) {
      return errorResult(err);
    }
  },
};

export const listProvincesTool = {
  name: 'list_provinces',
  config: {
    title: 'Listar provincias y sus códigos',
    description: 'Devuelve las 52 provincias españolas con su código numérico, necesario para el filtro `province` de search_auctions.',
    inputSchema: {},
  },
  handler: async () => textResult({ provinces: PROVINCES }),
};

export const TOOLS = [searchAuctionsTool, getAuctionDetailTool, calculateAuctionMetricsTool, listProvincesTool];

export function registerTools(server) {
  for (const tool of TOOLS) {
    server.registerTool(tool.name, tool.config, tool.handler);
  }
}
