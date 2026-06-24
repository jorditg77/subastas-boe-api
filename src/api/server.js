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
    logger: logger.child({ module: 'http' }),
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

  app.setErrorHandler(errorHandler);

  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(provincesRoutes, { prefix: '/provinces' });
  await app.register(auctionsRoutes, { prefix: '/auctions' });

  return app;
}
