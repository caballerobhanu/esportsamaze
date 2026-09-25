import { getCurrencyUsdRate, hasCurrencyUsdRate } from '@/lib/tournament-math';
import { CURRENCY_SYMBOLS, currencyCodeSuffix } from '@/lib/utils';

// Common Timezone to Currency Mapping (Instant, 0ms, zero network requests)
const TIMEZONE_TO_CURRENCY: Record<string, string> = {
  // South Asia
  'Asia/Karachi': 'PKR',
  'Asia/Kolkata': 'INR',
  'Asia/Calcutta': 'INR',
  'Asia/Dhaka': 'BDT',
  'Asia/Kathmandu': 'NPR',
  'Asia/Colombo': 'LKR',

  // Middle East
  'Asia/Riyadh': 'SAR',
  'Asia/Dubai': 'AED',
  'Asia/Qatar': 'QAR',
  'Asia/Kuwait': 'KWD',
  'Asia/Bahrain': 'BHD',
  'Asia/Muscat': 'OMR',

  // Southeast Asia
  'Asia/Bangkok': 'THB',
  'Asia/Jakarta': 'IDR',
  'Asia/Makassar': 'IDR',
  'Asia/Jayapura': 'IDR',
  'Asia/Kuala_Lumpur': 'MYR',
  'Asia/Singapore': 'SGD',
  'Asia/Manila': 'PHP',
  'Asia/Ho_Chi_Minh': 'VND',

  // East Asia
  'Asia/Tokyo': 'JPY',
  'Asia/Seoul': 'KRW',
  'Asia/Shanghai': 'CNY',
  'Asia/Hong_Kong': 'HKD',
  'Asia/Taipei': 'TWD',
  'Asia/Ulaanbaatar': 'MNT',
  'Asia/Almaty': 'KZT',
  'Asia/Tashkent': 'UZS',

  // Americas
  'America/New_York': 'USD',
  'America/Chicago': 'USD',
  'America/Denver': 'USD',
  'America/Los_Angeles': 'USD',
  'America/Toronto': 'CAD',
  'America/Vancouver': 'CAD',
  'America/Sao_Paulo': 'BRL',
  'America/Mexico_City': 'MXN',

  // Europe
  'Europe/London': 'GBP',
  'Europe/Berlin': 'EUR',
  'Europe/Paris': 'EUR',
  'Europe/Rome': 'EUR',
  'Europe/Madrid': 'EUR',
  'Europe/Amsterdam': 'EUR',
  'Europe/Brussels': 'EUR',
  'Europe/Vienna': 'EUR',
  'Europe/Stockholm': 'SEK',
  'Europe/Oslo': 'NOK',
  'Europe/Copenhagen': 'DKK',
  'Europe/Warsaw': 'PLN',
  'Europe/Zurich': 'CHF',
  'Europe/Istanbul': 'TRY',
  'Europe/Moscow': 'RUB',

  // Oceania & Africa
  'Australia/Sydney': 'AUD',
  'Australia/Melbourne': 'AUD',
  'Australia/Brisbane': 'AUD',
  'Pacific/Auckland': 'NZD',
  'Africa/Cairo': 'EGP',
  'Africa/Johannesburg': 'ZAR',
};

/**
 * Detects visitor's local currency code instantly from their browser timezone.
 */
export function getVisitorLocalCurrency(): string {
  if (typeof window === 'undefined') return 'USD';

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_CURRENCY[tz]) {
      return TIMEZONE_TO_CURRENCY[tz];
    }
  } catch {
    // Fallback to USD
  }

  return 'USD';
}

/**
 * The currency to show beside an event's own.
 *
 * It is the visitor's own currency — except when that is the event's, where USD
 * stands in (an Indian reading an INR event wants the dollar figure), and when
 * the event is already in USD an American has nothing left to compare against.
 *
 *   event INR + visitor INR → USD      event USD + visitor INR → INR
 *   event INR + visitor USD → USD      event USD + visitor USD → none
 */
export function secondaryCurrencyFor(eventCurrency: string, visitorCurrency: string): string | null {
  const base = (eventCurrency || 'USD').toUpperCase();
  const local = (visitorCurrency || 'USD').toUpperCase();

  const preferred = local !== base ? local : base === 'USD' ? null : 'USD';
  if (!preferred) return null;
  if (preferred === 'USD' || hasCurrencyUsdRate(preferred)) return preferred;

  // The rate table cannot convert `preferred`, and an unconverted number is
  // worse than none; USD is always safe.
  return base === 'USD' ? null : 'USD';
}

/**
 * Formats a prize pool amount into a specific currency — symbol and digits
 * ("₹1,23,456"), never a trailing code unless the symbol alone is ambiguous
 * (`¥3,000,000 CNY`, because ¥ is also the yen).
 */
export function formatAmountInCurrency(usdAmount: number, targetCurrency: string): string {
  const code = (targetCurrency || 'USD').toUpperCase();
  const rate = getCurrencyUsdRate(code); // 1 Foreign Currency in USD
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;

  // Converted amount = usdAmount / rate
  const localVal = rate > 0 ? Math.round(usdAmount / rate) : usdAmount;

  const locale =
    code === 'INR' ? 'en-IN' :
    code === 'PKR' ? 'en-PK' :
    code === 'BDT' ? 'en-BD' :
    'en-US';

  return `${symbol}${localVal.toLocaleString(locale)}${currencyCodeSuffix(code)}`;
}
