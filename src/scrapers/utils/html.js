import { fetch, Agent } from 'undici';
import { USER_AGENT } from '../../config/constants.js';
import { env } from '../../config/index.js';
import { logger } from '../../api/middleware/logger.js';

const dispatcher = new Agent({
  connect: {
    rejectUnauthorized: true,
  },
});

const DEFAULT_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9',
  'Accept-Encoding': 'identity',
  'Connection': 'keep-alive',
};

async function requestWithRetry(url, fetchOptions, retryOptions = {}) {
  const { retries = env.boe.retryAttempts, backoff = env.boe.retryBackoffMs } = retryOptions;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = backoff * Math.pow(2, attempt - 1);
        logger.info({ attempt, delay, url }, 'Retrying request');
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetch(url, { dispatcher, ...fetchOptions });

      if (response.status === 429) {
        throw new Error(`Rate limited: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (err) {
      lastError = err;
      logger.warn({ attempt, url, error: err.message }, 'Request failed');
    }
  }

  throw new Error(`Failed to fetch ${url} after ${retries + 1} attempts: ${lastError.message}`);
}

export async function fetchHtml(url, options = {}) {
  return requestWithRetry(url, { headers: DEFAULT_HEADERS }, options);
}

// El formulario de búsqueda avanzada del BOE (subastas_ava.php) solo
// responde con resultados a un POST application/x-www-form-urlencoded;
// un GET con los mismos parámetros devuelve el formulario vacío.
export async function postForm(url, fields, options = {}) {
  const body = new URLSearchParams(fields).toString();
  return requestWithRetry(
    url,
    {
      method: 'POST',
      headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body,
    },
    options
  );
}

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
