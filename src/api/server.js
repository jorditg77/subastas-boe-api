import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { logger } from './middleware/logger.js';
import { env } from '../config/index.js';
import { healthRoutes } from './routes/health.js';
import { provincesRoutes } from './routes/provinces.js';
import { auctionsRoutes } from './routes/auctions.js';
import { errorHandler } from './middleware/errorHandler.js';

export async function buildServer() {
  const app = Fastify({
    loggerInstance: logger.child({ module: 'http' }),
    disableRequestLogging: env.nodeEnv === 'production',
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Subastas BOE API',
        description: 'Datos consolidados de subastas judiciales del BOE',
        version: '0.1.0',
      },
      servers: [{ url: '/' }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // Verificación del gateway de RapidAPI. RapidAPI inyecta una cabecera secreta
  // (X-RapidAPI-Proxy-Secret) en cada petición que reenvía al backend. Sin esta
  // comprobación, cualquiera que descubra la URL pública del túnel Cloudflare
  // podría consumir la API directamente, saltándose la facturación de RapidAPI.
  // Solo se exige en producción y si el secreto está configurado, para no
  // entorpecer el desarrollo local ni los tests.
  if (env.nodeEnv === 'production' && env.rapidApiProxySecret) {
    app.addHook('onRequest', async (request, reply) => {
      // /health queda exento para que los monitores de uptime (UptimeRobot)
      // puedan comprobar el servicio sin la cabecera.
      if (request.url === '/health' || request.url.startsWith('/health?')) return;

      const provided = request.headers['x-rapidapi-proxy-secret'];
      if (provided !== env.rapidApiProxySecret) {
        reply.code(401).send({ error: 'No autorizado', code: 'MISSING_PROXY_SECRET' });
      }
    });
  }

  app.setErrorHandler(errorHandler);

  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(provincesRoutes, { prefix: '/provinces' });
  await app.register(auctionsRoutes, { prefix: '/auctions' });

  return app;
}
