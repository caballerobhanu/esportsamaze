import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { Trophy, Swords, Users, ArrowRight, Flame } from 'lucide-react';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';
import { TournamentsDirectoryExplorer } from '@/components/tournaments/tournaments-directory-explorer';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tournaments Hub | Esports Amaze — Official Standings, Matches & Stats',
  description:
    'Discover official BGMI, Valorant, CS2, MLBB, and Free Fire esports tournaments. Track live scorecards, match schedules, prize pools, and championship standings.',
};

async function getTournamentsDirectoryData() {
  try {
    const [tournaments, games] = await Promise.all([
      prisma.tournament.findMany({
        include: {
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
    <div className="flex flex-1 flex-col">

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {/* Editorial masthead */}
        <div className="mb-12 space-y-4">
          <span className="ed-chip text-(--ed-stone)">
            <Trophy className="h-3.5 w-3.5 text-(--ed-blue)" />
            Official Esports Tournament Portal
          </span>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Tournaments
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-(--ed-stone)">
            Browse verified esports championships — live stage standings, scheduled matchups,
            prize distributions, and team rosters.
          </p>
        </div>

        {/* Metric ribbon — one hairline-divided card */}
        <div className="ed-card mb-12 grid grid-cols-2 gap-px bg-(--ed-hair) lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-(--ed-surface) px-6 py-5">
              <p className="ed-label mb-2 flex items-center gap-1.5">
                <m.icon className={`h-3.5 w-3.5 ${m.live ? 'text-rose-500' : 'text-(--ed-blue)'}`} />
                {m.label}
              </p>
              <p className="font-display flex items-center gap-2 text-3xl font-medium tracking-tight">
                {m.live && m.value > 0 && <span className="h-2 w-2 animate-live rounded-full bg-rose-500" />}
                <span className="num">{m.value}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Featured split card */}
        {featured && (
          <div className="ed-card mb-14">
            <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-(--ed-hair) px-2.5 py-1 text-xs font-medium ${
                      featured.status === 'ONGOING'
                        ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'text-(--ed-blue)'
                    }`}
                  >
                    {featured.status === 'ONGOING' && <span className="h-1.5 w-1.5 animate-live rounded-full bg-rose-500" />}
                    {featured.status === 'ONGOING' ? 'Featured live tournament' : 'Featured upcoming tournament'}
                  </span>
                  <span className="ed-chip text-(--ed-stone)">{featured.game.name}</span>
                </div>

                <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  {featured.name}
                </h2>

                <p className="max-w-lg text-sm leading-relaxed text-(--ed-stone)">
                  {featured.series ? `${featured.series} ${featured.season ? `· ${featured.season}` : ''} — ` : ''}
                  {featured._count.teams} professional teams competing across official match stages.
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--ed-stone)">
                  <span className="num text-(--ed-ink)">
                    {formatDate(featured.startDate)} — {formatDate(featured.endDate)}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="num text-(--ed-ink)">{featured._count.matches} matches</span>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-6 rounded-xl border border-(--ed-hair) bg-(--ed-canvas) p-6 lg:col-span-4">
                <div>
                  <p className="ed-label mb-2">Prize Pool</p>
                  <div className="font-display text-2xl font-medium tracking-tight">
                    <PrizePoolBadge amount={featured.prizePool} currency={featured.currency} usdRate={featured.usdRate} />
                  </div>
                </div>

                <Link href={`/tournaments/${featured.slug}`} className="ed-btn w-full">
                  View Standings & Matches <ArrowRight className="h-4 w-4" />
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
