// El portal del BOE representa casi todos sus bloques de datos (General,
// Autoridad, cada Bien) como una tabla <th>Etiqueta</th><td>Valor</td>.
// Este parser genérico evita repetir selectores ad-hoc por cada campo.
export function parseKeyValueTable($, table) {
  const data = {};
  $(table)
    .find('> tbody > tr, > tr')
    .each((_, row) => {
      const $row = $(row);
      const label = $row.find('th').first().text().trim();
      const value = $row.find('td').first().text().trim().replace(/\s+/g, ' ');
      if (label) data[label] = value;
    });
  return data;
}

// Varios campos de fecha del BOE incluyen el ISO 8601 entre paréntesis,
// ej. "23-06-2026 18:00:00 CET  (ISO: 2026-06-23T18:00:00+02:00)".
export function extractIsoDate(text) {
  if (!text) return null;
  const match = text.match(/ISO:\s*([\d-]+T[\d:+-]+)/);
  return match ? match[1] : null;
}
