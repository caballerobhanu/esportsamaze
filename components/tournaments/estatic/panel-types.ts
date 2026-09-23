/* Shared payload types for the public tournament (estatic) panels.
   The server page serializes match/team/player data into these shapes and
   every panel consumes them — single source of truth, no React imports. */

export interface TournamentTeamInfo {
  id: string;
  name: string;
  tag?: string | null;
  slug?: string | null;
  logoUrl?: string | null;
  imageDarkUrl?: string | null;
  /** Resolved from the event's country override, then the team's region. Null when neither names a country. */
  countryCode?: string | null;
  matchCount?: number;
}

export interface TeamResultLite {
  id: string;
  rank: number;
  wwcd: boolean;
  placePoints: number;
  elimsPoints: number;
  bonusPoints?: number;
  totalPoints: number;
  damage?: number;
  damageReceived?: number;
  healing?: number;
  headshots?: number;
  assists?: number;
  knockouts?: number;
  longestElim?: number;
  vehicleElims?: number;
  grenadeElims?: number;
  smokesUsed?: number;
  grenadesUsed?: number;
  molotovsUsed?: number;
  flashUsed?: number;
  airdrops?: number;
  rescues?: number;
  distDrove?: number;
  distWalk?: number;
  team: TournamentTeamInfo;
}

export interface PlayerStatLite {
  id: string;
  playerElims: number;
  damage: number;
  isMvp: boolean;
  player: { ign: string };
  team?: { id?: string; name?: string; tag?: string | null } | null;
}

export interface MatchLite {
  id: string;
  format: string;
  matchNumber?: number | null;
  overallMatchNumber?: number | null;
  mapName?: string | null;
  status: string;
  scheduledAt: Date | string;
  matchTime?: string | null;
  streamUrl?: string | null;
  teamResults: TeamResultLite[];
  playerStats: PlayerStatLite[];
}

export interface StageGroup {
  stageName: string;
  matches: MatchLite[];
}

export interface TeamMatchDetail {
  matchId: string;
  stageName: string;
  mapName: string;
  day: string;
  groupName?: string | null;
  rank: number;
  wwcd: boolean;
  placePoints: number;
  elimsPoints: number;
  bonusPoints?: number;
  totalPoints: number;
}

export type TeamPointsMode = 'sum' | 'avg' | 'max';

export interface TeamPerformanceRow {
  teamId: string;
  teamSlug?: string | null;
  teamName: string;
  teamTag?: string | null;
  teamLogo?: string | null;
  teamLogoDark?: string | null;
  /** Resolved from the event's country override, then the team's region — what a flag mode draws. */
  countryCode?: string | null;
  matchesPlayed: number;
  wwcdCount: number;
  winRate: number;
  top5Count: number;
  midCount: number;
  bottomCount: number;
  totalPlacePoints: number;
  avgPlacePoints: number;
  maxPlacePoints: number;
  totalElimsPoints: number;
  avgElims: number;
  maxElims: number;
  totalPoints: number;
  avgTotalPoints: number;
  maxTotalPoints: number;
  matches?: TeamMatchDetail[];
  /**
   * Per-map totals, computed by the statistics panel from the currently-filtered
   * matches: `points` sums the map, `peak` is the best single match on it.
   */
  pointsByMap?: Record<string, { points: number; matches: number; peak: number }>;
  mapStats: Record<
    string,
    {
      mapName: string;
      matchesPlayed: number;
      wwcdCount: number;
      elims: number;
      placePoints: number;
      totalPoints: number;
    }
  >;
  stageStats: Record<
    string,
    {
      stageName: string;
      matchesPlayed: number;
      wwcdCount: number;
      elims: number;
      placePoints: number;
      totalPoints: number;
      maps: Record<string, { matchesPlayed: number; wwcdCount: number; elims: number; totalPoints: number }>;
    }
  >;
}

export interface PlayerPerformanceRow {
  playerId: string;
  playerSlug?: string | null;
  ign: string;
  teamId?: string | null;
  teamSlug?: string | null;
  teamName: string;
  teamTag?: string | null;
  teamLogo?: string | null;
  teamLogoDark?: string | null;
  /** The player's squad's country — a player row draws its team's mark, so it needs the flag too. */
  teamCountryCode?: string | null;
  role?: string | null;
  matchesPlayed: number;
  totalElims: number;
  totalPowerplay: number;
  totalDamage: number;
  totalHeadshots: number;
  totalAssists: number;
  totalKnockouts: number;
  totalSurvivalTime: number;
  totalHealing: number;
  totalDamageReceived: number;
  totalUtilities: number;
  totalDist: number;
  totalMvps: number;
  avgElims: number;
  maxElims?: number;
  zeroElimsMatches?: number;
  fivePlusElimsMatches?: number;
  customStats?: Record<string, number>;
  matchStats: Record<
    string,
    {
      matchId?: string;
      stageName: string;
      groupName?: string | null;
      mapName?: string | null;
      day?: string | null;
      playerElims: number;
      playerPowerplay?: number;
      damage?: number;
      headshots?: number;
      assists?: number;
      knockouts?: number;
      survivalTime?: number;
      healing?: number;
      damageReceived?: number;
      utilities?: number;
      totalDist?: number;
      isMvp?: boolean;
    }
  >;
}
