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
