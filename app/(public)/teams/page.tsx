import type { Metadata } from 'next';
import {
  CalendarDays,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { TeamsDirectoryExplorer } from '@/components/teams/teams-directory-explorer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Teams Hub | eSportsAmaze — Rosters, Profiles & Tournament History',
  description:
    'Browse every esports team in the eSportsAmaze wiki — verified rosters, regional info, and tournament history for BGMI, PUBG Mobile and more.',
};

async function getTeamsDirectoryData() {
  try {
    return await prisma.team.findMany({
      where: { isVerified: true },
      select: {
        id: true,
        name: true,
        displayName: true,
        slug: true,
        tag: true,
        logoUrl: true,
        imageDarkUrl: true,
        region: true,
        status: true,
        founded: true,
        game: {
          select: {
            name: true,
            slug: true,
            shortName: true,
            logoUrl: true,
            logoDarkUrl: true,
            family: { select: { slug: true, name: true } },
          },
        },
        _count: {
          select: {
            players: true,
            tournamentRosters: true,
            tournamentsWon: true,
          },
        },
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
  const totalTitles = teams.reduce((acc, t) => acc + (t._count?.tournamentsWon || 0), 0);

  const metrics = [
    { label: 'Teams Tracked', icon: ShieldCheck, value: teams.length },
    { label: 'Players on Rosters', icon: Users, value: totalPlayers },
    { label: 'Event Appearances', icon: CalendarDays, value: totalAppearances },
    { label: 'Championships Won', icon: Trophy, value: totalTitles },
  ];

  return (
    <div className="min-h-screen bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      {/* ================= HERO MASTHEAD ================= */}
      <section className="border-b border-[var(--ed-hair)] bg-[var(--ed-surface)] py-9 sm:py-12">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="kicker inline-flex items-center gap-2 text-[var(--ed-blue)]">
                <ShieldCheck className="h-3 w-3 text-[var(--ed-blue)]" aria-hidden />
                Official Team &amp; Roster Wiki
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Teams
              </h1>
              <p className="mt-2 max-w-xl text-sm font-medium text-[var(--ed-stone)]">
                Every organization in the eSportsAmaze verified database — explore active rosters,
                trophy cabinets, match history, and publisher circuit records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT ================= */}
      <main className="mx-auto w-full max-w-[1200px] space-y-10 px-4 py-10 sm:px-6">
        {/* Metric ribbon — flat editorial card */}
        <div className="ed-card grid grid-cols-2 md:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-2 border-b border-[var(--ed-hair)] px-4 py-6 last:border-b-0 md:border-r md:last:border-r-0">
              <m.icon className="h-4 w-4 text-[var(--ed-blue)]" aria-hidden />
              <p className="num text-3xl font-extrabold tracking-tight">{m.value}</p>
              <p className="ed-label">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Directory */}
        <TeamsDirectoryExplorer teams={teams} />
      </main>
    </div>
  );
}