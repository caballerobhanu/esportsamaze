import prisma from '@/lib/prisma';

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
    prisma.article.count({
      where: { OR: [{ content: contains }, { coverImage: contains }, { ogImage: contains }] },
    }),
    prisma.articleRevision.count({
      where: { OR: [{ content: contains }, { coverImage: contains }, { ogImage: contains }] },
    }),
    prisma.game.count({
      where: { OR: [{ logoUrl: contains }, { logoDarkUrl: contains }, { bannerUrl: contains }] },
    }),
    prisma.gameFamily.count({ where: { logoUrl: contains } }),
    prisma.team.count({ where: { OR: [{ logoUrl: contains }, { imageDarkUrl: contains }] } }),
    prisma.player.count({ where: { avatarUrl: contains } }),
    prisma.organizer.count({ where: { logoUrl: contains } }),
    prisma.sponsor.count({ where: { logoUrl: contains } }),
    prisma.venue.count({ where: { mapUrl: contains } }),
    prisma.tournament.count({
      where: { OR: [{ imageUrl: contains }, { imageDarkUrl: contains }, { bannerUrl: contains }] },
    }),
    prisma.tournamentTeam.count({
      where: { OR: [{ logoUrl: contains }, { logoDarkUrl: contains }] },
    }),
    prisma.siteSetting.count({ where: { key: BRANDING_SETTINGS_KEY, value: contains } }),
  ]);

  return counts.reduce((total, count) => total + count, 0);
}
