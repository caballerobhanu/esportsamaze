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

export const TOURNAMENT_PLATFORMS = [
  'Mobile',
  'PC',
  'PlayStation 5',
  'Xbox Series X/S',
  'Nintendo Switch',
  'Console',
  'Cross-Platform',
] as const;

export const STAGE_TYPES = [
  'Battle Royale Points Table',
  'Round Robin',
  'Groups Wise',
  'Swiss System',
  'Single Elimination',
  'Double Elimination',
] as const;

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  usdRate: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', usdRate: 0.0115 },
  { code: 'USD', symbol: '$', name: 'US Dollar', usdRate: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', usdRate: 1.08 },
  { code: 'GBP', symbol: '£', name: 'British Pound', usdRate: 1.28 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', usdRate: 0.266 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', usdRate: 0.272 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', usdRate: 0.000062 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', usdRate: 0.0285 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', usdRate: 0.225 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', usdRate: 0.75 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', usdRate: 0.17 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', usdRate: 0.0065 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', usdRate: 0.00072 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', usdRate: 0.138 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', usdRate: 0.029 },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', usdRate: 0.72 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', usdRate: 0.65 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', usdRate: 0.017 },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', usdRate: 0.000039 },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', usdRate: 0.0036 },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', usdRate: 0.0083 },
  { code: 'NPR', symbol: 'Rs', name: 'Nepalese Rupee', usdRate: 0.0072 },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', usdRate: 0.011 },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', usdRate: 0.051 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', usdRate: 0.055 },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', usdRate: 0.274 },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', usdRate: 3.25 },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', usdRate: 2.65 },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', usdRate: 2.60 },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', usdRate: 0.021 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', usdRate: 0.59 },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', usdRate: 0.095 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', usdRate: 0.092 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', usdRate: 0.145 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', usdRate: 0.25 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', usdRate: 1.13 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', usdRate: 0.128 },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', usdRate: 0.031 },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', usdRate: 0.0021 },
  { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik', usdRate: 0.00029 },
  { code: 'UZS', symbol: 'soʻm', name: 'Uzbekistani Som', usdRate: 0.000078 },
];

export function getCurrencyUsdRate(code: string): number {
  const match = CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return match ? match.usdRate : 1.0;
}

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

export interface PointsSystemPreset {
  id: string;
  name: string;
  shortName: string;
  description: string;
  placementPoints: Record<number, number>;
  killPoints: number;
}

export const POINTS_SYSTEM_PRESETS: PointsSystemPreset[] = [
  {
    id: 'BGIS_OFFICIAL_10',
    name: 'Official 10-Point Matrix (BGIS / BMPS / PMGC 2023+)',
    shortName: '10-Pt Official',
    description: '1st=10, 2nd=6, 3rd=5, 4th=4, 5th=3, 6th=2, 7th-8th=1, 9th-16th=0 (1 pt/kill)',
    placementPoints: { 1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0 },
    killPoints: 1,
  },
  {
    id: 'LEGACY_15_POINT',
    name: 'Legacy 15-Point Matrix (PMPL / PMWL / BGIS 2021)',
    shortName: '15-Pt Legacy',
    description: '1st=15, 2nd=12, 3rd=10, 4th=8, 5th=6, 6th=4, 7th=2, 8th-12th=1, 13th-16th=0 (1 pt/kill)',
    placementPoints: { 1: 15, 2: 12, 3: 10, 4: 8, 5: 6, 6: 4, 7: 2, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 0, 14: 0, 15: 0, 16: 0 },
    killPoints: 1,
  },
  {
    id: 'LEGACY_20_POINT',
    name: 'Legacy 20-Point Matrix (PMCO 2019-2020)',
    shortName: '20-Pt Legacy',
    description: '1st=20, 2nd=14, 3rd=10, 4th=8, 5th=7, 6th=6, 7th=5, 8th=4, 9th=3, 10th=2, 11th-16th=1',
    placementPoints: { 1: 20, 2: 14, 3: 10, 4: 8, 5: 7, 6: 6, 7: 5, 8: 4, 9: 3, 10: 2, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1 },
    killPoints: 1,
  },
  {
    id: 'ALGS_12_POINT',
    name: 'ALGS / Global 12-Point Matrix',
    shortName: '12-Pt Global',
    description: '1st=12, 2nd=9, 3rd=7, 4th=5, 5th=4, 6th=3, 7th=3, 8th=2, 9th=2, 10th=1, 11th-20th=0',
    placementPoints: { 1: 12, 2: 9, 3: 7, 4: 5, 5: 4, 6: 3, 7: 3, 8: 2, 9: 2, 10: 1, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0 },
    killPoints: 1,
  },
  {
    id: 'CUSTOM',
    name: 'Custom Points Matrix',
    shortName: 'Custom',
    description: 'User-configured placement scoring and custom kill points multiplier',
    placementPoints: { 1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0 },
    killPoints: 1,
  },
];

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

export function getPlacementPoints(
  rank: number,
  customMatrix?: Record<number, number> | number[] | null
): number {
  if (customMatrix) {
    if (Array.isArray(customMatrix)) {
      return customMatrix[rank - 1] ?? 0;
    }
    if (typeof customMatrix === 'object' && customMatrix[rank] !== undefined) {
      return Number(customMatrix[rank]) || 0;
    }
  }
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
  lastMatchRank?: number;
  totalDamage: number;
  totalHealing: number;
  totalDamageReceived: number;
  longestElim: number;
  headshots: number;
  assists: number;
  knockouts: number;
  vehicleElims: number;
  grenadeElims: number;
  smokesUsed: number;
  grenadesUsed: number;
  molotovsUsed: number;
  flashUsed: number;
  airdrops: number;
  rescues: number;
  distDrove: number;
  distWalk: number;
  utilitiesTotal: number;
}

/**
 * The single source of truth for BR standings tie-break order:
 * Total Points → WWCDs → Placement Points → Elim Points → Rank in Last Match → Total Damage.
 * Shared by every standings implementation (lib/match-standings.ts included).
 */
export function compareTeamStandings(
  a: {
    totalPoints: number;
    wwcd: number;
    placementPoints: number;
    eliminationPoints: number;
    lastMatchRank?: number | null;
    totalDamage: number;
  },
  b: {
    totalPoints: number;
    wwcd: number;
    placementPoints: number;
    eliminationPoints: number;
    lastMatchRank?: number | null;
    totalDamage: number;
  }
): number {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  if (b.wwcd !== a.wwcd) return b.wwcd - a.wwcd;
  if (b.placementPoints !== a.placementPoints) return b.placementPoints - a.placementPoints;
  if (b.eliminationPoints !== a.eliminationPoints) return b.eliminationPoints - a.eliminationPoints;
  const lastA = a.lastMatchRank ?? 999;
  const lastB = b.lastMatchRank ?? 999;
  if (lastA !== lastB) return lastA - lastB;
  return b.totalDamage - a.totalDamage;
}

/** Shared fraggers sort: Elims → Damage → Headshots. */
export function compareFraggerStandings(
  a: { elims: number; damage: number; headshots: number },
  b: { elims: number; damage: number; headshots: number }
): number {
  if (b.elims !== a.elims) return b.elims - a.elims;
  if (b.damage !== a.damage) return b.damage - a.damage;
  return b.headshots - a.headshots;
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
    utilitiesTotal?: number;
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
      lastMatchRank: undefined,
      totalDamage: 0,
      totalHealing: 0,
      totalDamageReceived: 0,
      longestElim: 0,
      headshots: 0,
      assists: 0,
      knockouts: 0,
      vehicleElims: 0,
      grenadeElims: 0,
      smokesUsed: 0,
      grenadesUsed: 0,
      molotovsUsed: 0,
      flashUsed: 0,
      airdrops: 0,
      rescues: 0,
      distDrove: 0,
      distWalk: 0,
      utilitiesTotal: 0,
    };

    existing.matchesPlayed += 1;
    if (r.wwcd || r.rank === 1) existing.wwcd += 1;
    existing.placementPoints += Number(r.placePoints || 0);
    existing.eliminationPoints += Number(r.elimsPoints || 0);
    existing.bonusPoints += Number(r.bonusPoints || 0);
    existing.totalPoints += Number(r.totalPoints || 0);
    if (r.rank != null) existing.lastMatchRank = Number(r.rank);
    existing.totalDamage += Number(r.damage || 0);
    existing.totalHealing += Number(r.healing || 0);
    existing.totalDamageReceived += Number(r.damageReceived || 0);
    existing.headshots += Number(r.headshots || 0);
    existing.assists += Number(r.assists || 0);
    existing.knockouts += Number(r.knockouts || 0);
    existing.longestElim = Math.max(existing.longestElim, Number(r.longestElim || 0));
    existing.vehicleElims += Number(r.vehicleElims || 0);
    existing.grenadeElims += Number(r.grenadeElims || 0);
    existing.smokesUsed += Number(r.smokesUsed || 0);
    existing.grenadesUsed += Number(r.grenadesUsed || 0);
    existing.molotovsUsed += Number(r.molotovsUsed || 0);
    existing.flashUsed += Number(r.flashUsed || 0);
    existing.airdrops += Number(r.airdrops || 0);
    existing.rescues += Number(r.rescues || 0);
    existing.distDrove += Number(r.distDrove || 0);
    existing.distWalk += Number(r.distWalk || 0);
    existing.utilitiesTotal += Number(
      r.utilitiesTotal ||
        Number(r.smokesUsed || 0) +
          Number(r.grenadesUsed || 0) +
          Number(r.molotovsUsed || 0) +
          Number(r.flashUsed || 0)
    );

    map.set(key, existing);
  }

  const list = Array.from(map.values());

  list.sort((a, b) => compareTeamStandings(a, b));

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

  list.sort((a, b) => compareFraggerStandings(a, b));

  return list.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
