export interface TeamMatchInput {
  teamId: string;
  teamName?: string;
  tag?: string;
  shortCode?: string;
  rank: number;
  wwcd?: boolean;
  placePoints?: number;
  elimsPoints?: number;
  bonusPoints?: number;
  totalPoints?: number;
  damage?: number;
  survivalTime?: number;
  healing?: number;
  damageReceived?: number;
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
}

export interface PlayerMatchInput {
  playerId: string;
  playerName?: string;
  teamId?: string;
  teamName?: string;
  shortCode?: string;
  role?: string;
  playerElims?: number;
  teamRank?: number;
  teamWwcd?: boolean;
  teamPlacePoints?: number;
  teamElimsPoints?: number;
  teamBonusPoints?: number;
  teamTotalPoints?: number;
  damage?: number;
  survivalTime?: number;
  healing?: number;
  damageReceived?: number;
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
  isMvp?: boolean;
  playerPowerplay?: number;
}

export const TOURNAMENT_TIERS = [
  'S-Tier',
  'A-Tier',
  'B-Tier',
  'C-Tier',
  'Qualifier',
  'Community',
  'Showmatch',
] as const;

export const EVENT_TYPES = ['LAN', 'Online', 'Hybrid', 'Offline Studio'] as const;

export const GAME_MODES = [
  'Squads TPP',
  'Squads FPP',
  'Duos TPP',
  'Duos FPP',
  'Solo TPP',
  'Solo FPP',
  '5v5 Tactical',
  '5v5 MOBA',
] as const;

export const STAGE_TYPES = [
  'Battle Royale Points Table',
  'Round Robin',
  'Groups Wise',
  'Swiss System',
  'Single Elimination',
  'Double Elimination',
] as const;

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
] as const;

export const BGMI_PUBGM_MAPS = [
  'Erangel',
  'Miramar',
  'Sanhok',
  'Vikendi',
  'Rondo',
  'Karakin',
  'Nusa',
  'Livik',
] as const;

/**
 * Derives tournament status from start and end dates.
 */
export function deriveTournamentStatus(
  startDate: Date | string,
  endDate: Date | string
): 'UPCOMING' | 'ONGOING' | 'COMPLETED' {
  const now = new Date().getTime();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (now < start) return 'UPCOMING';
  if (now > end) return 'COMPLETED';
  return 'ONGOING';
}

/**
 * Computes sum of all utility items used in a match.
 */
export function computeUtilitiesTotal(data: {
  smokesUsed?: number | null;
  grenadesUsed?: number | null;
  molotovsUsed?: number | null;
  flashUsed?: number | null;
}): number {
  return (
    Number(data.smokesUsed || 0) +
    Number(data.grenadesUsed || 0) +
    Number(data.molotovsUsed || 0) +
    Number(data.flashUsed || 0)
  );
}

/**
 * Computes total travel distance from driving and walking.
 */
export function computeTotalDistance(data: {
  distDrove?: number | null;
  distWalk?: number | null;
}): number {
  return Number((Number(data.distDrove || 0) + Number(data.distWalk || 0)).toFixed(2));
}

/**
 * Computes total tournament points for a match.
 */
export function computeTotalPoints(data: {
  placePoints?: number | null;
  elimsPoints?: number | null;
  bonusPoints?: number | null;
}): number {
  return (
    Number(data.placePoints || 0) +
    Number(data.elimsPoints || 0) +
    Number(data.bonusPoints || 0)
  );
}

/**
 * Standard Battle Royale Placement Points Table (e.g. Krafton Official 10-Pt Matrix)
 */
export const DEFAULT_BR_PLACEMENT_POINTS: Record<number, number> = {
  1: 10,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 1,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
  13: 0,
  14: 0,
  15: 0,
  16: 0,
};

export function getPlacementPoints(rank: number): number {
  return DEFAULT_BR_PLACEMENT_POINTS[rank] ?? 0;
}

export interface AggregatedTeamStanding {
  teamId: string;
  teamName: string;
  tag: string;
  logoUrl?: string;
  rank: number;
  matchesPlayed: number;
  wwcd: number;
  placementPoints: number;
  eliminationPoints: number;
  bonusPoints: number;
  totalPoints: number;
  totalDamage: number;
  longestElim: number;
  headshots: number;
  grenadeElims: number;
  utilitiesTotal: number;
  rescues: number;
}

/**
 * Aggregates all match team results into a cumulative tournament leaderboard.
 */
export function calculateTournamentStandings(
  teamResults: {
    teamId: string;
    team?: { id: string; name: string; tag?: string | null; logoUrl?: string | null };
    rank: number;
    wwcd?: boolean;
    placePoints?: number;
    elimsPoints?: number;
    bonusPoints?: number;
    totalPoints?: number;
    damage?: number;
    headshots?: number;
    longestElim?: number;
    grenadeElims?: number;
    utilitiesTotal?: number;
    rescues?: number;
  }[]
): AggregatedTeamStanding[] {
  const map = new Map<string, AggregatedTeamStanding>();

  for (const r of teamResults) {
    const key = r.teamId;
    const existing = map.get(key) || {
      teamId: r.teamId,
      teamName: r.team?.name || 'Unknown Team',
      tag: r.team?.tag || '',
      logoUrl: r.team?.logoUrl || undefined,
      rank: 0,
      matchesPlayed: 0,
      wwcd: 0,
      placementPoints: 0,
      eliminationPoints: 0,
      bonusPoints: 0,
      totalPoints: 0,
      totalDamage: 0,
      longestElim: 0,
      headshots: 0,
      grenadeElims: 0,
      utilitiesTotal: 0,
      rescues: 0,
    };

    existing.matchesPlayed += 1;
    if (r.wwcd || r.rank === 1) existing.wwcd += 1;
    existing.placementPoints += Number(r.placePoints || 0);
    existing.eliminationPoints += Number(r.elimsPoints || 0);
    existing.bonusPoints += Number(r.bonusPoints || 0);
    existing.totalPoints += Number(r.totalPoints || 0);
    existing.totalDamage += Number(r.damage || 0);
    existing.headshots += Number(r.headshots || 0);
    existing.longestElim = Math.max(existing.longestElim, Number(r.longestElim || 0));
    existing.grenadeElims += Number(r.grenadeElims || 0);
    existing.utilitiesTotal += Number(r.utilitiesTotal || 0);
    existing.rescues += Number(r.rescues || 0);

    map.set(key, existing);
  }

  const list = Array.from(map.values());

  // Tie-breaker order: Total Points -> WWCDs -> Placement Points -> Elim Points -> Total Damage
  list.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.wwcd !== a.wwcd) return b.wwcd - a.wwcd;
    if (b.placementPoints !== a.placementPoints) return b.placementPoints - a.placementPoints;
    if (b.eliminationPoints !== a.eliminationPoints) return b.eliminationPoints - a.eliminationPoints;
    return b.totalDamage - a.totalDamage;
  });

  return list.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

export interface AggregatedPlayerStat {
  playerId: string;
  ign: string;
  teamName: string;
  teamTag: string;
  avatarUrl?: string;
  role?: string;
  rank: number;
  matchesPlayed: number;
  elims: number;
  damage: number;
  headshots: number;
  assists: number;
  knockouts: number;
  longestElim: number;
  mvps: number;
  powerplayElims: number;
  grenadeElims: number;
  rescues: number;
}

/**
 * Aggregates all match player stats into top fraggers & statistics.
 */
export function calculateTournamentFraggers(
  playerStats: {
    playerId: string;
    player?: { id: string; ign: string; avatarUrl?: string | null };
    team?: { id: string; name: string; tag?: string | null } | null;
    role?: string | null;
    playerElims?: number;
    damage?: number;
    headshots?: number;
    assists?: number;
    knockouts?: number;
    longestElim?: number;
    isMvp?: boolean;
    playerPowerplay?: number;
    grenadeElims?: number;
    rescues?: number;
  }[]
): AggregatedPlayerStat[] {
  const map = new Map<string, AggregatedPlayerStat>();

  for (const s of playerStats) {
    const key = s.playerId;
    const existing = map.get(key) || {
      playerId: s.playerId,
      ign: s.player?.ign || 'Unknown Player',
      teamName: s.team?.name || '',
      teamTag: s.team?.tag || '',
      avatarUrl: s.player?.avatarUrl || undefined,
      role: s.role || undefined,
      rank: 0,
      matchesPlayed: 0,
      elims: 0,
      damage: 0,
      headshots: 0,
      assists: 0,
      knockouts: 0,
      longestElim: 0,
      mvps: 0,
      powerplayElims: 0,
      grenadeElims: 0,
      rescues: 0,
    };

    existing.matchesPlayed += 1;
    existing.elims += Number(s.playerElims || 0);
    existing.damage += Number(s.damage || 0);
    existing.headshots += Number(s.headshots || 0);
    existing.assists += Number(s.assists || 0);
    existing.knockouts += Number(s.knockouts || 0);
    existing.longestElim = Math.max(existing.longestElim, Number(s.longestElim || 0));
    if (s.isMvp) existing.mvps += 1;
    existing.powerplayElims += Number(s.playerPowerplay || 0);
    existing.grenadeElims += Number(s.grenadeElims || 0);
    existing.rescues += Number(s.rescues || 0);

    map.set(key, existing);
  }

  const list = Array.from(map.values());

  // Sort by Elims -> Damage -> Headshots
  list.sort((a, b) => {
    if (b.elims !== a.elims) return b.elims - a.elims;
    if (b.damage !== a.damage) return b.damage - a.damage;
    return b.headshots - a.headshots;
  });

  return list.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
