'use client';

import * as React from 'react';
import Link from 'next/link';
import { BarChart3, Crosshair, ArrowRight } from 'lucide-react';
import type { TeamStandingEntry, PlayerFraggerEntry } from '@/lib/match-standings';

interface HomeStandingsSectionProps {
  tournamentTitle: string;
  tournamentSlug: string;
  stageName: string;
  standings: TeamStandingEntry[];
  fraggers: PlayerFraggerEntry[];
}

export function HomeStandingsSection({
  tournamentTitle,
  tournamentSlug,
  stageName,
  standings,
  fraggers,
}: HomeStandingsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Official Points Table (8 cols) */}
      <section id="rankings" className="lg:col-span-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300 shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white truncate">
              {tournamentTitle}
            </h2>
            <span className="shrink-0 rounded-full bg-[#0A5FC4]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
              {stageName}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/tournaments/${tournamentSlug}?tab=standings`}
              className="text-xs font-bold text-[#0A5FC4] hover:underline dark:text-blue-400 flex items-center gap-1.5"
            >
              <span>Full Standings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 border-b border-slate-100 dark:bg-white/[0.02] dark:border-white/5">
                <tr>
                  <th className="py-3 px-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 w-12">#</th>
                  <th className="py-3 px-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Team Name</th>
                  <th className="py-3 px-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">Played</th>
                  <th className="py-3 px-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">WWCD 🍗</th>
                  <th className="py-3 px-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">Place Pts</th>
                  <th className="py-3 px-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">Finishes</th>
                  <th className="py-3 px-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">Total Pts</th>
                  <th className="py-3 px-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 hidden sm:table-cell">Recent Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {standings.length > 0 ? (
                  standings.slice(0, 16).map((team) => {
                    return (
                      <tr
                        key={team.teamId}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center">
                          {team.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black text-xs shadow-xs">
                              1
                            </span>
                          ) : team.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-bold text-xs">
                              2
                            </span>
                          ) : team.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-600/20 text-amber-700 dark:text-amber-400 font-bold text-xs">
                              3
                            </span>
                          ) : (
                            <span className="font-bold text-slate-400 text-xs">
                              {team.rank}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/teams/${encodeURIComponent(team.teamSlug || team.teamName.toLowerCase().replace(/\s+/g, '-'))}`}
                            className="flex items-center gap-2.5 group"
                          >
                            {team.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={team.logoUrl}
                                alt={team.teamName}
                                className="w-5 h-5 rounded object-contain shrink-0"
                              />
                            ) : null}
                            <span className="font-bold text-slate-900 group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-400 transition-colors">
                              {team.teamName}
                            </span>
                          </Link>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-500 dark:text-slate-400">
                          {team.matchesPlayed}
                        </td>
                        <td className="py-2.5 px-2 text-center font-black text-amber-600 dark:text-amber-400">
                          {team.wwcd}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-500 dark:text-slate-400">
                          {team.placementPoints}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-500 dark:text-slate-400">
                          {team.eliminationPoints}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-sm text-[#0A5FC4] dark:text-blue-300 bg-[#0A5FC4]/5 dark:bg-blue-500/10">
                          {team.totalPoints}
                        </td>
                        <td className="py-2.5 px-3 text-center hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {team.matchHistory.slice(-5).map((mh, idx) => (
                              <span
                                key={idx}
                                title={`M${mh.matchNumber} (${mh.mapName}): #${mh.rank} (${mh.elimsPoints} K) = ${mh.totalPoints} pts`}
                                className={`w-5 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                                  mh.rank === 1
                                    ? 'bg-amber-400 text-slate-950'
                                    : mh.rank <= 4
                                      ? 'bg-blue-100 text-[#0A5FC4] dark:bg-blue-950/40 dark:text-blue-300'
                                      : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                                }`}
                              >
                                {mh.totalPoints}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                      No points recorded yet for this stage.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Right Column: Top Fraggers (4 cols) */}
      <section id="rankings-fraggers" className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Crosshair className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
              Top Fraggers
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-500 dark:bg-white/10 dark:text-slate-400">
            {stageName}
          </span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {fraggers.length > 0 ? (
              fraggers.slice(0, 5).map((player) => (
                <div
                  key={player.playerId}
                  className="p-4 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                          player.rank === 1
                            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-xs'
                            : player.rank === 2
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                              : player.rank === 3
                                ? 'bg-amber-600/20 text-amber-700 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                        }`}
                      >
                        {player.rank}
                      </span>
                      <div>
                        <Link
                          href={`/players/${encodeURIComponent(player.playerSlug || player.ign.toLowerCase())}`}
                          className="font-bold text-sm text-slate-900 hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400 transition-colors"
                        >
                          {player.ign}
                        </Link>
                        <div className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                          {player.teamName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {player.elims} Kills
                      </div>
                      <div className="text-[11px] font-bold text-slate-400">
                        {player.matchesPlayed} Matches
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Role: <strong className="text-slate-700 dark:text-slate-300 font-bold">{player.role || 'Player'}</strong></span>
                    <span>Headshots: <strong className="text-slate-700 dark:text-slate-300 font-bold">{player.headshots}</strong></span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No player fragger statistics recorded yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
