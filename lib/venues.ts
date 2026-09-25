export interface VenueParts {
  name?: string | null;
  city?: string | null;
  country?: string | null;
}

/** The three things an event's location is known to, richest first. */
export type VenueLevel = 'VENUE' | 'CITY' | 'COUNTRY' | 'NONE';

/**
 * Which level a venue was entered at, read back from its own fields.
 *
 * A calendar often knows only the country, or only the city; a stadium name is a
 * bonus. The fields themselves say which, so nothing else has to record it.
 */
export function venueLevel(venue: VenueParts | null | undefined): VenueLevel {
  if (venue?.name?.trim()) return 'VENUE';
  if (venue?.city?.trim()) return 'CITY';
  if (venue?.country?.trim()) return 'COUNTRY';
  return 'NONE';
}

/**
 * The venue as a title plus a subtitle, degrading the same way the entry was
 * made: a named stadium with its city beneath, a city with its country, or a
 * country on its own (which has nothing left to put below it).
 */
export function venueLabel(venue: VenueParts | null | undefined): { title: string; subtitle: string | null } {
  const name = venue?.name?.trim() ?? '';
  const city = venue?.city?.trim() ?? '';
  const country = venue?.country?.trim() ?? '';

  if (name) return { title: name, subtitle: city || country || null };
  if (city) return { title: city, subtitle: country || null };
  return { title: country || 'TBA', subtitle: null };
}

/** The one-line "where" for a masthead: the name and city, or whichever one exists. */
export function venueLine(venue: VenueParts | null | undefined): string | null {
  const line = [venue?.name, venue?.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
  return line || venue?.country?.trim() || null;
}
