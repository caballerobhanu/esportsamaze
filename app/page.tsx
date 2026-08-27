'use client';

import * as React from 'react';
import { 
  Trophy, 
  ArrowLeftRight, 
  BarChart3, 
  Crosshair, 
  Tv, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Award,
  Clock,
  Layers,
  ChevronRight,
  ShieldAlert,
  Flame,
  ExternalLink,
  Target,
  Sparkles
} from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { EventsSection } from '@/components/events-section';
import { NewsSection } from '@/components/news-section';
import { KraftonRankings } from '@/components/krafton-rankings';
import { Footer } from '@/components/footer';
import {
  CRICINFO_TOURNAMENTS,
  BGMI_GRAND_FINALS_STANDINGS,
  PUBGM_GLOBAL_STANDINGS,
  BR_ROSTER_TRANSFERS,
  BGMI_TOP_FRAGGERS,
  PUBGM_TOP_FRAGGERS
} from '@/lib/bgmi-data';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const currentTournament = CRICINFO_TOURNAMENTS[0];

  const currentMatch =
    currentTournament.matches.find((m) => m.id === 'bgis-m1') ||
    currentTournament.matches[0];

  // Circuit based standings and fraggers
  const currentStandings = currentTournament.circuit === 'BGMI_INDIA' 
    ? BGMI_GRAND_FINALS_STANDINGS 
    : PUBGM_GLOBAL_STANDINGS;

  const currentFraggers = currentTournament.circuit === 'BGMI_INDIA' 
    ? BGMI_TOP_FRAGGERS 
    : PUBGM_TOP_FRAGGERS;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#07090e] text-slate-900 dark:text-slate-100 transition-colors selection:bg-[#0A5FC4] selection:text-white">
      
      {/* 1. Primary Top Navigation Bar (#0A5FC4 Light / #041129 Dark) */}
      <Navbar />

      {/* 2. Live & Upcoming Events Strip (Active / Past toggle) */}
      <EventsSection />

      {/* 3. Main Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-8">

        {/* ================================================================ */}
        {/* NEWS FROM ESPORTSAMAZE.COM (WORDPRESS REST API)                  */}
        {/* ================================================================ */}
        <NewsSection />

        {/* ================================================================ */}
        {/* KRAFTON RANKINGS: TEAMS + PLAYERS (DECAY-ADJUSTED)               */}
        {/* ================================================================ */}
        <KraftonRankings />

        {/* ================================================================ */}
        {/* MATCH HIGHLIGHT CARD: POST-MATCH BREAKDOWN OR UPCOMING PREVIEW   */}
        {/* ================================================================ */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
          
          {/* Header banner */}
          <div className="p-3.5 sm:px-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#0A5FC4] text-white">
                {currentTournament.shortCode}
              </span>
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                Match {currentMatch.matchNumber} Report: {currentMatch.mapName}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                • {currentTournament.title}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {currentMatch.status === 'COMPLETED' ? (
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Official Result Verified
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Scheduled at {currentMatch.scheduledTime}
                </span>
              )}
            </div>
          </div>

          {/* Body: Post Match Result Showcase */}
          {currentMatch.status === 'COMPLETED' && currentMatch.winner ? (
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Left 5 cols: Chicken Dinner Winner Card */}
              <div className="md:col-span-5 p-4 sm:p-5 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    🍗 Winner Winner Chicken Dinner
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                    1st Place
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {currentMatch.winner.teamName}
                  </h3>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                    [{currentMatch.winner.teamTag}]
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-500/20 text-center font-mono">
                  <div className="p-2 rounded bg-white/60 dark:bg-black/30">
                    <span className="text-[10px] text-slate-500 uppercase block">Placement</span>
                    <strong className="text-sm font-black text-slate-900 dark:text-white">+{currentMatch.winner.placementPts}</strong>
                  </div>
                  <div className="p-2 rounded bg-white/60 dark:bg-black/30">
                    <span className="text-[10px] text-slate-500 uppercase block">Finishes</span>
                    <strong className="text-sm font-black text-slate-900 dark:text-white">+{currentMatch.winner.finishes} K</strong>
                  </div>
                  <div className="p-2 rounded bg-amber-500/20">
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase block">Total Pts</span>
                    <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{currentMatch.winner.totalPts}</strong>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1">
                  <span>Match MVP: <strong className="text-slate-900 dark:text-white font-bold">{currentMatch.winner.mvpPlayer}</strong></span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{currentMatch.winner.mvpKills} Frags</span>
                </div>
              </div>

              {/* Right 7 cols: Top Squads in this match */}
              <div className="md:col-span-7 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Match #{currentMatch.matchNumber} Final Placement Standings</span>
                  <span className="font-mono">{currentMatch.mapName}</span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-[#111726] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-3 text-center w-12">Rank</th>
                        <th className="py-2 px-3">Team</th>
                        <th className="py-2 px-3 text-center">Kills</th>
                        <th className="py-2 px-3 text-right">Points Added</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                      {currentMatch.topSquads && currentMatch.topSquads.length > 0 ? (
                        currentMatch.topSquads.map((s) => (
                          <tr key={s.teamTag} className="hover:bg-slate-50 dark:hover:bg-[#141b2b]">
                            <td className="py-2 px-3 text-center font-bold font-mono">
                              #{s.rank}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                              <span className="text-[#0A5FC4] dark:text-amber-400 mr-1.5">[{s.teamTag}]</span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono">
                              {s.finishes} K
                            </td>
                            <td className="py-2 px-3 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                              +{s.totalPts} pts
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            No secondary squad placement records.
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
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto text-xl font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Match {currentMatch.matchNumber} ({currentMatch.mapName})
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Scheduled for {currentMatch.scheduledTime}. Results and player statistics will be officially published here immediately after match conclusion.
              </p>
            </div>
          )}

        </section>

        {/* ================================================================ */}
        {/* OFFICIAL POINTS TABLE & TOP FRAGGERS SPLIT */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Official Points Table (8 cols) */}
          <section id="rankings" className="lg:col-span-8 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#0A5FC4] dark:text-amber-400" />
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Cumulative Points Table (10-Pt Standard)
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 font-mono">
                {currentTournament.stageName}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-[#0f1524] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3">Team Name</th>
                      <th className="py-2.5 px-2 text-center">Played</th>
                      <th className="py-2.5 px-2 text-center">WWCD 🍗</th>
                      <th className="py-2.5 px-2 text-center">Place Pts</th>
                      <th className="py-2.5 px-2 text-center">Finishes</th>
                      <th className="py-2.5 px-3 text-center font-black">Total Pts</th>
                      <th className="py-2.5 px-3 text-center hidden sm:table-cell">Recent Form</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                    {currentStandings.map((team) => (
                      <tr
                        key={team.teamTag}
                        className={cn(
                          'transition hover:bg-slate-50 dark:hover:bg-[#121929]',
                          team.rank <= 3 && 'bg-[#0A5FC4]/[0.02] dark:bg-amber-500/[0.02]'
                        )}
                      >
                        <td className="py-2.5 px-3 text-center font-black text-xs font-mono">
                          {team.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[11px]">
                              1
                            </span>
                          ) : team.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-[11px]">
                              2
                            </span>
                          ) : team.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700/20 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-500">{team.rank}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{team.logo}</span>
                            <span>{team.teamName}</span>
                            <span className="text-[10px] text-[#0A5FC4] dark:text-amber-400 font-semibold font-mono">
                              [{team.teamTag}]
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 font-mono">
                          {team.matchesPlayed}
                        </td>
                        <td className="py-2.5 px-2 text-center font-black text-amber-600 dark:text-amber-400 font-mono">
                          {team.wwcd}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 font-mono">
                          {team.placementPoints}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {team.finishPoints}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-sm text-slate-900 dark:text-white font-mono bg-slate-50 dark:bg-[#0f1524]">
                          {team.totalPoints}
                        </td>
                        <td className="py-2.5 px-3 text-center hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {team.matchHistory.map((mh, idx) => (
                              <span
                                key={idx}
                                title={`M${mh.matchNum} (${mh.map}): #${mh.placement} (${mh.finishes} K) = ${mh.total} pts`}
                                className={cn(
                                  'w-5 h-4 rounded text-[9px] font-mono font-bold flex items-center justify-center',
                                  mh.placement === 1
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : mh.placement <= 4
                                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                    : 'bg-slate-100 dark:bg-slate-900 text-slate-400'
                                )}
                              >
                                {mh.total}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Right Column: Top Fraggers (4 cols) */}
          <section id="rankings-fraggers" className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  MVP Top Fraggers
                </h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Official Stats
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm overflow-hidden">
              {currentFraggers.map((player) => (
                <div key={player.playerIgn} className="p-3.5 hover:bg-slate-50 dark:hover:bg-[#121929] transition">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-xs',
                        player.rank === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      )}>
                        {player.rank}
                      </span>
                      <div>
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {player.playerIgn}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span className="font-bold text-[#0A5FC4] dark:text-amber-400">[{player.teamTag}]</span>
                          <span>•</span>
                          <span>{player.nationality}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {player.finishes} Kills
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {player.damage.toLocaleString('en-US')} DMG
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>Gun: <strong className="text-slate-700 dark:text-slate-300 font-sans">{player.favoriteGun}</strong></span>
                    <span>MVP Pts: <strong className="text-amber-500">{player.mvpPoints}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* ================================================================ */}
        {/* TOURNAMENT CIRCUITS & ROSTER MOVES SECTION */}
        {/* ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
          
          {/* Left: Tournaments (7 cols) */}
          <section id="tournaments" className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#0A5FC4] dark:text-amber-400" />
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Active & Upcoming Tournaments
                </h2>
              </div>
              <span className="text-xs font-bold text-[#0A5FC4] dark:text-amber-400 hover:underline cursor-pointer">
                All Circuits
              </span>
            </div>

            <div className="space-y-3">
              {CRICINFO_TOURNAMENTS.map((tourney) => (
                <div
                  key={tourney.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm space-y-3 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-200">
                          {tourney.circuit === 'BGMI_INDIA' ? 'BGMI India' : 'PUBGM Global'}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                          tourney.phase === 'CURRENT'
                            ? 'bg-rose-500 text-white'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        )}>
                          {tourney.statusLabel}
                        </span>
                      </div>
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white mt-1">
                        {tourney.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tourney.organizer}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-semibold">Prize Pool</div>
                      <div className="text-sm sm:text-base font-black text-amber-500">
                        {tourney.prizePool}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#080d17] border border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#0A5FC4] dark:text-amber-400" />
                      {tourney.dates}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      {tourney.lanVenue || tourney.location}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Right: Roster Moves (5 cols) */}
          <section id="teams" className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Transfer Ledger
                </h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                Verified Signings
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm overflow-hidden">
              {BR_ROSTER_TRANSFERS.map((move) => (
                <div key={move.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-[#121929] transition space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {move.playerIgn}
                      </span>
                      <span className="text-xs text-slate-400">({move.realName})</span>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider',
                      move.type === 'SIGNED' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
                      move.type === 'ROLE_CHANGE' && 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
                      move.type === 'BENCHED' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    )}>
                      {move.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#080d17] text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      {move.fromTeam || 'Free Agent'}
                    </span>
                    <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-black text-slate-900 dark:text-white">
                      {move.toTeam}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Role: <strong className="text-slate-700 dark:text-slate-300">{move.role}</strong></span>
                    <span>{move.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
