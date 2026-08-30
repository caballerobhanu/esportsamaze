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

export function fSocials(
  fd: FormData
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const key of SOCIAL_KEYS) {
    const v = fStr(fd, key);
    if (v) out[key] = v;
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
