import { load } from 'cheerio';
import { BOE_DETAIL_URL, BOE_TABS } from '../config/constants.js';
import { fetchHtml } from './utils/html.js';
import { boeLimit } from './utils/limit.js';
import { parseKeyValueTable, extractIsoDate } from './utils/parse.js';
import { redactAuctionPii } from './utils/pii.js';
import { calculateAuctionMetrics, parseCurrency } from './utils/calculations.js';
import { logger } from '../api/middleware/logger.js';

function buildTabUrl(id, ver) {
  return `${BOE_DETAIL_URL}?idSub=${encodeURIComponent(id)}&ver=${ver}`;
}

export function parseGeneralTab(html) {
  const $ = load(html);
  const fields = parseKeyValueTable($, '#idBloqueDatos1 > table');

  const auctionValue = parseCurrency(fields['Valor subasta']);
  const appraisalValueRaw = parseCurrency(fields['Tasación']);
  // La Tasación a menudo es 0 o no consta; si no hay valor de tasación
  // usable, los umbrales legales se calculan sobre el valor de subasta.
  const appraisalValue = appraisalValueRaw && appraisalValueRaw > 0 ? appraisalValueRaw : null;
  const metricsBase = appraisalValue ?? auctionValue;
  // Transparencia: el porcentaje legal de adjudicación (50%/70%) se calcula en
  // rigor sobre el valor de tasación. Cuando el BOE no lo publica, se cae al
  // valor de subasta y se marca aquí para que el consumidor sepa la base usada
  // y no tome el cálculo como definitivo (ver disclaimer legal).
  const metricsBasedOn = appraisalValue ? 'tasacion' : auctionValue ? 'valorSubasta' : null;

  const documents = [];
  $('#idBloqueDatos1 .caja.gris ul.enlaces li a').each((_, a) => {
    documents.push({
      title: $(a).text().trim(),
      url: $(a).attr('href') || null,
    });
  });

  return {
    auctionType: fields['Tipo de subasta'] || null,
    caseAccount: fields['Cuenta expediente'] || null,
    startDate: extractIsoDate(fields['Fecha de inicio']),
    endDate: extractIsoDate(fields['Fecha de conclusión']),
    claimedAmount: parseCurrency(fields['Cantidad reclamada']),
    lots: fields['Lotes'] || null,
    boeAnnouncement: fields['Anuncio BOE'] || null,
    auctionValue,
    appraisalValue,
    minimumBid: /sin puja m[ií]nima/i.test(fields['Puja mínima'] || '') ? null : parseCurrency(fields['Puja mínima']),
    bidIncrement: parseCurrency(fields['Tramos entre pujas']),
    publishedDeposit: parseCurrency(fields['Importe del depósito']),
    metricsBasedOn,
    ...calculateAuctionMetrics(metricsBase || 0),
    documents,
  };
}

export function parseAuthorityTab(html) {
  const $ = load(html);
  const fields = parseKeyValueTable($, '#idBloqueDatos2 > table');

  return {
    code: fields['Código'] || null,
    name: fields['Descripción'] || null,
    address: fields['Dirección'] || null,
    phone: fields['Teléfono'] || null,
    fax: fields['Fax'] || null,
    email: fields['Correo electrónico'] || null,
  };
}

// Si la subasta tiene varios lotes, ver=3 sin idLote solo renderiza el
// primero; el resto se referencia en pestañas #tabsver con su idLote real.
function parseLotTabRefs(html) {
  const $ = load(html);
  const refs = [];
  $('#tabsver a[id^="idTabLote"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const match = href.match(/idLote=([^&]+)/);
    if (match) refs.push(match[1]);
  });
  return refs;
}

// En subastas multi-lote, el valor de tasación/subasta/depósito es propio
// de cada lote y vive en una tabla separada ("Datos relacionados con la
// subasta del lote N"), no en la pestaña General.
function parseLotFinancials($, $lote) {
  let table = null;
  $lote.find('h3').each((_, h3) => {
    if (/Datos relacionados con la subasta del lote/i.test($(h3).text())) {
      table = $(h3).next('table');
    }
  });
  if (!table || !table.length) return {};

  const fields = parseKeyValueTable($, table);
  const auctionValue = parseCurrency(fields['Valor Subasta']);
  const appraisalValueRaw = parseCurrency(fields['Valor de tasación']);
  const appraisalValue = appraisalValueRaw && appraisalValueRaw > 0 ? appraisalValueRaw : null;

  return {
    auctionValue,
    appraisalValue,
    minimumBid: /sin puja m[ií]nima/i.test(fields['Puja mínima'] || '') ? null : parseCurrency(fields['Puja mínima']),
    bidIncrement: parseCurrency(fields['Tramos entre pujas']),
    publishedDeposit: parseCurrency(fields['Importe del depósito']),
  };
}

function parseLotBlock($, loteEl) {
  const $lote = $(loteEl);
  const idLote = ($lote.attr('id') || '').replace('idBloqueLote', '');
  const lotDescription = $lote.find('> div > .caja').first().text().trim() || null;
  const financials = parseLotFinancials($, $lote);
  const assets = [];

  $lote.find('h4').each((__, h4) => {
    const $h4 = $(h4);
    const table = $h4.next('table');
    if (!table.length) return;

    const fields = parseKeyValueTable($, table);
    assets.push({
      label: $h4.text().trim(),
      description: fields['Descripción'] || null,
      address: fields['Dirección'] || null,
      postalCode: fields['Código Postal'] || null,
      locality: fields['Localidad'] || null,
      province: fields['Provincia'] || null,
      registryEntry: fields['Inscripción registral'] || null,
      // Resto de campos tal cual aparecen (varían según tipo de bien:
      // inmueble, vehículo, mueble); evita perder información cuando el
      // BOE usa etiquetas distintas a las normalizadas arriba.
      raw: fields,
    });
  });

  const hasFinancials = Object.keys(financials).length > 0;
  return {
    idLote,
    description: lotDescription,
    ...(hasFinancials
      ? { ...financials, ...calculateAuctionMetrics(financials.appraisalValue ?? financials.auctionValue ?? 0) }
      : {}),
    assets,
  };
}

export function parseAssetsTab(html) {
  const $ = load(html);
  const lots = [];
  $('#idBloqueDatos3 .bloque[id^="idBloqueLote"]').each((_, loteEl) => {
    lots.push(parseLotBlock($, loteEl));
  });
  return lots;
}

const NO_BIDS_PATTERNS = [/no ha recibido pujas/i, /^Sin puja$/i];
const SECRET_BID_PATTERN = /puja m[aá]xima.*es secreta/i;

export function parseBidsTab(html) {
  const $ = load(html);
  const block = $('#idBloqueDatos8');
  const blockText = block.text();

  if (SECRET_BID_PATTERN.test(blockText)) {
    return { currentMaxBid: null, secret: true, totalBids: null, requiresDeposit: true, perLot: [] };
  }

  // Subastas multi-lote: tabla "Lote" / "Importe de la puja".
  const lotRows = block.find('table tr').has('td');
  if (lotRows.length) {
    const perLot = [];
    lotRows.each((_, row) => {
      const cells = $(row).find('td');
      const lot = $(cells[0]).text().trim();
      const amountText = $(cells[1]).text().trim();
      perLot.push({
        lot,
        amount: NO_BIDS_PATTERNS.some((re) => re.test(amountText)) ? null : parseCurrency(amountText),
      });
    });
    return { currentMaxBid: null, secret: false, totalBids: null, requiresDeposit: true, perLot };
  }

  if (NO_BIDS_PATTERNS.some((re) => re.test(blockText))) {
    return { currentMaxBid: null, secret: false, totalBids: 0, requiresDeposit: true, perLot: [] };
  }

  const amountMatch = blockText.match(/([\d.,]+)\s*€/);
  return {
    currentMaxBid: amountMatch ? parseCurrency(amountMatch[1]) : null,
    secret: false,
    totalBids: null,
    requiresDeposit: true,
    perLot: [],
  };
}

export async function getAuctionDetail(id) {
  const tabs = {
    general: BOE_TABS.GENERAL,
    autoridad: BOE_TABS.AUTORIDAD,
    bienes: BOE_TABS.BIENES,
    pujas: BOE_TABS.PUJAS,
  };

  logger.info({ id }, 'Fetching auction detail');

  const htmls = {};
  await Promise.all(
    Object.entries(tabs).map(([key, ver]) =>
      boeLimit(async () => {
        try {
          htmls[key] = await fetchHtml(buildTabUrl(id, ver));
        } catch (err) {
          logger.error({ key, id, error: err.message }, 'Failed to fetch tab');
          htmls[key] = '';
        }
      })
    )
  );

  // Si fallan TODAS las pestañas (BOE caído, IP bloqueada, id inexistente),
  // propagamos el error para que la ruta devuelva 5xx y NO se cachee una
  // subasta vacía durante horas (envenenamiento de caché ante fallo transitorio).
  if (!htmls.general && !htmls.autoridad && !htmls.bienes && !htmls.pujas) {
    throw new Error(`No se pudo obtener ninguna pestaña de la subasta ${id}`);
  }

  let lots = htmls.bienes ? parseAssetsTab(htmls.bienes) : [];

  if (htmls.bienes) {
    const allLoteIds = parseLotTabRefs(htmls.bienes);
    const missingLoteIds = allLoteIds.filter((loteId) => !lots.some((l) => l.idLote === loteId));

    if (missingLoteIds.length) {
      const extraLots = await Promise.all(
        missingLoteIds.map((loteId) =>
          boeLimit(async () => {
            try {
              const html = await fetchHtml(`${buildTabUrl(id, BOE_TABS.BIENES)}&idLote=${encodeURIComponent(loteId)}`);
              return parseAssetsTab(html)[0] ?? null;
            } catch (err) {
              logger.error({ id, loteId, error: err.message }, 'Failed to fetch lot');
              return null;
            }
          })
        )
      );
      lots = lots.concat(extraLots.filter(Boolean));
    }
  }

  const auction = {
    id,
    general: htmls.general ? parseGeneralTab(htmls.general) : null,
    authority: htmls.autoridad ? parseAuthorityTab(htmls.autoridad) : null,
    lots,
    bids: htmls.pujas ? parseBidsTab(htmls.pujas) : null,
    metadata: {
      sourceUrl: buildTabUrl(id, BOE_TABS.GENERAL),
      scrapedAt: new Date().toISOString(),
    },
  };

  return redactAuctionPii(auction);
}
