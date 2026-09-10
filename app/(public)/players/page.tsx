import type { Metadata } from 'next';
import { Crosshair, Users, ShieldCheck, Flame } from 'lucide-react';
import prisma from '@/lib/prisma';
import { PlayersDirectoryExplorer, type PlayersDirectoryItem } from '@/components/players/players-directory-explorer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Players Hub | eSportsAmaze — Pro Players, IGNs, Roles & Statistics',
  description:
    'Browse verified battle royale esports athletes, pro rosters, career statistics, and achievements across BGMI, PUBG Mobile and more.',
};

async function getPlayersDirectoryData(): Promise<PlayersDirectoryItem[]> {
  try {
    const list = await prisma.player.findMany({
      where: { isVerified: true },
      select: {
        id: true,
        ign: true,
        slug: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatarUrl: true,
        nationality: true,
        isVerified: true,
        game: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        currentTeam: {
          select: {
            id: true,
            name: true,
            tag: true,
            logoUrl: true,
          },
        },
        _count: {
          select: {
            matchStats: true,
            transferHistory: true,
          },
        },
      },
      orderBy: { ign: 'asc' },
    });

    return list.map((p) => ({
      ...p,
      name: [p.firstName, p.lastName].filter(Boolean).join(' ') || null,
    }));
  } catch (error) {
    console.error('Failed to fetch players directory data:', error);
    return [];
  }
}

export default async function PlayersPage() {
  const players = await getPlayersDirectoryData();

  const totalAthletes = players.length;
  const totalAssaulters = players.filter(
    (p) => (p.role || '').toLowerCase().includes('assaulter') || (p.role || '').toLowerCase().includes('frag')
  ).length;
  const totalIgls = players.filter(
    (p) => (p.role || '').toLowerCase().includes('igl') || (p.role || '').toLowerCase().includes('lead')
  ).length;
  const teamsRepresented = new Set(players.map((p) => p.currentTeam?.id).filter(Boolean)).size;

  const metrics = [
    { label: 'Verified Athletes', icon: Crosshair, value: totalAthletes },
    { label: 'Assaulters & Fraggers', icon: Flame, value: totalAssaulters },
    { label: 'In-Game Leaders (IGLs)', icon: ShieldCheck, value: totalIgls },
    { label: 'Rosters Represented', icon: Users, value: teamsRepresented },
  ];

  return (
    <div className="min-h-screen bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      {/* ================= HERO MASTHEAD ================= */}
      <section className="border-b border-[var(--ed-hair)] bg-[var(--ed-surface)] py-9 sm:py-12">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="kicker inline-flex items-center gap-2 text-[var(--ed-blue)] font-bold text-xs uppercase tracking-wider">
                <Crosshair className="h-3.5 w-3.5 text-[var(--ed-blue)]" aria-hidden />
                Official Pro Athlete Directory
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
                Players
              </h1>
              <p className="mt-2 max-w-xl text-sm font-medium text-[var(--ed-stone)]">
                Discover verified competitive esports athletes — explore tactical roles, team history, match performances, and carrier records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT ================= */}
      <main className="mx-auto w-full max-w-[1200px] space-y-10 px-4 py-10 sm:px-6">
        {/* Metric ribbon — flat editorial card */}
        <div className="ed-card grid grid-cols-2 md:grid-cols-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] overflow-hidden shadow-xs">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="flex flex-col items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-4 py-6 last:border-b-0 md:border-r md:last:border-r-0"
            >
              <m.icon className="h-4 w-4 text-[var(--ed-blue)]" aria-hidden />
              <p className="num text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{m.value}</p>
              <p className="ed-label text-[10px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Directory Explorer */}
        <PlayersDirectoryExplorer players={players} />
      </main>
    </div>
  );
}
