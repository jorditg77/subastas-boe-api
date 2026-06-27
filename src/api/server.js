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
  // FAIL-CLOSED: en producción el secreto del proxy es obligatorio. Sin él, la
  // API quedaría accesible a cualquiera que descubra la URL del túnel,
  // saltándose la facturación de RapidAPI. Antes esto "fallaba abierto" (si el
  // secreto faltaba, simplemente no se registraba la verificación); ahora se
  // rechaza el arranque para que un despliegue mal configurado no exponga el
  // servicio sin querer.
  if (env.nodeEnv === 'production' && !env.rapidApiProxySecret) {
    throw new Error(
      'RAPIDAPI_PROXY_SECRET es obligatorio en producción (protege la API tras el túnel). ' +
        'Configúralo en .env, o usa NODE_ENV=development para pruebas locales.'
    );
  }

  const app = Fastify({
    loggerInstance: logger.child({ module: 'http' }),
    disableRequestLogging: env.nodeEnv === 'production',
  });

  // Verificación del gateway de RapidAPI. RapidAPI inyecta una cabecera secreta
  // (X-RapidAPI-Proxy-Secret) en cada petición que reenvía al backend. Se
  // registra ANTES que Swagger y las rutas para que la comprobación cubra TODO
  // (incluido /docs) de forma predecible; solo /health queda exento para que
  // los monitores de uptime (UptimeRobot) puedan comprobar el servicio.
  if (env.nodeEnv === 'production') {
    app.addHook('onRequest', async (request, reply) => {
      if (request.url === '/health' || request.url.startsWith('/health?')) return;

      const provided = request.headers['x-rapidapi-proxy-secret'];
      if (provided !== env.rapidApiProxySecret) {
        return reply.code(401).send({ error: 'No autorizado', code: 'MISSING_PROXY_SECRET' });
      }
    });
  }

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
