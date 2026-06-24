import { logger } from '../../api/middleware/logger.js';

// Documentos de identidad de personas físicas españolas.
// DNI: 8 dígitos + letra de control. NIE: X/Y/Z + 7 dígitos + letra de control.
// Sin flag `i` a propósito: los identificadores válidos van en mayúsculas, y
// usar `i` provocaría falsos positivos dentro de hashes/tokens en minúscula
// (p. ej. los idDoc hexadecimales de los enlaces a PDF del BOE).
const DNI_REGEX = /\b\d{8}[TRWAGMYFPDXBNJZSQVHLCKE]\b/g;
const NIE_REGEX = /\b[XYZ]\d{7}[TRWAGMYFPDXBNJZSQVHLCKE]\b/g;

// IBAN español (ES + 22 dígitos), tolerando espacios entre grupos.
const IBAN_REGEX = /\bES\d{2}(?:[ ]?\d{4}){5}\b/g;

// NOTA DE DISEÑO: deliberadamente NO se aplica ninguna heurística de
// "nombres propios en mayúsculas". Las páginas públicas de subastas.boe.es no
// exponen el nombre del deudor (queda tras inicio de sesión), por lo que ese
// tipo de heurística no redactaba PII real y, en cambio, destruía datos de
// altísimo valor del producto: direcciones ("CALLE DEL CARMEN"), topónimos
// ("PLAZA DEL PILAR") y marcas de vehículos ("MERCEDES BENZ"), porque coinciden
// con nombres de pila comunes. Aquí solo se redactan identificadores
// estructurados e inequívocos (DNI/NIE/IBAN).
export function redactPii(text) {
  if (!text || typeof text !== 'string') return text;

  return text
    .replace(NIE_REGEX, '[NIE REDACTED]')
    .replace(DNI_REGEX, '[DNI REDACTED]')
    .replace(IBAN_REGEX, '[IBAN REDACTED]');
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
