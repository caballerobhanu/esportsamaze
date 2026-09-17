/**
 * Repairs `TournamentTeam.prizeWon` so it matches the prize ladder it is derived
 * from.
 *
 * The column is only rewritten when the admin recalculates, so it drifts as soon
 * as a stage is edited — which is how Team SouL came to show 2,30,000 on the
 * ladder's total of 2,40,000. This reads the same authority the prizepool page
 * reads (`placementTotalsByTeam`), so the stored column and the page cannot
 * disagree once it has run.
 *
 * A team with no placement rows on the ladder is left exactly as it is: the
 * column is its only source, and this script is not in the business of inventing
 * prize money.
 *
 * Dry run — prints every difference and writes nothing:
 *   npx tsx scripts/repair-prize-totals.ts
 * Apply:
 *   npx tsx scripts/repair-prize-totals.ts --apply
 */
import prisma from '../lib/prisma';
import { placementTotalsByTeam } from '../lib/tournament-prizes';

interface PendingChange {
  tournamentId: string;
  slug: string;
  teamId: string;
  teamName: string;
  from: number;
  to: number;
}

function format(amount: number): string {
  return amount.toLocaleString('en-IN');
}

async function main() {
  const apply = process.argv.includes('--apply');

  const tournaments = await prisma.tournament.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      prizeDistribution: true,
      teams: {
        select: {
          teamId: true,
          finalRank: true,
          prizeWon: true,
          team: { select: { name: true, displayName: true } },
        },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  const changes: PendingChange[] = [];
  let teamsChecked = 0;
  let teamsSkipped = 0;

  for (const tournament of tournaments) {
    const totals = placementTotalsByTeam(tournament.prizeDistribution);
    if (totals.size === 0) continue;

    for (const row of tournament.teams) {
      const computed = totals.get(row.teamId);
      if (computed == null) {
        // No placement rows: the stored column is all we have, so leave it.
        teamsSkipped++;
        continue;
      }

      teamsChecked++;
      const stored = row.prizeWon ?? 0;
      if (stored === computed) continue;

      changes.push({
        tournamentId: tournament.id,
        slug: tournament.slug,
        teamId: row.teamId,
        teamName: row.team.displayName || row.team.name,
        from: stored,
        to: computed,
      });
    }
  }

  console.log(`Tournaments scanned: ${tournaments.length}`);
  console.log(`Teams with ladder rows: ${teamsChecked}`);
  console.log(`Teams left alone (no ladder rows): ${teamsSkipped}`);

  if (changes.length === 0) {
    console.log('\nEvery stored total already matches its ladder. Nothing to do.');
    return;
  }

  console.log(`\n${changes.length} team(s) would change:\n`);
  for (const change of changes) {
    const delta = change.to - change.from;
    console.log(
      `  ${change.slug}  ${change.teamName}: ${format(change.from)} -> ${format(change.to)}  (${
        delta > 0 ? '+' : ''
      }${format(delta)})`
    );
  }

  if (!apply) {
    console.log('\nDry run — nothing written. Re-run with --apply to write these values.');
    return;
  }

  for (const change of changes) {
    await prisma.tournamentTeam.update({
      where: { tournamentId_teamId: { tournamentId: change.tournamentId, teamId: change.teamId } },
      data: { prizeWon: change.to },
    });
  }

  console.log(`\nApplied ${changes.length} update(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
