import { buildServer } from './api/server.js';
import { env } from './config/index.js';
import { logger } from './api/middleware/logger.js';

async function start() {
  try {
    const app = await buildServer();
    await app.listen({ port: env.port, host: '0.0.0.0' });
    logger.info(`Server running on http://0.0.0.0:${env.port}`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
