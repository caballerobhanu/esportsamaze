import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCoveragePack, type CoveragePackInput } from '../lib/coverage-pack';
import type { AggregatedPlayerStat, AggregatedTeamStanding } from '../lib/tournament-math';

const standing = (over: Partial<AggregatedTeamStanding> & { teamId: string; teamName: string; rank: number }): AggregatedTeamStanding => ({
  tag: '',
  matchesPlayed: 3,
  wwcd: 0,
  placementPoints: 0,
  eliminationPoints: 0,
  bonusPoints: 0,
  totalPoints: 0,
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
  ...over,
});

const fragger = (over: Partial<AggregatedPlayerStat> & { playerId: string; ign: string; rank: number }): AggregatedPlayerStat => ({
  teamName: '',
  teamTag: '',
  matchesPlayed: 3,
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
  ...over,
});

const baseInput = (over: Partial<CoveragePackInput> = {}): CoveragePackInput => ({
  generatedAt: new Date('2026-09-27T10:00:00.000Z'),
  tournament: {
    name: 'BGMI Series 2026',
    slug: 'bgmi-series-2026',
    gameName: 'BGMI',
    gameSlug: 'bgmi',
    region: 'India',
    tier: 'S-Tier',
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-10T00:00:00.000Z'),
    prizePool: 10000000,
    currency: 'INR',
    location: 'Delhi',
    pointsMatrix: { 1: 10, 2: 6, 3: 5 },
    killPointsPerElim: 1,
  },
  slice: { kind: 'DAY', dateKey: '2026-09-05' },
  sliceLabel: 'Day 3',
  fixtures: [],
  completedMatches: [],
  standings: [],
  fraggers: [],
  playerElims: [],
  teams: [],
  players: [],
  existingCategories: [],
  existingTags: [],
  missing: [],
  ...over,
});

describe('buildCoveragePack', () => {
  it('labels the slice and stamps the generation time', () => {
    const pack = buildCoveragePack(baseInput());
    assert.match(pack, /# Coverage Pack — BGMI Series 2026/);
    assert.match(pack, /Slice: Day 3/);
    assert.match(pack, /Generated: 2026-09-27T10:00:00\.000Z/);
    assert.match(pack, /This is the only source material/);
  });

  it('prints standings in order with the WWCD flag and tiebreak badge', () => {
    const pack = buildCoveragePack(
      baseInput({
        standings: [
          standing({
            teamId: 't1',
            teamName: 'Team Soul',
            rank: 1,
            wwcd: 2,
            totalPoints: 97,
            tiebreaker: { isTied: true, tiedWith: 'GodLike', type: 'WWCD', won: true, reason: 'more WWCDs', shortBadge: 'WWCD' },
          }),
          standing({ teamId: 't2', teamName: 'GodLike', rank: 2, totalPoints: 97 }),
        ],
      })
    );

    assert.match(pack, /1\. Team Soul — 3 mp · 2 WWCD · place 0 · elims 0 · 97 pts {2}\[tiebreak: WWCD\]/);
    assert.match(pack, /2\. GodLike/);
    // order preserved
    assert.ok(pack.indexOf('Team Soul') < pack.indexOf('GodLike'));
  });

  it('renders the top five teams and top three players for a match', () => {
    const podium = Array.from({ length: 6 }, (_, i) => ({
      rank: i + 1,
      teamName: `Team ${i + 1}`,
      wwcd: i === 0,
      placePoints: 10 - i,
      elimsPoints: 8 - i,
      bonusPoints: 0,
      totalPoints: 18 - 2 * i,
    }));
    const topPlayers = Array.from({ length: 5 }, (_, i) => ({
      ign: `Player ${i + 1}`,
      teamName: `Team ${i + 1}`,
      elims: 7 - i,
    }));

    const pack = buildCoveragePack(
      baseInput({
        completedMatches: [
          {
            matchNumber: 12,
            overallMatchNumber: 12,
            stageName: 'Grand Finals',
            mapName: 'Erangel',
            date: new Date('2026-09-05T12:00:00.000Z'),
            podium,
            topPlayers,
          },
        ],
      })
    );

    assert.match(pack, /Match 12 — Grand Finals · Erangel/);
    assert.match(pack, /1\. Team 1 — place 10 · elims 8 · bonus 0 · total 18 · WWCD/);
    assert.match(pack, /5\. Team 5 —/);
    // the sixth team is beyond the top five and must not leak in
    assert.doesNotMatch(pack, /6\. Team 6 —/);

    assert.match(pack, /Top players: 1\. Player 1 \(Team 1\) 7 elims · 2\. Player 2 \(Team 2\) 6 elims · 3\. Player 3 \(Team 3\) 5 elims/);
    // the fourth player is beyond the top three and must not leak in
    assert.doesNotMatch(pack, /Player 4/);
  });

  it('treats a fixtures-only day as a schedule pack without fabricating results', () => {
    const pack = buildCoveragePack(
      baseInput({
        sliceLabel: 'Day 1',
        fixtures: [
          {
            matchNumber: 1,
            overallMatchNumber: 1,
            stageName: 'Group Stage',
            groupName: 'A',
            mapName: 'Erangel',
            scheduledAt: new Date('2026-09-05T12:00:00.000Z'),
            matchTime: '17:30 IST',
            status: 'SCHEDULED',
            streamUrl: 'https://youtu.be/abc',
            games: 1,
          },
        ],
      })
    );

    assert.match(pack, /No completed matches in this slice yet\./);
    assert.match(pack, /No completed matches — standings unavailable\./);
    assert.match(pack, /Match 1 · Group Stage · Group A · Erangel/);
    assert.match(pack, /SCHEDULED/);
    assert.match(pack, /stream: https:\/\/youtu\.be\/abc/);
  });

  it('keeps the entity dictionary exact and only shortcodes entities that have a slug', () => {
    const pack = buildCoveragePack(
      baseInput({
        teams: [
          { name: 'Team Soul', slug: 'team-soul' },
          { name: 'Ghost Squad', slug: null },
        ],
        players: [{ ign: 'Manya', slug: 'manya', teamName: 'Team Soul' }],
        completedMatches: [
          {
            matchNumber: 12,
            overallMatchNumber: 12,
            stageName: 'Grand Finals',
            mapName: 'Erangel',
            date: new Date('2026-09-05T12:00:00.000Z'),
            podium: [],
            topPlayers: [],
          },
        ],
      })
    );

    assert.match(pack, /Team Soul → \/bgmi\/teams\/team-soul/);
    assert.match(pack, /Ghost Squad \(no slug — name in plain text only\)/);
    assert.match(pack, /Manya \[Team Soul\] → \/bgmi\/players\/manya/);

    assert.match(pack, /\[team-card team="Team Soul"\]/);
    assert.doesNotMatch(pack, /\[team-card team="Ghost Squad"\]/);
    assert.match(pack, /\[player-card player="Manya"\]/);
    assert.match(pack, /\[match-scorecard match="12"\]/);
    assert.match(pack, /\[standings tournament="BGMI Series 2026"\]/);
  });

  it('surfaces missing figures and never writes a placeholder or invented zero', () => {
    const pack = buildCoveragePack(
      baseInput({
        missing: ['no player statistics recorded for Match 4'],
        completedMatches: [
          {
            matchNumber: 4,
            overallMatchNumber: 4,
            stageName: 'Group Stage',
            mapName: 'Miramar',
            date: new Date('2026-09-05T09:00:00.000Z'),
            podium: [
              { rank: 1, teamName: 'Team Soul', wwcd: true, placePoints: null, elimsPoints: 8, bonusPoints: null, totalPoints: null },
            ],
            topPlayers: [],
          },
        ],
      })
    );

    assert.match(pack, /no player statistics recorded for Match 4/);
    // a metric that was never recorded prints as a dash, not as zero
    assert.match(pack, /place — · elims 8 · bonus — · total — · WWCD/);
    assert.doesNotMatch(pack, /\bTBD\b/);
    assert.doesNotMatch(pack, /\bN\/A\b/);
  });

  it('lists the categories and tags already in use for reuse', () => {
    const pack = buildCoveragePack(
      baseInput({ existingCategories: ['BGMI', 'Esports'], existingTags: ['bgms-2026', 'grand-finals'] })
    );
    assert.match(pack, /Categories: BGMI, Esports/);
    assert.match(pack, /Tags: bgms-2026, grand-finals/);
  });

  it('reports the points system and prize pool in the event facts', () => {
    const pack = buildCoveragePack(baseInput());
    assert.match(pack, /Prize pool: 10,000,000 INR/);
    assert.match(pack, /Placement: 1st 10, 2nd 6, 3rd 5/);
    assert.match(pack, /Elimination: 1 point each/);
  });

  it('adds per-player elims detail — total, best in a match and per-match average', () => {
    const pack = buildCoveragePack(
      baseInput({
        fraggers: [
          fragger({ playerId: 'p1', ign: 'Manya', rank: 1, teamName: 'Team Soul', elims: 12, damage: 900, headshots: 8 }),
          fragger({ playerId: 'p2', ign: 'Beast04', rank: 2, teamName: 'White Walkers', elims: 9 }),
        ],
        playerElims: [
          { playerId: 'p1', matches: 4, games: 5, elims: 12, highestInMatch: 5, averagePerMatch: 3 },
          { playerId: 'p2', matches: 3, games: 3, elims: 9, highestInMatch: 4, averagePerMatch: 3.3333 },
        ],
      })
    );

    assert.match(pack, /PLAYER ELIMS & FRAGGERS \(SLICE\)/);
    assert.match(pack, /1\. Manya \(Team Soul\) — 12 elims · high 5 · avg 3\.0\/match · 900 damage · 8 headshots/);
    assert.match(pack, /2\. Beast04 \(White Walkers\) — 9 elims · high 4 · avg 3\.3\/match/);
  });

  it('omits detail metrics a slice never recorded instead of printing zeros', () => {
    const pack = buildCoveragePack(
      baseInput({ fraggers: [fragger({ playerId: 'p1', ign: 'Manya', rank: 1, elims: 12 })] })
    );
    assert.match(pack, /1\. Manya — 12 elims$/m);
    assert.doesNotMatch(pack, /avg/);
    assert.doesNotMatch(pack, /damage/);
    assert.doesNotMatch(pack, /headshots/);
  });

  it('degrades cleanly when the event has no data at all', () => {
    const pack = buildCoveragePack(
      baseInput({ sliceLabel: 'Full event to date', tournament: { ...baseInput().tournament, prizePool: null } })
    );
    assert.match(pack, /Prize pool: not recorded/);
    assert.match(pack, /No matches in this slice\./);
    assert.match(pack, /No completed matches in this slice yet\./);
    assert.match(pack, /No completed matches — standings unavailable\./);
    assert.match(pack, /Tournament: BGMI Series 2026/);
  });
});
