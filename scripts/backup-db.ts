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
    articles: await prisma.article.findMany(),
    articleRevisions: await prisma.articleRevision.findMany(),
    comments: await prisma.comment.findMany(),
    articleReactions: await prisma.articleReaction.findMany(),
    mediaAssets: await prisma.mediaAsset.findMany(),
  };

  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(snapshot)) {
    if (Array.isArray(v)) counts[k] = v.length;
  }
  console.log(JSON.stringify(counts, null, 2));

  const dir = path.join(process.cwd(), 'prisma', 'backups');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `db-snapshot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`);
  const jsonContent = JSON.stringify(snapshot, null, 2);
  await writeFile(file, jsonContent, 'utf8');

  // Verify file was written completely and integrity is intact
  const { statSync, readFileSync } = await import('fs');
  const stats = statSync(file);
  if (stats.size < 1024) {
    throw new Error(`Integrity error: Snapshot file is suspiciously small (${stats.size} bytes).`);
  }

  // Verify file parseability
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (!parsed.exportedAt || !Array.isArray(parsed.tournaments)) {
      throw new Error('Snapshot JSON validation failed: Missing expected root keys.');
    }
  } catch (err) {
    throw new Error(`Snapshot JSON is malformed or truncated: ${err instanceof Error ? err.message : String(err)}`);
  }

  const sizeKb = (stats.size / 1024).toFixed(1);
  console.log(`✅ Snapshot verified and saved: ${file} (${sizeKb} KB, ${Object.values(counts).reduce((a, b) => a + b, 0)} total records)`);
}

main()
  .catch((e) => { console.error('❌ Backup failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
