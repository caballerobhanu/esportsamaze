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
      <section id="rankings" className="lg:col-span-8 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <BarChart3 className="w-5 h-5 text-[var(--ed-blue)] shrink-0" />
            <h2 className="font-display text-xl font-medium tracking-tight text-[var(--ed-ink)] truncate">
              {tournamentTitle}
            </h2>
            <span className="shrink-0 ed-chip text-[var(--ed-blue)] font-semibold">
              {stageName}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/tournaments/${tournamentSlug}?tab=standings`}
              className="text-xs font-semibold text-[var(--ed-blue)] hover:underline flex items-center gap-1"
            >
              Full Standings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="ed-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--ed-sand)]/50 border-b border-[var(--ed-hair)]">
                <tr>
                  <th className="ed-th text-center w-12">#</th>
                  <th className="ed-th">Team Name</th>
                  <th className="ed-th text-center">Played</th>
                  <th className="ed-th text-center">WWCD 🍗</th>
                  <th className="ed-th text-center">Place Pts</th>
                  <th className="ed-th text-center">Finishes</th>
                  <th className="ed-th text-center font-bold">Total Pts</th>
                  <th className="ed-th text-center hidden sm:table-cell">Recent Form</th>
                </tr>
              </thead>
              <tbody className="ed-rows font-medium">
                {standings.length > 0 ? (
                  standings.slice(0, 16).map((team) => {
                    return (
                      <tr
                        key={team.teamId}
                        className="hover:bg-[var(--ed-sand)]/30 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center num text-[var(--ed-stone)] font-bold">
                          {team.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-400 text-slate-950 font-bold text-xs">
                              1
                            </span>
                          ) : team.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-300 dark:bg-slate-700 text-[var(--ed-ink)] font-bold text-xs">
                              2
                            </span>
                          ) : team.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-amber-700/20 text-amber-700 dark:text-amber-400 font-bold text-xs">
                              3
                            </span>
                          ) : (
                            team.rank
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[var(--ed-ink)]">
                          <Link
                            href={`/teams/${encodeURIComponent(team.teamName.toLowerCase().replace(/\s+/g, '-'))}`}
                            className="flex items-center gap-2 group"
                          >
                            {team.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={team.logoUrl}
                                alt={team.teamName}
                                className="w-5 h-5 object-contain shrink-0"
                              />
                            ) : null}
                            <span className="group-hover:text-[var(--ed-blue)] transition-colors">
                              {team.teamName}
                            </span>
                          </Link>
                        </td>
                        <td className="py-2.5 px-2 text-center num text-[var(--ed-stone)]">
                          {team.matchesPlayed}
                        </td>
                        <td className="py-2.5 px-2 text-center num font-bold text-amber-600 dark:text-amber-400">
                          {team.wwcd}
                        </td>
                        <td className="py-2.5 px-2 text-center num text-[var(--ed-stone)]">
                          {team.placementPoints}
                        </td>
                        <td className="py-2.5 px-2 text-center num text-[var(--ed-stone)]">
                          {team.eliminationPoints}
                        </td>
                        <td className="py-2.5 px-3 text-center num font-bold text-sm text-[var(--ed-ink)] bg-[var(--ed-sand)]/20">
                          {team.totalPoints}
                        </td>
                        <td className="py-2.5 px-3 text-center hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {team.matchHistory.slice(-5).map((mh, idx) => (
                              <span
                                key={idx}
                                title={`M${mh.matchNumber} (${mh.mapName}): #${mh.rank} (${mh.elimsPoints} K) = ${mh.totalPoints} pts`}
                                className={`w-5 h-4 rounded text-[9px] num font-bold flex items-center justify-center ${
                                  mh.rank === 1
                                    ? 'bg-amber-400 text-slate-950 font-bold'
                                    : mh.rank <= 4
                                      ? 'bg-[var(--ed-sand)] text-[var(--ed-ink)]'
                                      : 'bg-[var(--ed-sand)]/50 text-[var(--ed-stone)]'
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
                    <td colSpan={8} className="py-8 text-center text-xs text-[var(--ed-stone)]">
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
      <section id="rankings-fraggers" className="lg:col-span-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display text-xl font-medium tracking-tight text-[var(--ed-ink)]">
              MVP Top Fraggers
            </h2>
          </div>
          <span className="ed-chip text-[var(--ed-stone)]">
            {stageName}
          </span>
        </div>

        <div className="ed-card">
          <div className="ed-rows">
            {fraggers.length > 0 ? (
              fraggers.slice(0, 5).map((player) => (
                <div
                  key={player.playerId}
                  className="p-3.5 hover:bg-[var(--ed-sand)]/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center num font-bold text-xs ${
                          player.rank === 1
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-[var(--ed-sand)] text-[var(--ed-stone)]'
                        }`}
                      >
                        {player.rank}
                      </span>
                      <div>
                        <Link
                          href={`/players/${encodeURIComponent(player.ign.toLowerCase())}`}
                          className="font-semibold text-sm text-[var(--ed-ink)] hover:text-[var(--ed-blue)] transition-colors"
                        >
                          {player.ign}
                        </Link>
                        <div className="text-[11px] text-[var(--ed-stone)] truncate mt-0.5">
                          {player.teamName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="num text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {player.elims} Kills
                      </div>
                      <div className="num text-[11px] text-[var(--ed-stone)]">
                        {player.matchesPlayed} Matches
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-[var(--ed-hair)]/60 flex items-center justify-between text-[11px] text-[var(--ed-stone)]">
                    <span>Role: <strong className="text-[var(--ed-ink)] font-medium">{player.role || 'Player'}</strong></span>
                    <span>Headshots: <strong className="num text-[var(--ed-ink)]">{player.headshots}</strong></span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-[var(--ed-stone)]">
                No player fragger statistics recorded yet.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
