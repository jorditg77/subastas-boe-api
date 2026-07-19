// Punto de entrada del Apify Actor. Reutiliza los scrapers del repo
// (src/scrapers), copiados junto a este archivo en el contenedor (ver
// .actor/Dockerfile).
//
// DIAGNÓSTICO: se usa console.log/console.error (escritura síncrona, no se
// pierde si el proceso termina de golpe) en vez de Actor.log para los rastros,
// porque Actor.log va a un búfer que puede perderse en una salida abrupta.
// Los imports de los scrapers son dinámicos para poder capturar y mostrar un
// eventual error de resolución de módulo.
import { Actor } from 'apify';

console.log('[actor] boot: main.js iniciado');

await Actor.init();
console.log('[actor] Actor.init() completado');

try {
  console.log('[actor] leyendo input...');
  const input = (await Actor.getInput()) ?? {};
  console.log('[actor] input recibido:', JSON.stringify(input));

  console.log('[actor] importando scrapers...');
  const { searchAuctions } = await import('./src/scrapers/search.js');
  const { getAuctionDetail } = await import('./src/scrapers/detail.js');
  console.log('[actor] scrapers importados OK');

  const { province, status, type = 'todos', maxResults = 100, includeDetails = false } = input;
  console.log('[actor] buscando subastas', JSON.stringify({ province, status, type }));

  const { results, total } = await searchAuctions({ province, status, type });
  const selected = maxResults > 0 ? results.slice(0, maxResults) : results;
  console.log(`[actor] encontradas ${total}; procesando ${selected.length} (includeDetails=${includeDetails})`);

  if (!includeDetails) {
    if (selected.length) await Actor.pushData(selected);
  } else {
    let done = 0;
    for (const r of selected) {
      try {
        const detail = await getAuctionDetail(r.id);
        await Actor.pushData(detail);
      } catch (err) {
        console.error(`[actor] fallo en detalle ${r.id}: ${err.message}`);
        await Actor.pushData({ id: r.id, ...r, detailError: err.message });
      }
      if (++done % 10 === 0) console.log(`[actor] procesadas ${done}/${selected.length}`);
    }
  }

  console.log(`[actor] TERMINADO OK: ${selected.length} items en el dataset`);
} catch (err) {
  console.error('[actor] ERROR FATAL:', err?.stack || err?.message || String(err));
  await Actor.exit({ exitCode: 1 });
}
await Actor.exit();
