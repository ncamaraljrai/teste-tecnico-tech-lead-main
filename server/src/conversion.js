export const CONVERSION_STATUS = 1;

export function calculateConversionRate(converted, total) {
  if (!total) return 0;
  return Number(((converted / total) * 100).toFixed(2));
}