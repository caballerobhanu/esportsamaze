import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Trophy } from 'lucide-react';
import { getTournamentShortName } from '@/lib/utils';
import { teamHref } from '@/lib/entity-links';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';
import { KickoffDate, KickoffTime } from '@/components/ui/kickoff';

export interface HighlightMatchData {
  id: string;
  matchNumber: number | null;
  overallMatchNumber: number | null;
  mapName: string | null;
  scheduledAt: Date;
  matchTime: string | null;
  status: string;
  tournament: {
    name: string;
    shortName?: string | null;
    series?: string | null;
    season?: string | null;
    slug: string;
    game?: { slug: string } | null;
  };
  stage?: {
    name: string;
  } | null;
  winner?: {
    teamName: string;
    teamSlug: string | null;
    teamTag: string | null;
    placementPts: number;
    finishes: number;
    totalPts: number;
    mvpPlayer: string | null;
    mvpKills: number;
  } | null;
  topSquads?: Array<{
    rank: number;
    teamName: string;
    teamTag: string | null;
    finishes: number;
    totalPts: number;
  }>;
}

export function HomeMatchHighlight({
  match,
  gameSlug = DEFAULT_GAME_SLUG,
}: {
  match: HighlightMatchData | null;
  /** The event's own game slug, so the event link stays on this game. */
  gameSlug?: string;
}) {
  if (!match) return null;

  const isCompleted = match.status === 'COMPLETED';
  const matchLabel = match.matchNumber ? `Match ${match.matchNumber}` : `Match`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-white/10 dark:bg-[#0b1220]">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5 dark:border-white/10 dark:bg-[#070b14]/50">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href={gameHref(gameSlug, `tournaments/${match.tournament.slug}`)}
            className="rounded-full bg-[#0A5FC4]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#0A5FC4] hover:bg-[#0A5FC4]/20 transition-colors dark:text-blue-400"
          >
            {getTournamentShortName(match.tournament)}
          </Link>
          <span className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
            {matchLabel} · {match.mapName || 'Erangel'}
          </span>
          {match.stage?.name && (
            <span className="hidden text-xs font-bold text-slate-400 dark:text-slate-500 sm:inline">
              · {match.stage.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Final result
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5 text-[#0A5FC4] dark:text-blue-400" /> Scheduled{' '}
              {match.matchTime ? (
                <>
                  at <KickoffTime scheduledAt={match.scheduledAt} fallback={match.matchTime} />
                </>
              ) : (
                ''
              )}
            </span>
          )}
        </div>
      </div>

      {/* Body: Match Result Showcase */}
      {isCompleted && match.winner ? (
        <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-12 md:divide-x md:divide-y-0 dark:divide-white/5">
          {/* Left 5 cols: Match Winner Box */}
          <div className="min-w-0 space-y-4 p-5 md:col-span-5 sm:p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-amber-500">
                  <Trophy className="h-3.5 w-3.5" />
                  Match Winner · WWCD
                </span>
              </div>

              <div>
                <Link
                  href={teamHref({ slug: match.winner.teamSlug, tag: match.winner.teamTag, name: match.winner.teamName })}
                  className="block text-2xl font-black tracking-tight text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-300 sm:text-3xl leading-none"
                >
                  {match.winner.teamName}
                </Link>
              </div>

              {/* Clean broadcast scorecard strip — authentic esports layout */}
              <div className="flex items-center gap-4 sm:gap-6 py-3 border-y border-slate-100 dark:border-white/5 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Placement</span>
                  <span className="num font-black text-base text-slate-900 dark:text-white">+{match.winner.placementPts}</span>
                </div>
                <div className="h-7 w-px bg-slate-200 dark:bg-white/10" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Elims</span>
                  <span className="num font-black text-base text-slate-900 dark:text-white">{match.winner.finishes} elims</span>
                </div>
                <div className="h-7 w-px bg-slate-200 dark:bg-white/10" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 block">Total</span>
                  <span className="num font-black text-base text-[#0A5FC4] dark:text-blue-400">{match.winner.totalPts} pts</span>
                </div>
              </div>
            </div>

            {match.winner.mvpPlayer && (
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="font-medium">
                  MVP: <strong className="font-bold text-slate-900 dark:text-white">{match.winner.mvpPlayer}</strong>
                </span>
                <span className="num font-bold text-emerald-600 dark:text-emerald-400">
                  {match.winner.mvpKills} elims
                </span>
              </div>
            )}
          </div>

          {/* Right 7 cols: Top Squads in this match */}
          <div className="min-w-0 p-4 md:col-span-7 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Match Standings</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{match.mapName || 'Erangel'}</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 text-center font-bold">#</th>
                    <th className="py-2.5 px-3 font-bold">Team</th>
                    <th className="py-2.5 px-2 text-center font-bold">Elims</th>
                    <th className="py-2.5 px-3 text-right font-bold">Points Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                  {match.topSquads && match.topSquads.length > 0 ? (
                    match.topSquads.map((s) => (
                      <tr key={`${s.rank}-${s.teamName}`} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                        <td className="px-3 py-2 text-center font-bold text-slate-400 dark:text-slate-500">
                          {s.rank}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                          {s.teamName}
                        </td>
                        <td className="px-2 py-2 text-center font-semibold text-slate-500 dark:text-slate-400">
                          {s.finishes}
                        </td>
                        <td className="num px-3 py-2 text-right font-black text-[#0A5FC4] dark:text-blue-400">
                          +{s.totalPts} pts
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                        No placement records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Upcoming Match View */
        <div className="space-y-3 p-6 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ed-blue)]/10 text-[var(--ed-blue)] text-xl font-bold">
            <Clock className="h-6 w-6" />
          </div>
          <h4 className="text-xl font-bold uppercase tracking-tight text-[var(--ed-ink)]">
            {matchLabel} ({match.mapName || 'Erangel'})
          </h4>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-[var(--ed-stone)]">
            Scheduled for{' '}
            <KickoffDate
              scheduledAt={match.scheduledAt}
              withYear
              fallback={new Date(match.scheduledAt).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            />
            {match.matchTime ? (
              <>
                {' '}
                at <KickoffTime scheduledAt={match.scheduledAt} fallback={match.matchTime} />
              </>
            ) : (
              ''
            )}
            . Results will appear here once the match is played.
          </p>
        </div>
      )}
    </section>
  );
}
