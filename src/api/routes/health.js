export async function healthRoutes(app) {
  app.get('/', async () => ({
    status: 'ok',
    service: 'subastas-boe-api',
    timestamp: new Date().toISOString(),
  }));
}
