import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Trophy } from 'lucide-react';
import { fetchBoardEntries, fetchEntityEntries, fetchProfileSlug, fetchTeamTransfers } from '@/lib/krafton-data';
import { computeBoard } from '@/lib/krafton-standings';
import type { KraftonBoard } from '@prisma/client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Params = Promise<{ board: string; key: string }>;

const isPlayerBoard = (board: string) => board === 'player';

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { key } = await params;
  const name = decodeURIComponent(key);
  return { title: `${name} — KRAFTON Ranking Breakdown | eSportsAmaze` };
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-IN');
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

export default async function RankingDetailPage({ params }: { params: Params }) {
  const { board: boardParam, key } = await params;
  if (boardParam !== 'team' && boardParam !== 'player') notFound();
  const board: KraftonBoard = isPlayerBoard(boardParam) ? 'PLAYER' : 'TEAM';
  const isPlayers = isPlayerBoard(boardParam);

  const entries = await fetchEntityEntries(board, decodeURIComponent(key));
  if (entries.length === 0) notFound();

  // Rank within the full board
  const fullBoard = computeBoard(await fetchBoardEntries(board), await fetchTeamTransfers());
  const myKey = entries[0].entityId || entries[0].entityName.toLowerCase();
  const me = fullBoard.find((b) => b.key === myKey) ?? null;
  const rank = Math.max(1, fullBoard.findIndex((b) => b.key === myKey) + 1);

  const entityName = entries[0].entityName;
  const latestTeam = [...entries].sort((a, b) => b.eventEndDate.getTime() - a.eventEndDate.getTime()).find((e) => e.teamName)?.teamName ?? null;
  const totalPoints = me?.totalPoints ?? 0;
  const profileSlug = await fetchProfileSlug(board, entries[0].entityId);
  const profileHref = profileSlug ? (isPlayers ? `/players/${profileSlug}` : `/teams/${profileSlug}`) : null;

  // Per-event contributions (from the entity's board entry)
  const contributions = me?.contributions ?? [];

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <main className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
          <Link href="/rankings" className="hover:text-[#0A5FC4]">
            KRAFTON Rankings
          </Link>
          <span>/</span>
          <span className="text-[#0A5FC4] dark:text-blue-300">{isPlayers ? 'Player' : 'Team'}</span>
        </div>

        {/* Header card */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
                <Trophy className="h-3 w-3" />
                KRAFTON Rank #{rank}
              </div>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                {entityName}
              </h1>
              {isPlayers && latestTeam && (
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Latest team: {latestTeam}</p>
              )}
              {me?.transferredInFrom && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0A5FC4]/10 px-3 py-1 text-[11px] font-bold text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
                  Points transferred in from {me.transferredInFrom}
                </p>
              )}
              {me?.transferredOutTo && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                  Pre-{me.contributions[0]?.eventName ?? 'cutoff'} points transferred to {me.transferredOutTo}
                </p>
              )}
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Points</p>
              <p className="num text-5xl font-black text-[#0A5FC4] dark:text-blue-300">{fmt(totalPoints)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                across {entries.length} event{entries.length === 1 ? '' : 's'} · live decay
              </p>
            </div>
          </div>
          {profileHref && (
            <Link
              href={profileHref}
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#0A5FC4] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all hover:bg-blue-600"
            >
              Visit {isPlayers ? 'player' : 'team'} page <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Points breakdown */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
            Points Breakdown
          </h2>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-white/5">
                    <th className="px-4 py-3">Event</th>
                    {isPlayers && <th className="px-4 py-3">Team</th>}
                    <th className="px-4 py-3 text-center">{isPlayers ? 'Finishes' : 'Rank'}</th>
                    <th className="px-4 py-3 text-center">Base</th>
                    <th className="px-4 py-3 text-center">Decay</th>
                    <th className="px-4 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {contributions.map((c) => (
                    <tr key={c.entryId}>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {c.eventName}
                        {c.transferredFrom && (
                          <span className="ml-2 rounded-full bg-[#0A5FC4]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
                            via transfer from {c.transferredFrom}
                          </span>
                        )}
                      </td>
                      {isPlayers && <td className="px-4 py-3 text-slate-500">{c.teamName ?? '—'}</td>}
                      <td className="px-4 py-3 text-center font-mono">
                        {isPlayers ? c.finishes : `#${c.rank}`}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-500">{fmt(c.basePoints)}</td>
                      <td className="px-4 py-3 text-center font-mono">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            c.decay === 1
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          ×{c.decay}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-[#0A5FC4] dark:text-blue-300">{fmt(c.points)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
