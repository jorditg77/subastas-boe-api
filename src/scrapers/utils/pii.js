import { logger } from '../../api/middleware/logger.js';

// Regex para NIF/DNI/NIE españoles
const NIF_REGEX = /\b[XYZ]\d{7}[TRWAGMYFPDXBNJZSQVHLCKE]|[\dKLM]\d{7}[TRWAGMYFPDXBNJZSQVHLCKE]\b/gi;

// Lista reducida de nombres propios comunes para heurística
const COMMON_NAMES = new Set([
  'ANTONIO', 'MANUEL', 'JOSE', 'FRANCISCO', 'JUAN', 'CARLOS', 'PEDRO', 'JESUS',
  'MARIA', 'CARMEN', 'ANA', 'ISABEL', 'DOLORES', 'LAURA', 'MARTA', 'LUCIA',
  'JOSEFA', 'FRANCISCA', 'LUISA', 'PILAR', 'ROSARIO', 'MERCEDES', 'RAFAEL',
  'MIGUEL', 'ANGEL', 'DAVID', 'JAVIER', 'FERNANDO', 'LUIS', 'PABLO', 'SERGIO',
  'ANDRES', 'JORGE', 'ALBERTO', 'DANIEL', 'ALEJANDRO', 'ADRIAN', 'DIEGO',
]);

export function redactPii(text) {
  if (!text || typeof text !== 'string') return text;

  let redacted = text.replace(NIF_REGEX, '[NIF REDACTED]');

  // Heurística simple: nombres propios aislados en mayúsculas (no usado en descripciones de inmuebles)
  redacted = redacted.replace(/\b([A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,})+)\b/g, (match) => {
    const parts = match.split(/\s+/);
    const hasCommonName = parts.some((part) => COMMON_NAMES.has(part));
    if (hasCommonName && parts.length >= 2) return '[NAME REDACTED]';
    return match;
  });

  return redacted;
}

export function redactAuctionPii(auction) {
  try {
    const stringified = JSON.stringify(auction);
    const redacted = redactPii(stringified);
    return JSON.parse(redacted);
  } catch (err) {
    logger.error(err, 'Failed to redact PII');
    return auction;
  }
}
