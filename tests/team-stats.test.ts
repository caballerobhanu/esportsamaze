import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DETAIL_STAT_FIELDS,
  MIN_AVERAGE_SAMPLES,
  averageDetailStat,
  binPlacements,
  detailStatSqlPredicate,
  formatAverage,
  formatDetailAverage,
  formatRate,
  groupRowsByEvent,
  hasDetailStats,
  summarisePlayerElims,
  summariseTeamMatches,
  type DetailStatField,
} from '../lib/team-stats';

type DetailRow = { matchGameId: string } & Partial<Record<DetailStatField, number | null>>;

/**
 * A scorecard from an event that never recorded detail stats: every field is
 * NULL — "not recorded". This is the BGMS shape after the nullable-stats
 * migration.
 */
const unrecordedRow = (matchGameId: string): DetailRow => ({
  matchGameId,
  damage: null,
  survivalTime: null,
  healing: null,
  damageReceived: null,
  headshots: null,
  assists: null,
  knockouts: null,
  utilitiesTotal: null,
  totalDist: null,
  rescues: null,
});

/**
 * A scorecard that recorded damage. `0` is a genuine reading — a team that
 * really did zero damage — not a stand-in for "not recorded".
 */
const recordedRow = (matchGameId: string, damage: number): DetailRow => ({
  ...unrecordedRow(matchGameId),
  damage,
});

describe('hasDetailStats', () => {
  it('treats a row of NULLs as carrying no detail stats', () => {
    assert.equal(hasDetailStats(unrecordedRow('g-blank')), false);
  });

  it('treats a genuine 0 as recorded data', () => {
    assert.equal(hasDetailStats(recordedRow('g-zero', 0)), true);
  });

  it('treats a single recorded stat as carrying detail stats', () => {
    assert.equal(hasDetailStats(recordedRow('g-filled', 400)), true);
    // one utility counter alone is enough
    assert.equal(hasDetailStats({ ...unrecordedRow('g-blank'), rescues: 1 }), true);
  });

  it('does not count a missing (undefined) field as recorded', () => {
    assert.equal(hasDetailStats({ matchGameId: 'g1', damage: undefined }), false);
  });
});

describe('averageDetailStat', () => {
  it('excludes NULL rows from both the sum and the denominator', () => {
    const avg = averageDetailStat(
      [
        unrecordedRow('g-blank'),
        unrecordedRow('g-blank'),
        recordedRow('g-filled', 400),
        recordedRow('g-filled', 300),
      ],
      'damage',
    );

    // 700 over the 2 rows that recorded damage only.
    assert.equal(avg.sum, 700);
    assert.equal(avg.samples, 2);
    assert.equal(avg.average, 350);
  });

  it('counts a genuine 0 in the denominator while NULL does not', () => {
    const avg = averageDetailStat(
      [
        recordedRow('g1', 500),
        recordedRow('g1', 0), // this scorecard really did 0 damage
        unrecordedRow('g2'), // never recorded — must not become a 0
      ],
      'damage',
    );

    // Both recorded rows count: 500 / 2, not 500 / 1 or 500 / 3.
    assert.equal(avg.sum, 500);
    assert.equal(avg.samples, 2);
    assert.equal(avg.average, 250);
  });

  it('gives each field its own sample size', () => {
    const rows: DetailRow[] = [
      { matchGameId: 'g1', damage: 400, survivalTime: 1200 },
      { matchGameId: 'g2', damage: 300, survivalTime: null },
    ];

    assert.equal(averageDetailStat(rows, 'damage').samples, 2);
    assert.equal(averageDetailStat(rows, 'damage').average, 350);
    // survival was recorded on one row only — its own denominator.
    assert.equal(averageDetailStat(rows, 'survivalTime').samples, 1);
    assert.equal(averageDetailStat(rows, 'survivalTime').average, 1200);
  });

  it('returns a null average when the field was never recorded', () => {
    const avg = averageDetailStat([unrecordedRow('g1'), unrecordedRow('g2')], 'damage');

    assert.equal(avg.sum, 0);
    assert.equal(avg.samples, 0);
    assert.equal(avg.average, null);
  });

  it('is not the "rows where the field is non-zero" rule', () => {
    // A non-zero filter would give 700/2 = 350 and drop the genuine zeroes;
    // the NULL-aware rule gives 700/4 because the zeroes were recorded.
    const rows = [
      recordedRow('g1', 400),
      recordedRow('g1', 0),
      recordedRow('g2', 300),
      recordedRow('g2', 0),
    ];

    assert.equal(averageDetailStat(rows, 'damage').samples, 4);
    assert.equal(averageDetailStat(rows, 'damage').average, 175);
  });
});

describe('detailStatSqlPredicate', () => {
  it('covers every detail field so the SQL detector cannot drift', () => {
    const predicate = detailStatSqlPredicate('r');

    for (const field of DETAIL_STAT_FIELDS) {
      assert.ok(
        predicate.includes(`r."${field}" IS NOT NULL`),
        `SQL predicate is missing ${field}`,
      );
    }
  });

  it('tests recorded-ness, not non-zeroness', () => {
    const predicate = detailStatSqlPredicate('r');

    assert.ok(!predicate.includes('<> 0'), 'predicate must not filter out genuine zeroes');
    assert.equal(predicate.split(' IS NOT NULL').length - 1, DETAIL_STAT_FIELDS.length);
  });

  it('ORs the field checks together', () => {
    assert.equal(
      detailStatSqlPredicate('r').split(' OR ').length,
      DETAIL_STAT_FIELDS.length,
    );
  });
});

describe('minimum sample guard', () => {
  it('renders an em dash below five underlying games', () => {
    assert.equal(formatAverage(4.2, MIN_AVERAGE_SAMPLES - 1), '—');
    assert.equal(formatRate(0.4, MIN_AVERAGE_SAMPLES - 1), '—');
    assert.equal(
      formatDetailAverage({ sum: 1600, samples: 4, average: 400 }, 'dmg'),
      '—',
    );
  });

  it('renders the value once the sample is big enough', () => {
    assert.equal(formatAverage(4.24, 5), '4.2');
    assert.equal(formatRate(0.4, 5), '40%');
    assert.equal(
      formatDetailAverage({ sum: 71700, samples: 174, average: 412.06 }, 'dmg'),
      '412 dmg · from 174 scorecards',
    );
  });
});

describe('summariseTeamMatches', () => {
  it('derives the stat band from one rank grouping', () => {
    const summary = summariseTeamMatches([
      { rank: 1, games: 20, points: 400, placePoints: 200 },
      { rank: 2, games: 10, points: 140, placePoints: 70 },
      { rank: 3, games: 10, points: 120, placePoints: 60 },
      { rank: 8, games: 160, points: 640, placePoints: 80 },
      { rank: 12, games: 46, points: 92, placePoints: 0 },
    ]);

    assert.equal(summary.matches, 246);
    assert.equal(summary.wins, 20);
    assert.equal(summary.topFiveRate, 40 / 246);
    assert.equal(summary.topTenRate, 200 / 246);
    assert.equal(summary.totalPoints, 1392);
    // Placement POINTS per game, not a mean rank: 410 / 246.
    assert.equal(summary.avgPlacePoints, 410 / 246);
  });

  it('has no mean-rank field — placement is an ordinal, not a quantity', () => {
    const summary = summariseTeamMatches([{ rank: 1, games: 1, points: 10, placePoints: 10 }]);

    assert.equal('avgPlacement' in summary, false);
  });

  it('returns nulls rather than zeroes for a team with no games', () => {
    const summary = summariseTeamMatches([]);

    assert.equal(summary.matches, 0);
    assert.equal(summary.winRate, null);
    assert.equal(summary.topFiveRate, null);
    assert.equal(summary.topTenRate, null);
    assert.equal(summary.avgPlacePoints, null);
  });
});

describe('groupRowsByEvent', () => {
  const row = (tournamentId: string, scheduledAtMs: number) => ({ tournamentId, scheduledAtMs });

  it('keeps every row of an event in one block, newest event first', () => {
    // Two events share a matchday, so their rows interleave in date order.
    const groups = groupRowsByEvent([
      row('BGMS', 300),
      row('BMPS', 300),
      row('BGMS', 200),
      row('BMPS', 200),
      row('BGMS', 100),
    ]);

    assert.deepEqual(
      groups.map((group) => [group.tournamentId, group.rows.map((r) => r.scheduledAtMs)]),
      [
        ['BGMS', [300, 200, 100]],
        ['BMPS', [300, 200]],
      ],
    );
  });

  it('preserves the given order inside a block (the query already ordered it)', () => {
    const groups = groupRowsByEvent([row('A', 100), row('A', 500), row('A', 300)]);

    assert.deepEqual(groups[0].rows.map((r) => r.scheduledAtMs), [100, 500, 300]);
  });

  it('treats rows without an event as their own block', () => {
    const groups = groupRowsByEvent([row('', 10), row('A', 20)]);

    assert.deepEqual(groups.map((g) => g.tournamentId), ['A', '']);
  });
});

describe('binPlacements', () => {
  it('buckets ranks into 1st / 2–3 / 4–10 / 11–16', () => {
    const bins = binPlacements([
      { rank: 1, games: 20, points: 0, placePoints: 0 },
      { rank: 2, games: 5, points: 0, placePoints: 0 },
      { rank: 3, games: 5, points: 0, placePoints: 0 },
      { rank: 4, games: 1, points: 0, placePoints: 0 },
      { rank: 10, games: 1, points: 0, placePoints: 0 },
      { rank: 11, games: 3, points: 0, placePoints: 0 },
      { rank: 16, games: 2, points: 0, placePoints: 0 },
    ]);

    assert.deepEqual(
      bins.map((bin) => [bin.label, bin.games]),
      [
        ['1st', 20],
        ['2–3', 10],
        ['4–10', 2],
        ['11–16', 5],
      ],
    );
  });
});

describe('summarisePlayerElims', () => {
  it('counts matches, elims, high-elim games and zero-elim share per player', () => {
    const metrics = summarisePlayerElims([
      { playerId: 'p1', playerElims: 0, games: 10 },
      { playerId: 'p1', playerElims: 3, games: 20 },
      { playerId: 'p1', playerElims: 7, games: 2 },
      { playerId: 'p2', playerElims: 0, games: 5 },
    ]);

    const p1 = metrics.get('p1');
    assert.ok(p1);
    assert.equal(p1.matchesPlayed, 32);
    assert.equal(p1.totalElims, 74);
    assert.equal(p1.maxElims, 7);
    assert.equal(p1.gamesWithFivePlus, 2);
    assert.equal(p1.zeroElimGames, 10);
    assert.equal(p1.avgElims, 74 / 32);
    assert.equal(p1.zeroElimShare, 10 / 32);

    const p2 = metrics.get('p2');
    assert.ok(p2);
    assert.equal(p2.matchesPlayed, 5);
    assert.equal(p2.totalElims, 0);
    assert.equal(p2.avgElims, 0);
    assert.equal(p2.zeroElimShare, 1);
  });
});
