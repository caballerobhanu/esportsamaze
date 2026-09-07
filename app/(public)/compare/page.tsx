import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import prisma from '@/lib/prisma';
import {
  Swords,
  Trophy,
  Crown,
  Users,
  Target,
  Shield,
  Zap,
  ArrowRight,
  TrendingUp,
  Award,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Head-to-Head Comparison | eSportsAmaze',
  description: 'Compare esports teams and players side-by-side with match history, rankings, win rates, and direct head-to-head records.',
};

export const dynamic = 'force-dynamic';

interface ComparePageProps {
  searchParams: Promise<{
    type?: string;
    teamA?: string;
    teamB?: string;
    playerA?: string;
    playerB?: string;
  }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const isPlayerMode = params.type === 'players';

  // Load list of all teams and players for selection controls
  const [teamsList, playersList] = await Promise.all([
    prisma.team.findMany({
      select: { id: true, name: true, slug: true, logoUrl: true, tag: true },
      orderBy: { name: 'asc' },
    }),
    prisma.player.findMany({
      select: { id: true, ign: true, slug: true, avatarUrl: true, currentTeam: { select: { name: true } } },
      orderBy: { ign: 'asc' },
    }),
  ]);

  if (!isPlayerMode) {
    // Team comparison mode
    const defaultTeamA = teamsList[0]?.slug;
    const defaultTeamB = teamsList[1]?.slug || teamsList[0]?.slug;

    const slugA = params.teamA || defaultTeamA;
    const slugB = params.teamB || defaultTeamB;

    const [teamA, teamB] = await Promise.all([
      slugA
        ? prisma.team.findFirst({
            where: { OR: [{ slug: slugA }, { id: slugA }] },
            include: {
              tournamentsWon: true,
              tournamentsRunnerUp: true,
              players: { where: { status: 'ACTIVE' }, select: { id: true, ign: true, slug: true, role: true, avatarUrl: true } },
            },
          })
        : null,
      slugB
        ? prisma.team.findFirst({
            where: { OR: [{ slug: slugB }, { id: slugB }] },
            include: {
              tournamentsWon: true,
              tournamentsRunnerUp: true,
              players: { where: { status: 'ACTIVE' }, select: { id: true, ign: true, slug: true, role: true, avatarUrl: true } },
            },
          })
        : null,
    ]);

    // Head-to-head calculations
    let sharedMatchesCount = 0;
    let teamAWinsInShared = 0;
    let teamBWinsInShared = 0;
    let teamAWwcdInShared = 0;
    let teamBWwcdInShared = 0;
    let teamAElimsInShared = 0;
    let teamBElimsInShared = 0;

    let lifetimeA = { matches: 0, wwcd: 0, elims: 0, damage: 0, totalPoints: 0 };
    let lifetimeB = { matches: 0, wwcd: 0, elims: 0, damage: 0, totalPoints: 0 };

    if (teamA && teamB) {
      const [resultsA, resultsB] = await Promise.all([
        prisma.matchTeamResult.findMany({
          where: { teamId: teamA.id },
          select: { matchGameId: true, rank: true, wwcd: true, elimsPoints: true, damage: true, totalPoints: true },
        }),
        prisma.matchTeamResult.findMany({
          where: { teamId: teamB.id },
          select: { matchGameId: true, rank: true, wwcd: true, elimsPoints: true, damage: true, totalPoints: true },
        }),
      ]);

      // Calculate lifetime aggregates
      for (const r of resultsA) {
        lifetimeA.matches += 1;
        if (r.wwcd) lifetimeA.wwcd += 1;
        lifetimeA.elims += r.elimsPoints;
        lifetimeA.damage += r.damage;
        lifetimeA.totalPoints += r.totalPoints;
      }
      for (const r of resultsB) {
        lifetimeB.matches += 1;
        if (r.wwcd) lifetimeB.wwcd += 1;
        lifetimeB.elims += r.elimsPoints;
        lifetimeB.damage += r.damage;
        lifetimeB.totalPoints += r.totalPoints;
      }

      const mapB = new Map(resultsB.map((r) => [r.matchGameId, r]));
      for (const rA of resultsA) {
        const rB = mapB.get(rA.matchGameId);
        if (rB) {
          sharedMatchesCount++;
          if (rA.rank < rB.rank) teamAWinsInShared++;
          else if (rB.rank < rA.rank) teamBWinsInShared++;
          if (rA.wwcd) teamAWwcdInShared++;
          if (rB.wwcd) teamBWwcdInShared++;
          teamAElimsInShared += rA.elimsPoints;
          teamBElimsInShared += rB.elimsPoints;
        }
      }
    }

    return (
      <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white py-6 sm:py-8">
        <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 space-y-8">
          {/* Header Banner */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
              <Swords className="h-3.5 w-3.5" />
              <span>Head-to-Head Analytics</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                  Head-to-Head Comparison
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Direct match lobby encounters, lifetime production benchmarks, and roster comparisons.
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center rounded-full bg-slate-200/70 p-1 dark:bg-white/10 shrink-0">
                <Link
                  href={`/compare?type=teams&teamA=${slugA || ''}&teamB=${slugB || ''}`}
                  className="rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600 transition-all"
                >
                  Teams
                </Link>
                <Link
                  href="/compare?type=players"
                  className="rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-all"
                >
                  Players
                </Link>
              </div>
            </div>
          </div>

          {/* Selection Selectors Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <form method="GET" action="/compare" className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <input type="hidden" name="type" value="teams" />
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Select Team A</label>
                <select
                  name="teamA"
                  defaultValue={slugA || ''}
                  className="w-full px-4 py-2.5 text-sm font-bold rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-[#0A5FC4] dark:border-white/10 dark:bg-[#141e33] dark:text-white"
                >
                  {teamsList.map((t) => (
                    <option key={`a-${t.id}`} value={t.slug || t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Select Team B</label>
                <div className="flex gap-2">
                  <select
                    name="teamB"
                    defaultValue={slugB || ''}
                    className="flex-1 px-4 py-2.5 text-sm font-bold rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-[#0A5FC4] dark:border-white/10 dark:bg-[#141e33] dark:text-white"
                  >
                    {teamsList.map((t) => (
                      <option key={`b-${t.id}`} value={t.slug || t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-2xl bg-[#0A5FC4] text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    Compare
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Team vs Team Header Board */}
          {teamA && teamB && (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                <div className="grid grid-cols-1 sm:grid-cols-11 gap-6 items-center">
                  {/* Team A */}
                  <div className="sm:col-span-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-slate-100 bg-slate-50 p-2 shrink-0 flex items-center justify-center dark:border-white/10 dark:bg-[#141e33]">
                      {teamA.logoUrl ? (
                        <Image src={teamA.logoUrl} alt={teamA.name} fill className="object-contain p-2" />
                      ) : (
                        <span className="text-2xl font-black text-[#0A5FC4]">{teamA.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300 mb-1.5 inline-block">
                        {teamA.region || 'Global'}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                        {teamA.name}
                      </h2>
                      <Link href={`/teams/${teamA.slug}`} className="text-xs font-bold text-[#0A5FC4] hover:underline inline-flex items-center gap-1 mt-1 dark:text-blue-400">
                        View Profile <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* VS badge */}
                  <div className="sm:col-span-1 flex flex-col items-center justify-center text-center">
                    <span className="h-12 w-12 rounded-full border-2 border-[#0A5FC4]/30 bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300 flex items-center justify-center font-black text-sm shadow-sm">
                      VS
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mt-2">{sharedMatchesCount} Battles</span>
                  </div>

                  {/* Team B */}
                  <div className="sm:col-span-5 flex flex-col sm:flex-row-reverse items-center gap-4 text-center sm:text-right">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-slate-100 bg-slate-50 p-2 shrink-0 flex items-center justify-center dark:border-white/10 dark:bg-[#141e33]">
                      {teamB.logoUrl ? (
                        <Image src={teamB.logoUrl} alt={teamB.name} fill className="object-contain p-2" />
                      ) : (
                        <span className="text-2xl font-black text-[#0A5FC4]">{teamB.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300 mb-1.5 inline-block">
                        {teamB.region || 'Global'}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                        {teamB.name}
                      </h2>
                      <Link href={`/teams/${teamB.slug}`} className="text-xs font-bold text-[#0A5FC4] hover:underline inline-flex items-center gap-1 mt-1 dark:text-blue-400">
                        View Profile <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Head-to-Head Records */}
              <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Swords className="h-4.5 w-4.5 text-[#0A5FC4] dark:text-blue-300" />
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Direct Encounters (Same Match Lobby)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{sharedMatchesCount} Shared Matches</span>
                </div>

                <div className="p-6 space-y-6">
                  {sharedMatchesCount > 0 ? (
                    <div className="space-y-6">
                      {/* Metric 1: Head-to-head higher placement score */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className={teamAWinsInShared >= teamBWinsInShared ? 'text-[#0A5FC4] dark:text-blue-300' : 'text-slate-400'}>
                            {teamA.name}: {teamAWinsInShared} Out-placements
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Higher Placement</span>
                          <span className={teamBWinsInShared >= teamAWinsInShared ? 'text-[#0A5FC4] dark:text-blue-300' : 'text-slate-400'}>
                            {teamB.name}: {teamBWinsInShared} Out-placements
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
                          <div
                            className="bg-[#0A5FC4] h-full transition-all"
                            style={{ width: `${(teamAWinsInShared / (sharedMatchesCount || 1)) * 100}%` }}
                          />
                          <div
                            className="bg-slate-400 dark:bg-slate-600 h-full transition-all"
                            style={{ width: `${(teamBWinsInShared / (sharedMatchesCount || 1)) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Metric 2: WWCD count in shared matches */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className={teamAWwcdInShared >= teamBWwcdInShared ? 'text-amber-500 font-black' : 'text-slate-400'}>
                            {teamAWwcdInShared} Chicken Dinners
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">WWCD In Shared Matches</span>
                          <span className={teamBWwcdInShared >= teamAWwcdInShared ? 'text-amber-500 font-black' : 'text-slate-400'}>
                            {teamBWwcdInShared} Chicken Dinners
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
                          <div
                            className="bg-amber-400 h-full transition-all"
                            style={{
                              width: `${
                                teamAWwcdInShared + teamBWwcdInShared > 0
                                   ? (teamAWwcdInShared / (teamAWwcdInShared + teamBWwcdInShared)) * 100
                                  : 50
                              }%`,
                            }}
                          />
                          <div
                            className="bg-amber-600 h-full transition-all"
                            style={{
                              width: `${
                                teamAWwcdInShared + teamBWwcdInShared > 0
                                  ? (teamBWwcdInShared / (teamAWwcdInShared + teamBWwcdInShared)) * 100
                                  : 50
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Metric 3: Elimination points in shared matches */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className={teamAElimsInShared >= teamBElimsInShared ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400'}>
                            {teamAElimsInShared} Shared Elims
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Head-to-Head Eliminations</span>
                          <span className={teamBElimsInShared >= teamAElimsInShared ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-400'}>
                            {teamBElimsInShared} Shared Elims
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{
                              width: `${
                                teamAElimsInShared + teamBElimsInShared > 0
                                  ? (teamAElimsInShared / (teamAElimsInShared + teamBElimsInShared)) * 100
                                  : 50
                              }%`,
                            }}
                          />
                          <div
                            className="bg-emerald-700 h-full transition-all"
                            style={{
                              width: `${
                                teamAElimsInShared + teamBElimsInShared > 0
                                  ? (teamBElimsInShared / (teamAElimsInShared + teamBElimsInShared)) * 100
                                  : 50
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-xs text-slate-400">
                      These two organizations haven&apos;t competed in the same match lobbies yet in the database.
                    </p>
                  )}
                </div>
              </section>

              {/* Franchise Lifetime Statistics Comparison Table */}
              <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                <div className="flex items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4.5 w-4.5 text-amber-500" />
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      Franchise Lifetime Benchmarks
                    </h3>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/30 border-b border-slate-100 dark:bg-white/[0.01] dark:border-white/5">
                        <th className="py-3 px-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 w-1/3">{teamA.name}</th>
                        <th className="py-3 px-4 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 w-1/3">Benchmark Metric</th>
                        <th className="py-3 px-4 text-right text-[11px] font-black uppercase tracking-wider text-slate-400 w-1/3">{teamB.name}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                      {[
                        {
                          label: 'Championships',
                          valA: teamA.tournamentsWon.length,
                          valB: teamB.tournamentsWon.length,
                          format: (v: number) => `${v} Titles`,
                        },
                        {
                          label: 'Runner-up Finishes',
                          valA: teamA.tournamentsRunnerUp.length,
                          valB: teamB.tournamentsRunnerUp.length,
                          format: (v: number) => `${v} Times`,
                        },
                        {
                          label: 'Matches Recorded',
                          valA: lifetimeA.matches,
                          valB: lifetimeB.matches,
                          format: (v: number) => `${v} Games`,
                        },
                        {
                          label: 'Total Chicken Dinners',
                          valA: lifetimeA.wwcd,
                          valB: lifetimeB.wwcd,
                          format: (v: number) => `${v} WWCD`,
                        },
                        {
                          label: 'Win Rate %',
                          valA: lifetimeA.matches ? (lifetimeA.wwcd / lifetimeA.matches) * 100 : 0,
                          valB: lifetimeB.matches ? (lifetimeB.wwcd / lifetimeB.matches) * 100 : 0,
                          format: (v: number) => `${v.toFixed(1)}%`,
                        },
                        {
                          label: 'Total Eliminations',
                          valA: lifetimeA.elims,
                          valB: lifetimeB.elims,
                          format: (v: number) => `${v}`,
                        },
                        {
                          label: 'Avg Elims / Match',
                          valA: lifetimeA.matches ? lifetimeA.elims / lifetimeA.matches : 0,
                          valB: lifetimeB.matches ? lifetimeB.elims / lifetimeB.matches : 0,
                          format: (v: number) => `${v.toFixed(2)}`,
                        },
                      ].map(({ label, valA, valB, format }) => {
                        const aWins = valA > valB;
                        const bWins = valB > valA;
                        return (
                          <tr key={label} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                            <td className={`p-4 text-sm ${aWins ? 'font-black text-[#0A5FC4] dark:text-blue-300' : 'font-medium text-slate-400'}`}>
                              {format(valA)} {aWins && '★'}
                            </td>
                            <td className="p-4 text-center font-black text-xs text-slate-500 uppercase tracking-wider">
                              {label}
                            </td>
                            <td className={`p-4 text-right text-sm ${bWins ? 'font-black text-[#0A5FC4] dark:text-blue-300' : 'font-medium text-slate-400'}`}>
                              {bWins && '★'} {format(valB)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Side by Side Active Roster */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Team A Roster */}
                <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
                      <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{teamA.name} Line-up</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{teamA.players.length} Players</span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {teamA.players.map((p) => (
                      <Link
                        key={p.id}
                        href={`/players/${p.slug || p.ign.toLowerCase()}`}
                        className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between hover:border-[#0A5FC4] hover:shadow-xs transition-all dark:border-white/5 dark:bg-[#141e33]/50 text-xs"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{p.ign}</span>
                        <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400">{p.role || 'Player'}</span>
                      </Link>
                    ))}
                  </div>
                </section>

                {/* Team B Roster */}
                <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
                      <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{teamB.name} Line-up</h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{teamB.players.length} Players</span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {teamB.players.map((p) => (
                      <Link
                        key={p.id}
                        href={`/players/${p.slug || p.ign.toLowerCase()}`}
                        className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between hover:border-[#0A5FC4] hover:shadow-xs transition-all dark:border-white/5 dark:bg-[#141e33]/50 text-xs"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{p.ign}</span>
                        <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400">{p.role || 'Player'}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // PLAYER COMPARISON MODE
  // ==========================================
  const defaultPlayerA = playersList[0]?.slug;
  const defaultPlayerB = playersList[1]?.slug || playersList[0]?.slug;

  const slugA = params.playerA || defaultPlayerA;
  const slugB = params.playerB || defaultPlayerB;

  const [playerA, playerB] = await Promise.all([
    slugA
      ? prisma.player.findFirst({
          where: { OR: [{ slug: slugA }, { ign: { equals: slugA, mode: 'insensitive' } }, { id: slugA }] },
          include: { currentTeam: true, game: true },
        })
      : null,
    slugB
      ? prisma.player.findFirst({
          where: { OR: [{ slug: slugB }, { ign: { equals: slugB, mode: 'insensitive' } }, { id: slugB }] },
          include: { currentTeam: true, game: true },
        })
      : null,
  ]);

  let sharedMatchesCount = 0;
  let elimsSharedA = 0;
  let elimsSharedB = 0;

  let lifetimeA = { matches: 0, elims: 0, damage: 0 };
  let lifetimeB = { matches: 0, elims: 0, damage: 0 };

  if (playerA && playerB) {
    const [statsA, statsB] = await Promise.all([
      prisma.matchPlayerStat.findMany({
        where: { playerId: playerA.id },
        select: { matchGameId: true, playerElims: true, damage: true },
      }),
      prisma.matchPlayerStat.findMany({
        where: { playerId: playerB.id },
        select: { matchGameId: true, playerElims: true, damage: true },
      }),
    ]);

    for (const s of statsA) {
      lifetimeA.matches++;
      lifetimeA.elims += s.playerElims;
      lifetimeA.damage += s.damage;
    }
    for (const s of statsB) {
      lifetimeB.matches++;
      lifetimeB.elims += s.playerElims;
      lifetimeB.damage += s.damage;
    }

    const mapB = new Map(statsB.map((s) => [s.matchGameId, s]));
    for (const sA of statsA) {
      const sB = mapB.get(sA.matchGameId);
      if (sB) {
        sharedMatchesCount++;
        elimsSharedA += sA.playerElims;
        elimsSharedB += sB.playerElims;
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white py-6 sm:py-8">
      <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 space-y-8">
        {/* Header Banner */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
            <Swords className="h-3.5 w-3.5" />
            <span>Head-to-Head Analytics</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
                Player vs Player Comparison
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                Direct lobby encounters, career production benchmarks, and head-to-head fragging metrics.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center rounded-full bg-slate-200/70 p-1 dark:bg-white/10 shrink-0">
              <Link
                href="/compare?type=teams"
                className="rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-all"
              >
                Teams
              </Link>
              <Link
                href={`/compare?type=players&playerA=${slugA || ''}&playerB=${slugB || ''}`}
                className="rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600 transition-all"
              >
                Players
              </Link>
            </div>
          </div>
        </div>

        {/* Selection Selectors Form */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
          <form method="GET" action="/compare" className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <input type="hidden" name="type" value="players" />
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Select Player A</label>
              <select
                name="playerA"
                defaultValue={slugA || ''}
                className="w-full px-4 py-2.5 text-sm font-bold rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-[#0A5FC4] dark:border-white/10 dark:bg-[#141e33] dark:text-white"
              >
                {playersList.map((p) => (
                  <option key={`pa-${p.id}`} value={p.slug || p.id}>
                    {p.ign} {p.currentTeam ? `(${p.currentTeam.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Select Player B</label>
              <div className="flex gap-2">
                <select
                  name="playerB"
                  defaultValue={slugB || ''}
                  className="flex-1 px-4 py-2.5 text-sm font-bold rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-[#0A5FC4] dark:border-white/10 dark:bg-[#141e33] dark:text-white"
                >
                  {playersList.map((p) => (
                    <option key={`pb-${p.id}`} value={p.slug || p.id}>
                      {p.ign} {p.currentTeam ? `(${p.currentTeam.name})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#0A5FC4] text-white text-xs font-black uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Compare
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Player vs Player Masthead */}
        {playerA && playerB && (
          <>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="grid grid-cols-1 sm:grid-cols-11 gap-6 items-center">
                {/* Player A */}
                <div className="sm:col-span-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-slate-100 bg-slate-50 p-2 shrink-0 flex items-center justify-center overflow-hidden dark:border-white/10 dark:bg-[#141e33]">
                    {playerA.avatarUrl ? (
                      <Image src={playerA.avatarUrl} alt={playerA.ign} fill className="object-contain object-bottom" />
                    ) : (
                      <span className="text-2xl font-black text-[#0A5FC4]">{playerA.ign.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300 mb-1.5 inline-block">
                      {playerA.currentTeam?.name || 'Free Agent'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                      {playerA.ign}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">{playerA.role || 'Athlete'}</p>
                    <Link href={`/players/${playerA.slug}`} className="text-xs font-bold text-[#0A5FC4] hover:underline inline-flex items-center gap-1 mt-1 dark:text-blue-400">
                      View Profile <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* VS badge */}
                <div className="sm:col-span-1 flex flex-col items-center justify-center text-center">
                  <span className="h-12 w-12 rounded-full border-2 border-[#0A5FC4]/30 bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300 flex items-center justify-center font-black text-sm shadow-sm">
                    VS
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mt-2">{sharedMatchesCount} Shared</span>
                </div>

                {/* Player B */}
                <div className="sm:col-span-5 flex flex-col sm:flex-row-reverse items-center gap-4 text-center sm:text-right">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-slate-100 bg-slate-50 p-2 shrink-0 flex items-center justify-center overflow-hidden dark:border-white/10 dark:bg-[#141e33]">
                    {playerB.avatarUrl ? (
                      <Image src={playerB.avatarUrl} alt={playerB.ign} fill className="object-contain object-bottom" />
                    ) : (
                      <span className="text-2xl font-black text-[#0A5FC4]">{playerB.ign.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300 mb-1.5 inline-block">
                      {playerB.currentTeam?.name || 'Free Agent'}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                      {playerB.ign}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">{playerB.role || 'Athlete'}</p>
                    <Link href={`/players/${playerB.slug}`} className="text-xs font-bold text-[#0A5FC4] hover:underline inline-flex items-center gap-1 mt-1 dark:text-blue-400">
                      View Profile <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Head-to-Head Encounters */}
            <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Swords className="h-4.5 w-4.5 text-[#0A5FC4] dark:text-blue-300" />
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Direct Lobby Encounters
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400">{sharedMatchesCount} Shared Matches</span>
              </div>

              <div className="p-6">
                {sharedMatchesCount > 0 ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className={elimsSharedA >= elimsSharedB ? 'text-[#0A5FC4] dark:text-blue-300' : 'text-slate-400'}>
                          {playerA.ign}: {elimsSharedA} Elims
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Head-to-Head Eliminations</span>
                        <span className={elimsSharedB >= elimsSharedA ? 'text-[#0A5FC4] dark:text-blue-300' : 'text-slate-400'}>
                          {playerB.ign}: {elimsSharedB} Elims
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
                        <div
                          className="bg-[#0A5FC4] h-full transition-all"
                          style={{
                            width: `${
                              elimsSharedA + elimsSharedB > 0
                                ? (elimsSharedA / (elimsSharedA + elimsSharedB)) * 100
                                : 50
                            }%`,
                          }}
                        />
                        <div
                          className="bg-slate-400 dark:bg-slate-600 h-full transition-all"
                          style={{
                            width: `${
                              elimsSharedA + elimsSharedB > 0
                                ? (elimsSharedB / (elimsSharedA + elimsSharedB)) * 100
                                : 50
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="py-8 text-center text-xs text-slate-400">
                    No shared match lobbies recorded between {playerA.ign} and {playerB.ign} yet.
                  </p>
                )}
              </div>
            </section>

            {/* Lifetime Career Benchmarks Table */}
            <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
              <div className="flex items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-[#0A5FC4] dark:text-blue-300" />
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    Career Production Benchmarks
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-100 dark:bg-white/[0.01] dark:border-white/5">
                      <th className="py-3 px-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-400 w-1/3">{playerA.ign}</th>
                      <th className="py-3 px-4 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 w-1/3">Benchmark Metric</th>
                      <th className="py-3 px-4 text-right text-[11px] font-black uppercase tracking-wider text-slate-400 w-1/3">{playerB.ign}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                    {[
                      {
                        label: 'Total Career Matches',
                        valA: lifetimeA.matches,
                        valB: lifetimeB.matches,
                        format: (v: number) => `${v}`,
                      },
                      {
                        label: 'Career Eliminations',
                        valA: lifetimeA.elims,
                        valB: lifetimeB.elims,
                        format: (v: number) => `${v} Kills`,
                      },
                      {
                        label: 'Eliminations / Match',
                        valA: lifetimeA.matches ? lifetimeA.elims / lifetimeA.matches : 0,
                        valB: lifetimeB.matches ? lifetimeB.elims / lifetimeB.matches : 0,
                        format: (v: number) => `${v.toFixed(2)}`,
                      },
                      {
                        label: 'Avg Damage / Match',
                        valA: lifetimeA.matches ? lifetimeA.damage / lifetimeA.matches : 0,
                        valB: lifetimeB.matches ? lifetimeB.damage / lifetimeB.matches : 0,
                        format: (v: number) => `${Math.round(v)}`,
                      },
                      {
                        label: 'Primary Role',
                        valA: 0,
                        valB: 0,
                        formatCustomA: playerA.role || 'Athlete',
                        formatCustomB: playerB.role || 'Athlete',
                      },
                    ].map(({ label, valA, valB, format, formatCustomA, formatCustomB }) => {
                      const aWins = valA > valB;
                      const bWins = valB > valA;
                      return (
                        <tr key={label} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                          <td className={`p-4 text-sm ${aWins ? 'font-black text-[#0A5FC4] dark:text-blue-300' : 'font-medium text-slate-400'}`}>
                            {formatCustomA || (format ? format(valA) : valA)} {aWins && '★'}
                          </td>
                          <td className="p-4 text-center font-black text-xs text-slate-500 uppercase tracking-wider">
                            {label}
                          </td>
                          <td className={`p-4 text-right text-sm ${bWins ? 'font-black text-[#0A5FC4] dark:text-blue-300' : 'font-medium text-slate-400'}`}>
                            {bWins && '★'} {formatCustomB || (format ? format(valB) : valB)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
