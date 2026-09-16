import { revalidatePath, revalidateTag } from 'next/cache';

import { TEAM_PROFILE_CACHE_TAG } from '@/lib/team-stats';

const TAB_SEGMENTS = ['standings', 'matches', 'progression', 'format', 'teams', 'prizepool', 'statistics'];

/**
 * Revalidates the tournaments list and every tab route of one tournament.
 *
 * - With a slug: revalidates that tournament's base + tab routes precisely.
 * - Without a slug: revalidates the dynamic route patterns so every
 *   tournament's cached pages rebuild on next request. Mutation sites that
 *   only know a tournamentId use this form.
 *
 * Every mutation that can change a tournament page (scorecards, matches,
 * tournaments, squads) must call this — stale tab routes otherwise survive
 * up to their ISR window (180s).
 *
 * Scorecards also feed every team-profile aggregate, so the same call purges
 * the team-profile cache tag (lib/team-data.ts).
 */
export function revalidateTournamentPages(slug?: string | null): void {
  try {
    // Compare page data layer is cached under this tag (lib/compare-stats.ts)
    revalidateTag('compare-stats', 'max');
    // Team profile aggregates (lib/team-data.ts) — matches, placements, totals
    revalidateTag(TEAM_PROFILE_CACHE_TAG, 'max');
    // Player profile routes are ISR (revalidate = 180) and derive from the same
    // scorecards. The layout scope covers the base route and every tab in one
    // call, so a match paste cannot leave a player page stale for 180s.
    revalidatePath('/players/[slug]', 'layout');
    revalidatePath('/tournaments');
    if (slug) {
      revalidatePath(`/tournaments/${slug}`);
      for (const tab of TAB_SEGMENTS) {
        revalidatePath(`/tournaments/${slug}/${tab}`);
      }
    } else {
      revalidatePath('/tournaments/[slug]', 'page');
      for (const tab of TAB_SEGMENTS) {
        revalidatePath(`/tournaments/[slug]/${tab}`, 'page');
      }
    }
  } catch {
    // Ignored in script contexts where revalidation isn't available
  }
}
