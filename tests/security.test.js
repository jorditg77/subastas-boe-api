import { test, before, after } from 'node:test';
import assert from 'node:assert';

// Fija un entorno de producción con secreto y rate limit bajo ANTES de que
// se cargue la config (env.js lee process.env en el primer import).
process.env.NODE_ENV = 'production';
process.env.RAPIDAPI_PROXY_SECRET = 'secreto-de-test-1234567890';
process.env.RATE_LIMIT_MAX = '5';
process.env.RATE_LIMIT_WINDOW_MS = '60000';

const { buildServer } = await import('../src/api/server.js');

let app;
before(async () => {
  app = await buildServer();
  await app.ready();
});
after(async () => {
  await app.close();
});

const SECRET = 'secreto-de-test-1234567890';

// Cada test usa una IP distinta (CF-Connecting-IP) para no compartir el cubo
// del rate limit y ser determinista.
function inject(url, headers = {}, ip = `10.0.0.${Math.floor(Math.random() * 250) + 1}`) {
  return app.inject({ method: 'GET', url, headers: { 'cf-connecting-ip': ip, ...headers } });
}

test('sin cabecera de secreto => 401', async () => {
  const res = await inject('/provinces');
  assert.strictEqual(res.statusCode, 401);
});

test('con secreto correcto (X-RapidAPI-Proxy-Secret) => 200', async () => {
  const res = await inject('/provinces', { 'x-rapidapi-proxy-secret': SECRET });
  assert.strictEqual(res.statusCode, 200);
});

test('con secreto correcto por cabecera genérica X-Gateway-Secret => 200', async () => {
  const res = await inject('/provinces', { 'x-gateway-secret': SECRET });
  assert.strictEqual(res.statusCode, 200);
});

test('secreto incorrecto => 401', async () => {
  const res = await inject('/provinces', { 'x-rapidapi-proxy-secret': 'incorrecto' });
  assert.strictEqual(res.statusCode, 401);
});

test('/health está exento de autenticación => 200', async () => {
  const res = await inject('/health');
  assert.strictEqual(res.statusCode, 200);
});

test('/docs NO está expuesto en producción => 404', async () => {
  const res = await inject('/docs', { 'x-rapidapi-proxy-secret': SECRET });
  assert.strictEqual(res.statusCode, 404);
});

test('rate limit: supera el máximo por IP y devuelve 429', async () => {
  const headers = { 'x-rapidapi-proxy-secret': SECRET };
  const ip = '203.0.113.77';
  const codes = [];
  for (let i = 0; i < 8; i++) {
    const res = await inject('/provinces', headers, ip);
    codes.push(res.statusCode);
  }
  // Con RATE_LIMIT_MAX=5, las primeras 5 pasan y el resto se corta con 429.
  assert.ok(codes.filter((c) => c === 200).length <= 5, 'no más de 5 respuestas OK');
  assert.ok(codes.includes(429), 'alguna petición fue limitada con 429');
});
