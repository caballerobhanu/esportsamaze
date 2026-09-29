/**
 * Cache tags for the shared read model — settings, games, home curation.
 *
 * Kept free of imports so an admin action can pull a tag without dragging Prisma
 * into its module graph, the same reason `TEAM_PROFILE_CACHE_TAG` lives in the
 * Prisma-free `lib/team-stats.ts`.
 *
 * The rule for anything cached under these tags: every write path must purge the
 * tag, or the value goes quietly stale. There is no build-time check for a
 * forgotten purge, which is why each tag below has exactly one owning module —
 * the reads and the invalidation sit next to each other.
 */

/** `lib/site-settings.ts` — branding, maintenance and view-count settings. */
export const SITE_SETTINGS_TAG = 'site-settings';

/** `lib/game-queries.ts` — the game and game-family lookups. */
export const GAMES_TAG = 'games';

/** `lib/home-curation.ts` — the home page's curated article lists. */
export const HOME_CURATION_TAG = 'home-curation';
