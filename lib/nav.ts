/**
 * The tab segment of a profile/tournament URL.
 *
 * Routes are game-scoped now, so the shape is either
 * `/<section>/<slug>/<tab>` (legacy) or `/<game>/<section>/<slug>/<tab>`; the
 * base route is the overview. Used by the profile tab docks and the tournament
 * edition switcher, which live in a layout and therefore cannot receive the
 * active tab as a prop.
 */
const SECTIONS = new Set(['tournaments', 'teams', 'players', 'rankings']);

export function activeTabFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  // `/bgmi/teams/soul/stats` → section at index 1; `/teams/soul/stats` → index 0.
  const sectionIdx = SECTIONS.has(segments[0]) ? 0 : 1;
  return segments[sectionIdx + 2] ?? 'overview';
}
