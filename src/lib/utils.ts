import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ISO_FIAT_CODES = new Set([
  'MXN', 'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD',
  'CNY', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'INR', 'KRW',
]);

export function formatCurrency(
  value: number,
  currency: string = 'MXN',
  locale: string = 'es-MX',
): string {
  if (ISO_FIAT_CODES.has(currency)) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      /* fall through */
    }
  }
  const abs = Math.abs(value);
  const decimals = abs < 1 ? 6 : abs < 100 ? 4 : 2;
  const num = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${num} ${currency}`;
}

export function formatCompact(value: number, locale: string = 'es-MX'): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, locale: string = 'es-MX'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}
