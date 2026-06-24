import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSearchResults } from '../src/scrapers/search.js';
import {
  parseGeneralTab,
  parseAuthorityTab,
  parseAssetsTab,
  parseBidsTab,
} from '../src/scrapers/detail.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(__dirname, 'fixtures', name), 'utf-8');

// Estos tests corren contra HTML REAL capturado de subastas.boe.es. Si el BOE
// cambia su estructura, fallan aquí antes de fallar en producción. Para
// refrescarlos: volver a descargar los fixtures y ajustar los valores esperados.

test('parseSearchResults: extrae todos los resultados de la página y el total', () => {
  const { results, total } = parseSearchResults(fixture('search_results.html'));
  assert.strictEqual(total, 85, 'total tomado de "Resultados 1 a 50 de 85"');
  assert.strictEqual(results.length, 50, 'la página captura page_hits=50 resultados');

  for (const r of results) {
    assert.match(r.id, /^SUB-[A-Z]{2}-\d{4}-/, 'cada resultado tiene un id de subasta válido');
    assert.ok(r.detailUrl.includes(encodeURIComponent(r.id)), 'detailUrl apunta al id');
  }
});

test('parseSearchResults: primer resultado AEAT (sin expediente)', () => {
  const { results } = parseSearchResults(fixture('search_results.html'));
  const first = results[0];
  assert.strictEqual(first.id, 'SUB-AT-2026-26R0886001165');
  assert.strictEqual(first.authority, 'U.R. SUBASTAS CATALUÑA - BARCELONA (AEAT)');
  assert.strictEqual(first.status, 'Celebrándose');
  assert.strictEqual(first.caseNumber, null, 'las subastas AEAT no traen nº de expediente');
  assert.ok(first.description.includes('CERCS'));
});

test('parseSearchResults: detecta subastas multi-lote y expediente judicial', () => {
  const { results } = parseSearchResults(fixture('search_results.html'));

  const multi = results.find((r) => r.id === 'SUB-JA-2026-263451');
  assert.ok(multi, 'existe la subasta multi-lote del fixture');
  assert.strictEqual(multi.lots, 2, 'se extrae "(2 lotes)" del título');

  const judicial = results.find((r) => r.id === 'SUB-JA-2026-261951');
  assert.strictEqual(judicial.caseNumber, '0168/20');
});

test('parseGeneralTab: campos económicos y fechas', () => {
  const g = parseGeneralTab(fixture('detail_general.html'));
  assert.strictEqual(g.auctionType, 'JUDICIAL EN VÍA DE APREMIO');
  assert.strictEqual(g.caseAccount, '2773 0000 06 0423 18');
  assert.strictEqual(g.startDate, '2026-06-23T18:00:00+02:00');
  assert.strictEqual(g.endDate, '2026-07-13T18:00:00+02:00');
  assert.strictEqual(g.claimedAmount, 504911.94);
  assert.strictEqual(g.auctionValue, 1395280.33);
  assert.strictEqual(g.bidIncrement, 27905.61);
  assert.strictEqual(g.publishedDeposit, 69764.02);
});

test('parseGeneralTab: tasación a 0 => métricas se basan en valor subasta y se marca', () => {
  const g = parseGeneralTab(fixture('detail_general.html'));
  assert.strictEqual(g.appraisalValue, null, 'Tasación "0,00 €" se normaliza a null');
  assert.strictEqual(g.metricsBasedOn, 'valorSubasta', 'transparencia sobre la base usada');
  // 70% / 50% / 5% sobre el valor de subasta (1.395.280,33)
  assert.strictEqual(g.reference70, 976696.23);
  assert.strictEqual(g.reference50, 697640.17);
  assert.strictEqual(g.deposit, 69764.02);
});

test('parseGeneralTab: extrae documentos enlazados', () => {
  const g = parseGeneralTab(fixture('detail_general.html'));
  assert.strictEqual(g.documents.length, 1);
  assert.ok(g.documents[0].title.includes('Certificación de dominio'));
  assert.ok(g.documents[0].url.includes('verDocumento.php'));
});

test('parseAuthorityTab: datos de contacto del órgano gestor', () => {
  const a = parseAuthorityTab(fixture('detail_autoridad.html'));
  assert.strictEqual(a.code, '0818441006');
  assert.strictEqual(a.name, 'Sección Civil e Instrucción TI Rubí. Plz.n 6');
  assert.strictEqual(a.address, 'CL PERE ESMENDIA 15 15 ; 08191 RUBI');
  assert.strictEqual(a.phone, '935880142');
  assert.strictEqual(a.email, 'sce.rubi@xij.gencat.cat');
});

test('parseAssetsTab: itera todos los bienes del lote', () => {
  const lots = parseAssetsTab(fixture('detail_bienes.html'));
  assert.strictEqual(lots.length, 1, 'un único lote en este fixture');
  assert.strictEqual(lots[0].assets.length, 70, 'las 70 plazas de aparcamiento');
  assert.ok(lots[0].description.includes('70 plazas de aparcamiento'));

  const asset = lots[0].assets[0];
  assert.ok(asset.label.startsWith('Bien 1'));
  assert.strictEqual(asset.province, 'Barcelona');
  assert.strictEqual(asset.locality, 'Sant Cugat del Vallés');
  assert.ok(asset.raw, 'conserva todos los campos crudos del bien');
});

test('parseBidsTab: subasta sin pujas', () => {
  const b = parseBidsTab(fixture('detail_pujas.html'));
  assert.strictEqual(b.totalBids, 0);
  assert.strictEqual(b.secret, false);
  assert.strictEqual(b.currentMaxBid, null);
  assert.deepStrictEqual(b.perLot, []);
});

test('parseBidsTab: maneja puja secreta y multi-lote sintéticos', () => {
  const secreta = parseBidsTab(
    '<div id="idBloqueDatos8"><p>La puja máxima de la subasta es secreta.</p></div>'
  );
  assert.strictEqual(secreta.secret, true);
  assert.strictEqual(secreta.currentMaxBid, null);

  const multiLote = parseBidsTab(
    `<div id="idBloqueDatos8"><table>
       <thead><tr><th>Lote</th><th>Importe</th></tr></thead>
       <tbody>
         <tr><td>1</td><td>Sin puja</td></tr>
         <tr><td>2</td><td>12.500,00 €</td></tr>
       </tbody></table></div>`
  );
  assert.strictEqual(multiLote.perLot.length, 2);
  assert.strictEqual(multiLote.perLot[0].amount, null);
  assert.strictEqual(multiLote.perLot[1].amount, 12500);
});
