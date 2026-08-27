export interface LiveMatchData {
  id: string;
  gameId: string;
  gameName: string;
  gameSlug: string;
  tournamentName: string;
  stageName: string;
  status: 'LIVE' | 'SCHEDULED' | 'COMPLETED';
  streamUrl?: string;
  map?: string;
  currentScore?: string;
  scheduledAt: string;
  team1: {
    name: string;
    tag: string;
    score: number;
    logoColor: string;
    region: string;
  };
  team2: {
    name: string;
    tag: string;
    score: number;
    logoColor: string;
    region: string;
  };
  details?: string;
}

export interface TournamentData {
  id: string;
  gameId: string;
  gameName: string;
  name: string;
  slug: string;
  tier: 'S-Tier' | 'A-Tier' | 'B-Tier';
  status: 'ONGOING' | 'UPCOMING' | 'COMPLETED';
  prizePool: number;
  currency: string;
  region: string;
  startDate: string;
  endDate: string;
  teamsCount: number;
  location: string;
  bannerGradient: string;
}

export interface TransferData {
  id: string;
  gameId: string;
  gameName: string;
  playerIgn: string;
  playerName: string;
  nationality: string;
  role: string;
  fromTeam?: string;
  toTeam: string;
  type: 'JOINED' | 'LEFT' | 'LOANED' | 'BENCHED';
  date: string;
  notes?: string;
}

export interface StandingsTeam {
  rank: number;
  teamName: string;
  teamTag: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  extraStatLabel: string;
  extraStatValue: string;
  form: ('W' | 'L')[];
}

export const MOCK_LIVE_MATCHES: LiveMatchData[] = [
  {
    id: 'm1',
    gameId: 'bgmi',
    gameName: 'BGMI',
    gameSlug: 'bgmi',
    tournamentName: 'Battlegrounds Mobile India Series (BGIS) 2026',
    stageName: 'Grand Finals - Match 4 (Erangel)',
    status: 'LIVE',
    streamUrl: 'https://youtube.com',
    map: 'Erangel Day 3',
    currentScore: '14 Alive / Zone 5',
    scheduledAt: 'LIVE NOW',
    team1: {
      name: 'Team Soul',
      tag: 'SOUL',
      score: 48,
      logoColor: 'from-amber-500 to-orange-600',
      region: 'India',
    },
    team2: {
      name: 'GodLike Esports',
      tag: 'GODL',
      score: 42,
      logoColor: 'from-red-600 to-rose-700',
      region: 'India',
    },
    details: 'Team Soul holding the military base ridge with 8 total finish points in current match.',
  },
  {
    id: 'm2',
    gameId: 'valorant',
    gameName: 'Valorant',
    gameSlug: 'valorant',
    tournamentName: 'VCT Masters Bangkok 2026',
    stageName: 'Upper Bracket Final - Map 2',
    status: 'LIVE',
    streamUrl: 'https://twitch.tv',
    map: 'Lotus (Map 2)',
    currentScore: '11 - 9',
    scheduledAt: 'LIVE NOW',
    team1: {
      name: 'Fnatic',
      tag: 'FNC',
      score: 1,
      logoColor: 'from-orange-500 to-amber-500',
      region: 'EMEA',
    },
    team2: {
      name: 'Paper Rex',
      tag: 'PRX',
      score: 0,
      logoColor: 'from-pink-500 to-rose-600',
      region: 'Pacific',
    },
    details: 'Fnatic leading 1-0 in series after winning Ascent (13-10). Currently round 21 on Lotus.',
  },
  {
    id: 'm3',
    gameId: 'cs2',
    gameName: 'CS2',
    gameSlug: 'cs2',
    tournamentName: 'IEM Katowice 2026',
    stageName: 'Semifinals - Map 1',
    status: 'LIVE',
    streamUrl: 'https://twitch.tv',
    map: 'Mirage',
    currentScore: '8 - 7 (Half-time)',
    scheduledAt: 'LIVE NOW',
    team1: {
      name: 'Natus Vincere',
      tag: 'NAVI',
      score: 0,
      logoColor: 'from-yellow-400 to-amber-500',
      region: 'Europe',
    },
    team2: {
      name: 'FaZe Clan',
      tag: 'FaZe',
      score: 0,
      logoColor: 'from-red-500 to-red-700',
      region: 'International',
    },
    details: 'jL with 16 frags on CT side holding A ramp.',
  },
  {
    id: 'm4',
    gameId: 'mlbb',
    gameName: 'Mobile Legends',
    gameSlug: 'mlbb',
    tournamentName: 'MPL Indonesia Season 17',
    stageName: 'Regular Season - Game 3',
    status: 'LIVE',
    streamUrl: 'https://youtube.com',
    map: 'Land of Dawn',
    currentScore: '1 - 1',
    scheduledAt: 'LIVE NOW',
    team1: {
      name: 'RRQ Hoshi',
      tag: 'RRQ',
      score: 1,
      logoColor: 'from-amber-600 to-yellow-500',
      region: 'Indonesia',
    },
    team2: {
      name: 'ONIC Esports',
      tag: 'ONIC',
      score: 1,
      logoColor: 'from-yellow-400 to-orange-500',
      region: 'Indonesia',
    },
    details: 'Decider Game 3. Lord spawned at 18:30 min mark.',
  },
  {
    id: 'm5',
    gameId: 'pubgm',
    gameName: 'PUBG Mobile',
    gameSlug: 'pubgm',
    tournamentName: 'PMSL SEA Spring 2026',
    stageName: 'Super Weekend 2',
    status: 'SCHEDULED',
    scheduledAt: 'Today, 18:00 UTC',
    team1: {
      name: 'Vampire Esports',
      tag: 'VPE',
      score: 0,
      logoColor: 'from-red-600 to-slate-900',
      region: 'Thailand',
    },
    team2: {
      name: 'Alter Ego Ares',
      tag: 'AE',
      score: 0,
      logoColor: 'from-red-500 to-amber-600',
      region: 'Indonesia',
    },
    details: 'Match 1 kicks off on Sanhok.',
  },
  {
    id: 'm6',
    gameId: 'tekken',
    gameName: 'Tekken 8',
    gameSlug: 'tekken',
    tournamentName: 'Tekken World Tour Finals 2026',
    stageName: 'Top 8 Winners Semis',
    status: 'SCHEDULED',
    scheduledAt: 'Tomorrow, 14:00 UTC',
    team1: {
      name: 'Arslan Ash',
      tag: 'TWIS',
      score: 0,
      logoColor: 'from-emerald-500 to-teal-700',
      region: 'Pakistan',
    },
    team2: {
      name: 'Knee',
      tag: 'DRX',
      score: 0,
      logoColor: 'from-blue-600 to-cyan-500',
      region: 'South Korea',
    },
    details: 'Best of 5 sets. Nina vs Bryan matchup expected.',
  }
];

export const MOCK_TOURNAMENTS: TournamentData[] = [
  {
    id: 't1',
    gameId: 'bgmi',
    gameName: 'BGMI',
    name: 'Battlegrounds Mobile India Series (BGIS) 2026',
    slug: 'bgis-2026',
    tier: 'S-Tier',
    status: 'ONGOING',
    prizePool: 240000,
    currency: 'USD',
    region: 'India',
    startDate: '2026-08-10',
    endDate: '2026-08-25',
    teamsCount: 16,
    location: 'Hyderabad, India (LAN)',
    bannerGradient: 'from-amber-600/30 via-orange-600/20 to-slate-900/80',
  },
  {
    id: 't2',
    gameId: 'valorant',
    gameName: 'Valorant',
    name: 'VCT Champions 2026',
    slug: 'vct-champions-2026',
    tier: 'S-Tier',
    status: 'UPCOMING',
    prizePool: 2250000,
    currency: 'USD',
    region: 'Global',
    startDate: '2026-09-05',
    endDate: '2026-09-28',
    teamsCount: 16,
    location: 'Tokyo, Japan (LAN)',
    bannerGradient: 'from-rose-600/30 via-pink-600/20 to-slate-900/80',
  },
  {
    id: 't3',
    gameId: 'cs2',
    gameName: 'CS2',
    name: 'BLAST Premier World Final 2026',
    slug: 'blast-world-final-2026',
    tier: 'S-Tier',
    status: 'UPCOMING',
    prizePool: 1000000,
    currency: 'USD',
    region: 'Global',
    startDate: '2026-11-12',
    endDate: '2026-11-17',
    teamsCount: 8,
    location: 'Copenhagen, Denmark',
    bannerGradient: 'from-sky-600/30 via-indigo-600/20 to-slate-900/80',
  },
  {
    id: 't4',
    gameId: 'mlbb',
    gameName: 'Mobile Legends',
    name: 'M7 World Championship',
    slug: 'm7-world-championship',
    tier: 'S-Tier',
    status: 'UPCOMING',
    prizePool: 1000000,
    currency: 'USD',
    region: 'Global',
    startDate: '2026-12-01',
    endDate: '2026-12-20',
    teamsCount: 16,
    location: 'Kuala Lumpur, Malaysia',
    bannerGradient: 'from-blue-600/30 via-purple-600/20 to-slate-900/80',
  },
  {
    id: 't5',
    gameId: 'hok',
    gameName: 'Honor of Kings',
    name: 'Honor of Kings International Championship (KIC) 2026',
    slug: 'kic-2026',
    tier: 'S-Tier',
    status: 'ONGOING',
    prizePool: 3000000,
    currency: 'USD',
    region: 'Global',
    startDate: '2026-08-15',
    endDate: '2026-08-30',
    teamsCount: 16,
    location: 'Shenzhen, China',
    bannerGradient: 'from-purple-600/30 via-pink-600/20 to-slate-900/80',
  },
  {
    id: 't6',
    gameId: 'freefire',
    gameName: 'Free Fire',
    name: 'Free Fire World Series (FFWS) Global Finals',
    slug: 'ffws-2026',
    tier: 'A-Tier',
    status: 'UPCOMING',
    prizePool: 1000000,
    currency: 'USD',
    region: 'Global',
    startDate: '2026-10-18',
    endDate: '2026-10-27',
    teamsCount: 18,
    location: 'Rio de Janeiro, Brazil',
    bannerGradient: 'from-red-600/30 via-amber-600/20 to-slate-900/80',
  },
];

export const MOCK_TRANSFERS: TransferData[] = [
  {
    id: 'tr1',
    gameId: 'bgmi',
    gameName: 'BGMI',
    playerIgn: 'Spower',
    playerName: 'Rudra B',
    nationality: '🇮🇳 India',
    role: 'Assaulter / Entry',
    fromTeam: 'Carnival Gaming',
    toTeam: 'Team Soul',
    type: 'JOINED',
    date: '2026-08-18',
    notes: 'Signed multi-year contract ahead of BGIS finals.',
  },
  {
    id: 'tr2',
    gameId: 'valorant',
    gameName: 'Valorant',
    playerIgn: 'Derke',
    playerName: 'Nikita Sirmitev',
    nationality: '🇫🇮 Finland',
    role: 'Duelist / Jett',
    fromTeam: 'Fnatic',
    toTeam: 'Team Vitality',
    type: 'JOINED',
    date: '2026-08-15',
    notes: 'Transferred for undisclosed buyout fee.',
  },
  {
    id: 'tr3',
    gameId: 'cs2',
    gameName: 'CS2',
    playerIgn: 'm0NESY',
    playerName: 'Ilya Osipov',
    nationality: '🌍 International',
    role: 'AWPer',
    fromTeam: 'G2 Esports',
    toTeam: 'Cloud9',
    type: 'LOANED',
    date: '2026-08-12',
    notes: 'Short-term loan agreement for tournament season.',
  },
  {
    id: 'tr4',
    gameId: 'mlbb',
    gameName: 'Mobile Legends',
    playerIgn: 'Kairi',
    playerName: 'Kairi Rayosdelsol',
    nationality: '🇵🇭 Philippines',
    role: 'Jungler',
    fromTeam: 'ONIC Esports',
    toTeam: 'Echo Philippines',
    type: 'JOINED',
    date: '2026-08-09',
    notes: 'Returned to MPL PH circuit.',
  },
  {
    id: 'tr5',
    gameId: 'bgmi',
    gameName: 'BGMI',
    playerIgn: 'Jonathan',
    playerName: 'Jonathan Amaral',
    nationality: '🇮🇳 India',
    role: 'Assaulter',
    fromTeam: 'GodLike Esports',
    toTeam: 'Free Agent',
    type: 'BENCHED',
    date: '2026-08-04',
    notes: 'Taking competitive hiatus for medical recovery.',
  },
  {
    id: 'tr6',
    gameId: 'tekken',
    gameName: 'Tekken 8',
    playerIgn: 'Atif Butt',
    playerName: 'Atif Ijaz',
    nationality: '🇵🇰 Pakistan',
    role: 'Pro Fighter',
    fromTeam: 'Free Agent',
    toTeam: 'Falcons Esports',
    type: 'JOINED',
    date: '2026-07-29',
    notes: 'Joined Esports World Cup roster.',
  }
];

export const MOCK_STANDINGS: Record<string, StandingsTeam[]> = {
  bgmi: [
    { rank: 1, teamName: 'Team Soul', teamTag: 'SOUL', played: 18, wins: 5, losses: 13, points: 198, extraStatLabel: 'Finishes', extraStatValue: '124', form: ['W', 'W', 'L', 'W', 'W'] },
    { rank: 2, teamName: 'GodLike Esports', teamTag: 'GODL', played: 18, wins: 4, losses: 14, points: 184, extraStatLabel: 'Finishes', extraStatValue: '118', form: ['W', 'L', 'W', 'W', 'L'] },
    { rank: 3, teamName: 'Entity Gaming', teamTag: 'ENT', played: 18, wins: 3, losses: 15, points: 167, extraStatLabel: 'Finishes', extraStatValue: '102', form: ['L', 'W', 'W', 'L', 'W'] },
    { rank: 4, teamName: 'Global Esports', teamTag: 'GE', played: 18, wins: 2, losses: 16, points: 152, extraStatLabel: 'Finishes', extraStatValue: '96', form: ['L', 'L', 'W', 'W', 'L'] },
    { rank: 5, teamName: 'Reckoning Esports', teamTag: 'RGE', played: 18, wins: 2, losses: 16, points: 141, extraStatLabel: 'Finishes', extraStatValue: '88', form: ['W', 'L', 'L', 'W', 'L'] },
  ],
  valorant: [
    { rank: 1, teamName: 'Fnatic', teamTag: 'FNC', played: 10, wins: 9, losses: 1, points: 27, extraStatLabel: 'Round Diff', extraStatValue: '+68', form: ['W', 'W', 'W', 'W', 'W'] },
    { rank: 2, teamName: 'Paper Rex', teamTag: 'PRX', played: 10, wins: 8, losses: 2, points: 24, extraStatLabel: 'Round Diff', extraStatValue: '+52', form: ['W', 'W', 'L', 'W', 'W'] },
    { rank: 3, teamName: 'Sentinels', teamTag: 'SEN', played: 10, wins: 7, losses: 3, points: 21, extraStatLabel: 'Round Diff', extraStatValue: '+34', form: ['L', 'W', 'W', 'W', 'L'] },
    { rank: 4, teamName: 'Gen.G Esports', teamTag: 'GEN', played: 10, wins: 7, losses: 3, points: 21, extraStatLabel: 'Round Diff', extraStatValue: '+29', form: ['W', 'L', 'W', 'L', 'W'] },
    { rank: 5, teamName: 'Team Heretics', teamTag: 'TH', played: 10, wins: 6, losses: 4, points: 18, extraStatLabel: 'Round Diff', extraStatValue: '+18', form: ['W', 'W', 'L', 'L', 'W'] },
  ],
  cs2: [
    { rank: 1, teamName: 'Natus Vincere', teamTag: 'NAVI', played: 14, wins: 12, losses: 2, points: 36, extraStatLabel: 'Map Win %', extraStatValue: '78.5%', form: ['W', 'W', 'W', 'W', 'W'] },
    { rank: 2, teamName: 'FaZe Clan', teamTag: 'FaZe', played: 14, wins: 10, losses: 4, points: 30, extraStatLabel: 'Map Win %', extraStatValue: '68.2%', form: ['W', 'L', 'W', 'W', 'W'] },
    { rank: 3, teamName: 'Team Spirit', teamTag: 'SPIRIT', played: 14, wins: 9, losses: 5, points: 27, extraStatLabel: 'Map Win %', extraStatValue: '64.0%', form: ['L', 'W', 'W', 'L', 'W'] },
    { rank: 4, teamName: 'MOUZ', teamTag: 'MOUZ', played: 14, wins: 8, losses: 6, points: 24, extraStatLabel: 'Map Win %', extraStatValue: '57.1%', form: ['W', 'W', 'L', 'W', 'L'] },
    { rank: 5, teamName: 'Vitality', teamTag: 'VIT', played: 14, wins: 8, losses: 6, points: 24, extraStatLabel: 'Map Win %', extraStatValue: '55.0%', form: ['L', 'L', 'W', 'W', 'W'] },
  ],
  mlbb: [
    { rank: 1, teamName: 'ONIC Esports', teamTag: 'ONIC', played: 12, wins: 11, losses: 1, points: 33, extraStatLabel: 'Game Diff', extraStatValue: '+18', form: ['W', 'W', 'W', 'W', 'W'] },
    { rank: 2, teamName: 'RRQ Hoshi', teamTag: 'RRQ', played: 12, wins: 9, losses: 3, points: 27, extraStatLabel: 'Game Diff', extraStatValue: '+12', form: ['W', 'W', 'L', 'W', 'W'] },
    { rank: 3, teamName: 'Blacklist International', teamTag: 'BLCK', played: 12, wins: 8, losses: 4, points: 24, extraStatLabel: 'Game Diff', extraStatValue: '+8', form: ['L', 'W', 'W', 'W', 'L'] },
    { rank: 4, teamName: 'AP.Bren', teamTag: 'APBR', played: 12, wins: 7, losses: 5, points: 21, extraStatLabel: 'Game Diff', extraStatValue: '+5', form: ['W', 'L', 'W', 'L', 'W'] },
    { rank: 5, teamName: 'Team Liquid PH', teamTag: 'TLPH', played: 12, wins: 6, losses: 6, points: 18, extraStatLabel: 'Game Diff', extraStatValue: '0', form: ['L', 'W', 'L', 'W', 'L'] },
  ]
};
