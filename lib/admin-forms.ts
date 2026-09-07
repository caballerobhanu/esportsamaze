// Shared FormData parsing helpers for admin server actions.

export function fStr(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim();
}

export function fOpt(fd: FormData, key: string): string | null {
  const v = fStr(fd, key);
  return v === '' ? null : v;
}

export function fDate(fd: FormData, key: string): Date | null {
  const v = fStr(fd, key);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fNum(fd: FormData, key: string): number | null {
  const v = fStr(fd, key);
  if (v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export const VALID_TOURNAMENT_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELED'] as const;
export type ValidTournamentStatus = (typeof VALID_TOURNAMENT_STATUSES)[number];

export function fTournamentStatus(
  fd: FormData,
  key: string,
  fallback?: ValidTournamentStatus
): ValidTournamentStatus | null {
  const raw = fStr(fd, key).toUpperCase();
  if ((VALID_TOURNAMENT_STATUSES as readonly string[]).includes(raw)) {
    return raw as ValidTournamentStatus;
  }
  return fallback ?? null;
}

export const VALID_MATCH_STATUSES = ['SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED'] as const;
export type ValidMatchStatus = (typeof VALID_MATCH_STATUSES)[number];

export function fMatchStatus(
  fd: FormData,
  key: string,
  fallback: ValidMatchStatus = 'SCHEDULED'
): ValidMatchStatus {
  const raw = fStr(fd, key).toUpperCase();
  if ((VALID_MATCH_STATUSES as readonly string[]).includes(raw)) {
    return raw as ValidMatchStatus;
  }
  return fallback;
}

export function sanitizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function fUrl(fd: FormData, key: string): string | null {
  return sanitizeUrl(fStr(fd, key));
}

const SOCIAL_KEYS = [
  'instagram',
  'twitter',
  'youtube',
  'discord',
  'facebook',
  'website',
  'kick',
  'twitch',
  'tiktok',
  'threads',
] as const;

const SOCIAL_DOMAIN_MAP: Record<string, string[]> = {
  instagram: ['instagram.com'],
  twitter: ['twitter.com', 'x.com'],
  youtube: ['youtube.com', 'youtu.be'],
  discord: ['discord.gg', 'discord.com'],
  facebook: ['facebook.com', 'fb.com'],
  kick: ['kick.com'],
  twitch: ['twitch.tv'],
  tiktok: ['tiktok.com'],
  threads: ['threads.net'],
};

export function sanitizeSocialValue(key: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Reject obvious script injection / javascript: / data:
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      const host = url.hostname.toLowerCase();
      const allowedDomains = SOCIAL_DOMAIN_MAP[key];
      if (allowedDomains) {
        const isAllowed = allowedDomains.some(
          (d) => host === d || host.endsWith('.' + d)
        );
        if (!isAllowed) return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  }

  // If it's a handle (e.g. @username or username), allow clean alphanumeric + common handle chars
  if (/^@?[a-zA-Z0-9._-]{1,60}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function fSocials(
  fd: FormData
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const key of SOCIAL_KEYS) {
    const raw = fStr(fd, key);
    if (!raw) continue;
    const clean = sanitizeSocialValue(key, raw);
    if (clean) out[key] = clean;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Returns a slug derived from `base` that passes the `isTaken` uniqueness check. */
export async function uniqueSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>
): Promise<string> {
  const { slugify } = await import('./utils');
  const clean = slugify(base) || `item-${Date.now()}`;
  let slug = clean;
  let i = 2;
  while (await isTaken(slug)) {
    slug = `${clean}-${i++}`;
  }
  return slug;
}

