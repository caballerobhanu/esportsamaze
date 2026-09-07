/* Client-side bookmark storage (localStorage) — no accounts needed.
   Only call these from client code. */

const KEY = 'ea-bookmarks';

export function getSavedSlugs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function isSaved(slug: string): boolean {
  return getSavedSlugs().includes(slug);
}

/** Toggle a bookmark; returns the new saved state. */
export function toggleSaved(slug: string): boolean {
  const list = getSavedSlugs();
  const next = list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list].slice(0, 200);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return next.includes(slug);
}
