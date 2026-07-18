import { timingSafeEqual } from 'node:crypto';
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { logger } from './middleware/logger.js';
import { env } from '../config/index.js';
import { healthRoutes } from './routes/health.js';
import { provincesRoutes } from './routes/provinces.js';
import { auctionsRoutes } from './routes/auctions.js';
import { errorHandler } from './middleware/errorHandler.js';

// Comparación en tiempo constante: evita que un atacante deduzca el secreto
// midiendo cuánto tarda el rechazo (timing attack). Las longitudes distintas
// se descartan sin comparar bytes (no filtra la longitud del secreto real).
function secretMatches(provided, validSecrets) {
  if (typeof provided !== 'string' || provided.length === 0) return false;
  const providedBuf = Buffer.from(provided);
  for (const secret of validSecrets) {
    const secretBuf = Buffer.from(secret);
    if (secretBuf.length === providedBuf.length && timingSafeEqual(secretBuf, providedBuf)) {
      return true;
    }
  }
  return false;
}

// IP real del cliente detrás del túnel: Cloudflare la inyecta en
// CF-Connecting-IP. Sin esto, todas las peticiones parecerían venir de
// localhost (cloudflared) y el rate limit las agruparía en un único cubo.
function clientIp(request) {
  return request.headers['cf-connecting-ip'] || request.ip;
}

export async function buildServer() {
  // Conjunto de secretos de gateway válidos: el de RapidAPI más los de otros
  // marketplaces (GATEWAY_EXTRA_SECRETS). Cada gateway autentica con el suyo.
  const validSecrets = [env.rapidApiProxySecret, ...env.extraProxySecrets].filter(Boolean);

  // FAIL-CLOSED: en producción es obligatorio al menos un secreto. Sin él, la
  // API quedaría accesible a cualquiera que descubra la URL del túnel,
  // saltándose la facturación de los marketplaces.
  if (env.nodeEnv === 'production' && validSecrets.length === 0) {
    throw new Error(
      'RAPIDAPI_PROXY_SECRET (o GATEWAY_EXTRA_SECRETS) es obligatorio en producción (protege la API tras el túnel). ' +
        'Configúralo en .env, o usa NODE_ENV=development para pruebas locales.'
    );
  }

  const app = Fastify({
    loggerInstance: logger.child({ module: 'http' }),
    disableRequestLogging: env.nodeEnv === 'production',
  });

  // Techo de protección del servidor: límite por IP real (CF-Connecting-IP).
  // No sustituye a la cuota del marketplace; es una red de seguridad ante
  // abuso directo del backend.
  await app.register(rateLimit, {
    max: env.rateLimit.max,
    timeWindow: env.rateLimit.windowMs,
    keyGenerator: clientIp,
  });

  // Verificación del gateway. RapidAPI/Zyla inyectan una cabecera secreta en
  // cada petición que reenvían. Se registra ANTES que las rutas para cubrir
  // todo; solo /health queda exento para los monitores de uptime.
  if (env.nodeEnv === 'production') {
    app.addHook('onRequest', async (request, reply) => {
      if (request.url === '/health' || request.url.startsWith('/health?')) return;

      const provided = request.headers['x-rapidapi-proxy-secret'] ?? request.headers['x-gateway-secret'];
      if (!secretMatches(provided, validSecrets)) {
        return reply.code(401).send({ error: 'No autorizado', code: 'MISSING_PROXY_SECRET' });
      }
    });
  }

  // Swagger UI solo en desarrollo: en producción no aporta a los clientes
  // (consumen la documentación en el marketplace) y reduce superficie de
  // ataque. El OpenAPI publicable vive en docs/openapi.json.
  if (env.nodeEnv !== 'production') {
    const swagger = (await import('@fastify/swagger')).default;
    const swaggerUi = (await import('@fastify/swagger-ui')).default;
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
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }

  app.setErrorHandler(errorHandler);

  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(provincesRoutes, { prefix: '/provinces' });
  await app.register(auctionsRoutes, { prefix: '/auctions' });

  return app;
}
