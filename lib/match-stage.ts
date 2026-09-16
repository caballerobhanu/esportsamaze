/**
 * Stage classification, shared by the JavaScript surfaces.
 *
 * Grand-Finals detection deliberately mirrors the SQL predicate the team
 * per-tournament recount uses (lib/team-data.ts, `loadTeamTournamentStats`):
 * a stage counts as the Grand Finals when its stage type or its stage name says
 * so, or when the name is the bare "GF". Keeping the rule identical means a
 * "Grand finals only" toggle means the same thing on a team and on a player.
 *
 * Pure module: no Prisma, no React.
 */

export function isGrandFinalsStage(
  stageName?: string | null,
  stageType?: string | null,
): boolean {
  const name = (stageName ?? '').trim().toLowerCase();
  const type = (stageType ?? '').trim().toLowerCase();
  return type.includes('grand final') || name.includes('grand final') || name === 'gf';
}
