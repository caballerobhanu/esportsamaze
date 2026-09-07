import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { Trophy, Swords, Users, ArrowRight, Flame } from 'lucide-react';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';
import { TournamentsDirectoryExplorer } from '@/components/tournaments/tournaments-directory-explorer';
import { formatDate } from '@/lib/utils';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Tournaments Hub | eSportsAmaze — Official Standings, Matches & Stats',
  description:
    'Discover official BGMI, Valorant, CS2, MLBB, and Free Fire esports tournaments. Track live scorecards, match schedules, prize pools, and championship standings.',
};

async function getTournamentsDirectoryData() {
  try {
    const [tournaments, games] = await Promise.all([
      prisma.tournament.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          tier: true,
          status: true,
          series: true,
          season: true,
          eventType: true,
          gameMode: true,
          startDate: true,
          endDate: true,
          prizePool: true,
          currency: true,
          usdRate: true,
          imageUrl: true,
          imageDarkUrl: true,
          winner: true,
          game: { select: { name: true, slug: true } },
          venues: { include: { venue: { select: { name: true, city: true, country: true } } } },
          organizers: { include: { organizer: { select: { name: true } } } },
          _count: {
            select: {
              matches: true,
              teams: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      }),
      prisma.game.findMany({
        select: { name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { tournaments, games };
  } catch (error) {
    console.error('Failed to fetch tournaments directory data:', error);
    return { tournaments: [], games: [] };
  }
}

export default async function TournamentsPage() {
  const { tournaments, games } = await getTournamentsDirectoryData();

  const totalTournaments = tournaments.length;
  const liveTournaments = tournaments.filter((t) => t.status === 'ONGOING');
  const upcomingTournaments = tournaments.filter((t) => t.status === 'UPCOMING');
  const totalMatchesTracked = tournaments.reduce((acc, t) => acc + (t._count?.matches || 0), 0);
  const totalTeamsTracked = tournaments.reduce((acc, t) => acc + (t._count?.teams || 0), 0);

  // Featured Tournament Hero: Prioritize LIVE, then first UPCOMING, then newest
  const featured =
    liveTournaments[0] ||
    upcomingTournaments[0] ||
    tournaments[0] ||
    null;

  const metrics = [
    { label: 'Total Tournaments', icon: Trophy, value: totalTournaments },
    { label: 'Live Competitions', icon: Flame, value: liveTournaments.length, live: true },
    { label: 'Matches Tracked', icon: Swords, value: totalMatchesTracked },
    { label: 'Teams Registered', icon: Users, value: totalTeamsTracked },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* Estatic masthead */}
        <div className="mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
            <Trophy className="h-3.5 w-3.5" />
            <span>Official Esports Championships</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Tournaments
          </h1>
          <p className="max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
            Browse verified esports championships — live stage standings, scheduled matchups,
            prize distributions, and competitive squad leaderboards.
          </p>
        </div>

        {/* Metric ribbon — rounded-3xl card */}
        <div className="mb-10 grid grid-cols-2 gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0b1220] md:grid-cols-4 md:divide-x divide-slate-200 dark:divide-white/10">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-1.5 p-3 text-center">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <m.icon className={`h-3.5 w-3.5 ${m.live ? 'text-rose-500' : 'text-[#0A5FC4] dark:text-blue-300'}`} />
                {m.label}
              </p>
              <p className="flex items-center gap-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {m.live && m.value > 0 && <span className="h-2 w-2 animate-ping rounded-full bg-rose-500" />}
                <span>{m.value}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Featured split card */}
        {featured && (
          <div className="relative mb-12 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                      featured.status === 'ONGOING'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300'
                    }`}
                  >
                    {featured.status === 'ONGOING' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />}
                    {featured.status === 'ONGOING' ? 'Live Tournament' : 'Upcoming Event'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    {featured.game.name}
                  </span>
                </div>

                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                  {featured.name}
                </h2>

                <p className="max-w-lg text-sm font-medium text-slate-500 dark:text-slate-400">
                  {featured.series ? `${featured.series} ${featured.season ? `· ${featured.season}` : ''} — ` : ''}
                  {featured._count.teams} professional teams competing across official match stages.
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>
                    {formatDate(featured.startDate)} — {formatDate(featured.endDate)}
                  </span>
                  <span>•</span>
                  <span>{featured._count.matches} matches scheduled</span>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 dark:border-white/10 dark:bg-white/5 lg:col-span-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Total Prize Pool</p>
                  <div className="text-2xl font-black tracking-tight text-[#0A5FC4] dark:text-blue-300">
                    <PrizePoolBadge amount={featured.prizePool} currency={featured.currency} usdRate={featured.usdRate} />
                  </div>
                </div>

                <Link
                  href={`/tournaments/${featured.slug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A5FC4] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-blue-500/25 transition-all hover:bg-blue-600 hover:shadow-lg"
                >
                  <span>View Standings &amp; Matches</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Directory */}
        <TournamentsDirectoryExplorer tournaments={tournaments} games={games} />
      </main>
    </div>
  );
}
