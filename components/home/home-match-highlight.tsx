import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Trophy } from 'lucide-react';

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
    slug: string;
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

export function HomeMatchHighlight({ match }: { match: HighlightMatchData | null }) {
  if (!match) return null;

  const isCompleted = match.status === 'COMPLETED';
  const matchLabel = match.matchNumber ? `Match ${match.matchNumber}` : `Match`;

  return (
    <section className="ed-card">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ed-hair)] bg-[var(--ed-sand)]/50 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href={`/tournaments/${match.tournament.slug}`}
            className="rounded-full bg-[var(--ed-blue)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--ed-blue)] hover:bg-[var(--ed-blue)]/20 transition-colors"
          >
            {match.tournament.name.split(' ').slice(0, 2).join(' ')}
          </Link>
          <span className="text-sm font-bold uppercase tracking-tight text-[var(--ed-ink)]">
            {matchLabel} · {match.mapName || 'Erangel'}
          </span>
          {match.stage?.name && (
            <span className="hidden text-xs font-semibold text-[var(--ed-stone)] sm:inline">
              · {match.stage.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Final result
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ed-sand)] px-3 py-1 text-xs font-bold text-[var(--ed-stone)]">
              <Clock className="h-3.5 w-3.5 text-[var(--ed-blue)]" /> Scheduled {match.matchTime ? `at ${match.matchTime}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Body: Match Result Showcase */}
      {isCompleted && match.winner ? (
        <div className="grid grid-cols-1 divide-y divide-[var(--ed-hair)] md:grid-cols-12 md:divide-x md:divide-y-0">
          {/* Left 5 cols: Match Winner Box */}
          <div className="min-w-0 space-y-4 bg-gradient-to-br from-[var(--ed-blue)]/5 via-transparent to-transparent p-5 md:col-span-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="kicker flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" /> Match Winner
              </span>
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                1st Place WWCD
              </span>
            </div>

            <div>
              <Link
                href={`/teams/${encodeURIComponent(match.winner.teamSlug || match.winner.teamName.toLowerCase().replace(/\s+/g, '-'))}`}
                className="block text-2xl font-extrabold tracking-tight text-[var(--ed-ink)] transition-colors hover:text-[var(--ed-blue)] sm:text-3xl"
              >
                {match.winner.teamName}
              </Link>
            </div>

            {/* Metric counters */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 text-center">
              <div className="rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-3">
                <span className="kicker block text-[10px] tracking-wider">Placement</span>
                <strong className="num text-lg text-[var(--ed-ink)]">
                  +{match.winner.placementPts}
                </strong>
              </div>
              <div className="rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-3">
                <span className="kicker block text-[10px] tracking-wider">Finishes</span>
                <strong className="num text-lg text-[var(--ed-ink)]">
                  +{match.winner.finishes} K
                </strong>
              </div>
              <div className="rounded-xl border border-[var(--ed-blue)]/30 bg-[var(--ed-blue)]/10 p-3">
                <span className="kicker block text-[10px] tracking-wider text-[var(--ed-blue)]">Total Pts</span>
                <strong className="num text-lg text-[var(--ed-blue)]">
                  {match.winner.totalPts}
                </strong>
              </div>
            </div>

            {match.winner.mvpPlayer && (
              <div className="flex items-center justify-between border-t border-[var(--ed-hair)] pt-3 text-xs text-[var(--ed-stone)]">
                <span>
                  Match MVP:{' '}
                  <strong className="font-bold text-[var(--ed-ink)]">
                    {match.winner.mvpPlayer}
                  </strong>
                </span>
                <span className="num font-bold text-emerald-600 dark:text-emerald-400">
                  {match.winner.mvpKills} Frags
                </span>
              </div>
            )}
          </div>

          {/* Right 7 cols: Top Squads in this match */}
          <div className="min-w-0 space-y-4 p-5 md:col-span-7 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="kicker">Top Squads Placement</span>
              <span className="text-xs font-semibold text-[var(--ed-stone)]">{match.mapName || 'Erangel'}</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--ed-hair)]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--ed-hair)] bg-[var(--ed-sand)]/60">
                  <tr>
                    <th className="ed-th w-12 py-2.5 px-3 text-center">#</th>
                    <th className="ed-th py-2.5 px-3">Team</th>
                    <th className="ed-th py-2.5 px-2 text-center">Kills</th>
                    <th className="ed-th py-2.5 px-3 text-right">Points Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ed-hair)] font-medium">
                  {match.topSquads && match.topSquads.length > 0 ? (
                    match.topSquads.map((s) => (
                      <tr key={`${s.rank}-${s.teamName}`} className="transition-colors hover:bg-[var(--ed-sand)]/50">
                        <td className="px-3 py-2 text-center font-bold text-[var(--ed-stone)]">
                          #{s.rank}
                        </td>
                        <td className="px-3 py-2 font-bold text-[var(--ed-ink)]">
                          {s.teamName}
                        </td>
                        <td className="px-2 py-2 text-center font-semibold text-[var(--ed-stone)]">
                          {s.finishes} K
                        </td>
                        <td className="num px-3 py-2 text-right font-bold text-[var(--ed-blue)]">
                          +{s.totalPts} pts
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-[var(--ed-stone)]">
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
        <div className="space-y-3 p-8 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ed-blue)]/10 text-[var(--ed-blue)] text-xl font-bold">
            <Clock className="h-6 w-6" />
          </div>
          <h4 className="text-xl font-bold uppercase tracking-tight text-[var(--ed-ink)]">
            {matchLabel} ({match.mapName || 'Erangel'})
          </h4>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-[var(--ed-stone)]">
            Scheduled for {new Date(match.scheduledAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            {match.matchTime ? ` at ${match.matchTime}` : ''}. Results will appear here once the match is played.
          </p>
        </div>
      )}
    </section>
  );
}
