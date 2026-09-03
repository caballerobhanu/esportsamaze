/**
 * Backs up the live database to prisma/backups/db-snapshot-<date>.json
 * Run: npx tsx scripts/backup-db.ts
 */
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import prisma from '../lib/prisma';

async function main() {
  console.log('Dumping database...');

  const snapshot = {
    exportedAt: new Date().toISOString(),
    games: await prisma.game.findMany(),
    organizers: await prisma.organizer.findMany(),
    sponsors: await prisma.sponsor.findMany(),
    venues: await prisma.venue.findMany(),
    teams: await prisma.team.findMany(),
    players: await prisma.player.findMany(),
    transfers: await prisma.transfer.findMany(),
    tournaments: await prisma.tournament.findMany(),
    tournamentStages: await prisma.tournamentStage.findMany(),
    tournamentGroups: await prisma.tournamentGroup.findMany(),
    tournamentTeams: await prisma.tournamentTeam.findMany(),
    tournamentOrganizers: await prisma.tournamentOrganizer.findMany(),
    tournamentSponsors: await prisma.tournamentSponsor.findMany(),
    tournamentVenues: await prisma.tournamentVenue.findMany(),
    matches: await prisma.match.findMany(),
    matchGames: await prisma.matchGame.findMany(),
    matchTeamResults: await prisma.matchTeamResult.findMany(),
    matchPlayerStats: await prisma.matchPlayerStat.findMany(),
    teamRankings: await prisma.teamRanking.findMany(),
    playerRankings: await prisma.playerRanking.findMany(),
    rankingTransferRules: await prisma.rankingTransferRule.findMany(),
  };

  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(snapshot)) {
    if (Array.isArray(v)) counts[k] = v.length;
  }
  console.log(JSON.stringify(counts, null, 2));

  const dir = path.join(process.cwd(), 'prisma', 'backups');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `db-snapshot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`);
  await writeFile(file, JSON.stringify(snapshot, null, 2));
  console.log(`✅ Snapshot saved: ${file}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
