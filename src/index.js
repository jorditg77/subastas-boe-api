import { buildServer } from './api/server.js';
import { env } from './config/index.js';
import { logger } from './api/middleware/logger.js';

// Red de seguridad: un rechazo de promesa o excepción no capturada no debe
// tumbar el proceso en silencio. Se registra; PM2 reinicia si el proceso
// realmente muere, pero la mayoría de estos casos (p. ej. un parseo raro del
// BOE) no deberían derribar el servidor entero.
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: reason?.message || reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.error(err, 'Uncaught exception');
});

async function start() {
  try {
    const app = await buildServer();
    await app.listen({ port: env.port, host: env.host });
    logger.info(`Server running on http://${env.host}:${env.port}`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
