import type { Metadata } from 'next';
import { Crosshair, Users, Trophy } from 'lucide-react';
import prisma from '@/lib/prisma';
import { PlayersDirectoryExplorer, type PlayersDirectoryItem } from '@/components/players/players-directory-explorer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Players Hub | eSportsAmaze — Pro Players, IGNs, Roles & Statistics',
  description:
    'Browse verified battle royale esports athletes, pro rosters, statistics, and career achievements across BGMI, PUBG Mobile and more.',
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
          <Crosshair className="w-3.5 h-3.5" /> Pro Athlete Directory
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
          Esports Players Hub
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          Discover verified competitive players across top battle royale games. View player roles, career statistics, match histories, and team rosters.
        </p>
      </div>

      <PlayersDirectoryExplorer players={players} />
    </div>
  );
}
