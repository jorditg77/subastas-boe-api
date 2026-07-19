// Punto de entrada del Apify Actor. Se ejecuta en la infraestructura de Apify
// (no en el portátil): hace el scraping del BOE y vuelca los resultados en el
// dataset. Reutiliza los mismos scrapers del repo (src/scrapers), copiados
// junto a este archivo en el contenedor (ver .actor/Dockerfile).
//
// Los imports de los scrapers son DINÁMICOS a propósito: si por algún motivo el
// código no se copió a la imagen, el error aparece en el log del run (en vez de
// que el módulo falle al cargar en silencio antes de poder registrar nada).
import { Actor } from 'apify';

// Primer rastro, antes de nada: si esto no sale en el log, es que Apify no está
// ejecutando este main.js (problema de Dockerfile/arranque, no de la lógica).
console.log('[actor] boot: main.js iniciado');

await Actor.init();
try {
  const input = (await Actor.getInput()) ?? {};
  Actor.log.info('[actor] input recibido', input);

  const { searchAuctions } = await import('./src/scrapers/search.js');
  const { getAuctionDetail } = await import('./src/scrapers/detail.js');

  const { province, status, type = 'todos', maxResults = 100, includeDetails = false } = input;
  Actor.log.info('[actor] buscando subastas', { province, status, type });

  const { results, total } = await searchAuctions({ province, status, type });
  const selected = maxResults > 0 ? results.slice(0, maxResults) : results;
  Actor.log.info(`[actor] encontradas ${total}; procesando ${selected.length} (includeDetails=${includeDetails})`);

  if (!includeDetails) {
    if (selected.length) await Actor.pushData(selected);
  } else {
    let done = 0;
    for (const r of selected) {
      try {
        const detail = await getAuctionDetail(r.id);
        await Actor.pushData(detail);
      } catch (err) {
        Actor.log.warning(`[actor] fallo en detalle ${r.id}: ${err.message}`);
        await Actor.pushData({ id: r.id, ...r, detailError: err.message });
      }
      if (++done % 10 === 0) Actor.log.info(`[actor] procesadas ${done}/${selected.length}`);
    }
  }

  Actor.log.info(`[actor] terminado: ${selected.length} items en el dataset`);
} catch (err) {
  // Registra el error completo para poder diagnosticarlo desde el log del run.
  Actor.log.error(`[actor] error fatal: ${err?.stack || err?.message || err}`);
  throw err;
} finally {
  await Actor.exit();
}
