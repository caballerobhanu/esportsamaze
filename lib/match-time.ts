/**
 * Time-of-day parsing shared by every surface that accepts a kick-off time.
 *
 * The admin match form and the bulk importers must agree on what a time string
 * means: "1400" (the 4-digit military form a spreadsheet exports) is 14:00, not
 * an unreadable token that silently falls back to a default. Keeping one parser
 * here is what stops a pasted fixture and a hand-typed one from disagreeing.
 *
 * Returns 24-hour `HH:MM`, or null when the string carries no readable time.
 */
export function parseTimeTo24h(timeStr?: string | null): string | null {
  if (!timeStr) return null;
  const s = timeStr.trim();

  // 1. Check 12-hour format with AM/PM e.g. "04:20 PM" or "4:20pm" or "4 PM"
  const ampmMatch = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPm = ampmMatch[3].toLowerCase() === 'pm';
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // 2. Check 24-hour format with colon e.g. "16:20" or "16:20 IST"
  const colonMatch = s.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  // 3. Check 4-digit military format e.g. "1620" or "1620 IST" or "0930"
  const fourDigitMatch = s.match(/\b(\d{2})(\d{2})\b/);
  if (fourDigitMatch) {
    const hours = parseInt(fourDigitMatch[1], 10);
    const minutes = parseInt(fourDigitMatch[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Minutes ahead of UTC for the timezone codes a match sheet may name.
 *
 * Lives here beside the time parser so booking a fixture and repairing one can
 * never apply different offsets — the two used to hold separate copies.
 */
export const TIMEZONE_OFFSET_MINUTES: Record<string, number> = {
  IST: 330, // UTC+5:30
  AST: 180, // UTC+3:00
  GST: 240, // UTC+4:00
  BST: 360, // UTC+6:00
  PKT: 300, // UTC+5:00
  NPT: 345, // UTC+5:45
  SGT: 480, // UTC+8:00
  MYT: 480, // UTC+8:00
  PHT: 480, // UTC+8:00
  ICT: 420, // UTC+7:00
  WIB: 420, // UTC+7:00
  KST: 540, // UTC+9:00
  JST: 540, // UTC+9:00
  CST: 480, // UTC+8:00
  HKT: 480, // UTC+8:00
  GMT: 0,
  UTC: 0,
  CET: 60,
  CEST: 120,
  EST: -300,
  EDT: -240,
  PST: -480,
  PDT: -420,
};

/** Offset for a timezone code, falling back to IST — the editor's default zone. */
export function timezoneOffsetMinutes(code?: string | null): number {
  return TIMEZONE_OFFSET_MINUTES[String(code || '').trim().toUpperCase()] ?? 330;
}

/** The trailing timezone code of a stored `matchTime` (e.g. "1600 IST" → "IST"). */
export function timezoneCodeFromMatchTime(matchTime?: string | null): string {
  const found = String(matchTime || '').trim().match(/([A-Za-z]{2,5})\s*$/);
  return found ? found[1].toUpperCase() : 'IST';
}

/** Overrides for the viewer-facing formatters; tests pin these, callers don't. */
export interface KickoffFormatOptions {
  /** BCP-47 tag. Left undefined, the runtime's own locale is used. */
  locale?: string;
  /** IANA zone. Left undefined, the runtime's own zone is used — the point of these. */
  timeZone?: string;
  /** Include the year, for prose that names a full date. */
  withYear?: boolean;
}

/**
 * A kick-off time in the viewer's own timezone, with the zone named so the figure
 * cannot be misread.
 *
 * The instant we store is absolute UTC, so this is display only. Leaving `timeZone`
 * undefined is what makes a visitor in the US read their own local time instead of
 * having to convert from IST.
 */
export function formatKickoffTime(date: Date, options: KickoffFormatOptions = {}): string {
  return new Intl.DateTimeFormat(options.locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
}

/**
 * The calendar day a kick-off falls on in the viewer's own timezone.
 *
 * Paired with `formatKickoffTime` so a late-evening IST match cannot be shown with
 * one day's date and the next day's local time. Month and day by default, matching
 * the compact meta line it usually sits in.
 */
export function formatKickoffDate(date: Date, options: KickoffFormatOptions = {}): string {
  return new Intl.DateTimeFormat(options.locale, {
    month: 'short',
    day: 'numeric',
    ...(options.withYear ? { year: 'numeric' } : {}),
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(date);
}
