export interface BRMatchSummary {
  id: string;
  matchNumber: number;
  mapName: 'Erangel' | 'Miramar' | 'Sanhok' | 'Vikendi';
  status: 'COMPLETED' | 'UPCOMING';
  scheduledTime: string;
  winner?: {
    teamTag: string;
    teamName: string;
    finishes: number;
    placementPts: number;
    totalPts: number;
    mvpPlayer: string;
    mvpKills: number;
  };
  topSquads?: {
    rank: number;
    teamTag: string;
    finishes: number;
    totalPts: number;
  }[];
}

export interface TournamentWithMatches {
  id: string;
  title: string;
  shortCode: string;
  circuit: 'BGMI_INDIA' | 'PUBGM_GLOBAL';
  organizer: string;
  phase: 'CURRENT' | 'STARTING' | 'END_PHASE';
  statusLabel: string;
  prizePool: string;
  prizePoolUSD: string;
  dates: string;
  location: string;
  lanVenue?: string;
  stageName: string;
  matches: BRMatchSummary[];
}

export interface BRTeamStanding {
  rank: number;
  teamName: string;
  teamTag: string;
  logo: string;
  matchesPlayed: number;
  wwcd: number;
  placementPoints: number;
  finishPoints: number;
  totalPoints: number;
  matchHistory: {
    matchNum: number;
    map: string;
    placement: number;
    finishes: number;
    total: number;
  }[];
}

export interface BRRosterMove {
  id: string;
  playerIgn: string;
  realName: string;
  role: 'IGL' | 'Assaulter / Entry' | 'Sniper / DMR' | 'Support' | 'Coach / Analyst';
  fromTeam: string | null;
  toTeam: string;
  type: 'SIGNED' | 'RELEASED' | 'LOAN' | 'BENCHED' | 'ROLE_CHANGE';
  date: string;
  circuit: 'BGMI' | 'PUBG_MOBILE';
  verified: boolean;
  notes: string;
}

export interface BRTopFragger {
  rank: number;
  playerIgn: string;
  teamTag: string;
  nationality: string;
  finishes: number;
  damage: number;
  assists: number;
  headshots: number;
  mvpPoints: number;
  favoriteGun: string;
}

// Cricinfo-Style Tournament Matches Collections
export const CRICINFO_TOURNAMENTS: TournamentWithMatches[] = [
  {
    id: 'bgis-2026',
    title: 'BGIS 2026 Grand Finals',
    shortCode: 'BGIS 2026',
    circuit: 'BGMI_INDIA',
    organizer: 'Krafton India',
    phase: 'CURRENT', // Mix of finished results and upcoming matches
    statusLabel: 'Day 3 in Progress',
    prizePool: '₹2,00,00,000 INR',
    prizePoolUSD: '$240,000',
    dates: 'Aug 10 - Aug 25, 2026',
    location: 'Hyderabad (LAN)',
    lanVenue: 'Gachibowli Indoor Stadium, Hyderabad',
    stageName: 'Grand Finals (Day 3 • Matches 13-18)',
    matches: [
      {
        id: 'bgis-m1',
        matchNumber: 1,
        mapName: 'Erangel',
        status: 'COMPLETED',
        scheduledTime: '13:00 IST',
        winner: {
          teamTag: 'SOUL',
          teamName: 'Team Soul',
          finishes: 12,
          placementPts: 10,
          totalPts: 22,
          mvpPlayer: 'Spower',
          mvpKills: 6,
        },
        topSquads: [
          { rank: 1, teamTag: 'SOUL', finishes: 12, totalPts: 22 },
          { rank: 2, teamTag: 'TX', finishes: 7, totalPts: 13 },
          { rank: 3, teamTag: 'GODL', finishes: 8, totalPts: 13 },
          { rank: 4, teamTag: 'CG', finishes: 5, totalPts: 9 },
        ],
      },
      {
        id: 'bgis-m2',
        matchNumber: 2,
        mapName: 'Miramar',
        status: 'COMPLETED',
        scheduledTime: '13:45 IST',
        winner: {
          teamTag: 'GODL',
          teamName: 'GodLike Esports',
          finishes: 11,
          placementPts: 10,
          totalPts: 21,
          mvpPlayer: 'Jonathan',
          mvpKills: 5,
        },
        topSquads: [
          { rank: 1, teamTag: 'GODL', finishes: 11, totalPts: 21 },
          { rank: 2, teamTag: 'GE', finishes: 8, totalPts: 14 },
          { rank: 3, teamTag: 'ENT', finishes: 8, totalPts: 13 },
          { rank: 4, teamTag: 'SOUL', finishes: 6, totalPts: 10 },
        ],
      },
      {
        id: 'bgis-m3',
        matchNumber: 3,
        mapName: 'Sanhok',
        status: 'COMPLETED',
        scheduledTime: '14:30 IST',
        winner: {
          teamTag: 'SOUL',
          teamName: 'Team Soul',
          finishes: 14,
          placementPts: 10,
          totalPts: 24,
          mvpPlayer: 'Manya',
          mvpKills: 5,
        },
        topSquads: [
          { rank: 1, teamTag: 'SOUL', finishes: 14, totalPts: 24 },
          { rank: 2, teamTag: 'TX', finishes: 8, totalPts: 14 },
          { rank: 3, teamTag: 'CG', finishes: 7, totalPts: 12 },
          { rank: 4, teamTag: 'RGE', finishes: 6, totalPts: 10 },
        ],
      },
      {
        id: 'bgis-m4',
        matchNumber: 4,
        mapName: 'Erangel',
        status: 'COMPLETED',
        scheduledTime: '15:20 IST',
        winner: {
          teamTag: 'ENT',
          teamName: 'Entity Gaming',
          finishes: 9,
          placementPts: 10,
          totalPts: 19,
          mvpPlayer: 'NinjaBOD',
          mvpKills: 4,
        },
        topSquads: [
          { rank: 1, teamTag: 'ENT', finishes: 9, totalPts: 19 },
          { rank: 2, teamTag: 'SOUL', finishes: 9, totalPts: 15 },
          { rank: 3, teamTag: 'OG', finishes: 6, totalPts: 11 },
          { rank: 4, teamTag: 'MEDAL', finishes: 5, totalPts: 9 },
        ],
      },
      {
        id: 'bgis-m5',
        matchNumber: 5,
        mapName: 'Miramar',
        status: 'UPCOMING',
        scheduledTime: '16:15 IST',
      },
      {
        id: 'bgis-m6',
        matchNumber: 6,
        mapName: 'Erangel',
        status: 'UPCOMING',
        scheduledTime: '17:00 IST',
      },
    ],
  },
  {
    id: 'pmsl-sea-2026',
    title: 'PMSL SEA Spring 2026',
    shortCode: 'PMSL SEA',
    circuit: 'PUBGM_GLOBAL',
    organizer: 'VSPO / Level Infinite',
    phase: 'CURRENT',
    statusLabel: 'Super Weekend 2',
    prizePool: '$250,000 USD',
    prizePoolUSD: '$250,000',
    dates: 'Aug 14 - Sep 01, 2026',
    location: 'Kuala Lumpur, Malaysia',
    lanVenue: 'Tropicana Gardens Mall LAN',
    stageName: 'Super Weekend 2 (Day 2)',
    matches: [
      {
        id: 'pmsl-m1',
        matchNumber: 1,
        mapName: 'Sanhok',
        status: 'COMPLETED',
        scheduledTime: '15:00 MYT',
        winner: {
          teamTag: 'A7',
          teamName: 'Alpha7 Esports',
          finishes: 13,
          placementPts: 10,
          totalPts: 23,
          mvpPlayer: 'Reiji',
          mvpKills: 6,
        },
        topSquads: [
          { rank: 1, teamTag: 'A7', finishes: 13, totalPts: 23 },
          { rank: 2, teamTag: 'VPE', finishes: 9, totalPts: 15 },
          { rank: 3, teamTag: 'AE', finishes: 7, totalPts: 12 },
        ],
      },
      {
        id: 'pmsl-m2',
        matchNumber: 2,
        mapName: 'Erangel',
        status: 'COMPLETED',
        scheduledTime: '15:45 MYT',
        winner: {
          teamTag: 'VPE',
          teamName: 'Vampire Esports',
          finishes: 12,
          placementPts: 10,
          totalPts: 22,
          mvpPlayer: 'TonyK',
          mvpKills: 5,
        },
        topSquads: [
          { rank: 1, teamTag: 'VPE', finishes: 12, totalPts: 22 },
          { rank: 2, teamTag: 'A7', finishes: 8, totalPts: 14 },
          { rank: 3, teamTag: 'DX', finishes: 7, totalPts: 12 },
        ],
      },
      {
        id: 'pmsl-m3',
        matchNumber: 3,
        mapName: 'Erangel',
        status: 'UPCOMING',
        scheduledTime: '16:30 MYT',
      },
      {
        id: 'pmsl-m4',
        matchNumber: 4,
        mapName: 'Miramar',
        status: 'UPCOMING',
        scheduledTime: '17:15 MYT',
      },
      {
        id: 'pmsl-m5',
        matchNumber: 5,
        mapName: 'Miramar',
        status: 'UPCOMING',
        scheduledTime: '18:00 MYT',
      },
      {
        id: 'pmsl-m6',
        matchNumber: 6,
        mapName: 'Erangel',
        status: 'UPCOMING',
        scheduledTime: '18:45 MYT',
      },
    ],
  },
  {
    id: 'bmps-s4',
    title: 'BMPS Season 4 (Pro Series)',
    shortCode: 'BMPS S4',
    circuit: 'BGMI_INDIA',
    organizer: 'Krafton India',
    phase: 'STARTING', // Event Starting -> all upcoming schedule
    statusLabel: 'Starts Oct 02',
    prizePool: '₹1,00,00,000 INR',
    prizePoolUSD: '$120,000',
    dates: 'Oct 02 - Nov 05, 2026',
    location: 'Kochi (LAN)',
    lanVenue: 'Rajiv Gandhi Indoor Stadium, Kochi',
    stageName: 'League Stage Week 1 (Day 1)',
    matches: [
      { id: 'bmps-m1', matchNumber: 1, mapName: 'Erangel', status: 'UPCOMING', scheduledTime: 'Oct 02, 13:00 IST' },
      { id: 'bmps-m2', matchNumber: 2, mapName: 'Miramar', status: 'UPCOMING', scheduledTime: 'Oct 02, 13:45 IST' },
      { id: 'bmps-m3', matchNumber: 3, mapName: 'Sanhok', status: 'UPCOMING', scheduledTime: 'Oct 02, 14:30 IST' },
      { id: 'bmps-m4', matchNumber: 4, mapName: 'Erangel', status: 'UPCOMING', scheduledTime: 'Oct 02, 15:15 IST' },
      { id: 'bmps-m5', matchNumber: 5, mapName: 'Miramar', status: 'UPCOMING', scheduledTime: 'Oct 02, 16:00 IST' },
      { id: 'bmps-m6', matchNumber: 6, mapName: 'Erangel', status: 'UPCOMING', scheduledTime: 'Oct 02, 16:45 IST' },
    ],
  },
  {
    id: 'pmgc-2026',
    title: 'PMGC 2026 Global Championship',
    shortCode: 'PMGC 2026',
    circuit: 'PUBGM_GLOBAL',
    organizer: 'Tencent & Krafton',
    phase: 'STARTING',
    statusLabel: 'Starts Dec 01',
    prizePool: '$3,000,000 USD',
    prizePoolUSD: '$3,000,000',
    dates: 'Dec 01 - Dec 22, 2026',
    location: 'London, UK (LAN)',
    lanVenue: 'Copper Box Arena, London',
    stageName: 'Group Stage (Day 1)',
    matches: [
      { id: 'pmgc-m1', matchNumber: 1, mapName: 'Sanhok', status: 'UPCOMING', scheduledTime: 'Dec 01, 14:00 GMT' },
      { id: 'pmgc-m2', matchNumber: 2, mapName: 'Erangel', status: 'UPCOMING', scheduledTime: 'Dec 01, 14:45 GMT' },
      { id: 'pmgc-m3', matchNumber: 3, mapName: 'Erangel', status: 'UPCOMING', scheduledTime: 'Dec 01, 15:30 GMT' },
      { id: 'pmgc-m4', matchNumber: 4, mapName: 'Miramar', status: 'UPCOMING', scheduledTime: 'Dec 01, 16:15 GMT' },
      { id: 'pmgc-m5', matchNumber: 5, mapName: 'Miramar', status: 'UPCOMING', scheduledTime: 'Dec 01, 17:00 GMT' },
      { id: 'pmgc-m6', matchNumber: 6, mapName: 'Erangel', status: 'UPCOMING', scheduledTime: 'Dec 01, 17:45 GMT' },
    ],
  },
  {
    id: 'bgms-s3-archive',
    title: 'BGMS Season 3 (Past Event)',
    shortCode: 'BGMS S3',
    circuit: 'BGMI_INDIA',
    organizer: 'NODWIN Gaming & Star Sports',
    phase: 'END_PHASE', // End Phase -> All past results
    statusLabel: 'Completed',
    prizePool: '₹2,10,00,000 INR',
    prizePoolUSD: '$250,000',
    dates: 'Completed July 2026',
    location: 'Delhi NCR (LAN)',
    lanVenue: 'Star Sports Studios, Delhi',
    stageName: 'Grand Finals (Final Day)',
    matches: [
      {
        id: 'bgms-m1',
        matchNumber: 1,
        mapName: 'Erangel',
        status: 'COMPLETED',
        scheduledTime: 'Day 3',
        winner: { teamTag: 'TX', teamName: 'Team XSpark', finishes: 11, placementPts: 10, totalPts: 21, mvpPlayer: 'Sarang', mvpKills: 5 },
        topSquads: [{ rank: 1, teamTag: 'TX', finishes: 11, totalPts: 21 }, { rank: 2, teamTag: 'GE', finishes: 7, totalPts: 13 }],
      },
      {
        id: 'bgms-m2',
        matchNumber: 2,
        mapName: 'Miramar',
        status: 'COMPLETED',
        scheduledTime: 'Day 3',
        winner: { teamTag: 'SOUL', teamName: 'Team Soul', finishes: 13, placementPts: 10, totalPts: 23, mvpPlayer: 'Spower', mvpKills: 6 },
        topSquads: [{ rank: 1, teamTag: 'SOUL', finishes: 13, totalPts: 23 }, { rank: 2, teamTag: 'GODL', finishes: 9, totalPts: 15 }],
      },
      {
        id: 'bgms-m3',
        matchNumber: 3,
        mapName: 'Sanhok',
        status: 'COMPLETED',
        scheduledTime: 'Day 3',
        winner: { teamTag: 'GODL', teamName: 'GodLike Esports', finishes: 12, placementPts: 10, totalPts: 22, mvpPlayer: 'Jonathan', mvpKills: 6 },
        topSquads: [{ rank: 1, teamTag: 'GODL', finishes: 12, totalPts: 22 }, { rank: 2, teamTag: 'CG', finishes: 6, totalPts: 11 }],
      },
      {
        id: 'bgms-m4',
        matchNumber: 4,
        mapName: 'Erangel',
        status: 'COMPLETED',
        scheduledTime: 'Day 3',
        winner: { teamTag: 'CG', teamName: 'Carnival Gaming', finishes: 10, placementPts: 10, totalPts: 20, mvpPlayer: 'Goblin', mvpKills: 4 },
        topSquads: [{ rank: 1, teamTag: 'CG', finishes: 10, totalPts: 20 }, { rank: 2, teamTag: 'TX', finishes: 8, totalPts: 14 }],
      },
      {
        id: 'bgms-m5',
        matchNumber: 5,
        mapName: 'Miramar',
        status: 'COMPLETED',
        scheduledTime: 'Day 3',
        winner: { teamTag: 'ENT', teamName: 'Entity Gaming', finishes: 11, placementPts: 10, totalPts: 21, mvpPlayer: 'NinjaBOD', mvpKills: 5 },
        topSquads: [{ rank: 1, teamTag: 'ENT', finishes: 11, totalPts: 21 }, { rank: 2, teamTag: 'RGE', finishes: 6, totalPts: 11 }],
      },
      {
        id: 'bgms-m6',
        matchNumber: 6,
        mapName: 'Erangel',
        status: 'COMPLETED',
        scheduledTime: 'Day 3',
        winner: { teamTag: 'TX', teamName: 'Team XSpark (Champions 🏆)', finishes: 14, placementPts: 10, totalPts: 24, mvpPlayer: 'Sarang', mvpKills: 7 },
        topSquads: [{ rank: 1, teamTag: 'TX', finishes: 14, totalPts: 24 }, { rank: 2, teamTag: 'SOUL', finishes: 9, totalPts: 15 }],
      },
    ],
  },
];

// Standings
export const BGMI_GRAND_FINALS_STANDINGS: BRTeamStanding[] = [
  {
    rank: 1,
    teamName: 'Team Soul',
    teamTag: 'SOUL',
    logo: '🟡',
    matchesPlayed: 12,
    wwcd: 3,
    placementPoints: 64,
    finishPoints: 78,
    totalPoints: 142,
    matchHistory: [
      { matchNum: 8, map: 'Erangel', placement: 1, finishes: 12, total: 22 },
      { matchNum: 9, map: 'Miramar', placement: 4, finishes: 6, total: 10 },
      { matchNum: 10, map: 'Sanhok', placement: 1, finishes: 14, total: 24 },
      { matchNum: 11, map: 'Erangel', placement: 7, finishes: 4, total: 6 },
      { matchNum: 12, map: 'Miramar', placement: 2, finishes: 9, total: 15 },
    ],
  },
  {
    rank: 2,
    teamName: 'GodLike Esports',
    teamTag: 'GODL',
    logo: '🔴',
    matchesPlayed: 12,
    wwcd: 2,
    placementPoints: 58,
    finishPoints: 74,
    totalPoints: 132,
    matchHistory: [
      { matchNum: 8, map: 'Erangel', placement: 3, finishes: 8, total: 13 },
      { matchNum: 9, map: 'Miramar', placement: 1, finishes: 11, total: 21 },
      { matchNum: 10, map: 'Sanhok', placement: 8, finishes: 3, total: 4 },
      { matchNum: 11, map: 'Erangel', placement: 1, finishes: 10, total: 20 },
      { matchNum: 12, map: 'Miramar', placement: 5, finishes: 5, total: 8 },
    ],
  },
  {
    rank: 3,
    teamName: 'Team XSpark',
    teamTag: 'TX',
    logo: '⚡',
    matchesPlayed: 12,
    wwcd: 2,
    placementPoints: 52,
    finishPoints: 69,
    totalPoints: 121,
    matchHistory: [
      { matchNum: 8, map: 'Erangel', placement: 2, finishes: 7, total: 13 },
      { matchNum: 9, map: 'Miramar', placement: 6, finishes: 4, total: 6 },
      { matchNum: 10, map: 'Sanhok', placement: 2, finishes: 8, total: 14 },
      { matchNum: 11, map: 'Erangel', placement: 3, finishes: 6, total: 11 },
      { matchNum: 12, map: 'Miramar', placement: 8, finishes: 3, total: 4 },
    ],
  },
  {
    rank: 4,
    teamName: 'Entity Gaming',
    teamTag: 'ENT',
    logo: '🟣',
    matchesPlayed: 12,
    wwcd: 1,
    placementPoints: 44,
    finishPoints: 66,
    totalPoints: 110,
    matchHistory: [
      { matchNum: 8, map: 'Erangel', placement: 5, finishes: 6, total: 9 },
      { matchNum: 9, map: 'Miramar', placement: 3, finishes: 8, total: 13 },
      { matchNum: 10, map: 'Sanhok', placement: 5, finishes: 5, total: 8 },
      { matchNum: 11, map: 'Erangel', placement: 9, finishes: 2, total: 3 },
      { matchNum: 12, map: 'Miramar', placement: 1, finishes: 9, total: 19 },
    ],
  },
  {
    rank: 5,
    teamName: 'Carnival Gaming',
    teamTag: 'CG',
    logo: '🎪',
    matchesPlayed: 12,
    wwcd: 1,
    placementPoints: 40,
    finishPoints: 61,
    totalPoints: 101,
    matchHistory: [
      { matchNum: 8, map: 'Erangel', placement: 4, finishes: 5, total: 9 },
      { matchNum: 9, map: 'Miramar', placement: 8, finishes: 3, total: 4 },
      { matchNum: 10, map: 'Sanhok', placement: 3, finishes: 7, total: 12 },
      { matchNum: 11, map: 'Erangel', placement: 2, finishes: 7, total: 13 },
      { matchNum: 12, map: 'Miramar', placement: 11, finishes: 2, total: 2 },
    ],
  },
  {
    rank: 6,
    teamName: 'Global Esports',
    teamTag: 'GE',
    logo: '🌐',
    matchesPlayed: 12,
    wwcd: 1,
    placementPoints: 38,
    finishPoints: 58,
    totalPoints: 96,
    matchHistory: [
      { matchNum: 8, map: 'Erangel', placement: 6, finishes: 4, total: 6 },
      { matchNum: 9, map: 'Miramar', placement: 2, finishes: 8, total: 14 },
      { matchNum: 10, map: 'Sanhok', placement: 9, finishes: 2, total: 3 },
      { matchNum: 11, map: 'Erangel', placement: 4, finishes: 5, total: 9 },
      { matchNum: 12, map: 'Miramar', placement: 6, finishes: 4, total: 6 },
    ],
  },
  {
    rank: 7,
    teamName: 'Reckoning Esports',
    teamTag: 'RGE',
    logo: '⚔️',
    matchesPlayed: 12,
    wwcd: 1,
    placementPoints: 34,
    finishPoints: 52,
    totalPoints: 86,
    matchHistory: [
      { matchNum: 8, map: 'Erangel', placement: 8, finishes: 3, total: 4 },
      { matchNum: 9, map: 'Miramar', placement: 5, finishes: 5, total: 8 },
      { matchNum: 10, map: 'Sanhok', placement: 4, finishes: 6, total: 10 },
      { matchNum: 11, map: 'Erangel', placement: 6, finishes: 4, total: 6 },
      { matchNum: 12, map: 'Miramar', placement: 7, finishes: 3, total: 4 },
    ],
  },
  {
    rank: 8,
    teamName: 'Orangutan',
    teamTag: 'OG',
    logo: '🦧',
    matchesPlayed: 12,
    wwcd: 1,
    placementPoints: 32,
    finishPoints: 50,
    totalPoints: 82,
    matchHistory: [
      { matchNum: 8, map: 'Erangel', placement: 7, finishes: 4, total: 6 },
      { matchNum: 9, map: 'Miramar', placement: 7, finishes: 4, total: 6 },
      { matchNum: 10, map: 'Sanhok', placement: 7, finishes: 3, total: 4 },
      { matchNum: 11, map: 'Erangel', placement: 5, finishes: 5, total: 8 },
      { matchNum: 12, map: 'Miramar', placement: 3, finishes: 6, total: 11 },
    ],
  },
];

export const PUBGM_GLOBAL_STANDINGS: BRTeamStanding[] = [
  {
    rank: 1,
    teamName: 'Alpha7 Esports',
    teamTag: 'A7',
    logo: '🇧🇷',
    matchesPlayed: 18,
    wwcd: 4,
    placementPoints: 92,
    finishPoints: 118,
    totalPoints: 210,
    matchHistory: [
      { matchNum: 14, map: 'Erangel', placement: 1, finishes: 13, total: 23 },
      { matchNum: 15, map: 'Miramar', placement: 2, finishes: 8, total: 14 },
      { matchNum: 16, map: 'Sanhok', placement: 1, finishes: 11, total: 21 },
      { matchNum: 17, map: 'Erangel', placement: 5, finishes: 5, total: 8 },
      { matchNum: 18, map: 'Miramar', placement: 1, finishes: 14, total: 24 },
    ],
  },
  {
    rank: 2,
    teamName: 'Vampire Esports',
    teamTag: 'VPE',
    logo: '🇹🇭',
    matchesPlayed: 18,
    wwcd: 3,
    placementPoints: 86,
    finishPoints: 112,
    totalPoints: 198,
    matchHistory: [
      { matchNum: 14, map: 'Erangel', placement: 2, finishes: 9, total: 15 },
      { matchNum: 15, map: 'Miramar', placement: 1, finishes: 12, total: 22 },
      { matchNum: 16, map: 'Sanhok', placement: 4, finishes: 6, total: 10 },
      { matchNum: 17, map: 'Erangel', placement: 1, finishes: 10, total: 20 },
      { matchNum: 18, map: 'Miramar', placement: 6, finishes: 4, total: 6 },
    ],
  },
  {
    rank: 3,
    teamName: 'Alter Ego Ares',
    teamTag: 'AE',
    logo: '🇮🇩',
    matchesPlayed: 18,
    wwcd: 3,
    placementPoints: 78,
    finishPoints: 104,
    totalPoints: 182,
    matchHistory: [
      { matchNum: 14, map: 'Erangel', placement: 3, finishes: 7, total: 12 },
      { matchNum: 15, map: 'Miramar', placement: 4, finishes: 5, total: 9 },
      { matchNum: 16, map: 'Sanhok', placement: 2, finishes: 8, total: 14 },
      { matchNum: 17, map: 'Erangel', placement: 3, finishes: 6, total: 11 },
      { matchNum: 18, map: 'Miramar', placement: 2, finishes: 7, total: 13 },
    ],
  },
];

// Roster Transfers
export const BR_ROSTER_TRANSFERS: BRRosterMove[] = [
  {
    id: 'tr-1',
    playerIgn: 'Spower',
    realName: 'Rudra B',
    role: 'Assaulter / Entry',
    fromTeam: 'Carnival Gaming',
    toTeam: 'Team Soul',
    type: 'SIGNED',
    date: '2026-08-18',
    circuit: 'BGMI',
    verified: true,
    notes: 'Signed permanent buyout contract ahead of BGIS finals.',
  },
  {
    id: 'tr-2',
    playerIgn: 'Jonathan',
    realName: 'Jonathan Amaral',
    role: 'Assaulter / Entry',
    fromTeam: null,
    toTeam: 'GodLike Esports',
    type: 'ROLE_CHANGE',
    date: '2026-08-15',
    circuit: 'BGMI',
    verified: true,
    notes: 'Shifted to primary flank & frag caller.',
  },
  {
    id: 'tr-3',
    playerIgn: 'Goblin',
    realName: 'Harsh Paudwal',
    role: 'Assaulter / Entry',
    fromTeam: 'Team Soul',
    toTeam: 'Carnival Gaming',
    type: 'SIGNED',
    date: '2026-08-12',
    circuit: 'BGMI',
    verified: true,
    notes: 'Reunited with Omega for new lineup formation.',
  },
  {
    id: 'tr-4',
    playerIgn: 'TonyK',
    realName: 'Natdanai Rungruang',
    role: 'Assaulter / Entry',
    fromTeam: 'Vampire Esports',
    toTeam: 'Buriram United',
    type: 'SIGNED',
    date: '2026-08-10',
    circuit: 'PUBG_MOBILE',
    verified: true,
    notes: 'High-profile SEA PMSL transfer deal.',
  },
];

// Fraggers
export const BGMI_TOP_FRAGGERS: BRTopFragger[] = [
  {
    rank: 1,
    playerIgn: 'Spower',
    teamTag: 'SOUL',
    nationality: '🇮🇳 India',
    finishes: 32,
    damage: 6420,
    assists: 14,
    headshots: 18,
    mvpPoints: 48.5,
    favoriteGun: 'M416 + DBS',
  },
  {
    rank: 2,
    playerIgn: 'Jonathan',
    teamTag: 'GODL',
    nationality: '🇮🇳 India',
    finishes: 29,
    damage: 5980,
    assists: 11,
    headshots: 22,
    mvpPoints: 44.2,
    favoriteGun: 'M416 + AMR',
  },
  {
    rank: 3,
    playerIgn: 'NinjaBOD',
    teamTag: 'ENT',
    nationality: '🇮🇳 India',
    finishes: 27,
    damage: 5410,
    assists: 9,
    headshots: 15,
    mvpPoints: 40.8,
    favoriteGun: 'UMP45 + M416',
  },
  {
    rank: 4,
    playerIgn: 'Sarang',
    teamTag: 'TX',
    nationality: '🇮🇳 India',
    finishes: 25,
    damage: 5120,
    assists: 12,
    headshots: 14,
    mvpPoints: 38.6,
    favoriteGun: 'M416 + AKM',
  },
];

export const PUBGM_TOP_FRAGGERS: BRTopFragger[] = [
  {
    rank: 1,
    playerIgn: 'Reiji',
    teamTag: 'A7',
    nationality: '🇧🇷 Brazil',
    finishes: 41,
    damage: 7890,
    assists: 19,
    headshots: 26,
    mvpPoints: 58.4,
    favoriteGun: 'M416 + DBS',
  },
  {
    rank: 2,
    playerIgn: 'TonyK',
    teamTag: 'VPE',
    nationality: '🇹🇭 Thailand',
    finishes: 38,
    damage: 7420,
    assists: 15,
    headshots: 24,
    mvpPoints: 54.1,
    favoriteGun: 'M416 + AMR',
  },
];
