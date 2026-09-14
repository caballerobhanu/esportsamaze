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
import type { Prisma } from '@prisma/client';
import { PLAYER_DETAIL_FIELDS, TEAM_DETAIL_FIELDS, deriveTotalDistance } from '../lib/match-stat-fields';

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

/**
 * Snapshot rows already carry the database's own values, nulls included. A field
 * missing from the snapshot must become an explicit `null` rather than rely on a
 * column default — `undefined` would let `createMany` fall back to `@default(0)`
 * and re-fabricate the zeros this migration exists to remove. `rawData` is never
 * rebuilt: it rides along untouched from the snapshot.
 */
function fillMissingDetailFields(
  rows: Record<string, unknown>[],
  fields: readonly string[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = { ...row };
    for (const field of fields) {
      if (!(field in out)) out[field] = null;
    }
    // Never fabricate a distance: `0 + 0` used to invent a real-looking zero for
    // events that never recorded distances at all.
    if (!('totalDist' in row)) {
      out.totalDist = deriveTotalDistance({
        distDrove: out.distDrove as number | null,
        distWalk: out.distWalk as number | null,
      });
    }
    return out;
  });
}

async function insertMany<T>(
  label: string,
  rows: Record<string, unknown>[] | undefined,
  run: (data: T[]) => Promise<unknown>,
  chunkSize = 1000
) {
  const data = reviveDates(rows ?? []) as unknown as T[];
  if (data.length === 0) {
    console.log(`⏭  ${label}: 0 rows`);
    return;
  }
  for (let i = 0; i < data.length; i += chunkSize) {
    await run(data.slice(i, i + chunkSize));
  }
  console.log(`✅ ${label}: ${data.length} rows`);
}

export async function main() {
  console.log('🎮 Esports Amaze — snapshot restore seed');

  const snapshotPath = findSnapshot();
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Record<string, Record<string, unknown>[]>;

  // 1. Clean existing records in reverse dependency order (children before parents)
  console.log('🧹 Cleaning existing records...');
  await prisma.kraftonTransfer.deleteMany({});
  await prisma.kraftonEntry.deleteMany({});
  await prisma.kraftonEvent.deleteMany({});
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
  await prisma.transfer.deleteMany({});
  await prisma.player.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.sponsor.deleteMany({});
  await prisma.organizer.deleteMany({});
  await prisma.game.deleteMany({});
  await prisma.gameFamily.deleteMany({});

  // 2. Restore in dependency order (parents before children; explicit IDs preserve every relation)
  // Ensure referenced GameFamily records exist to satisfy foreign key constraints
  if (Array.isArray(snapshot.games)) {
    for (const g of snapshot.games) {
      if (g.familyId && typeof g.familyId === 'string') {
        await prisma.gameFamily.upsert({
          where: { id: g.familyId },
          update: {},
          create: {
            id: g.familyId,
            name: 'PUBG Ecosystem',
            slug: 'pubg-ecosystem',
            description: 'Battle Royale ecosystem including BGMI, PUBG Mobile, and Game for Peace.',
          },
        });
      }
    }
  }

  await insertMany<Prisma.GameCreateManyInput>('Games', snapshot.games, (d) => prisma.game.createMany({ data: d }));
  await insertMany<Prisma.OrganizerCreateManyInput>('Organizers', snapshot.organizers, (d) => prisma.organizer.createMany({ data: d }));
  await insertMany<Prisma.SponsorCreateManyInput>('Sponsors', snapshot.sponsors, (d) => prisma.sponsor.createMany({ data: d }));
  await insertMany<Prisma.VenueCreateManyInput>('Venues', snapshot.venues, (d) => prisma.venue.createMany({ data: d }));
  const sanitizedTeams = (snapshot.teams || []).map((t) => ({ isVerified: false, ...t }));
  await insertMany<Prisma.TeamCreateManyInput>('Teams', sanitizedTeams, (d) => prisma.team.createMany({ data: d }));

  const sanitizedPlayers = (snapshot.players || []).map((p) => ({ isVerified: false, ...p }));
  await insertMany<Prisma.PlayerCreateManyInput>('Players', sanitizedPlayers, (d) => prisma.player.createMany({ data: d }));

  await insertMany<Prisma.TransferCreateManyInput>('Transfers', snapshot.transfers, (d) => prisma.transfer.createMany({ data: d }));

  const sanitizedTournaments = (snapshot.tournaments || []).map((t) => ({ rankingIncluded: true, currency: 'USD', ...t }));
  await insertMany<Prisma.TournamentCreateManyInput>('Tournaments', sanitizedTournaments, (d) => prisma.tournament.createMany({ data: d }));

  await insertMany<Prisma.TournamentStageCreateManyInput>('Tournament Stages', snapshot.tournamentStages, (d) => prisma.tournamentStage.createMany({ data: d }));
  await insertMany<Prisma.TournamentGroupCreateManyInput>('Tournament Groups', snapshot.tournamentGroups, (d) => prisma.tournamentGroup.createMany({ data: d }));
  await insertMany<Prisma.TournamentTeamCreateManyInput>('Tournament Teams', snapshot.tournamentTeams, (d) => prisma.tournamentTeam.createMany({ data: d }));
  await insertMany<Prisma.TournamentOrganizerCreateManyInput>('Tournament Organizers', snapshot.tournamentOrganizers, (d) => prisma.tournamentOrganizer.createMany({ data: d }));
  await insertMany<Prisma.TournamentSponsorCreateManyInput>('Tournament Sponsors', snapshot.tournamentSponsors, (d) => prisma.tournamentSponsor.createMany({ data: d }));
  await insertMany<Prisma.TournamentVenueCreateManyInput>('Tournament Venues', snapshot.tournamentVenues, (d) => prisma.tournamentVenue.createMany({ data: d }));
  await insertMany<Prisma.MatchCreateManyInput>('Matches', snapshot.matches, (d) => prisma.match.createMany({ data: d }));
  await insertMany<Prisma.MatchGameCreateManyInput>('Match Games', snapshot.matchGames, (d) => prisma.matchGame.createMany({ data: d }));

  const sanitizedTeamResults = fillMissingDetailFields(snapshot.matchTeamResults || [], TEAM_DETAIL_FIELDS);
  await insertMany<Prisma.MatchTeamResultCreateManyInput>('Match Team Results', sanitizedTeamResults, (d) => prisma.matchTeamResult.createMany({ data: d }));

  const sanitizedPlayerStats = fillMissingDetailFields(snapshot.matchPlayerStats || [], PLAYER_DETAIL_FIELDS);
  await insertMany<Prisma.MatchPlayerStatCreateManyInput>('Match Player Stats', sanitizedPlayerStats, (d) => prisma.matchPlayerStat.createMany({ data: d }));
  await insertMany<Prisma.MediaAssetCreateManyInput>('Media Assets', snapshot.mediaAssets, (d) => prisma.mediaAsset.createMany({ data: d }));
  await insertMany<Prisma.ArticleCreateManyInput>('Articles', snapshot.articles, (d) => prisma.article.createMany({ data: d }));
  await insertMany<Prisma.ArticleRevisionCreateManyInput>('Article Revisions', snapshot.articleRevisions, (d) => prisma.articleRevision.createMany({ data: d }));
  await insertMany<Prisma.CommentCreateManyInput>('Comments', snapshot.comments, (d) => prisma.comment.createMany({ data: d }));
  await insertMany<Prisma.ArticleReactionCreateManyInput>('Article Reactions', snapshot.articleReactions, (d) => prisma.articleReaction.createMany({ data: d }));
  if (snapshot.kraftonEvents) {
    await insertMany<Prisma.KraftonEventCreateManyInput>('Krafton Events', snapshot.kraftonEvents, (d) => prisma.kraftonEvent.createMany({ data: d }));
  }
  if (snapshot.kraftonEntries) {
    await insertMany<Prisma.KraftonEntryCreateManyInput>('Krafton Entries', snapshot.kraftonEntries, (d) => prisma.kraftonEntry.createMany({ data: d }));
  }
  if (snapshot.kraftonTransfers) {
    await insertMany<Prisma.KraftonTransferCreateManyInput>('Krafton Transfers', snapshot.kraftonTransfers, (d) => prisma.kraftonTransfer.createMany({ data: d }));
  }

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
