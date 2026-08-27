import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  computeTeamRankings,
  computePlayerRankings,
  type TeamRankingRow,
  type PlayerRankingRow,
} from '@/lib/krafton-rankings';

const LIMIT = 10;

// Fallback rows (legacy RankingData_* shape) used when the database is
// empty or unreachable. Spans tiers/dates so decay and transfers are visible.
const MOCK_TEAM_ROWS: TeamRankingRow[] = [
  { tournament: 'BGIS 2025', tier: 'Tier 1', endDate: '2025-02-02', team: 'Team Soul', rank: 1 },
  { tournament: 'BMPS 2025', tier: 'Tier 1', endDate: '2025-06-15', team: 'Team Soul', rank: 2 },
  { tournament: 'BGIS 2025', tier: 'Tier 1', endDate: '2025-02-02', team: 'GodLike Esports', rank: 3 },
  { tournament: 'PMSL Global', tier: 'Publisher', endDate: '2025-09-10', team: 'GodLike Esports', rank: 4 },
  { tournament: 'BMPS 2025', tier: 'Tier 1', endDate: '2025-06-15', team: 'K9 Esports', rank: 1 },
  { tournament: 'Battlegrounds Cup', tier: 'Tier 2', endDate: '2026-01-20', team: 'K9 Esports', rank: 3 },
  { tournament: 'BGIS 2025', tier: 'Tier 1', endDate: '2025-02-02', team: 'True Rippers', rank: 6 },
  { tournament: 'Battlegrounds Cup', tier: 'Tier 2', endDate: '2026-03-08', team: 'Team Vitality', rank: 1 },
  { tournament: 'IEM Catania', tier: 'Tier 2', endDate: '2025-11-30', team: 'Team Vitality', rank: 2 },
  { tournament: 'PMSL Global', tier: 'Publisher', endDate: '2025-09-10', team: 'Vampire Esports', rank: 2 },
  { tournament: 'Battlegrounds Cup', tier: 'Tier 2', endDate: '2026-03-08', team: 'Reckoning Esports', rank: 4 },
  { tournament: 'IEM Catania', tier: 'Tier 2', endDate: '2025-11-30', team: 'Reckoning Esports', rank: 8 },
  { tournament: 'Scrims Season 12', tier: 'Tier 3', endDate: '2026-05-18', team: '4Merical Vibes', rank: 2 },
  { tournament: 'BMPS 2025', tier: 'Tier 1', endDate: '2025-06-15', team: '4Merical Vibes', rank: 7 },
];

const MOCK_PLAYER_ROWS: PlayerRankingRow[] = [
  { tournament: 'BGIS 2025', tier: 'Tier 1', endDate: '2025-02-02', player: 'Jonathan', team: 'GodLike Esports', finishes: 78, mvpTourney: true, mvpFinals: false, igl: false, survivor: false, emerging: false },
  { tournament: 'BMPS 2025', tier: 'Tier 1', endDate: '2025-06-15', player: 'Jonathan', team: 'GodLike Esports', finishes: 52, mvpTourney: false, mvpFinals: true, igl: false, survivor: true, emerging: false },
  { tournament: 'BGIS 2025', tier: 'Tier 1', endDate: '2025-02-02', player: 'Manya', team: 'Team Soul', finishes: 71, mvpTourney: false, mvpFinals: false, igl: true, survivor: false, emerging: false },
  { tournament: 'BMPS 2025', tier: 'Tier 1', endDate: '2025-06-15', player: 'Manya', team: 'Team Soul', finishes: 60, mvpTourney: true, mvpFinals: false, igl: true, survivor: false, emerging: false },
  { tournament: 'PMSL Global', tier: 'Publisher', endDate: '2025-09-10', player: 'Manya', team: 'Team Soul', finishes: 45, mvpTourney: false, mvpFinals: false, igl: false, survivor: true, emerging: false },
  { tournament: 'BMPS 2025', tier: 'Tier 1', endDate: '2025-06-15', player: 'Spower', team: 'K9 Esports', finishes: 66, mvpTourney: false, mvpFinals: false, igl: false, survivor: false, emerging: true },
  { tournament: 'Battlegrounds Cup', tier: 'Tier 2', endDate: '2026-01-20', player: 'Spower', team: 'K9 Esports', finishes: 38, mvpTourney: false, mvpFinals: false, igl: false, survivor: false, emerging: false },
  { tournament: 'BGIS 2025', tier: 'Tier 1', endDate: '2025-02-02', player: 'Jokerr', team: 'True Rippers', finishes: 49, mvpTourney: false, mvpFinals: false, igl: false, survivor: false, emerging: false },
  { tournament: 'IEM Catania', tier: 'Tier 2', endDate: '2025-11-30', player: 'Jokerr', team: 'Team Vitality', finishes: 41, mvpTourney: false, mvpFinals: false, igl: false, survivor: false, emerging: false },
  { tournament: 'PMSL Global', tier: 'Publisher', endDate: '2025-09-10', player: 'Tricky', team: 'Vampire Esports', finishes: 55, mvpTourney: false, mvpFinals: false, igl: false, survivor: true, emerging: false },
  { tournament: 'Scrims Season 12', tier: 'Tier 3', endDate: '2026-05-18', player: 'AjjuBhai', team: '4Merical Vibes', finishes: 44, mvpTourney: true, mvpFinals: false, igl: false, survivor: false, emerging: false },
  { tournament: 'Battlegrounds Cup', tier: 'Tier 2', endDate: '2026-03-08', player: 'Nakul', team: 'Reckoning Esports', finishes: 36, mvpTourney: false, mvpFinals: false, igl: true, survivor: false, emerging: false },
];

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const [teamRows, playerRows] = await Promise.all([
      prisma.teamRanking.findMany({
        orderBy: { endDate: 'desc' },
        include: {
          team: { select: { name: true, logoUrl: true, imageDarkUrl: true, slug: true } },
          tournament: { select: { name: true } },
        },
      }),
      prisma.playerRanking.findMany({
        orderBy: { endDate: 'desc' },
        include: {
          player: { select: { ign: true, slug: true } },
          team: { select: { name: true, slug: true } },
          tournament: { select: { name: true } },
        },
      }),
    ]);

    if (teamRows.length > 0 || playerRows.length > 0) {
      // Logo + slug lookup per team name (used by both tables)
      const logos: Record<
        string,
        { logoUrl: string | null; imageDarkUrl: string | null; slug?: string }
      > = {};
      for (const r of teamRows) {
        logos[r.team.name.toLowerCase()] = {
          logoUrl: r.team.logoUrl,
          imageDarkUrl: r.team.imageDarkUrl,
          slug: r.team.slug ?? undefined,
        };
      }

      // attach team slugs to players for sub-name links
      const teamSlugByName = new Map<string, string>();
      for (const [name, meta] of Object.entries(logos)) {
        if (meta.slug) teamSlugByName.set(name, meta.slug);
      }

      const teams = computeTeamRankings(
        teamRows.map((r) => ({
          tournament: r.tournament?.name ?? '',
          tier: r.tier,
          endDate: toDateOnly(r.endDate),
          team: r.team.name,
          rank: r.rank,
        }))
      ).slice(0, LIMIT);

      const players = computePlayerRankings(
        playerRows.map((r) => ({
          tournament: r.tournament?.name ?? '',
          tier: r.tier,
          endDate: toDateOnly(r.endDate),
          player: r.player.ign,
          team: r.team?.name ?? '',
          finishes: r.finishes,
          mvpTourney: r.mvpTourney > 0,
          mvpFinals: r.mvpFinals > 0,
          igl: r.igl > 0,
          survivor: r.survivor > 0,
          emerging: r.emerging > 0,
        }))
      )
        .slice(0, LIMIT)
        .map((p) => {
          const row = playerRows.find(
            (r) => r.player.ign.toLowerCase() === p.name.toLowerCase()
          );
          return {
            ...p,
            slug: row?.player.slug ?? undefined,
            teamSlug: p.team ? teamSlugByName.get(p.team.toLowerCase()) : undefined,
          };
        });

      return NextResponse.json({
        success: true,
        source: 'database',
        data: { teams, players, logos },
      });
    }
  } catch (error) {
    console.warn('Prisma rankings query failed, falling back to mock data:', error);
  }

  return NextResponse.json({
    success: true,
    source: 'fallback',
    data: {
      teams: computeTeamRankings(MOCK_TEAM_ROWS).slice(0, LIMIT),
      players: computePlayerRankings(MOCK_PLAYER_ROWS).slice(0, LIMIT),
      logos: {},
    },
  });
}
