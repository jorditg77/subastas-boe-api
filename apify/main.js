// Punto de entrada del Apify Actor. Se ejecuta en la infraestructura de Apify
// (no en el portátil): hace el scraping del BOE y vuelca los resultados en el
// dataset. Reutiliza los mismos scrapers del repo (src/scrapers), copiados
// junto a este archivo en el contenedor (ver .actor/Dockerfile).
//
// Los rastros usan console.log (escritura síncrona: no se pierden si el proceso
// termina rápido, a diferencia del logger con búfer de Apify).
import { Actor } from 'apify';

await Actor.init();
try {
  const input = (await Actor.getInput()) ?? {};

  const { searchAuctions } = await import('./src/scrapers/search.js');
  const { getAuctionDetail } = await import('./src/scrapers/detail.js');

  const { province, status, type = 'todos', maxResults = 100, includeDetails = false } = input;
  console.log('[actor] Searching Spain BOE auctions', JSON.stringify({ province, status, type }));

  const { results, total } = await searchAuctions({ province, status, type });
  const selected = maxResults > 0 ? results.slice(0, maxResults) : results;
  console.log(`[actor] Found ${total}; processing ${selected.length} (includeDetails=${includeDetails})`);

  if (!includeDetails) {
    if (selected.length) await Actor.pushData(selected);
  } else {
    let done = 0;
    for (const r of selected) {
      try {
        const detail = await getAuctionDetail(r.id);
        await Actor.pushData(detail);
      } catch (err) {
        console.error(`[actor] detail failed for ${r.id}: ${err.message}`);
        await Actor.pushData({ id: r.id, ...r, detailError: err.message });
      }
      if (++done % 10 === 0) console.log(`[actor] processed ${done}/${selected.length}`);
    }
  }

  console.log(`[actor] Done: ${selected.length} items pushed to the dataset`);
} catch (err) {
  console.error('[actor] FATAL:', err?.stack || err?.message || String(err));
  await Actor.exit({ exitCode: 1 });
}
await Actor.exit();
