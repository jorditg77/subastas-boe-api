import { test } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { buildMcpServer } from '../src/mcp/runtime.js';
import { TOOLS, listProvincesTool, calculateAuctionMetricsTool, searchAuctionsTool, getAuctionDetailTool } from '../src/mcp/tools.js';

test('buildMcpServer registra las 4 tools sin lanzar', () => {
  const server = buildMcpServer();
  for (const tool of TOOLS) {
    assert.ok(server.server, 'el servidor subyacente existe');
  }
  assert.strictEqual(TOOLS.length, 4);
  assert.deepStrictEqual(
    TOOLS.map((t) => t.name),
    ['search_auctions', 'get_auction_detail', 'calculate_auction_metrics', 'list_provinces']
  );
});

test('cada tool tiene título, descripción y esquema de entrada', () => {
  for (const tool of TOOLS) {
    assert.ok(tool.config.title, `${tool.name} sin título`);
    assert.ok(tool.config.description, `${tool.name} sin descripción`);
    assert.ok(tool.config.inputSchema !== undefined, `${tool.name} sin inputSchema`);
  }
});

test('list_provinces: devuelve las 52 provincias sin tocar la red', async () => {
  const result = await listProvincesTool.handler();
  const payload = JSON.parse(result.content[0].text);
  assert.strictEqual(payload.provinces.length, 52);
  assert.ok(payload.provinces.some((p) => p.code === '08' && p.name === 'Barcelona'));
});

test('calculate_auction_metrics: calcula los umbrales legales', async () => {
  const result = await calculateAuctionMetricsTool.handler({ value: 100000 });
  const payload = JSON.parse(result.content[0].text);
  assert.strictEqual(payload.reference70, 70000);
  assert.strictEqual(payload.reference50, 50000);
  assert.strictEqual(payload.deposit, 5000);
});

test('calculate_auction_metrics: rechaza valores no positivos según el esquema', () => {
  const schema = z.object(calculateAuctionMetricsTool.config.inputSchema);
  assert.throws(() => schema.parse({ value: -5 }));
  assert.throws(() => schema.parse({ value: 0 }));
  assert.doesNotThrow(() => schema.parse({ value: 1 }));
});

test('search_auctions: el esquema valida provincia y aplica defaults', () => {
  const schema = z.object(searchAuctionsTool.config.inputSchema);
  assert.throws(() => schema.parse({ province: 'Madrid' }), 'rechaza provincia no numérica de 2 dígitos');
  const parsed = schema.parse({ province: '28' });
  assert.strictEqual(parsed.page, 1);
  assert.strictEqual(parsed.limit, 50);
});

test('get_auction_detail: el esquema valida el formato del id', () => {
  const schema = z.object(getAuctionDetailTool.config.inputSchema);
  assert.throws(() => schema.parse({ id: 'cualquier-cosa' }));
  assert.doesNotThrow(() => schema.parse({ id: 'SUB-JA-2026-262574' }));
});
