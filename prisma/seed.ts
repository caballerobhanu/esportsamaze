import { GameGenre, TournamentStatus, MatchStatus, TransferType } from '@prisma/client';
import prisma from '../lib/prisma';

async function main() {
  console.log('🎮 Starting Comprehensive Esports Amaze Database Seeding...');

  // 1. Clean existing records in reverse dependency order
  await prisma.matchPlayerStat.deleteMany({});
  await prisma.matchTeamResult.deleteMany({});
  await prisma.matchGame.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.tournamentVenue.deleteMany({});
  await prisma.tournamentSponsor.deleteMany({});
  await prisma.tournamentOrganizer.deleteMany({});
  await prisma.tournamentTeam.deleteMany({});
  await prisma.tournamentGroup.deleteMany({});
  await prisma.tournamentStage.deleteMany({});
  await prisma.tournament.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.sponsor.deleteMany({});
  await prisma.organizer.deleteMany({});
  await prisma.transfer.deleteMany({});
  await prisma.player.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.game.deleteMany({});

  console.log('🧹 Cleaned existing database entries.');

  // 2. Seed Games
  const bgmi = await prisma.game.create({
    data: {
      slug: 'bgmi',
      name: 'Battlegrounds Mobile India',
      genre: GameGenre.BATTLE_ROYALE,
      developer: 'Krafton',
      logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&auto=format&fit=crop&q=60',
    },
  });

  const pubgm = await prisma.game.create({
    data: {
      slug: 'pubgm',
      name: 'PUBG Mobile',
      genre: GameGenre.BATTLE_ROYALE,
      developer: 'Level Infinite / Krafton',
      logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&auto=format&fit=crop&q=60',
    },
  });

  const valorant = await prisma.game.create({
    data: {
      slug: 'valorant',
      name: 'Valorant',
      genre: GameGenre.TACTICAL_FPS,
      developer: 'Riot Games',
      logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&auto=format&fit=crop&q=60',
    },
  });

  const cs2 = await prisma.game.create({
    data: {
      slug: 'cs2',
      name: 'Counter-Strike 2',
      genre: GameGenre.TACTICAL_FPS,
      developer: 'Valve Corporation',
      logoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&auto=format&fit=crop&q=60',
    },
  });

  // 3. Seed Organizers
  const orgKrafton = await prisma.organizer.create({
    data: {
      name: 'Krafton India Esports',
      slug: 'krafton-india',
      website: 'https://kraftonindiaesports.com',
      type: 'PRIMARY',
    },
  });

  const orgLevelInfinite = await prisma.organizer.create({
    data: {
      name: 'Level Infinite',
      slug: 'level-infinite',
      website: 'https://levelinfinite.com',
      type: 'PRIMARY',
    },
  });

  const orgNodwin = await prisma.organizer.create({
    data: {
      name: 'Nodwin Gaming',
      slug: 'nodwin-gaming',
      website: 'https://nodwingaming.com',
      type: 'CO_ORGANIZER',
    },
  });

  // 4. Seed Sponsors
  const spSwiggy = await prisma.sponsor.create({
    data: {
      name: 'Swiggy Scenes',
      slug: 'swiggy-scenes',
      category: 'TICKETING_PARTNER',
      website: 'https://swiggy.com',
    },
  });

  const spRealme = await prisma.sponsor.create({
    data: {
      name: 'Realme India',
      slug: 'realme-india',
      category: 'DEVICE_PARTNER',
      website: 'https://realme.com/in',
    },
  });

  const spMonster = await prisma.sponsor.create({
    data: {
      name: 'Monster Energy',
      slug: 'monster-energy',
      category: 'ENERGY_DRINK_PARTNER',
      website: 'https://monsterenergy.com',
    },
  });

  // 5. Seed Venues
  const venChennai = await prisma.venue.create({
    data: {
      name: 'Chennai Trade Centre',
      slug: 'chennai-trade-centre',
      city: 'Chennai',
      country: 'India',
      capacity: 8000,
    },
  });

  const venJaipur = await prisma.venue.create({
    data: {
      name: 'Jaipur Exhibition & Convention Centre (JECC)',
      slug: 'jecc-jaipur',
      city: 'Jaipur',
      country: 'India',
      capacity: 10000,
    },
  });

  const venKolkata = await prisma.venue.create({
    data: {
      name: 'Biswa Bangla Mela Prangan',
      slug: 'biswa-bangla-kolkata',
      city: 'Kolkata',
      country: 'India',
      capacity: 12000,
    },
  });

  // 6. Seed Pro Teams
  const soul = await prisma.team.create({
    data: {
      name: 'Team Soul',
      slug: 'team-soul',
      tag: 'SOUL',
      region: 'India',
      founded: new Date('2019-03-01'),
      status: 'ACTIVE',
      socialLinks: { twitter: '@TeamSoul', instagram: '@soulesports', youtube: '@TeamSoulOfficial' },
    },
  });

  const godlike = await prisma.team.create({
    data: {
      name: 'GodLike Esports',
      slug: 'godlike-esports',
      tag: 'GODL',
      region: 'India',
      founded: new Date('2018-11-15'),
      status: 'ACTIVE',
      socialLinks: { twitter: '@GodLike_in', instagram: '@godlike.in', youtube: '@GodLikeEsports' },
    },
  });

  const entity = await prisma.team.create({
    data: {
      name: 'Entity Gaming',
      slug: 'entity-gaming',
      tag: 'ENT',
      region: 'India',
      founded: new Date('2017-06-01'),
      status: 'ACTIVE',
      socialLinks: { instagram: '@entitygaming' },
    },
  });

  const globalEsports = await prisma.team.create({
    data: {
      name: 'Global Esports',
      slug: 'global-esports',
      tag: 'GE',
      region: 'India',
      founded: new Date('2017-09-01'),
      status: 'ACTIVE',
      socialLinks: { twitter: '@GlobalEsportsIn' },
    },
  });

  // 7. Seed Players
  const pSpower = await prisma.player.create({
    data: {
      ign: 'Spower',
      slug: 'spower',
      firstName: 'Rudra',
      lastName: 'B',
      nationality: 'India',
      role: 'Assaulter / Entry',
      currentTeamId: soul.id,
    },
  });

  const pManya = await prisma.player.create({
    data: {
      ign: 'Manya',
      slug: 'manya',
      firstName: 'Mohammad',
      lastName: 'Raja',
      nationality: 'India',
      role: 'In-Game Leader (IGL)',
      currentTeamId: soul.id,
    },
  });

  const pNakul = await prisma.player.create({
    data: {
      ign: 'Nakul',
      slug: 'nakul',
      firstName: 'Nakul',
      lastName: 'Sharma',
      nationality: 'India',
      role: 'Assaulter',
      currentTeamId: soul.id,
    },
  });

  const pRony = await prisma.player.create({
    data: {
      ign: 'Rony',
      slug: 'rony',
      firstName: 'Manpreet',
      lastName: 'Singh',
      nationality: 'India',
      role: 'Support / Healer',
      currentTeamId: soul.id,
    },
  });

  const pJonathan = await prisma.player.create({
    data: {
      ign: 'Jonathan',
      slug: 'jonathan',
      firstName: 'Jonathan',
      lastName: 'Amaral',
      nationality: 'India',
      role: 'Assaulter / Finisher',
      currentTeamId: godlike.id,
    },
  });

  const pZgod = await prisma.player.create({
    data: {
      ign: 'ZGOD',
      slug: 'zgod',
      firstName: 'Abhishek',
      lastName: 'Choudhary',
      nationality: 'India',
      role: 'Support / Assaulter',
      currentTeamId: godlike.id,
    },
  });

  const pPunk = await prisma.player.create({
    data: {
      ign: 'Punk',
      slug: 'punk',
      firstName: 'Ashutosh',
      lastName: 'Singh',
      nationality: 'India',
      role: 'IGL',
      currentTeamId: godlike.id,
    },
  });

  const pSimp = await prisma.player.create({
    data: {
      ign: 'Simp',
      slug: 'simp',
      firstName: 'Harsh',
      lastName: 'Rao',
      nationality: 'India',
      role: 'Assaulter',
      currentTeamId: godlike.id,
    },
  });

  // 8. Seed Transfers
  await prisma.transfer.createMany({
    data: [
      {
        playerId: pSpower.id,
        teamId: soul.id,
        type: TransferType.JOINED,
        date: new Date('2026-08-18'),
        notes: 'Signed multi-year contract ahead of BGIS Grand Finals.',
      },
      {
        playerId: pJonathan.id,
        teamId: godlike.id,
        type: TransferType.JOINED,
        date: new Date('2026-01-10'),
        notes: 'Renewed marquee player contract.',
      },
    ],
  });

  // 9. Seed Comprehensive Tournaments
  const prizeDistributionBgis = [
    { rank: '1st', percentage: 37.5, prize: 15000000 },
    { rank: '2nd', percentage: 18.75, prize: 7500000 },
    { rank: '3rd', percentage: 11.25, prize: 4500000 },
    { rank: '4th', percentage: 7.5, prize: 3000000 },
    { rank: '5th', percentage: 5.0, prize: 2000000 },
    { rank: '6th', percentage: 3.75, prize: 1500000 },
    { rank: 'Tournament MVP', percentage: 2.5, prize: 1000000 },
    { rank: 'Finals MVP', percentage: 1.5, prize: 600000 },
    { rank: 'Best IGL', percentage: 1.0, prize: 400000 },
  ];

  const socialLinksBgis = {
    website: 'https://kraftonindiaesports.com',
    instagram: 'https://instagram.com/kraftonindiaesports',
    youtube: 'https://youtube.com/@kraftonindiaesports',
    twitter: 'https://twitter.com/kraftonindia',
    facebook: 'https://facebook.com/kraftonindiaesports',
    twitch: 'https://twitch.tv/kraftonindia',
    kick: 'https://kick.com/kraftonindia',
    discord: 'https://discord.gg/kraftonindia',
    liquipedia: 'https://liquipedia.net/pubg/Battlegrounds_Mobile_India_Series/2026',
  };

  const formatRulesBgis = {
    pointsMatrix: {
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
    },
    killPointsPerElim: 1,
    stagesDescription:
      'The Ground Zero qualifier opens the championship with 2048 teams, progressing through Round 1-4, Semifinals (32 teams), Survival Stage, and the Grand Finals LAN (16 teams, 18 matches across 3 days).',
  };

  const tourneyBgis = await prisma.tournament.create({
    data: {
      gameId: bgmi.id,
      name: 'Battlegrounds Mobile India Series 2026',
      slug: 'bgis-2026',
      series: 'BGIS',
      season: '2026 Edition',
      seriesValue: 5,
      tier: 'S-Tier',
      status: TournamentStatus.COMPLETED,
      eventType: 'LAN',
      gameMode: 'Squads TPP',
      device: 'Realme GT 7 Pro (Official Device)',
      region: 'India',
      countries: ['India'],
      prizePool: 40000000,
      currency: 'INR',
      usdRate: 0.01104,
      prizeDistribution: prizeDistributionBgis,
      startDate: new Date('2026-01-17'),
      endDate: new Date('2026-03-29'),
      winnerTeamId: soul.id,
      winner: 'Team Soul',
      runnerUpTeamId: godlike.id,
      runnerUp: 'GodLike Esports',
      imageUrl: '/tournaments/bgis_2026_light.png',
      imageDarkUrl: '/tournaments/bgis_2026_dark.png',
      bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
      liquipedia: 'https://liquipedia.net/pubg/Battlegrounds_Mobile_India_Series/2026',
      socialLinks: socialLinksBgis,
      formatDetails: formatRulesBgis,
    },
  });

  // Link Organizers, Sponsors, Venues to BGIS
  await prisma.tournamentOrganizer.createMany({
    data: [
      { tournamentId: tourneyBgis.id, organizerId: orgKrafton.id, role: 'LEAD' },
      { tournamentId: tourneyBgis.id, organizerId: orgNodwin.id, role: 'BROADCASTER' },
    ],
  });

  await prisma.tournamentSponsor.createMany({
    data: [
      { tournamentId: tourneyBgis.id, sponsorId: spSwiggy.id, tier: 'TICKETING_PARTNER' },
      { tournamentId: tourneyBgis.id, sponsorId: spRealme.id, tier: 'DEVICE_PARTNER' },
      { tournamentId: tourneyBgis.id, sponsorId: spMonster.id, tier: 'ENERGY_PARTNER' },
    ],
  });

  await prisma.tournamentVenue.createMany({
    data: [
      { tournamentId: tourneyBgis.id, venueId: venChennai.id, stageName: 'Grand Finals LAN' },
      { tournamentId: tourneyBgis.id, venueId: venKolkata.id, stageName: 'Semifinals LAN' },
    ],
  });

  // BMPS 2026
  const tourneyBmps = await prisma.tournament.create({
    data: {
      gameId: bgmi.id,
      name: 'Battlegrounds Mobile Pro Series 2026',
      slug: 'bmps-2026',
      series: 'BMPS',
      season: 'Season 4',
      seriesValue: 5,
      tier: 'S-Tier',
      status: TournamentStatus.COMPLETED,
      eventType: 'Hybrid',
      gameMode: 'Squads TPP',
      device: 'OnePlus 13 Pro',
      region: 'India',
      countries: ['India'],
      prizePool: 40000000,
      currency: 'INR',
      usdRate: 0.01058,
      startDate: new Date('2026-05-06'),
      endDate: new Date('2026-06-21'),
      winnerTeamId: soul.id,
      winner: 'Team Soul',
      runnerUpTeamId: godlike.id,
      runnerUp: 'GodLike Esports',
      imageUrl: '/tournaments/bmps_2026_light.png',
      imageDarkUrl: '/tournaments/bmps_2026_dark.png',
      bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
      socialLinks: socialLinksBgis,
      formatDetails: formatRulesBgis,
    },
  });

  await prisma.tournamentVenue.create({
    data: {
      tournamentId: tourneyBmps.id,
      venueId: venJaipur.id,
      stageName: 'Grand Finals',
    },
  });

  // 10. Seed Stages & Participating Teams
  const stageBgisFinals = await prisma.tournamentStage.create({
    data: {
      tournamentId: tourneyBgis.id,
      name: 'Grand Finals',
      sequence: 1,
      formatType: 'Battle Royale Points Table',
      stageType: 'BR_FINALS',
    },
  });

  await prisma.tournamentTeam.createMany({
    data: [
      {
        tournamentId: tourneyBgis.id,
        teamId: soul.id,
        seed: 1,
        finalRank: 1,
        prizeWon: 15000000,
        rosterJson: [
          { ign: 'Spower', role: 'Assaulter / Entry', captain: false },
          { ign: 'Manya', role: 'IGL', captain: true },
          { ign: 'Nakul', role: 'Assaulter', captain: false },
          { ign: 'Rony', role: 'Support', captain: false },
        ],
      },
      {
        tournamentId: tourneyBgis.id,
        teamId: godlike.id,
        seed: 2,
        finalRank: 2,
        prizeWon: 7500000,
        rosterJson: [
          { ign: 'Jonathan', role: 'Assaulter', captain: false },
          { ign: 'Punk', role: 'IGL', captain: true },
          { ign: 'ZGOD', role: 'Support', captain: false },
          { ign: 'Simp', role: 'Assaulter', captain: false },
        ],
      },
      {
        tournamentId: tourneyBgis.id,
        teamId: entity.id,
        seed: 3,
        finalRank: 3,
        prizeWon: 4500000,
        rosterJson: [{ ign: 'Saumraj', role: 'IGL', captain: true }],
      },
      {
        tournamentId: tourneyBgis.id,
        teamId: globalEsports.id,
        seed: 4,
        finalRank: 4,
        prizeWon: 3000000,
        rosterJson: [{ ign: 'Mavi', role: 'IGL', captain: true }],
      },
    ],
  });

  // 11. Seed Matches with Full Team & Player Metrics
  const match1 = await prisma.match.create({
    data: {
      tournamentId: tourneyBgis.id,
      stageId: stageBgisFinals.id,
      gameId: bgmi.id,
      matchNumber: 1,
      stageType: 'Grand Finals',
      groupName: 'Grand Finals - Day 1',
      mapName: 'Erangel',
      matchType: 'LAN',
      format: 'Match 1 - Erangel',
      status: MatchStatus.COMPLETED,
      scheduledAt: new Date('2026-03-27T14:30:00Z'),
      matchTime: '14:30 IST',
      streamUrl: 'https://youtube.com/@kraftonindiaesports',
    },
  });

  const mg1 = await prisma.matchGame.create({
    data: {
      matchId: match1.id,
      sequence: 1,
      mapName: 'Erangel',
      duration: 1680, // 28 mins
    },
  });

  // Team Results for Match 1
  await prisma.matchTeamResult.createMany({
    data: [
      {
        matchGameId: mg1.id,
        teamId: soul.id,
        shortCode: 'SOUL',
        mp: 1,
        rank: 1,
        wwcd: true,
        placePoints: 10,
        elimsPoints: 14,
        bonusPoints: 0,
        totalPoints: 24,
        damage: 2840,
        survivalTime: 1680,
        healing: 12,
        damageReceived: 1420,
        headshots: 8,
        assists: 9,
        knockouts: 16,
        longestElim: 248.5,
        vehicleElims: 1,
        grenadeElims: 3,
        smokesUsed: 14,
        grenadesUsed: 11,
        molotovsUsed: 4,
        flashUsed: 2,
        utilitiesTotal: 31,
        airdrops: 2,
        rescues: 4,
        distDrove: 4820,
        distWalk: 3120,
        totalDist: 7940,
        won: true,
        score: 24,
      },
      {
        matchGameId: mg1.id,
        teamId: godlike.id,
        shortCode: 'GODL',
        mp: 1,
        rank: 2,
        wwcd: false,
        placePoints: 6,
        elimsPoints: 10,
        bonusPoints: 0,
        totalPoints: 16,
        damage: 2150,
        survivalTime: 1650,
        healing: 9,
        damageReceived: 1850,
        headshots: 6,
        assists: 7,
        knockouts: 11,
        longestElim: 195.2,
        vehicleElims: 0,
        grenadeElims: 2,
        smokesUsed: 12,
        grenadesUsed: 8,
        molotovsUsed: 3,
        flashUsed: 1,
        utilitiesTotal: 24,
        airdrops: 1,
        rescues: 3,
        distDrove: 5120,
        distWalk: 2850,
        totalDist: 7970,
        won: false,
        score: 16,
      },
    ],
  });

  // Player Stats for Match 1
  await prisma.matchPlayerStat.createMany({
    data: [
      {
        matchGameId: mg1.id,
        playerId: pSpower.id,
        teamId: soul.id,
        shortCode: 'SOUL',
        role: 'Assaulter / Entry',
        mp: 1,
        playerElims: 7,
        teamRank: 1,
        teamWwcd: true,
        teamPlacePoints: 10,
        teamElimsPoints: 14,
        teamBonusPoints: 0,
        teamTotalPoints: 24,
        damage: 1350,
        survivalTime: 1680,
        healing: 4,
        damageReceived: 420,
        headshots: 4,
        assists: 2,
        knockouts: 8,
        longestElim: 248.5,
        vehicleElims: 1,
        grenadeElims: 2,
        smokesUsed: 4,
        grenadesUsed: 5,
        molotovsUsed: 2,
        flashUsed: 1,
        utilitiesTotal: 12,
        airdrops: 1,
        rescues: 1,
        distDrove: 2100,
        distWalk: 1450,
        totalDist: 3550,
        isMvp: true,
        playerPowerplay: 3,
        kills: 7,
        deaths: 0,
      },
      {
        matchGameId: mg1.id,
        playerId: pManya.id,
        teamId: soul.id,
        shortCode: 'SOUL',
        role: 'IGL',
        mp: 1,
        playerElims: 3,
        teamRank: 1,
        teamWwcd: true,
        teamPlacePoints: 10,
        teamElimsPoints: 14,
        teamBonusPoints: 0,
        teamTotalPoints: 24,
        damage: 640,
        survivalTime: 1680,
        healing: 3,
        damageReceived: 380,
        headshots: 2,
        assists: 4,
        knockouts: 3,
        longestElim: 140.0,
        vehicleElims: 0,
        grenadeElims: 1,
        smokesUsed: 6,
        grenadesUsed: 3,
        molotovsUsed: 1,
        flashUsed: 0,
        utilitiesTotal: 10,
        airdrops: 1,
        rescues: 2,
        distDrove: 1800,
        distWalk: 1200,
        totalDist: 3000,
        isMvp: false,
        playerPowerplay: 1,
        kills: 3,
        deaths: 0,
      },
      {
        matchGameId: mg1.id,
        playerId: pJonathan.id,
        teamId: godlike.id,
        shortCode: 'GODL',
        role: 'Assaulter',
        mp: 1,
        playerElims: 5,
        teamRank: 2,
        teamWwcd: false,
        teamPlacePoints: 6,
        teamElimsPoints: 10,
        teamBonusPoints: 0,
        teamTotalPoints: 16,
        damage: 1080,
        survivalTime: 1650,
        healing: 5,
        damageReceived: 620,
        headshots: 3,
        assists: 2,
        knockouts: 6,
        longestElim: 195.2,
        vehicleElims: 0,
        grenadeElims: 1,
        smokesUsed: 4,
        grenadesUsed: 4,
        molotovsUsed: 2,
        flashUsed: 1,
        utilitiesTotal: 11,
        airdrops: 1,
        rescues: 1,
        distDrove: 2400,
        distWalk: 1350,
        totalDist: 3750,
        isMvp: false,
        playerPowerplay: 2,
        kills: 5,
        deaths: 1,
      },
      {
        matchGameId: mg1.id,
        playerId: pPunk.id,
        teamId: godlike.id,
        shortCode: 'GODL',
        role: 'IGL',
        mp: 1,
        playerElims: 2,
        teamRank: 2,
        teamWwcd: false,
        teamPlacePoints: 6,
        teamElimsPoints: 10,
        teamBonusPoints: 0,
        teamTotalPoints: 16,
        damage: 480,
        survivalTime: 1600,
        healing: 2,
        damageReceived: 510,
        headshots: 1,
        assists: 3,
        knockouts: 2,
        longestElim: 110.0,
        vehicleElims: 0,
        grenadeElims: 0,
        smokesUsed: 5,
        grenadesUsed: 2,
        molotovsUsed: 1,
        flashUsed: 0,
        utilitiesTotal: 8,
        airdrops: 0,
        rescues: 2,
        distDrove: 1900,
        distWalk: 950,
        totalDist: 2850,
        isMvp: false,
        playerPowerplay: 0,
        kills: 2,
        deaths: 1,
      },
    ],
  });

  // Match 2 (Miramar)
  const match2 = await prisma.match.create({
    data: {
      tournamentId: tourneyBgis.id,
      stageId: stageBgisFinals.id,
      gameId: bgmi.id,
      matchNumber: 2,
      stageType: 'Grand Finals',
      groupName: 'Grand Finals - Day 1',
      mapName: 'Miramar',
      matchType: 'LAN',
      format: 'Match 2 - Miramar',
      status: MatchStatus.COMPLETED,
      scheduledAt: new Date('2026-03-27T15:30:00Z'),
      matchTime: '15:30 IST',
      streamUrl: 'https://youtube.com/@kraftonindiaesports',
    },
  });

  const mg2 = await prisma.matchGame.create({
    data: {
      matchId: match2.id,
      sequence: 2,
      mapName: 'Miramar',
      duration: 1740, // 29 mins
    },
  });

  await prisma.matchTeamResult.createMany({
    data: [
      {
        matchGameId: mg2.id,
        teamId: godlike.id,
        shortCode: 'GODL',
        mp: 1,
        rank: 1,
        wwcd: true,
        placePoints: 10,
        elimsPoints: 12,
        bonusPoints: 0,
        totalPoints: 22,
        damage: 2650,
        survivalTime: 1740,
        healing: 10,
        damageReceived: 1200,
        headshots: 7,
        assists: 8,
        knockouts: 14,
        longestElim: 310.4,
        vehicleElims: 1,
        grenadeElims: 2,
        smokesUsed: 15,
        grenadesUsed: 9,
        molotovsUsed: 4,
        flashUsed: 1,
        utilitiesTotal: 29,
        airdrops: 2,
        rescues: 3,
        distDrove: 6200,
        distWalk: 2400,
        totalDist: 8600,
        won: true,
        score: 22,
      },
      {
        matchGameId: mg2.id,
        teamId: soul.id,
        shortCode: 'SOUL',
        mp: 1,
        rank: 2,
        wwcd: false,
        placePoints: 6,
        elimsPoints: 8,
        bonusPoints: 0,
        totalPoints: 14,
        damage: 1980,
        survivalTime: 1700,
        healing: 8,
        damageReceived: 1650,
        headshots: 5,
        assists: 6,
        knockouts: 9,
        longestElim: 215.0,
        vehicleElims: 0,
        grenadeElims: 1,
        smokesUsed: 11,
        grenadesUsed: 7,
        molotovsUsed: 2,
        flashUsed: 1,
        utilitiesTotal: 21,
        airdrops: 1,
        rescues: 2,
        distDrove: 5400,
        distWalk: 2900,
        totalDist: 8300,
        won: false,
        score: 14,
      },
    ],
  });

  await prisma.matchPlayerStat.createMany({
    data: [
      {
        matchGameId: mg2.id,
        playerId: pJonathan.id,
        teamId: godlike.id,
        shortCode: 'GODL',
        role: 'Assaulter',
        mp: 1,
        playerElims: 6,
        teamRank: 1,
        teamWwcd: true,
        teamPlacePoints: 10,
        teamElimsPoints: 12,
        teamBonusPoints: 0,
        teamTotalPoints: 22,
        damage: 1420,
        survivalTime: 1740,
        healing: 5,
        damageReceived: 450,
        headshots: 4,
        assists: 3,
        knockouts: 8,
        longestElim: 310.4,
        vehicleElims: 1,
        grenadeElims: 1,
        smokesUsed: 5,
        grenadesUsed: 4,
        molotovsUsed: 2,
        flashUsed: 0,
        utilitiesTotal: 11,
        airdrops: 1,
        rescues: 1,
        distDrove: 2800,
        distWalk: 1100,
        totalDist: 3900,
        isMvp: true,
        playerPowerplay: 2,
        kills: 6,
        deaths: 0,
      },
      {
        matchGameId: mg2.id,
        playerId: pSpower.id,
        teamId: soul.id,
        shortCode: 'SOUL',
        role: 'Assaulter / Entry',
        mp: 1,
        playerElims: 4,
        teamRank: 2,
        teamWwcd: false,
        teamPlacePoints: 6,
        teamElimsPoints: 8,
        teamBonusPoints: 0,
        teamTotalPoints: 14,
        damage: 890,
        survivalTime: 1700,
        healing: 4,
        damageReceived: 580,
        headshots: 3,
        assists: 2,
        knockouts: 5,
        longestElim: 215.0,
        vehicleElims: 0,
        grenadeElims: 1,
        smokesUsed: 4,
        grenadesUsed: 3,
        molotovsUsed: 1,
        flashUsed: 1,
        utilitiesTotal: 9,
        airdrops: 1,
        rescues: 1,
        distDrove: 2300,
        distWalk: 1300,
        totalDist: 3600,
        isMvp: false,
        playerPowerplay: 1,
        kills: 4,
        deaths: 1,
      },
    ],
  });

  console.log('✅ Created Full Matches, Games, Team Results & Player Stats with Complete Metrics.');
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
