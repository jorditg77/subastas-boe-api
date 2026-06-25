export function calculateAuctionMetrics(auctionValue) {
  if (!auctionValue || auctionValue <= 0) {
    return {
      reference70: null,
      reference50: null,
      deposit: null,
    };
  }

  return {
    reference70: Math.round(auctionValue * 0.7 * 100) / 100,
    reference50: Math.round(auctionValue * 0.5 * 100) / 100,
    deposit: Math.round(auctionValue * 0.05 * 100) / 100,
  };
}

// El 50%/70% NO son dos referencias intercambiables: en una subasta JUDICIAL
// sin postores, el art. 671 LEC fija qué umbral aplica realmente según si el
// bien es la vivienda habitual del deudor (dato que el propio BOE publica por
// bien, campo "Vivienda habitual"): 70% si lo es, 50% si no. Para subastas no
// judiciales (AEAT, notariales, administrativas) esa regla no es aplicable
// sin más —siguen otra normativa— así que aquí no se determina un umbral por
// no tener certeza suficiente para afirmarlo en un producto comercial.
// Esto NO es asesoramiento legal: es una orientación basada en una regla
// general y en un dato que el propio portal publica; debe verificarse con un
// profesional antes de cualquier decisión de inversión.
export function determineApplicableThreshold({ reference50, reference70 }, { isJudicial, isViviendaHabitual }) {
  if (!isJudicial) {
    return {
      value: null,
      basis: null,
      note: 'No determinado: la regla del 50%/70% (art. 671 LEC) aplica a subastas judiciales; este procedimiento sigue otra normativa.',
    };
  }

  if (isViviendaHabitual === null || isViviendaHabitual === undefined) {
    return {
      value: null,
      basis: null,
      note: 'No se ha podido determinar si el bien es vivienda habitual del deudor.',
    };
  }

  return isViviendaHabitual
    ? { value: reference70, basis: 'reference70', note: 'Vivienda habitual del deudor: umbral del 70% (art. 671 LEC).' }
    : { value: reference50, basis: 'reference50', note: 'No es vivienda habitual: umbral del 50% (art. 671 LEC).' };
}

export function parseCurrency(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;

  const cleaned = value
    .replace(/[\.,](?=\d{3})/g, '') // puntos separadores de miles
    .replace(/,/g, '.') // coma decimal a punto
    .replace(/[^\d.-]/g, ''); // eliminar símbolos

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}
