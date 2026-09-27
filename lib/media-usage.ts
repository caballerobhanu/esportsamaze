// Unfiltered on purpose: a trashed entity still references its media, so the
// library must not delete a file that a restore would need back.
import { prismaUnfiltered } from '@/lib/prisma';

const BRANDING_SETTINGS_KEY = 'branding_config';

/**
 * Counts how many places still reference a stored media filename.
 *
 * Every image-bearing field on every model is checked, because a miss here means the
 * media library deletes a file that is still rendering somewhere on the site. Matching
 * is by substring: a field can hold a bare filename or a full URL, and article bodies
 * hold whatever the editor inserted.
 */
export async function countReferences(filename: string): Promise<number> {
  const file = filename.trim();
  if (!file) return 0;

  const contains = { contains: file };

  const counts = await Promise.all([
    prismaUnfiltered.article.count({
      where: { OR: [{ content: contains }, { coverImage: contains }, { ogImage: contains }] },
    }),
    prismaUnfiltered.articleRevision.count({
      where: { OR: [{ content: contains }, { coverImage: contains }, { ogImage: contains }] },
    }),
    prismaUnfiltered.game.count({
      where: { OR: [{ logoUrl: contains }, { logoDarkUrl: contains }, { bannerUrl: contains }] },
    }),
    prismaUnfiltered.gameFamily.count({ where: { logoUrl: contains } }),
    prismaUnfiltered.team.count({ where: { OR: [{ logoUrl: contains }, { imageDarkUrl: contains }] } }),
    prismaUnfiltered.player.count({ where: { avatarUrl: contains } }),
    prismaUnfiltered.organizer.count({ where: { logoUrl: contains } }),
    prismaUnfiltered.sponsor.count({ where: { logoUrl: contains } }),
    prismaUnfiltered.venue.count({ where: { mapUrl: contains } }),
    prismaUnfiltered.tournament.count({
      where: { OR: [{ imageUrl: contains }, { imageDarkUrl: contains }, { bannerUrl: contains }] },
    }),
    prismaUnfiltered.tournamentTeam.count({
      where: { OR: [{ logoUrl: contains }, { logoDarkUrl: contains }] },
    }),
    prismaUnfiltered.siteSetting.count({ where: { key: BRANDING_SETTINGS_KEY, value: contains } }),
  ]);

  return counts.reduce((total, count) => total + count, 0);
}
