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
      <div className="ed-card-head">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href={`/tournaments/${match.tournament.slug}`}
            className="ed-chip text-[var(--ed-blue)] font-semibold hover:border-[var(--ed-blue)] transition-colors"
          >
            {match.tournament.name.split(' ').slice(0, 2).join(' ')}
          </Link>
          <span className="font-display font-medium text-sm text-[var(--ed-ink)]">
            {matchLabel} · {match.mapName || 'Erangel'}
          </span>
          {match.stage?.name && (
            <span className="text-xs text-[var(--ed-stone)] hidden sm:inline">
              · {match.stage.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isCompleted ? (
            <span className="ed-chip text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Result Verified
            </span>
          ) : (
            <span className="ed-chip text-[var(--ed-stone)]">
              <Clock className="w-3.5 h-3.5 text-[var(--ed-blue)]" /> Scheduled {match.matchTime ? `at ${match.matchTime}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Body: Match Result Showcase */}
      {isCompleted && match.winner ? (
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[var(--ed-hair)]">
          {/* Left 5 cols: Match Winner Box */}
          <div className="md:col-span-5 p-5 sm:p-6 space-y-4 bg-[var(--ed-sand)]/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ed-stone)] flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" /> Match Winner
              </span>
              <span className="ed-chip text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10 border-amber-500/30">
                1st Place
              </span>
            </div>

            <div>
              <Link
                href={`/teams/${encodeURIComponent(match.winner.teamSlug || match.winner.teamName.toLowerCase().replace(/\s+/g, '-'))}`}
                className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-[var(--ed-ink)] hover:text-[var(--ed-blue)] transition-colors block"
              >
                {match.winner.teamName}
              </Link>
            </div>

            {/* Metric counters */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--ed-hair)] text-center">
              <div className="p-2.5 rounded-lg border border-[var(--ed-hair)] bg-[var(--ed-surface)]">
                <span className="text-[10px] text-[var(--ed-stone)] uppercase font-semibold block">Placement</span>
                <strong className="num text-base text-[var(--ed-ink)]">
                  +{match.winner.placementPts}
                </strong>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--ed-hair)] bg-[var(--ed-surface)]">
                <span className="text-[10px] text-[var(--ed-stone)] uppercase font-semibold block">Finishes</span>
                <strong className="num text-base text-[var(--ed-ink)]">
                  +{match.winner.finishes} K
                </strong>
              </div>
              <div className="p-2.5 rounded-lg border border-[var(--ed-blue)]/30 bg-[var(--ed-blue)]/10">
                <span className="text-[10px] text-[var(--ed-blue)] uppercase font-bold block">Total Pts</span>
                <strong className="num text-base text-[var(--ed-blue)]">
                  {match.winner.totalPts}
                </strong>
              </div>
            </div>

            {match.winner.mvpPlayer && (
              <div className="text-xs text-[var(--ed-stone)] flex items-center justify-between pt-1 border-t border-[var(--ed-hair)]/60">
                <span>
                  Match MVP:{' '}
                  <strong className="text-[var(--ed-ink)] font-semibold">
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
          <div className="md:col-span-7 p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="ed-label">Top Squads Placement</span>
              <span className="text-xs text-[var(--ed-stone)] font-mono">{match.mapName || 'Erangel'}</span>
            </div>

            <div className="rounded-lg border border-[var(--ed-hair)] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--ed-sand)]/50 border-b border-[var(--ed-hair)]">
                  <tr>
                    <th className="ed-th text-center w-12">#</th>
                    <th className="ed-th">Team</th>
                    <th className="ed-th text-center">Kills</th>
                    <th className="ed-th text-right">Points Added</th>
                  </tr>
                </thead>
                <tbody className="ed-rows font-medium">
                  {match.topSquads && match.topSquads.length > 0 ? (
                    match.topSquads.map((s) => (
                      <tr key={`${s.rank}-${s.teamName}`} className="hover:bg-[var(--ed-sand)]/30 transition-colors">
                        <td className="py-2.5 px-3 text-center num text-[var(--ed-stone)] font-bold">
                          #{s.rank}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[var(--ed-ink)]">
                          {s.teamName}
                        </td>
                        <td className="py-2.5 px-3 text-center num text-[var(--ed-stone)]">
                          {s.finishes} K
                        </td>
                        <td className="py-2.5 px-3 text-right num font-bold text-emerald-600 dark:text-emerald-400">
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
        <div className="p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--ed-sand)] text-[var(--ed-blue)] flex items-center justify-center mx-auto text-xl font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="font-display text-xl font-medium text-[var(--ed-ink)]">
            {matchLabel} ({match.mapName || 'Erangel'})
          </h4>
          <p className="text-xs text-[var(--ed-stone)] max-w-md mx-auto leading-relaxed">
            Scheduled for {new Date(match.scheduledAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            {match.matchTime ? ` at ${match.matchTime}` : ''}. Results and player statistics will be officially published here immediately after match conclusion.
          </p>
        </div>
      )}
    </section>
  );
}
