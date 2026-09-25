import { formatDate } from './utils';

const MONTH_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const MONTH_ONLY = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

/**
 * Renders a tournament's date range honouring `datePrecision`.
 *
 * A `MONTH` entry (the day was never announced) reads as month-year: "Nov 2026",
 * "Nov – Dec 2026" inside one year, or "Nov 2026 – Jan 2027" across years.
 * Everything else keeps the exact "Nov 1, 2026 – Dec 31, 2026" form.
 */
export function formatTournamentDates(
  startDate: Date | string,
  endDate: Date | string,
  precision?: string | null
): string {
  if (precision === 'MONTH') {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startLabel = MONTH_YEAR.format(start);
    const endLabel = MONTH_YEAR.format(end);
    if (startLabel === endLabel) return startLabel;
    // Same year: drop the repeated year from the opening month.
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
    return `${sameYear ? MONTH_ONLY.format(start) : startLabel} – ${endLabel}`;
  }
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}
