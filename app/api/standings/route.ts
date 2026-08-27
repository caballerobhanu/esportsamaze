import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { computeTournamentStandings, computeTournamentFraggers } from '@/lib/match-standings';

/**
 * GET /api/standings?tournament=<id>&stage=<id>&type=teams|fraggers
 *
 * Computes cumulative tournament standings from stored MatchTeamResult / MatchPlayerStat rows.
 * Returns both team standings and player fraggers by default (or either one via `type`).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get('tournament');
  const stageId = searchParams.get('stage') ?? undefined;
  const type = searchParams.get('type') ?? 'all'; // 'teams' | 'fraggers' | 'all'

  if (!tournamentId) {
    return NextResponse.json(
      { success: false, error: 'tournament query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, name: true, slug: true, status: true },
    });

    if (!tournament) {
      return NextResponse.json(
        { success: false, error: 'Tournament not found' },
        { status: 404 }
      );
    }

    const [teams, fraggers] = await Promise.all([
      type === 'fraggers'
        ? Promise.resolve([])
        : computeTournamentStandings(tournamentId, stageId),
      type === 'teams'
        ? Promise.resolve([])
        : computeTournamentFraggers(tournamentId, stageId),
    ]);

    return NextResponse.json({
      success: true,
      source: 'database',
      tournament: { id: tournament.id, name: tournament.name, slug: tournament.slug, status: tournament.status },
      data: { teams, fraggers },
    });
  } catch (error) {
    console.error('Standings computation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compute standings' },
      { status: 500 }
    );
  }
}
