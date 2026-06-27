import { load } from 'cheerio';
import { BOE_SEARCH_URL, BOE_DETAIL_URL, BOE_STATUS, BOE_BIEN_TIPO } from '../config/constants.js';
import { postForm } from './utils/html.js';
import { boeLimit } from './utils/limit.js';
import { redactAuctionPii } from './utils/pii.js';
import { logger } from '../api/middleware/logger.js';

// Decodifica el idSub del href de forma segura: un % mal formado en el HTML
// del BOE no debe tumbar el parseo de todos los resultados.
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const STATUS_MAP = {
  proxima: BOE_STATUS.PROXIMA_APERTURA,
  celebrandose: BOE_STATUS.CELEBRANDOSE,
  suspendida: BOE_STATUS.SUSPENDIDA,
  cancelada: BOE_STATUS.CANCELADA,
  concluida: BOE_STATUS.CONCLUIDA_PORTAL,
  finalizada: BOE_STATUS.FINALIZADA_AUTORIDAD,
};

const TYPE_MAP = {
  inmuebles: BOE_BIEN_TIPO.INMUEBLES,
  vehiculos: BOE_BIEN_TIPO.VEHICULOS,
  muebles: BOE_BIEN_TIPO.MUEBLES,
  todos: BOE_BIEN_TIPO.TODOS,
};

// Réplica exacta de los pares campo[i]/dato[i] que envía el formulario real
// de subastas_ava.php. minValue/maxValue no se mapean: el único filtro de
// importe del portal es un desplegable de umbrales fijos ("postura mínima
// inferior a") que no permite un rango arbitrario, así que de momento no se
// usa (filtrar por importe exigiría descargar el detalle de cada resultado).
function buildSearchFields(query) {
  return {
    'campo[0]': 'SUBASTA.ORIGEN',
    'dato[0]': '',
    'campo[1]': 'SUBASTA.AUTORIDAD',
    'dato[1]': '',
    'campo[2]': 'SUBASTA.ESTADO.CODIGO',
    'dato[2]': query.status ? STATUS_MAP[query.status] ?? '' : '',
    'campo[3]': 'BIEN.TIPO',
    'dato[3]': TYPE_MAP[query.type] ?? '',
    'dato[4]': '',
    'campo[5]': 'BIEN.DIRECCION',
    'dato[5]': '',
    'campo[6]': 'BIEN.CODPOSTAL',
    'dato[6]': '',
    'campo[7]': 'BIEN.LOCALIDAD',
    'dato[7]': '',
    'campo[8]': 'BIEN.COD_PROVINCIA',
    'dato[8]': query.province ?? '',
    'campo[9]': 'SUBASTA.POSTURA_MINIMA_MINIMA_LOTES',
    'dato[9]': '',
    'campo[10]': 'SUBASTA.NUM_CUENTA_EXPEDIENTE_1',
    'dato[10]': '',
    'campo[11]': 'SUBASTA.NUM_CUENTA_EXPEDIENTE_2',
    'dato[11]': '',
    'campo[12]': 'SUBASTA.NUM_CUENTA_EXPEDIENTE_3',
    'dato[12]': '',
    'campo[13]': 'SUBASTA.NUM_CUENTA_EXPEDIENTE_4',
    'dato[13]': '',
    'campo[14]': 'SUBASTA.NUM_CUENTA_EXPEDIENTE_5',
    'dato[14]': '',
    'campo[15]': 'SUBASTA.ID_SUBASTA_BUSCAR',
    'dato[15]': '',
    'campo[16]': 'SUBASTA.ACREEDORES',
    'dato[16]': '',
    'campo[17]': 'SUBASTA.FECHA_FIN',
    'dato[17][0]': '',
    'dato[17][1]': '',
    'campo[18]': 'SUBASTA.FECHA_INICIO',
    'dato[18][0]': '',
    'dato[18][1]': '',
    page_hits: '500',
    'sort_field[0]': 'SUBASTA.FECHA_FIN',
    'sort_order[0]': 'asc',
    accion: 'Buscar',
  };
}

export function parseSearchResults(html) {
  const $ = load(html);
  const results = [];

  $('div.listadoResult > ul > li.resultado-busqueda').each((_, el) => {
    const $el = $(el);
    const titleText = $el.children('h3').first().text().trim();
    const idMatch = titleText.match(/SUBASTA\s+([\w-]+)/i);
    if (!idMatch) return;

    const lotsMatch = titleText.match(/\((\d+)\s*lotes?\)/i);
    const authority = $el.children('h4').first().text().trim();

    let caseNumber = null;
    let statusText = null;
    let description = null;
    $el.children('p').each((__, p) => {
      const text = $(p).text().trim();
      if (/^Expediente:/i.test(text)) caseNumber = text.replace(/^Expediente:\s*/i, '');
      else if (/^Estado:/i.test(text)) statusText = text.replace(/^Estado:\s*/i, '');
      else description = text;
    });

    const statusMatch = statusText?.match(/^([^-]+)/);
    const endDateMatch = statusText?.match(/Conclusi[oó]n prevista:\s*([\d/]+\s+a las\s+[\d:]+)/i);

    const detailHref = $el.find('a.resultado-busqueda-link-defecto').attr('href') || '';
    const idSubMatch = detailHref.match(/idSub=([^&]+)/);
    const id = idSubMatch ? safeDecode(idSubMatch[1]) : idMatch[1];

    results.push({
      id,
      lots: lotsMatch ? parseInt(lotsMatch[1], 10) : 1,
      authority: authority || null,
      caseNumber,
      status: statusMatch ? statusMatch[1].trim() : null,
      expectedEndDate: endDateMatch ? endDateMatch[1] : null,
      description,
      detailUrl: `${BOE_DETAIL_URL}?idSub=${encodeURIComponent(id)}`,
      scrapedAt: new Date().toISOString(),
    });
  });

  const totalMatch = $('div.paginar p').first().text().match(/de\s+(\d+)/i);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : results.length;

  return { results, total };
}

// Devuelve el CONJUNTO COMPLETO de resultados para unos filtros dados (sin
// paginar). La paginación se aplica después, en la capa de servicio, sobre el
// resultado cacheado: así page/limit no fragmentan la caché ni multiplican las
// peticiones al BOE (antes cada página disparaba una búsqueda completa nueva).
export async function searchAuctions(filters) {
  const fields = buildSearchFields(filters);
  logger.info({ province: filters.province, status: filters.status, type: filters.type }, 'Searching auctions');

  // A través del limitador global compartido con el detalle: nunca más de
  // BOE_MAX_CONCURRENT_REQUESTS peticiones simultáneas al portal en total.
  const html = await boeLimit(() => postForm(BOE_SEARCH_URL, fields));
  const { results, total } = parseSearchResults(html);

  return {
    results: results.map(redactAuctionPii),
    total,
    metadata: {
      source: BOE_SEARCH_URL,
      scrapedAt: new Date().toISOString(),
    },
  };
}
