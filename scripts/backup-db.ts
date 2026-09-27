/**
 * Backs up the live database to prisma/backups/db-snapshot-<date>.json
 * Run: npx tsx scripts/backup-db.ts
 */
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
// Unfiltered: a backup must include trashed rows too, so a restore can bring them back.
import { prismaUnfiltered } from '../lib/prisma';

async function main() {
  console.log('Dumping database...');

  const snapshot = {
    exportedAt: new Date().toISOString(),
    gameFamilies: await prismaUnfiltered.gameFamily.findMany(),
    games: await prismaUnfiltered.game.findMany(),
    organizers: await prismaUnfiltered.organizer.findMany(),
    sponsors: await prismaUnfiltered.sponsor.findMany(),
    venues: await prismaUnfiltered.venue.findMany(),
    teams: await prismaUnfiltered.team.findMany(),
    players: await prismaUnfiltered.player.findMany(),
    transfers: await prismaUnfiltered.transfer.findMany(),
    tournaments: await prismaUnfiltered.tournament.findMany(),
    tournamentStages: await prismaUnfiltered.tournamentStage.findMany(),
    tournamentGroups: await prismaUnfiltered.tournamentGroup.findMany(),
    tournamentTeams: await prismaUnfiltered.tournamentTeam.findMany(),
    tournamentOrganizers: await prismaUnfiltered.tournamentOrganizer.findMany(),
    tournamentSponsors: await prismaUnfiltered.tournamentSponsor.findMany(),
    tournamentVenues: await prismaUnfiltered.tournamentVenue.findMany(),
    matches: await prismaUnfiltered.match.findMany(),
    matchGames: await prismaUnfiltered.matchGame.findMany(),
    matchTeamResults: await prismaUnfiltered.matchTeamResult.findMany(),
    matchPlayerStats: await prismaUnfiltered.matchPlayerStat.findMany(),
    articles: await prismaUnfiltered.article.findMany(),
    articleRevisions: await prismaUnfiltered.articleRevision.findMany(),
    comments: await prismaUnfiltered.comment.findMany(),
    articleReactions: await prismaUnfiltered.articleReaction.findMany(),
    mediaAssets: await prismaUnfiltered.mediaAsset.findMany(),
    kraftonEvents: await prismaUnfiltered.kraftonEvent.findMany(),
    kraftonEntries: await prismaUnfiltered.kraftonEntry.findMany(),
    kraftonTransfers: await prismaUnfiltered.kraftonTransfer.findMany(),
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
  .finally(async () => { await prismaUnfiltered.$disconnect(); });
