import { revalidatePath, revalidateTag } from 'next/cache';

import { TEAM_PROFILE_CACHE_TAG } from '@/lib/team-stats';

/**
 * Every surface that renders a player's team or the movement ledger: the admin
 * list, the roster and transfer timeline on team pages, the player career
 * history, and the homepage ledger.
 *
 * Team-profile aggregates are cached under TEAM_PROFILE_CACHE_TAG
 * (lib/team-data.ts), which is revalidated by tag rather than path.
 */
export function revalidateTransferSurfaces(): void {
  try {
    revalidateTag(TEAM_PROFILE_CACHE_TAG, 'max');
    revalidatePath('/admin/transfers');
    revalidatePath('/');
    revalidatePath('/players');
    revalidatePath('/teams');
    revalidatePath('/players/[slug]', 'page');
    revalidatePath('/teams/[slug]', 'page');
  } catch {
    // Ignored in script contexts where revalidation isn't available
  }
}
