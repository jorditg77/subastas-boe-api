// Punto de entrada del Apify Actor. Se ejecuta en la infraestructura de Apify
// (no en el portátil doméstico): hace el scraping del BOE directamente y vuelca
// los resultados en el dataset de Apify.
//
// Reutiliza EXACTAMENTE los mismos scrapers del repo (src/scrapers), que ya
// están cubiertos por los tests contra fixtures. Las rutas de import son
// './src/...' porque el Dockerfile copia src/ junto a este main.js dentro del
// contenedor (ver .actor/Dockerfile).
import { Actor } from 'apify';
import { searchAuctions } from './src/scrapers/search.js';
import { getAuctionDetail } from './src/scrapers/detail.js';

await Actor.init();
try {
  const input = (await Actor.getInput()) ?? {};
  const { province, status, type = 'todos', maxResults = 100, includeDetails = false } = input;

  Actor.log.info('Searching Spain BOE auctions', { province, status, type });
  const { results, total } = await searchAuctions({ province, status, type });
  const selected = maxResults > 0 ? results.slice(0, maxResults) : results;
  Actor.log.info(`Found ${total} auctions; processing ${selected.length} (includeDetails=${includeDetails})`);

  if (!includeDetails) {
    // Listado rápido: una sola petición al BOE, resultados ya consolidados.
    if (selected.length) await Actor.pushData(selected);
  } else {
    // Detalle completo por subasta (más lento: varias peticiones por subasta,
    // serializadas por el limitador de concurrencia interno).
    let done = 0;
    for (const r of selected) {
      try {
        const detail = await getAuctionDetail(r.id);
        await Actor.pushData(detail);
      } catch (err) {
        Actor.log.warning(`Failed detail for ${r.id}: ${err.message}`);
        await Actor.pushData({ id: r.id, ...r, detailError: err.message });
      }
      if (++done % 10 === 0) Actor.log.info(`Processed ${done}/${selected.length}`);
    }
  }

  Actor.log.info('Finished');
} finally {
  await Actor.exit();
}
