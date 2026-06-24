import { fetch, Agent } from 'undici';
import { USER_AGENT } from '../../config/constants.js';
import { env } from '../../config/index.js';
import { logger } from '../../api/middleware/logger.js';

const dispatcher = new Agent({
  connect: {
    rejectUnauthorized: true,
  },
});

export async function fetchHtml(url, options = {}) {
  const { retries = env.boe.retryAttempts, backoff = env.boe.retryBackoffMs } = options;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = backoff * Math.pow(2, attempt - 1);
        logger.info({ attempt, delay, url }, 'Retrying fetch');
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetch(url, {
        dispatcher,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Accept-Encoding': 'identity',
          'Connection': 'keep-alive',
        },
      });

      if (response.status === 429) {
        throw new Error(`Rate limited: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (err) {
      lastError = err;
      logger.warn({ attempt, url, error: err.message }, 'Fetch failed');
    }
  }

  throw new Error(`Failed to fetch ${url} after ${retries + 1} attempts: ${lastError.message}`);
}

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
