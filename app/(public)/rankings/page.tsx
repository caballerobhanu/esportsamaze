import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { fetchBoardSnapshot, fetchTeamTransfers, fetchFutureKraftonEvents } from '@/lib/krafton-data';
import { computeNextDecay, computeUnifiedNextUpdate } from '@/lib/krafton-standings';
import type { KraftonBoard } from '@prisma/client';
import {
  EntityLogoMeta,
  RankingsBoardClient,
} from '@/components/rankings/rankings-board-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'KRAFTON Rankings | eSportsAmaze — Official Team & Player Standings',
  description:
    'Official KRAFTON ranking points for BGMI esports — tier-based event points with rolling decay, updated as events are entered.',
};

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

  const [{ ranked, snapshotDates, selectedDate }, transfers, futureEvents] = await Promise.all([
    fetchBoardSnapshot(board, params.date),
    fetchTeamTransfers(),
    fetchFutureKraftonEvents(),
  ]);

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

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
        <RankingsBoardClient
          board={board}
          ranked={ranked}
          snapshotDates={snapshotDates}
          selectedDate={selectedDate}
          logosMap={logosMap}
          transfers={transfers}
          nextUpdate={nextUpdate}
        />
      </main>
    </div>
  );
}
