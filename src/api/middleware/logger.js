import pino from 'pino';
import { env } from '../../config/index.js';

export const logger = pino({
  level: env.logLevel,
  transport: env.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
});
