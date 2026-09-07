import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { BulkJsonMatchImporter } from '@/components/admin/bulk-json-match-importer';
import { MultiMatchMatrixGrid, type MatrixTournamentOption } from '@/components/admin/multi-match-matrix-grid';

export const dynamic = 'force-dynamic';

export default async function AdminMatchMatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ tournamentId?: string; stage?: string; view?: 'json' | 'matrix' }>;
}) {
  if (!(await isAdmin())) {
    redirect('/admin/login');
  }

  const { tournamentId, stage, view } = await searchParams;
  const activeView = view || 'json'; // Default to zero-selection Universal JSON/Excel view

  // The heavy tournament→matches→games graph is only consumed by the matrix
  // grid (which needs it client-side for tournament switching). The default
  // JSON importer view only needs light reference data, so skip the deep
  // query entirely there instead of serializing every match into the payload.
  const allTeams = await prisma.team.findMany({
    select: { id: true, name: true, tag: true },
    orderBy: { name: 'asc' },
  });

  let tournaments: MatrixTournamentOption[] = [];
  let referenceTournaments: { id: string; name: string; slug: string }[];

  if (activeView === 'matrix') {
    const fullTournaments = await prisma.tournament.findMany({
      where: tournamentId ? { id: tournamentId } : undefined,
      take: tournamentId ? 1 : 25,
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        formatDetails: true,
        game: { select: { name: true, slug: true } },
        stages: {
          orderBy: { sequence: 'asc' },
          select: { id: true, name: true, sequence: true },
        },
        teams: {
          orderBy: { seed: 'asc' },
          select: {
            teamId: true,
            team: {
              select: {
                id: true,
                name: true,
                displayName: true,
                tag: true,
                logoUrl: true,
                imageDarkUrl: true,
              },
            },
          },
        },
        matches: {
          orderBy: [{ matchNumber: 'asc' }, { scheduledAt: 'asc' }],
          select: {
            id: true,
            matchNumber: true,
            overallMatchNumber: true,
            format: true,
            stageType: true,
            groupName: true,
            mapName: true,
            status: true,
            scheduledAt: true,
            stage: { select: { id: true, name: true } },
            games: {
              orderBy: { sequence: 'asc' },
              select: {
                id: true,
                sequence: true,
                mapName: true,
                teamResults: {
                  select: {
                    id: true,
                    teamId: true,
                    rank: true,
                    wwcd: true,
                    placePoints: true,
                    elimsPoints: true,
                    bonusPoints: true,
                    totalPoints: true,
                    damage: true,
                    survivalTime: true,
                    healing: true,
                    damageReceived: true,
                    headshots: true,
                    assists: true,
                    knockouts: true,
                    longestElim: true,
                    vehicleElims: true,
                    grenadeElims: true,
                    smokesUsed: true,
                    grenadesUsed: true,
                    molotovsUsed: true,
                    flashUsed: true,
                    airdrops: true,
                    rescues: true,
                    distDrove: true,
                    distWalk: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    tournaments = fullTournaments.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      game: t.game,
      formatDetails: t.formatDetails,
      stages: t.stages,
      teams: t.teams,
      matches: t.matches.map((m) => ({
        ...m,
        scheduledAt: m.scheduledAt.toISOString(),
        status: m.status as any,
      })),
    }));
    referenceTournaments = fullTournaments.map((t) => ({ id: t.id, name: t.name, slug: t.slug }));
  } else {
    referenceTournaments = await prisma.tournament.findMany({
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, slug: true },
    });
  }

  const referenceData = {
    tournaments: referenceTournaments,
    teams: allTeams,
  };

  return (
    <div className="space-y-6">
      {/* View Mode Switcher Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <a
            href="/admin/matches/matrix?view=json"
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeView === 'json'
                ? 'bg-(--ed-blue) text-white shadow-md shadow-(--ed-blue)/25'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            ⚡ Universal Bulk Importer (Players &amp; Teams)
          </a>
          <a
            href="/admin/matches/matrix?view=matrix"
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeView === 'matrix'
                ? 'bg-(--ed-blue) text-white shadow-md shadow-(--ed-blue)/25'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            📊 Interactive Score Matrix Grid
          </a>
        </div>

        <span className="text-[11px] font-bold text-slate-400">
          {activeView === 'json' ? 'Paste complete Player Stats or Team Scorecards with headers' : 'Tournament filtered interactive grid'}
        </span>
      </div>

      {activeView === 'json' ? (
        <BulkJsonMatchImporter referenceData={referenceData} />
      ) : (
        <MultiMatchMatrixGrid
          tournaments={tournaments}
          initialTournamentId={tournamentId}
          initialStageName={stage}
        />
      )}
    </div>
  );
}
