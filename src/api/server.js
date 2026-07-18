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
  // Conjunto de secretos de gateway válidos: el de RapidAPI más los de otros
  // marketplaces (GATEWAY_EXTRA_SECRETS). Cada gateway autentica con el suyo.
  const validSecrets = new Set([env.rapidApiProxySecret, ...env.extraProxySecrets].filter(Boolean));

  // FAIL-CLOSED: en producción es obligatorio al menos un secreto. Sin él, la
  // API quedaría accesible a cualquiera que descubra la URL del túnel,
  // saltándose la facturación de los marketplaces. Antes esto "fallaba
  // abierto" (si el secreto faltaba, simplemente no se registraba la
  // verificación); ahora se rechaza el arranque para que un despliegue mal
  // configurado no exponga el servicio sin querer.
  if (env.nodeEnv === 'production' && validSecrets.size === 0) {
    throw new Error(
      'RAPIDAPI_PROXY_SECRET (o GATEWAY_EXTRA_SECRETS) es obligatorio en producción (protege la API tras el túnel). ' +
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

      // Se acepta la cabecera de RapidAPI o la genérica X-Gateway-Secret
      // (para otros marketplaces como Zyla, que definen sus propias cabeceras).
      const provided = request.headers['x-rapidapi-proxy-secret'] ?? request.headers['x-gateway-secret'];
      if (!provided || !validSecrets.has(provided)) {
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
