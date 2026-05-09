/**
 * @layer shared/utils
 * @description Utility functions for currency formatting.
 */

/**
 * Returns the currency symbol for a given currency code.
 * Supports PEN (Peruvian Sol) and USD (US Dollar).
 * Defaults to 'S/' if currency is null or unknown.
 */
export function getCurrencySymbol(currency: string | null | undefined): string {
  if (currency === 'USD') return 'USD';
  return 'S/';
}

/**
 * Formats a price with the appropriate currency symbol.
 * e.g. formatPrice(1500, 'PEN') → 'S/ 1,500'
 */
export function formatPrice(price: number | null | undefined, currency: string | null | undefined): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = (price ?? 0).toLocaleString('es-PE');
  return `${symbol} ${formatted}`;
}
