import { revalidatePath, updateTag } from 'next/cache';

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
 */
export function revalidateTournamentPages(slug?: string | null): void {
  try {
    // Compare page data layer is cached under this tag (lib/compare-stats.ts)
    updateTag('compare-stats');
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
