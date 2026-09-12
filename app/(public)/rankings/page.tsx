import type { Metadata } from 'next';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import prisma from '@/lib/prisma';
import { fetchBoardEntries, fetchTeamTransfers } from '@/lib/krafton-data';
import { computeBoard } from '@/lib/krafton-standings';
import type { KraftonBoard } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'KRAFTON Rankings | eSportsAmaze — Official Team & Player Standings',
  description:
    'Official KRAFTON ranking points for BGMI esports — tier-based event points with rolling decay, updated as events are entered.',
};

function parseBoard(params: { board?: string }): KraftonBoard {
  return params.board === 'players' ? 'PLAYER' : 'TEAM';
}

const MEDALS = [
  { badge: 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 ring-2 ring-white dark:ring-[#0b1220]', label: '👑 Champion', card: 'sm:-translate-y-4 ring-2 ring-amber-400/50 shadow-xl bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/20 dark:via-[#0b1220] dark:to-[#0b1220]' },
  { badge: 'bg-slate-300 text-slate-800 ring-2 ring-white dark:ring-[#0b1220]', label: 'Runner-up', card: 'bg-gradient-to-b from-slate-50/50 via-white to-white dark:from-slate-900/20 dark:via-[#0b1220] dark:to-[#0b1220]' },
  { badge: 'bg-amber-700 text-white ring-2 ring-white dark:ring-[#0b1220]', label: '3rd Place', card: 'bg-gradient-to-b from-orange-50/50 via-white to-white dark:from-orange-950/20 dark:via-[#0b1220] dark:to-[#0b1220]' },
];

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const board: KraftonBoard = parseBoard(params);
  const isPlayers = board === 'PLAYER';

  const entries = await fetchBoardEntries(board);
  const transfers = await fetchTeamTransfers();
  const ranked = computeBoard(entries, transfers).map((e, i) => ({ ...e, rank: i + 1 }));

  const detailBase = isPlayers ? '/rankings/player' : '/rankings/team';
  const podium = ranked.slice(0, 3);

  // Logos/avatars for linked entities
  const linkedIds = ranked.map((e) => e.entityId).filter(Boolean) as string[];
  const teamsById = new Map(
    linkedIds.length
      ? (
          await prisma.team.findMany({
            where: { id: { in: linkedIds } },
            select: { id: true, slug: true, logoUrl: true, imageDarkUrl: true },
          })
        ).map((t) => [t.id, t])
      : []
  );
  const playersById = new Map(
    linkedIds.length
      ? (
          await prisma.player.findMany({
            where: { id: { in: linkedIds } },
            select: { id: true, slug: true, avatarUrl: true },
          })
        ).map((p) => [p.id, p])
      : []
  );

  const logoFor = (entity: (typeof ranked)[number]) => {
    if (!entity.entityId) return null;
    if (!isPlayers) {
      const t = teamsById.get(entity.entityId);
      return t ? { logoUrl: t.logoUrl, imageDarkUrl: t.imageDarkUrl, slug: t.slug, kind: 'team' as const } : null;
    }
    const p = playersById.get(entity.entityId);
    return p ? { logoUrl: p.avatarUrl, imageDarkUrl: null, slug: p.slug, kind: 'player' as const } : null;
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
        {/* ── Masthead ── */}
        <div className="mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
            <Trophy className="h-3.5 w-3.5" />
            <span>Official KRAFTON Rankings</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {isPlayers ? 'Player Rankings' : 'Team Rankings'}
          </h1>
          <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Rolling points earned across Publisher and Tier events, decayed by recency so recent form
            weighs heaviest. Roster acquisitions carry points to the new organisation up to the cutoff date.
          </p>
        </div>

        {/* ── Capsule Tab Dock ── */}
        <div className="mb-10 flex w-fit items-center rounded-full bg-slate-200/70 p-1 dark:bg-white/10">
          <Link
            href="/rankings"
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
              !isPlayers ? 'bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600' : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Trophy className="h-4 w-4" /> Teams ({ranked.filter((e) => e.board === 'TEAM').length || (isPlayers ? 0 : ranked.length)})
          </Link>
          <Link
            href="/rankings?board=players"
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
              isPlayers ? 'bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600' : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Players ({ranked.filter((e) => e.board === 'PLAYER').length || (isPlayers ? ranked.length : 0)})
          </Link>
        </div>

        {ranked.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/50 p-16 text-center dark:border-slate-700 dark:bg-white/[0.02]">
            <Trophy className="mx-auto h-8 w-8 text-slate-400 opacity-50" />
            <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
              No ranking entries yet.
            </p>
            <p className="mt-1 text-xs text-slate-400">Ranking events will appear here once entered.</p>
          </div>
        ) : (
          <>
            {/* ── Podium ── */}
            {podium.length >= 3 && (
              <div className="mb-12 grid grid-cols-1 items-end gap-6 sm:grid-cols-3">
                {[podium[1], podium[0], podium[2]].map((entity, i) => {
                  const medal = MEDALS[i];
                  const logo = logoFor(entity);
                  return (
                    <div
                      key={entity.key}
                      className={`relative flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all dark:border-white/10 dark:bg-[#0b1220] ${medal.card}`}
                    >
                      <span
                        className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-3.5 py-1 text-[10px] font-black uppercase tracking-widest shadow-xs ${medal.badge}`}
                      >
                        {medal.label}
                      </span>

                      <div className="mt-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2 shadow-xs dark:border-white/10 dark:bg-[#141e33]">
                        {logo?.logoUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={logo.logoUrl} alt="" className="h-full w-full object-contain p-1 dark:hidden" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={logo.imageDarkUrl || logo.logoUrl}
                              alt=""
                              aria-hidden="true"
                              className="hidden h-full w-full object-contain p-1 dark:block"
                            />
                          </>
                        ) : (
                          <span className="text-2xl font-black text-[#0A5FC4] dark:text-blue-300">
                            {entity.entityName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`${detailBase}/${encodeURIComponent(entity.key)}`}
                        className="text-lg font-black uppercase tracking-tight text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400"
                      >
                        {entity.entityName}
                      </Link>

                      <p className="text-3xl font-black tracking-tight text-[#0A5FC4] dark:text-blue-300">
                        <span>{Math.round(entity.totalPoints).toLocaleString('en-IN')}</span>
                        <span className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">pts</span>
                      </p>

                      <p className="text-xs font-bold text-slate-400">
                        {entity.events} event{entity.events === 1 ? '' : 's'}
                        {isPlayers && entity.latestTeamName ? ` · ${entity.latestTeamName}` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Full table ── */}
            <div className="mb-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                  {isPlayers ? 'Player standings' : 'Team standings'} · Top {ranked.length}
                </h2>
                <span className="text-[11px] font-bold text-slate-400">Decay-adjusted · as of today</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/30 dark:border-white/5 dark:bg-white/[0.01]">
                    <tr>
                      <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">#</th>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {isPlayers ? 'Player' : 'Team'}
                      </th>
                      {isPlayers && <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Team</th>}
                      <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">Events</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {ranked.map((entity) => {
                      const logo = logoFor(entity);
                      return (
                        <tr key={entity.key} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5">
                          <td className="px-5 py-3 text-center">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black ${
                                entity.rank === 1
                                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                                  : entity.rank === 2
                                    ? 'bg-slate-300 text-slate-900'
                                    : entity.rank === 3
                                      ? 'bg-orange-400/80 text-white'
                                      : 'text-slate-500'
                              }`}
                            >
                              {entity.rank}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-3">
                              <Link
                                href={`${detailBase}/${encodeURIComponent(entity.key)}`}
                                className="flex items-center gap-3"
                              >
                                {logo?.logoUrl ? (
                                  <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-white/10 dark:bg-[#141e33]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={logo.logoUrl} alt="" className="h-full w-full object-contain p-0.5 dark:hidden" />
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={logo.imageDarkUrl || logo.logoUrl}
                                      alt=""
                                      className="hidden h-full w-full object-contain p-0.5 dark:block"
                                    />
                                  </span>
                                ) : (
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 dark:border-white/10 dark:bg-[#141e33]">
                                    {entity.entityName.slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                                <span className="font-extrabold text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400">
                                  {entity.entityName}
                                </span>
                              </Link>
                              {logo?.slug && (
                                <Link
                                  href={`${logo.kind === 'team' ? '/teams/' : '/players/'}${logo.slug}`}
                                  className="rounded-md p-1 text-slate-300 transition-colors hover:text-[#0A5FC4] dark:hover:text-blue-300"
                                  aria-label={`${entity.entityName} profile`}
                                >
                                  →
                                </Link>
                              )}
                            </span>
                          </td>
                          {isPlayers && (
                            <td className="px-5 py-3 text-slate-500">{entity.latestTeamName ?? '—'}</td>
                          )}
                          <td className="px-5 py-3 text-center font-mono text-slate-500">{entity.events}</td>
                          <td className="px-5 py-3 text-right font-black text-[#0A5FC4] dark:text-blue-300">
                            {Math.round(entity.totalPoints).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
