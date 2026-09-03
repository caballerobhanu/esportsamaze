import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ArrowRight, CalendarDays, Globe2, ShieldCheck, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Teams Hub | Esports Amaze — Rosters, Profiles & Tournament History',
  description:
    'Browse every esports team in the Esports Amaze wiki — verified rosters, regional info, and tournament history for BGMI, PUBG Mobile and more.',
};

async function getTeamsDirectoryData() {
  try {
    return await prisma.team.findMany({
      include: {
        game: { select: { name: true } },
        _count: { select: { players: true, tournamentRosters: true } },
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Failed to fetch teams directory data:', error);
    return [];
  }
}

export default async function TeamsPage() {
  const teams = await getTeamsDirectoryData();

  const totalPlayers = teams.reduce((acc, t) => acc + (t._count?.players || 0), 0);
  const totalAppearances = teams.reduce((acc, t) => acc + (t._count?.tournamentRosters || 0), 0);
  const regions = new Set(teams.map((t) => t.region?.trim()).filter(Boolean));

  const metrics = [
    { label: 'Teams Tracked', icon: ShieldCheck, value: teams.length },
    { label: 'Players on Rosters', icon: Users, value: totalPlayers },
    { label: 'Event Appearances', icon: CalendarDays, value: totalAppearances },
    { label: 'Regions Covered', icon: Globe2, value: regions.size },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {/* Editorial masthead */}
        <div className="mb-12 space-y-4">
          <span className="ed-chip text-(--ed-stone)">
            <ShieldCheck className="h-3.5 w-3.5 text-(--ed-blue)" />
            Official Team &amp; Roster Wiki
          </span>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">Teams</h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-(--ed-stone)">
            Every organization in the Esports Amaze database — open a team for its active
            roster, trophy cabinet, and verified tournament history.
          </p>
        </div>

        {/* Metric ribbon — one hairline-divided card */}
        <div className="ed-card mb-12 grid grid-cols-2 gap-px bg-(--ed-hair) lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-(--ed-surface) px-6 py-5">
              <p className="ed-label mb-2 flex items-center gap-1.5">
                <m.icon className="h-3.5 w-3.5 text-(--ed-blue)" />
                {m.label}
              </p>
              <p className="font-display text-3xl font-medium tracking-tight">
                <span className="num">{m.value}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Directory grid */}
        {teams.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.slug || team.tag || team.id}`}
                className="ed-card group flex items-center gap-4 p-4 transition-colors hover:border-[var(--ed-blue)]"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-(--ed-hair) bg-(--ed-canvas)">
                  {team.logoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        className="h-full w-full object-contain p-1.5 dark:hidden"
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={team.imageDarkUrl || team.logoUrl}
                        alt=""
                        aria-hidden="true"
                        className="hidden h-full w-full object-contain p-1.5 dark:block"
                      />
                    </>
                  ) : (
                    <span className="font-display text-lg font-medium text-(--ed-blue)">
                      {(team.tag || team.name).slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-display truncate text-base font-medium tracking-tight text-(--ed-ink) transition-colors group-hover:text-[var(--ed-blue)]">
                    {team.name}
                  </h2>
                  <p className="ed-label mt-1.5 truncate">
                    {team.region || 'Global'}
                    {team.game?.name ? ` · ${team.game.name}` : ''}
                    {` · ${team._count.players} player${team._count.players === 1 ? '' : 's'}`}
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 shrink-0 text-(--ed-stone) transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--ed-blue)]" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="ed-card px-6 py-16 text-center text-sm text-(--ed-stone)">
            No teams have been added to the wiki yet. Check back soon.
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
