import Link from 'next/link';
import {
  Banknote,
  CalendarDays,
  MapPin,
  Swords,
  Clock,
  Users,
  Trophy,
  ChevronRight,
  Flame,
  Crown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { AggregatedTeamStanding } from '@/lib/tournament-math';
import type { MatchLite } from '../tournament-matches-panel';
import { ThemeLogo } from './theme-logo';

interface OverviewMatchLite extends MatchLite {
  stageType?: string | null;
  stage?: { name?: string | null } | null;
}

export function EstaticOverviewPanel({
  tournament,
  featuredStageName,
  featuredStandings,
  overallFraggers,
  matches,
  teamsCount,
  resolvedWinner,
  resolvedRunnerUp,
}: {
  tournament: {
    slug: string;
    name: string;
    prizePool?: number | null;
    currency?: string | null;
    usdRate?: number | null;
    startDate: Date;
    endDate: Date;
    gameMode?: string | null;
    eventType?: string | null;
    device?: string | null;
    winner?: string | null;
    runnerUp?: string | null;
    venues?: { venue: { name: string; city?: string | null; country?: string | null }; stageName?: string | null }[];
  };
  featuredStageName: string;
  featuredStandings: AggregatedTeamStanding[];
  overallFraggers: {
    playerId: string;
    ign: string;
    teamName: string;
    teamTag: string;
    elims: number;
    damage: number;
    matchesPlayed?: number;
  }[];
  matches: OverviewMatchLite[];
  teamsCount: number;
  resolvedWinner?: string | null;
  resolvedRunnerUp?: string | null;
}) {
  const completed = matches
    .filter((m) => m.status === 'COMPLETED' && m.teamResults.length > 0)
    .sort((a, b) => (b.overallMatchNumber ?? b.matchNumber ?? 0) - (a.overallMatchNumber ?? a.matchNumber ?? 0));
  const upcoming = matches
    .filter((m) => m.status !== 'COMPLETED')
    .sort((a, b) => (a.overallMatchNumber ?? a.matchNumber ?? 0) - (b.overallMatchNumber ?? b.matchNumber ?? 0));
  const latest = completed[0];
  const fraggers = overallFraggers.slice(0, 5);

  const facts = [
    {
      icon: Banknote,
      label: 'Total Prize Pool',
      value: tournament.prizePool ? `₹${tournament.prizePool.toLocaleString('en-IN')}` : '₹1,00,00,000',
      sub: tournament.usdRate && tournament.prizePool ? `≈ $${Math.round(tournament.prizePool * tournament.usdRate).toLocaleString()} USD` : 'National Major',
    },
    {
      icon: CalendarDays,
      label: 'Tournament Schedule',
      value: `${formatDate(tournament.startDate)} – ${formatDate(tournament.endDate)}`,
      sub: 'Multi-Week LAN',
    },
    {
      icon: MapPin,
      label: 'Official Venue',
      value: tournament.venues?.[0]?.venue.name || 'Nodwin Gaming Arena',
      sub: tournament.venues?.[0]?.venue.city ? `${tournament.venues[0].venue.city}, India` : 'New Delhi, India',
    },
    {
      icon: Users,
      label: 'Format & Line-up',
      value: `${teamsCount} Qualified Squads`,
      sub: tournament.gameMode || 'Battle Royale (Squads TPP)',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 4-Card Quick Facts Grid in Estatic Style */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.label}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#0A5FC4] hover:shadow-lg dark:border-white/10 dark:bg-[#0b1220]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                  {f.label}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#0A5FC4] dark:bg-blue-950/60 dark:text-blue-300">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                {f.value}
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-400">
                {f.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Left Column + Sidebar */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column (8 cols) */}
        <div className="space-y-8 lg:col-span-8">
          {/* Latest Match Result */}
          {latest && (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                    Recent Battle
                  </p>
                  <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
                    <Swords className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
                    Latest Match Result
                  </h3>
                </div>
                <Link
                  href={`/tournaments/${tournament.slug}/preview?tab=matches`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-[#0A5FC4] hover:text-white dark:bg-white/5 dark:text-slate-300 transition-all"
                >
                  All Matches <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Match Header Pill */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/5 mb-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#0A5FC4] px-3 py-0.5 text-xs font-black uppercase tracking-wider text-white">
                    Match #{latest.overallMatchNumber ?? latest.matchNumber}
                  </span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {latest.format || latest.mapName || 'Erangel'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <span>{latest.mapName}</span>
                  <span>•</span>
                  <span>{latest.matchTime || formatDate(latest.scheduledAt)}</span>
                </div>
              </div>

              {/* Lobby Standings Top 3 */}
              <div className="space-y-2.5">
                {latest.teamResults.slice(0, 5).map((tr, idx) => (
                  <div
                    key={tr.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-[#070b14]"
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-900'
                            : idx === 2
                            ? 'bg-amber-600/20 text-amber-600'
                            : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                        }`}
                      >
                        {tr.rank}
                      </span>
                      <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/30">
                        {tr.team?.logoUrl || tr.team?.imageDarkUrl ? (
                          <ThemeLogo
                            lightSrc={tr.team?.logoUrl}
                            darkSrc={tr.team?.imageDarkUrl}
                            alt={tr.team?.name || 'Team'}
                            className="object-contain p-1"
                          />
                        ) : (
                          <span className="text-xs font-black text-slate-400">
                            {tr.team?.name?.slice(0, 2).toUpperCase() || 'TM'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {tr.team?.name || 'Unknown Squad'}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          {tr.placePoints || 0} Place + {tr.elimsPoints || 0} Elims
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-[#0A5FC4] dark:text-blue-300">
                        {tr.totalPoints || 0} pts
                      </div>
                      {tr.wwcd && (
                        <div className="text-[10px] font-black uppercase text-amber-500">
                          Winner 🍗
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Featured Stage Standings */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                  {featuredStageName}
                </p>
                <h3 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Stage Standings Leaderboard
                </h3>
              </div>
              <Link
                href={`/tournaments/${tournament.slug}/preview?tab=standings`}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-[#0A5FC4] hover:text-white dark:bg-white/5 dark:text-slate-300 transition-all"
              >
                Full Standings <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                  <tr>
                    <th className="pb-3 w-12 text-center">#</th>
                    <th className="pb-3">Squad</th>
                    <th className="pb-3 text-center">WWCD</th>
                    <th className="pb-3 text-center">Place</th>
                    <th className="pb-3 text-center">Elims</th>
                    <th className="pb-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {featuredStandings.slice(0, 10).map((row) => (
                    <tr
                      key={row.teamId}
                      className="text-sm hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 text-center font-black">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black ${
                            row.rank === 1
                              ? 'bg-amber-400 text-slate-950 shadow-sm'
                              : row.rank === 2
                              ? 'bg-slate-300 text-slate-900'
                              : row.rank === 3
                              ? 'bg-amber-600/20 text-amber-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <Link
                          href={`/teams/${row.teamId}`}
                          className="flex items-center gap-3 font-extrabold hover:text-[#0A5FC4] transition-colors"
                        >
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-black/40">
                            {row.logoUrl || row.logoDarkUrl ? (
                              <ThemeLogo
                                lightSrc={row.logoUrl}
                                darkSrc={row.logoDarkUrl}
                                alt={row.teamName}
                                className="object-contain p-1"
                              />
                            ) : (
                              <span className="text-xs font-black text-slate-400">
                                {row.teamName.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="truncate">{row.teamName}</span>
                        </Link>
                      </td>
                      <td className="py-3 text-center font-bold text-amber-500">
                        {row.wwcd > 0 ? `${row.wwcd} 🍗` : '—'}
                      </td>
                      <td className="py-3 text-center font-bold text-slate-500">{row.placementPoints}</td>
                      <td className="py-3 text-center font-bold text-slate-500">{row.eliminationPoints}</td>
                      <td className="py-3 text-right font-black text-[#0A5FC4] dark:text-blue-300 text-base">
                        {row.totalPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column (Sidebar, 4 cols) */}
        <div className="space-y-8 lg:col-span-4">
          {/* Top Eliminators / Fraggers Leaderboard */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                  Combat Specialists
                </p>
                <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
                  <Flame className="h-4 w-4 text-rose-500" />
                  Top Eliminators
                </h3>
              </div>
              <Link
                href={`/tournaments/${tournament.slug}/preview?tab=statistics`}
                className="text-xs font-bold text-[#0A5FC4] hover:underline dark:text-blue-300"
              >
                Full List →
              </Link>
            </div>

            <div className="space-y-3">
              {fraggers.map((f, i) => (
                <div
                  key={f.playerId}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${
                        i === 0
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                          : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <Link
                        href={`/players/${f.playerId}`}
                        className="text-sm font-black text-slate-900 dark:text-white hover:text-[#0A5FC4] transition-colors"
                      >
                        {f.ign}
                      </Link>
                      <div className="text-[11px] font-semibold text-slate-400">
                        {f.teamName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-rose-600 dark:text-rose-400">
                      {f.elims} <span className="text-[10px] font-bold text-slate-400 uppercase">kills</span>
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400">
                      {f.matchesPlayed && f.matchesPlayed > 0
                        ? (f.elims / f.matchesPlayed).toFixed(2)
                        : '0.00'}{' '}
                      avg elim
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Prize Pool Spotlight Card (Rich Blue Gradient) */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A5FC4] via-blue-700 to-indigo-900 p-6 text-white shadow-xl shadow-blue-900/20">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[.2em] text-blue-200">
                  Prize Spotlight
                </span>
                <h4 className="mt-1 text-3xl font-black tracking-tight">
                  {tournament.prizePool ? `₹${tournament.prizePool.toLocaleString('en-IN')}` : '₹1,00,00,000'}
                </h4>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm text-amber-300">
                <Crown className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-3 text-xs text-blue-100/90 leading-relaxed">
              Official prize purse distributed across Finals champions, runner-ups, and special performance awards.
            </p>

            <div className="mt-5 border-t border-white/15 pt-4">
              <Link
                href={`/tournaments/${tournament.slug}/preview?tab=prizepool`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-[#0A5FC4] shadow hover:bg-blue-50 transition-colors"
              >
                Inspect Distribution <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
