import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { fetchBoardSnapshot, fetchTeamTransfers, fetchFutureKraftonEvents } from '@/lib/krafton-data';
import { computeNextDecay, computeRankOneReigns, computeUnifiedNextUpdate } from '@/lib/krafton-standings';
import type { KraftonBoard } from '@prisma/client';
import {
  EntityLogoMeta,
  RankingsBoardClient,
} from '@/components/rankings/rankings-board-client';

import { absoluteUrl, breadcrumbJsonLd, canonical, rankedItemListJsonLd, SITE_NAME } from '@/lib/seo';
import { JsonLd } from '@/components/seo/json-ld';

export const dynamic = 'force-dynamic';

/*
 * `?date=` is view state — a snapshot of the same board — so it is stripped and
 * every snapshot canonicalises to the live board. `?board=` is not: the team and
 * player leaderboards are different datasets answering different queries, so
 * each keeps its own canonical and its own title.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const isPlayers = parseBoard(params) === 'PLAYER';

  if (isPlayers) {
    return {
      title: `BGMI KRAFTON Rankings — Player Leaderboard | ${SITE_NAME}`,
      description:
        'Official KRAFTON ranking points for BGMI players — tier-based event points with MVP, finish and award bonuses, plus rolling decay.',
      ...canonical('/rankings?board=players'),
    };
  }

  return {
    title: `BGMI KRAFTON Rankings — Team Points Table | ${SITE_NAME}`,
    description:
      'Official KRAFTON ranking points for BGMI esports teams — tier-based event points with rolling decay, updated as events are entered.',
    ...canonical('/rankings'),
  };
}

function parseBoard(params: { board?: string }): KraftonBoard {
  return params.board === 'players' ? 'PLAYER' : 'TEAM';
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const board: KraftonBoard = parseBoard(params);
  const isPlayers = board === 'PLAYER';

  const [{ ranked, snapshotDates, selectedDate, entries }, transfers, futureEvents] = await Promise.all([
    fetchBoardSnapshot(board, params.date),
    fetchTeamTransfers(),
    fetchFutureKraftonEvents(),
  ]);

  // Who held #1 and for how long — computed from the same entries the board was
  // built from, so both views agree. Point transfers only apply to the team board.
  const reigns = computeRankOneReigns(entries, isPlayers ? [] : transfers);

  // Earliest upcoming decay across top entities
  let earliestDecay: ReturnType<typeof computeNextDecay> = null;
  for (const entity of ranked) {
    const nd = computeNextDecay(entity.contributions);
    if (nd) {
      if (!earliestDecay || nd.daysRemaining < earliestDecay.daysRemaining) {
        earliestDecay = nd;
      }
    }
  }

  const nextUpdate = computeUnifiedNextUpdate(earliestDecay, futureEvents);

  // Fetch logos/avatars for linked entities in this snapshot
  const linkedIds = ranked.map((e) => e.entityId).filter(Boolean) as string[];
  const logosMap: Record<string, EntityLogoMeta> = {};

  if (linkedIds.length > 0) {
    if (!isPlayers) {
      const teams = await prisma.team.findMany({
        where: { id: { in: linkedIds } },
        select: { id: true, slug: true, logoUrl: true, imageDarkUrl: true },
      });
      for (const t of teams) {
        logosMap[t.id] = {
          logoUrl: t.logoUrl,
          imageDarkUrl: t.imageDarkUrl,
          slug: t.slug,
        };
      }
    } else {
      const players = await prisma.player.findMany({
        where: { id: { in: linkedIds } },
        select: {
          id: true,
          slug: true,
          avatarUrl: true,
          currentTeam: { select: { id: true, name: true, slug: true } },
        },
      });
      for (const p of players) {
        logosMap[p.id] = {
          logoUrl: p.avatarUrl,
          slug: p.slug,
          currentTeamName: p.currentTeam?.name ?? null,
          currentTeamSlug: p.currentTeam?.slug ?? null,
        };
      }
    }
  }

  const boardPath = isPlayers ? '/rankings?board=players' : '/rankings';

  // The board itself as an ordered list, so the ranking is machine-readable
  // rather than only visually ordered. Entities linked to a site profile get a
  // URL; the rest stay name-only rather than pointing somewhere invented.
  const rankingJsonLd = rankedItemListJsonLd(
    ranked.map((entry) => {
      const slug = entry.entityId ? logosMap[entry.entityId]?.slug : null;
      return {
        name: entry.entityName,
        type: isPlayers ? ('Person' as const) : ('SportsTeam' as const),
        url: slug ? absoluteUrl(`/rankings/${isPlayers ? 'player' : 'team'}/${slug}`) : null,
      };
    }),
    isPlayers ? 'KRAFTON player rankings' : 'KRAFTON team rankings'
  );
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'KRAFTON Rankings', path: boardPath },
  ]);

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <JsonLd data={[rankingJsonLd, breadcrumbs]} />
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
        <RankingsBoardClient
          board={board}
          ranked={ranked}
          snapshotDates={snapshotDates}
          selectedDate={selectedDate}
          logosMap={logosMap}
          transfers={transfers}
          nextUpdate={nextUpdate}
          reigns={reigns}
        />
      </main>
    </div>
  );
}
