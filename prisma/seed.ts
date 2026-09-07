/**
 * Data-driven seed: replays the newest database snapshot from prisma/backups/.
 *
 * The snapshot is produced by `npm run db:backup` (scripts/backup-db.ts), which
 * captures the live database exactly as entered via the admin panel. Re-running
 * this seed therefore RESTORES your real data instead of wiping it with demo data.
 *
 * Run: npm run db:seed   (or: npx tsx prisma/seed.ts)
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import prisma from '../lib/prisma';

/** All DateTime columns across the schema — ISO strings from JSON must be revived. */
const DATE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'founded',
  'birthDate',
  'date',
  'startDate',
  'endDate',
  'scheduledAt',
  'publishedAt',
  'deletedAt',
  'before',
]);

function reviveDates<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = { ...row };
    for (const key of Object.keys(out)) {
      if (DATE_FIELDS.has(key) && typeof out[key] === 'string') {
        out[key] = new Date(out[key] as string);
      }
    }
    return out as T;
  });
}

function findSnapshot(): string {
  const candidates = [
    path.join(__dirname, 'backups'),
    path.resolve(process.cwd(), 'prisma', 'backups'),
  ];
  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir)
      .filter((f) => f.startsWith('db-snapshot-') && f.endsWith('.json'))
      .sort();
    if (files.length > 0) {
      const file = path.join(dir, files[files.length - 1]);
      console.log(`📦 Using snapshot: ${path.basename(file)}`);
      return file;
    }
  }
  throw new Error(
    'No snapshot found in prisma/backups/. Run `npm run db:backup` first — the seed restores from a snapshot and refuses to guess.'
  );
}

async function insertMany(
  label: string,
  rows: Record<string, unknown>[] | undefined,
  run: (data: Record<string, unknown>[]) => Promise<unknown>
) {
  const data = reviveDates(rows ?? []);
  if (data.length === 0) {
    console.log(`⏭  ${label}: 0 rows`);
    return;
  }
  await run(data);
  console.log(`✅ ${label}: ${data.length} rows`);
}

async function main() {
  console.log('🎮 Esports Amaze — snapshot restore seed');

  const snapshotPath = findSnapshot();
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Record<string, Record<string, unknown>[]>;

  // 1. Clean existing records in reverse dependency order (children before parents)
  console.log('🧹 Cleaning existing records...');
  await prisma.articleReaction.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.articleRevision.deleteMany({});
  await prisma.article.deleteMany({});
  await prisma.mediaAsset.deleteMany({});
  await prisma.matchPlayerStat.deleteMany({});
  await prisma.matchTeamResult.deleteMany({});
  await prisma.matchGame.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.tournamentVenue.deleteMany({});
  await prisma.tournamentSponsor.deleteMany({});
  await prisma.tournamentOrganizer.deleteMany({});
  await prisma.tournamentTeam.deleteMany({});
  await prisma.tournamentGroup.deleteMany({});
  await prisma.tournamentStage.deleteMany({});
  await prisma.tournament.deleteMany({});
  await prisma.playerRanking.deleteMany({});
  await prisma.teamRanking.deleteMany({});
  await prisma.rankingTransferRule.deleteMany({});
  await prisma.transfer.deleteMany({});
  await prisma.player.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.sponsor.deleteMany({});
  await prisma.organizer.deleteMany({});
  await prisma.game.deleteMany({});

  // 2. Restore in dependency order (parents before children; explicit IDs preserve every relation)
  await insertMany('Games', snapshot.games, (d) => prisma.game.createMany({ data: d as never }));
  await insertMany('Organizers', snapshot.organizers, (d) => prisma.organizer.createMany({ data: d as never }));
  await insertMany('Sponsors', snapshot.sponsors, (d) => prisma.sponsor.createMany({ data: d as never }));
  await insertMany('Venues', snapshot.venues, (d) => prisma.venue.createMany({ data: d as never }));
  await insertMany('Teams', snapshot.teams, (d) => prisma.team.createMany({ data: d as never }));
  await insertMany('Players', snapshot.players, (d) => prisma.player.createMany({ data: d as never }));
  await insertMany('Transfers', snapshot.transfers, (d) => prisma.transfer.createMany({ data: d as never }));
  await insertMany('Tournaments', snapshot.tournaments, (d) => prisma.tournament.createMany({ data: d as never }));
  await insertMany('Tournament Stages', snapshot.tournamentStages, (d) => prisma.tournamentStage.createMany({ data: d as never }));
  await insertMany('Tournament Groups', snapshot.tournamentGroups, (d) => prisma.tournamentGroup.createMany({ data: d as never }));
  await insertMany('Tournament Teams', snapshot.tournamentTeams, (d) => prisma.tournamentTeam.createMany({ data: d as never }));
  await insertMany('Tournament Organizers', snapshot.tournamentOrganizers, (d) => prisma.tournamentOrganizer.createMany({ data: d as never }));
  await insertMany('Tournament Sponsors', snapshot.tournamentSponsors, (d) => prisma.tournamentSponsor.createMany({ data: d as never }));
  await insertMany('Tournament Venues', snapshot.tournamentVenues, (d) => prisma.tournamentVenue.createMany({ data: d as never }));
  await insertMany('Matches', snapshot.matches, (d) => prisma.match.createMany({ data: d as never }));
  await insertMany('Match Games', snapshot.matchGames, (d) => prisma.matchGame.createMany({ data: d as never }));
  await insertMany('Match Team Results', snapshot.matchTeamResults, (d) => prisma.matchTeamResult.createMany({ data: d as never }));
  await insertMany('Match Player Stats', snapshot.matchPlayerStats, (d) => prisma.matchPlayerStat.createMany({ data: d as never }));
  await insertMany('Team Rankings', snapshot.teamRankings, (d) => prisma.teamRanking.createMany({ data: d as never }));
  await insertMany('Player Rankings', snapshot.playerRankings, (d) => prisma.playerRanking.createMany({ data: d as never }));
  await insertMany('Ranking Transfer Rules', snapshot.rankingTransferRules, (d) => prisma.rankingTransferRule.createMany({ data: d as never }));
  await insertMany('Media Assets', snapshot.mediaAssets, (d) => prisma.mediaAsset.createMany({ data: d as never }));
  await insertMany('Articles', snapshot.articles, (d) => prisma.article.createMany({ data: d as never }));
  await insertMany('Article Revisions', snapshot.articleRevisions, (d) => prisma.articleRevision.createMany({ data: d as never }));
  await insertMany('Comments', snapshot.comments, (d) => prisma.comment.createMany({ data: d as never }));
  await insertMany('Article Reactions', snapshot.articleReactions, (d) => prisma.articleReaction.createMany({ data: d as never }));

  console.log('🎉 Restore complete — database matches the snapshot exactly.');
}

main()
  .catch((e) => {
    console.error('❌ Restore failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
