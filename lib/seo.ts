/* Site-wide SEO helpers: base URL, metadata defaults and JSON-LD builders. */

export const SITE_NAME = 'eSportsAmaze';

/** Durable positioning line. Lives in schema.org `slogan`, og alt text and socials. */
export const SITE_SLOGAN = 'Where Esports Lives.';

export function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  return process.env.NODE_ENV === 'production' ? 'https://esportsamaze.com' : 'http://localhost:3000';
}

export function absoluteUrl(path: string): string {
  return `${baseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Self-referencing canonical for entity, tab and hub routes.
 *
 * Tab routes deliberately canonicalise to themselves rather than to their
 * entity base: each tab answers a different query family (points table,
 * statistics, schedule, results, prize pool), so collapsing them would
 * forfeit those families. Use this on any route whose content is unique
 * to that URL. Strip volatile query params (`?date=`, `?board=`) before
 * passing the path.
 */
export function canonical(path: string) {
  return { alternates: { canonical: path } };
}

export interface DirectoryMetadataOptions {
  /** Route path without a query string, e.g. "/teams". */
  path: string;
  /** The route's searchParams. */
  params: Record<string, string | undefined>;
  /** Params that narrow the listing; any non-default value marks it filtered. */
  filterKeys: string[];
  /** Values that mean "no filter applied" for a given key (default: unset). */
  defaults?: Record<string, string>;
}

/**
 * Canonical and robots directives for a filterable directory page.
 *
 * A filtered view — a search box above all — is unbounded crawl space, so it is
 * kept out of the index while `follow` still passes crawlers through its links.
 * Pagination is not view state: it is a real page of the listing and
 * canonicalises to itself. Sorting is view state over the same set, so it never
 * reaches the canonical. This mirrors the treatment already used on /news.
 */
export function directoryMetadata({
  path,
  params,
  filterKeys,
  defaults = {},
}: DirectoryMetadataOptions) {
  const filtered = filterKeys.some((key) => {
    const current = (params[key] ?? '').trim();
    if (!current) return false;
    return current !== (defaults[key] ?? '');
  });

  const page = Math.max(1, Number(params.page) || 1);

  return {
    ...canonical(page > 1 ? `${path}?page=${page}` : path),
    ...(filtered ? { robots: { index: false as const, follow: true as const } } : {}),
  };
}

/**
 * Serialize a JSON-LD payload for a <script type="application/ld+json"> tag.
 * JSON.stringify leaves `<` unescaped, so any string containing `</script>`
 * (e.g. in an article title) would break out of the tag — escape it.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

const LOGO_PATH = '/logo.svg';

/* ── JSON-LD builders ───────────────────────────────────────────────────── */

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: baseUrl(),
    logo: absoluteUrl(LOGO_PATH),
    slogan: SITE_SLOGAN,
    sameAs: ['https://x.com/esportsamaze', 'https://www.instagram.com/esportsamaze'],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: baseUrl(),
    publisher: { '@type': 'Organization', name: SITE_NAME },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

/** ItemList of headlines for listing pages (homepage, /news hub). */
export function itemListJsonLd(articles: Array<{ slug: string; title: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: articles.map((article, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(`/news/${article.slug}`),
      name: article.title,
    })),
  };
}

export function faqPageJsonLd(faqs: Array<{ question: string; answer: string }>) {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export function newsArticleJsonLd(article: {
  slug: string;
  title: string;
  subHeadline?: string | null;
  excerpt: string | null;
  metaDescription?: string | null;
  coverImage: string | null;
  coverImageAlt?: string | null;
  ogImage?: string | null;
  category: string;
  tags: string[];
  secondaryKeywords?: string[];
  authorName: string;
  authorRole: string | null;
  publishedAt: Date;
  updatedAt: Date;
  readTimeMinutes: number;
  wordCount?: number;
}) {
  const image = article.ogImage || article.coverImage;
  const allKeywords = Array.from(
    new Set([...article.tags, ...(article.secondaryKeywords || [])].filter(Boolean))
  );
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    ...(article.subHeadline ? { alternativeHeadline: article.subHeadline } : {}),
    description: article.metaDescription || article.excerpt || undefined,
    ...(image
      ? {
          image: {
            '@type': 'ImageObject',
            url: image,
            ...(article.coverImageAlt ? { description: article.coverImageAlt } : {}),
          },
        }
      : {}),
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: [
      {
        '@type': 'Person',
        name: article.authorName,
        ...(article.authorRole ? { jobTitle: article.authorRole } : {}),
      },
    ],
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl(LOGO_PATH) },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/news/${article.slug}`) },
    articleSection: article.category,
    ...(allKeywords.length > 0 ? { keywords: allKeywords.join(', ') } : {}),
    ...(article.wordCount ? { wordCount: article.wordCount } : {}),
    inLanguage: 'en',
    isAccessibleForFree: true,
  };
}

/* ── Entity structured data ─────────────────────────────────────────────── */

/**
 * Media is stored either absolute (R2/CDN) or root-relative (`/uploads/…`),
 * so absolutise only the relative form.
 */
export function mediaUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : absoluteUrl(url);
}

const EVENT_STATUS: Record<string, string> = {
  UPCOMING: 'https://schema.org/EventScheduled',
  ONGOING: 'https://schema.org/EventScheduled',
  COMPLETED: 'https://schema.org/EventScheduled',
  CANCELED: 'https://schema.org/EventCancelled',
};

const EVENT_ATTENDANCE: Array<[RegExp, string]> = [
  [/hybrid/i, 'https://schema.org/MixedEventAttendanceMode'],
  [/online|remote/i, 'https://schema.org/OnlineEventAttendanceMode'],
  [/lan|offline|on-?ground/i, 'https://schema.org/OfflineEventAttendanceMode'],
];

function attendanceMode(eventType: string | null | undefined): string | undefined {
  if (!eventType) return undefined;
  return EVENT_ATTENDANCE.find(([pattern]) => pattern.test(eventType))?.[1];
}

export interface SportsEventVenue {
  name: string;
  city?: string | null;
  country?: string | null;
}

export interface SportsEventEntity {
  name: string;
  url?: string | null;
}

export interface SportsEventInput {
  name: string;
  slug: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status?: string | null;
  /** Free-text format label: "LAN", "Online", "Hybrid". */
  eventType?: string | null;
  /** Every venue the event is played at, in the order recorded. */
  venues?: SportsEventVenue[];
  /** Organizers, with the host's own website when one is recorded. */
  organizers?: SportsEventEntity[];
  imageUrl?: string | null;
  gameName?: string | null;
  /** Participating teams — emitted as both `competitor` and `performer`. */
  competitors?: SportsEventEntity[];
}

/**
 * Google asks for a day, not midnight, when the hour is not recorded:
 * "2026-05-06" rather than "2026-05-06T00:00:00.000Z".
 */
function eventDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface SportsEventPlaceJsonLd {
  '@type': 'Place';
  name: string;
  address?: {
    '@type': 'PostalAddress';
    addressLocality?: string;
    addressCountry?: string;
  };
}

export interface SportsEventJsonLd {
  '@context': string;
  '@type': 'SportsEvent';
  name: string;
  url: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: SportsEventPlaceJsonLd | SportsEventPlaceJsonLd[];
  organizer?: Array<{ '@type': 'Organization'; name: string; url?: string }>;
  eventStatus?: string;
  eventAttendanceMode?: string;
  sport: string;
  about?: { '@type': 'VideoGame'; name: string };
  image?: string;
  competitor?: Array<{ '@type': 'SportsTeam'; name: string }>;
  performer?: Array<{ '@type': 'SportsTeam'; name: string; url?: string }>;
}

/**
 * Google requires `location.address` and reads it to place the event, so the
 * city and country on file are carried through. No street address is recorded
 * in the schema, and a city-level address is what Google accepts for an event
 * without a well-defined location — an invented street would be worse.
 */
function eventPlace(venue: SportsEventVenue): SportsEventPlaceJsonLd {
  const address = {
    ...(venue.city ? { addressLocality: venue.city } : {}),
    ...(venue.country ? { addressCountry: venue.country } : {}),
  };

  return {
    '@type': 'Place',
    name: venue.name,
    ...(Object.keys(address).length > 0
      ? { address: { '@type': 'PostalAddress', ...address } }
      : {}),
  };
}

export function sportsEventJsonLd(event: SportsEventInput): SportsEventJsonLd {
  const url = absoluteUrl(`/tournaments/${event.slug}`);
  const status = event.status ? EVENT_STATUS[event.status] : undefined;
  const mode = attendanceMode(event.eventType);
  const venues = (event.venues ?? []).filter((venue) => venue.name);
  const competitors = event.competitors ?? [];

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    url,
    ...(event.description ? { description: event.description } : {}),
    ...(event.startDate ? { startDate: eventDay(event.startDate) } : {}),
    ...(event.endDate ? { endDate: eventDay(event.endDate) } : {}),
    // `location` is left out rather than guessed when no venue is recorded — an
    // invented place is worse than a missing one. An event played across
    // several venues carries one Place each.
    ...(venues.length === 1
      ? { location: eventPlace(venues[0]) }
      : venues.length > 1
        ? { location: venues.map(eventPlace) }
        : {}),
    ...(event.organizers && event.organizers.length > 0
      ? {
          organizer: event.organizers.map((organizer) => ({
            '@type': 'Organization',
            name: organizer.name,
            ...(organizer.url ? { url: organizer.url } : {}),
          })),
        }
      : {}),
    ...(status ? { eventStatus: status } : {}),
    ...(mode ? { eventAttendanceMode: mode } : {}),
    sport: 'Esports',
    ...(event.gameName ? { about: { '@type': 'VideoGame', name: event.gameName } } : {}),
    ...(event.imageUrl ? { image: mediaUrl(event.imageUrl) } : {}),
    // `competitor` is the SportsEvent property Google doesn't read; `performer`
    // is the one it does, so the same squad list feeds both. A SportsTeam is an
    // Organization on schema.org, which is what `performer` expects.
    ...(competitors.length > 0
      ? {
          competitor: competitors.map((entry) => ({ '@type': 'SportsTeam', name: entry.name })),
          performer: competitors.map((entry) => ({
            '@type': 'SportsTeam',
            name: entry.name,
            ...(entry.url ? { url: entry.url } : {}),
          })),
        }
      : {}),
  };
}

export interface SportsTeamInput {
  name: string;
  slug: string | null;
  tag?: string | null;
  displayName?: string | null;
  logoUrl?: string | null;
  region?: string | null;
  foundedYear?: number | null;
  members?: Array<{ name: string; slug: string | null; role?: string | null }>;
  sameAs?: string[];
}

export function sportsTeamJsonLd(team: SportsTeamInput) {
  const url = team.slug ? absoluteUrl(`/teams/${team.slug}`) : undefined;
  const alternateName = team.tag || team.displayName || undefined;
  const sameAs = (team.sameAs ?? []).filter(Boolean);
  const members = (team.members ?? []).map((member) => ({
    '@type': 'Person',
    name: member.name,
    ...(member.slug ? { url: absoluteUrl(`/players/${member.slug}`) } : {}),
    ...(member.role ? { jobTitle: member.role } : {}),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    ...(alternateName ? { alternateName } : {}),
    ...(url ? { url } : {}),
    ...(team.logoUrl ? { logo: mediaUrl(team.logoUrl) } : {}),
    sport: 'Esports',
    // `region` is free text ("India", "South Asia"), so it stays a plain string.
    ...(team.region ? { areaServed: team.region } : {}),
    ...(team.foundedYear ? { foundingDate: String(team.foundedYear) } : {}),
    ...(members.length > 0 ? { member: members } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export interface PlayerPersonInput {
  ign: string;
  slug: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  nationality?: string | null;
  role?: string | null;
  birthDate?: Date | null;
  teamName?: string | null;
  teamSlug?: string | null;
  sameAs?: string[];
}

export function personJsonLd(player: PlayerPersonInput) {
  const url = player.slug ? absoluteUrl(`/players/${player.slug}`) : undefined;
  const realName = [player.firstName, player.lastName].filter(Boolean).join(' ').trim();
  const sameAs = (player.sameAs ?? []).filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    // The in-game name is the identity people search for; the real name is the
    // alternate, never the reverse.
    name: player.ign,
    ...(realName ? { alternateName: realName } : {}),
    ...(url ? { url } : {}),
    ...(player.avatarUrl ? { image: mediaUrl(player.avatarUrl) } : {}),
    ...(player.nationality
      ? { nationality: { '@type': 'Country', name: player.nationality } }
      : {}),
    ...(player.role ? { jobTitle: player.role } : {}),
    ...(player.birthDate ? { birthDate: player.birthDate.toISOString().slice(0, 10) } : {}),
    ...(player.teamName
      ? {
          memberOf: {
            '@type': 'SportsTeam',
            name: player.teamName,
            ...(player.teamSlug ? { url: absoluteUrl(`/teams/${player.teamSlug}`) } : {}),
          },
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export interface RankedEntryInput {
  name: string;
  type: 'SportsTeam' | 'Person';
  url?: string | null;
}

/**
 * An ordered leaderboard (KRAFTON board, stage standings) as an ItemList —
 * position is meaningful here, unlike the news `itemListJsonLd`.
 */
export function rankedItemListJsonLd(entries: RankedEntryInput[], name: string) {
  if (!entries || entries.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: entries.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: entries.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': entry.type,
        name: entry.name,
        ...(entry.url ? { url: entry.url } : {}),
      },
    })),
  };
}
