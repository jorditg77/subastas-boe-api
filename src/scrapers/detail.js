import { load } from 'cheerio';
import { BOE_BASE_URL, BOE_TABS } from '../config/constants.js';
import { fetchHtml } from './utils/html.js';
import { redactAuctionPii } from './utils/pii.js';
import { calculateAuctionMetrics, parseCurrency } from './utils/calculations.js';
import { logger } from '../api/middleware/logger.js';

export async function getAuctionDetail(id) {
  const baseDetailUrl = `${BOE_BASE_URL}/detalleSubasta.php?idSub=${encodeURIComponent(id)}`;

  logger.info({ id }, 'Fetching auction detail');

  // TODO: lanzar 4 requests en paralelo con limitación de concurrencia
  const tabs = {
    general: `${baseDetailUrl}&tab=${BOE_TABS.GENERAL}`,
    autoridad: `${baseDetailUrl}&tab=${BOE_TABS.AUTORIDAD}`,
    bienes: `${baseDetailUrl}&tab=${BOE_TABS.BIENES}`,
    pujas: `${baseDetailUrl}&tab=${BOE_TABS.PUJAS}`,
  };

  const htmls = {};
  for (const [key, url] of Object.entries(tabs)) {
    try {
      htmls[key] = await fetchHtml(url);
    } catch (err) {
      logger.error({ key, id, error: err.message }, 'Failed to fetch tab');
      htmls[key] = '';
    }
  }

  // TODO: implementar parsers reales para cada tab
  const auction = {
    id,
    type: 'JUDICIAL EN VÍA DE APREMIO',
    status: 'Celebrandose',
    general: {
      description: 'Pendiente de implementar parseo real',
      auctionValue: null,
      appraisalValue: null,
      ...calculateAuctionMetrics(0),
    },
    authority: {
      name: null,
      code: null,
      address: null,
      phone: null,
      email: null,
    },
    assets: [],
    bids: {
      currentMaxBid: null,
      totalBids: null,
      requiresDeposit: true,
    },
    documents: [],
    metadata: {
      sourceUrl: baseDetailUrl,
      scrapedAt: new Date().toISOString(),
    },
  };

  return redactAuctionPii(auction);
}
