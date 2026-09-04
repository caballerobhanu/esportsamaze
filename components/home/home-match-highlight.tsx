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
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-white/10 dark:bg-[#0b1220]">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60 dark:border-white/5 dark:bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href={`/tournaments/${match.tournament.slug}`}
            className="rounded-full bg-[#0A5FC4]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#0A5FC4] hover:bg-[#0A5FC4]/20 dark:bg-[#0A5FC4]/20 dark:text-blue-300 transition-colors"
          >
            {match.tournament.name.split(' ').slice(0, 2).join(' ')}
          </Link>
          <span className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
            {matchLabel} · {match.mapName || 'Erangel'}
          </span>
          {match.stage?.name && (
            <span className="text-xs font-bold text-slate-400 hidden sm:inline">
              · {match.stage.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Result Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-[#0A5FC4]" /> Scheduled {match.matchTime ? `at ${match.matchTime}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Body: Match Result Showcase */}
      {isCompleted && match.winner ? (
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-white/5">
          {/* Left 5 cols: Match Winner Box */}
          <div className="md:col-span-5 p-6 space-y-4 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent dark:from-blue-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" /> Match Winner
              </span>
              <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-400/20">
                1st Place WWCD
              </span>
            </div>

            <div>
              <Link
                href={`/teams/${encodeURIComponent(match.winner.teamSlug || match.winner.teamName.toLowerCase().replace(/\s+/g, '-'))}`}
                className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400 transition-colors block"
              >
                {match.winner.teamName}
              </Link>
            </div>

            {/* Metric counters */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 text-center">
              <div className="p-3 rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0e1726]">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Placement</span>
                <strong className="text-lg font-black text-slate-900 dark:text-white">
                  +{match.winner.placementPts}
                </strong>
              </div>
              <div className="p-3 rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0e1726]">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Finishes</span>
                <strong className="text-lg font-black text-slate-900 dark:text-white">
                  +{match.winner.finishes} K
                </strong>
              </div>
              <div className="p-3 rounded-2xl border border-[#0A5FC4]/30 bg-[#0A5FC4]/10 shadow-xs dark:border-blue-500/30 dark:bg-blue-500/10">
                <span className="text-[10px] text-[#0A5FC4] dark:text-blue-300 uppercase font-black tracking-wider block">Total Pts</span>
                <strong className="text-lg font-black text-[#0A5FC4] dark:text-blue-300">
                  {match.winner.totalPts}
                </strong>
              </div>
            </div>

            {match.winner.mvpPlayer && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                <span>
                  Match MVP:{' '}
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {match.winner.mvpPlayer}
                  </strong>
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {match.winner.mvpKills} Frags
                </span>
              </div>
            )}
          </div>

          {/* Right 7 cols: Top Squads in this match */}
          <div className="md:col-span-7 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Top Squads Placement
              </span>
              <span className="text-xs font-bold text-slate-400">{match.mapName || 'Erangel'}</span>
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden dark:border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 border-b border-slate-100 dark:bg-white/[0.02] dark:border-white/5">
                  <tr>
                    <th className="py-2.5 px-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 w-12">#</th>
                    <th className="py-2.5 px-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Team</th>
                    <th className="py-2.5 px-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">Kills</th>
                    <th className="py-2.5 px-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400">Points Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                  {match.topSquads && match.topSquads.length > 0 ? (
                    match.topSquads.map((s) => (
                      <tr key={`${s.rank}-${s.teamName}`} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-2 px-3 text-center font-black text-slate-400">
                          #{s.rank}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                          {s.teamName}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-500 dark:text-slate-400">
                          {s.finishes} K
                        </td>
                        <td className="py-2 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
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
        <div className="p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0A5FC4]/10 text-[#0A5FC4] flex items-center justify-center mx-auto text-xl font-bold dark:bg-[#0A5FC4]/20 dark:text-blue-300">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            {matchLabel} ({match.mapName || 'Erangel'})
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Scheduled for {new Date(match.scheduledAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            {match.matchTime ? ` at ${match.matchTime}` : ''}. Results and player statistics will be officially published here immediately after match conclusion.
          </p>
        </div>
      )}
    </section>
  );
}
