import { load } from 'cheerio';
import { BOE_BASE_URL } from '../config/constants.js';
import { fetchHtml, sleep } from './utils/html.js';
import { redactAuctionPii } from './utils/pii.js';
import { env } from '../config/index.js';
import { logger } from '../api/middleware/logger.js';

export async function searchAuctions(query) {
  // TODO: implementar mapeo real de query a URL de búsqueda del BOE
  // Esta es una URL de ejemplo que debe validarse durante reconocimiento
  const url = `${BOE_BASE_URL}/busqueda.php?tipo_subasta=1&estado=2&id_provincia=${query.province || ''}&tipo_bien=${query.type === 'inmuebles' ? 1 : ''}`;

  logger.info({ url, query }, 'Searching auctions');
  const html = await fetchHtml(url);
  const $ = load(html);

  const auctions = [];

  // TODO: ajustar selectores tras reconocimiento del portal
  // $('table tr').each((i, el) => { ... });

  // Placeholder mientras se hace reconocimiento
  auctions.push({
    id: 'SUB-JA-2026-000000',
    type: 'Placeholder',
    status: 'Celebrandose',
    description: 'Implementar parseo real tras reconocimiento del portal',
    detailUrl: `${BOE_BASE_URL}/detalleSubasta.php?idSub=SUB-JA-2026-000000`,
    scrapedAt: new Date().toISOString(),
  });

  await sleep(env.boe.requestDelayMs);

  return {
    data: auctions.map(redactAuctionPii),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: auctions.length,
    },
    metadata: {
      source: BOE_BASE_URL,
      scrapedAt: new Date().toISOString(),
    },
  };
}
