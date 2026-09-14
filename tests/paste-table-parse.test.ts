import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  describeScoringFallbacks,
  looksLikeHeaderRow,
  parsePaste,
  pasteColumnsFor,
  resolveHeaderColumns,
  rowHasValue,
  scoringFallbacksFor,
  summarisePasteColumns,
} from '../lib/paste-table-parse';
import {
  PLAYER_DETAIL_FIELDS,
  TEAM_DETAIL_FIELDS,
  collectSuppliedFields,
  playerDetailPayload,
  teamDetailPayload,
} from '../lib/match-stat-fields';

/**
 * The rule these tests pin down: a column the paste does not carry (or carries
 * blank) is `undefined` in the parsed row and NULL in the DB payload — never a
 * fabricated `0`, and never a fabricated 1680-second survival time.
 */

describe('header detection', () => {
  it('accepts any recognised column alias, not just the identity columns', () => {
    // A stats-only header is exactly what a "only the columns I have" paste
    // produces. Reading it positionally would write values into wrong columns.
    assert.equal(looksLikeHeaderRow(['damage', 'healing']), true);
    assert.equal(looksLikeHeaderRow(['dmg', 'hs', 'pp']), true);
    assert.equal(looksLikeHeaderRow(['powerplay']), true);
    assert.equal(looksLikeHeaderRow(['survival_time']), true);
  });

  it('does not mistake a data row for a header', () => {
    assert.equal(looksLikeHeaderRow(['1', 'Team Soul', '10', '9', '19', '1450']), false);
    assert.equal(looksLikeHeaderRow(['2850', '120']), false);
  });

  it('resolves multi-slot aliases', () => {
    assert.deepEqual(resolveHeaderColumns('team_wwcd'), ['team_wwcd', 'wwcd']);
    assert.deepEqual(resolveHeaderColumns('unknown_token'), []);
  });

  it('reads a stats-only header by name instead of shifting columns', () => {
    const parsed = parsePaste('dmg\thealing\n2850\t120', 'excel', 'teams');

    assert.equal(parsed.mode, 'header');
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].damage, 2850);
    assert.equal(parsed.rows[0].healing, 120);
    // Positional reading would have set `team` to the literal "2850".
    assert.equal(parsed.rows[0].team, '');
  });

  it('reports positional mode explicitly when there is no header', () => {
    const parsed = parsePaste(
      '1\tTeam Soul\t10\t9\t19\t1450\n2\tGodLike\t7\t6\t13\t1100',
      'excel',
      'teams',
    );

    assert.equal(parsed.mode, 'positional');
    assert.equal(parsed.rows.length, 2);
  });

  it('reports JSON input as its own mode', () => {
    const parsed = parsePaste('[{"team":"Soul","damage":100}]', 'json', 'teams');

    assert.equal(parsed.mode, 'json');
    assert.equal(parsed.rows[0].damage, 100);
  });
});

/**
 * Sheets spell scoring columns "Place Pts" / "Bonus Pts" / "Total Pts" at least
 * as often as the canonical camelCase. Every one of these used to resolve to no
 * column, which dropped the value and fell through to a derived placement and a
 * computed total — a plausible-looking wrong scorecard.
 */
describe('scoring header aliases', () => {
  const spellings: Array<[string, string]> = [
    // placePoints
    ['placepoints', 'placepoints'],
    ['place_points', 'placepoints'],
    ['pp', 'placepoints'],
    ['placepts', 'placepoints'],
    ['place_pts', 'placepoints'],
    ['placementpoints', 'placepoints'],
    ['placementpts', 'placepoints'],
    ['placement_pts', 'placepoints'],
    // bonusPoints
    ['bonuspoints', 'bonuspoints'],
    ['bonus_points', 'bonuspoints'],
    ['bonus', 'bonuspoints'],
    ['bonuspts', 'bonuspoints'],
    ['bonus_pts', 'bonuspoints'],
    ['bonuspoint', 'bonuspoints'],
    ['bonus_point', 'bonuspoints'],
    // totalPoints
    ['totalpoints', 'totalpoints'],
    ['total_points', 'totalpoints'],
    ['total', 'totalpoints'],
    ['totalpts', 'totalpoints'],
    ['total_pts', 'totalpoints'],
    ['totalpoint', 'totalpoints'],
    ['total_point', 'totalpoints'],
    // elims
    ['elims', 'elims'],
    ['kills', 'elims'],
    ['elimspts', 'elims'],
    ['elims_pts', 'elims'],
    ['elimpts', 'elims'],
    ['elim_pts', 'elims'],
    ['elimpoints', 'elims'],
    ['elim_points', 'elims'],
  ];

  it('resolves every accepted scoring spelling to its column', () => {
    for (const [spelling, expected] of spellings) {
      assert.deepEqual(resolveHeaderColumns(spelling), [expected], `alias: ${spelling}`);
    }
  });

  it('leaves bare ambiguous tokens unmapped', () => {
    // "Pts" alone could be place, bonus or total — guessing writes a wrong total.
    for (const bare of ['pts', 'points', 'p', 'b', 'ppts']) {
      assert.deepEqual(resolveHeaderColumns(bare), [], `bare token: ${bare}`);
    }
  });

  it('still reads a bare "placement" as the rank column', () => {
    // A placement is an ordinal, not a points column — unchanged, and the reason
    // the qualifying spellings above all carry a `points`/`pts` suffix.
    assert.deepEqual(resolveHeaderColumns('placement'), ['rank']);
  });

  it('reads a Place Pts / Bonus Pts / Total Pts sheet instead of dropping the columns', () => {
    const paste = [
      'Tournament\tStage\tDate\tMap\tGroup\tType\tTeam\tRank\tWWCD\tPlace Pts\tElims\tBonus Pts\tTotal Pts\tDamage\tHealing\tHeadshots\tKnocks',
      'BMPS 2024\tGrand Finals\t14-08-2026\tErangel\tGroup A\tOnline\tTeam Soul\t1\ttrue\t10\t9\t1\t28\t1450\t250\t4\t5',
    ].join('\n');

    const parsed = parsePaste(paste, 'excel', 'teams');
    const [row] = parsed.rows;

    assert.equal(parsed.mode, 'header');
    assert.equal(parsed.rows.length, 1);
    assert.deepEqual(parsed.unrecognisedHeaders, []);
    assert.equal(row.placePoints, 10);
    assert.equal(row.bonusPoints, 1);
    assert.equal(row.totalPoints, 28);
    assert.equal(row.elims, 9);
    assert.equal(row.damage, 1450);
  });

  it('keeps a pts-suffixed header row out of the data', () => {
    // Unrecognised before, so the whole paste fell back to positional reading and
    // the header line itself became row 1 (2 rows).
    const parsed = parsePaste('placepts\tbonuspts\ttotalpts\n10\t1\t28', 'excel', 'teams');

    assert.equal(parsed.mode, 'header');
    assert.equal(parsed.rows.length, 1);
    assert.equal(parsed.rows[0].placePoints, 10);
    assert.equal(parsed.rows[0].bonusPoints, 1);
    assert.equal(parsed.rows[0].totalPoints, 28);
  });

  it('reads Elims Pts on the player sheet as the elims column', () => {
    const parsed = parsePaste(
      'Player\tTeam\tElims Pts\tDamage\nManya\tTeam Soul\t4\t650',
      'excel',
      'players',
    );

    assert.equal(parsed.mode, 'header');
    assert.equal(parsed.rows[0].elims, 4);
  });

  it('still leaves absent detail columns NULL after the alias widening', () => {
    const parsed = parsePaste(
      'Team\tRank\tPlace Pts\tElims\tBonus Pts\tTotal Pts\tDamage\nTeam Soul\t1\t10\t9\t1\t28\t1450',
      'excel',
      'teams',
    );
    const [row] = parsed.rows;

    assert.equal(row.damage, 1450);
    // Detail telemetry stays undefined → NULL: not a 0, and not a 1680 survival.
    assert.equal(row.survivalTime, undefined);
    assert.equal(row.headshots, undefined);
    assert.equal(teamDetailPayload(row).survivalTime, null);
    assert.equal(teamDetailPayload(row).headshots, null);
    assert.deepEqual(collectSuppliedFields(row, TEAM_DETAIL_FIELDS), ['damage']);
  });
});

describe('unrecognised headers', () => {
  it('reports the first-row tokens that matched no column', () => {
    const parsed = parsePaste(
      'Rank\tTeam\tMystery Col\tFoobar\n1\tTeam Soul\tx\ty',
      'excel',
      'teams',
    );

    assert.equal(parsed.mode, 'header');
    assert.deepEqual(parsed.unrecognisedHeaders, ['Mystery Col', 'Foobar']);
  });

  it('reports a mistyped scoring header that silently reads back as 0', () => {
    // "Bouns" — a one-transposition typo, the shape of the bug this guards.
    const parsed = parsePaste('Rank\tTeam\tBouns Pts\n1\tTeam Soul\t3', 'excel', 'teams');

    assert.deepEqual(parsed.unrecognisedHeaders, ['Bouns Pts']);
    // The row still carries the zero fallback — which is exactly why the preview
    // has to name the ignored header instead of trusting the parsed value.
    assert.equal(parsed.rows[0].bonusPoints, 0);
  });

  it('ignores blank and repeated tokens', () => {
    const parsed = parsePaste('Rank\tTeam\tFoo\tFoo\t\n1\tTeam Soul\tx\ty\tz', 'excel', 'teams');

    assert.deepEqual(parsed.unrecognisedHeaders, ['Foo']);
  });

  it('reports nothing without a header row', () => {
    const positional = parsePaste('1\tTeam Soul\t10\t9', 'excel', 'teams');
    const json = parsePaste('[{"team":"Soul","damage":100}]', 'json', 'teams');

    assert.equal(positional.mode, 'positional');
    assert.deepEqual(positional.unrecognisedHeaders, []);
    assert.deepEqual(json.unrecognisedHeaders, []);
    assert.deepEqual(json.resolvedKeys, []);
  });

  it('exposes the keys a header row resolved to', () => {
    const parsed = parsePaste('Rank\tTeam\tPlace Pts\n1\tSoul\t10', 'excel', 'teams');

    assert.deepEqual(parsed.resolvedKeys.sort(), ['placepoints', 'rank', 'team']);
  });
});

describe('scoring fallbacks', () => {
  it('names the scoring column a paste omitted, and what gets written instead', () => {
    const parsed = parsePaste('Rank\tTeam\tElims\n1\tTeam Soul\t9\n2\tGodLike\t6', 'excel', 'teams');

    const notes = describeScoringFallbacks(parsed, 'teams');

    assert.deepEqual(
      notes.map((note) => note.key),
      ['wwcd', 'placePoints', 'bonusPoints', 'totalPoints'],
    );
    assert.match(
      notes.find((note) => note.key === 'bonusPoints')!.consequence,
      /bonus points not provided — will be stored as 0/,
    );
    assert.match(
      notes.find((note) => note.key === 'placePoints')!.consequence,
      /will be derived from rank/,
    );
    assert.match(notes.find((note) => note.key === 'totalPoints')!.consequence, /will be computed/);
  });

  it('stays silent when every scoring column was supplied', () => {
    const paste = [
      'Team\tRank\tWWCD\tPlace Pts\tElims\tBonus Pts\tTotal Pts',
      'Team Soul\t1\ttrue\t10\t9\t1\t28',
    ].join('\n');
    const parsed = parsePaste(paste, 'excel', 'teams');

    assert.deepEqual(describeScoringFallbacks(parsed, 'teams'), []);
  });

  it('trusts the header, not the zero fallback, in header mode', () => {
    // The bonus header is misspelled => the column was never supplied, even
    // though every row carries a bonusPoints: 0.
    const parsed = parsePaste(
      'Team\tRank\tWWCD\tPlace Pts\tElims\tTotal Pts\tBonu Pts\nSoul\t1\ttrue\t10\t9\t28\t1',
      'excel',
      'teams',
    );

    assert.equal(parsed.rows[0].bonusPoints, 0);
    const notes = describeScoringFallbacks(parsed, 'teams');
    assert.deepEqual(
      notes.map((note) => note.key),
      ['bonusPoints'],
    );
  });

  it('falls back to row values when the read has no column names', () => {
    const json = parsePaste('[{"team":"Soul","elims":5}]', 'json', 'teams');

    assert.deepEqual(
      describeScoringFallbacks(json, 'teams').map((note) => note.key),
      ['rank', 'wwcd', 'placePoints', 'bonusPoints', 'totalPoints'],
    );
  });

  it('reports the positional slots that are genuinely empty, per target', () => {
    const positional = parsePaste('1\tTeam Soul\t10', 'excel', 'teams');

    assert.equal(positional.mode, 'positional');
    assert.deepEqual(
      describeScoringFallbacks(positional, 'teams').map((note) => note.key),
      ['placePoints', 'totalPoints'],
    );

    const players = parsePaste('BMPS\tManya\tTeam Soul\t4', 'excel', 'players');
    assert.equal(players.mode, 'positional');
    assert.deepEqual(
      describeScoringFallbacks(players, 'players').map((note) => note.key),
      ['team_rank', 'team_wwcd', 'team_place', 'team_elims', 'bonusPoints', 'team_total'],
    );
  });

  it('promises the team result is left alone rather than recomputed', () => {
    // A player-only paste no longer rewrites the team result it says nothing
    // about, so the preview must not claim the values will be derived.
    const parsed = parsePaste('Tournament\tPlayer\tTeam\tElims\nBMPS\tManya\tTeam Soul\t4', 'excel', 'players');

    for (const note of describeScoringFallbacks(parsed, 'players')) {
      if (!note.key.startsWith('team_') && note.key !== 'bonusPoints') continue;
      assert.match(note.consequence, /an existing team result keeps its/);
    }
  });

  it('reuses the existing column labels rather than inventing new ones', () => {
    for (const target of ['teams', 'players'] as const) {
      const labels = new Map(pasteColumnsFor(target).map((column) => [column.key, column.label]));
      for (const fallback of scoringFallbacksFor(target)) {
        assert.equal(labels.get(fallback.key), fallback.label, `${target}:${fallback.key}`);
        assert.notEqual(fallback.consequence.trim(), '');
      }
    }
  });
});

describe('team mapping', () => {
  // Only the columns the user actually has. The blank damage cell sits mid-row,
  // so the row keeps its shape and the cell is genuinely empty (not truncated).
  const partialPaste = `Rank\tTeam\tElims\tDamage\n1\tTeam Soul\t14\t2850\n2\tGodLike\t9\t`;
  const gapPaste = `Rank\tTeam\tElims\tDamage\tHealing\n1\tTeam Soul\t14\t2850\t120\n2\tGodLike\t9\t\t90`;

  it('leaves an absent column undefined rather than 0', () => {
    const { rows } = parsePaste(partialPaste, 'excel', 'teams');
    const [first] = rows;

    assert.equal(first.damage, 2850);
    // Absent headers → undefined (these were `: 0` and `: 1680` before).
    assert.equal(first.survivalTime, undefined);
    assert.equal(first.healing, undefined);
    assert.equal(first.damageReceived, undefined);
    assert.equal(first.headshots, undefined);
    assert.equal(first.assists, undefined);
    assert.equal(first.knockouts, undefined);
    assert.equal(first.longestElim, undefined);
    assert.equal(first.vehicleElims, undefined);
    assert.equal(first.grenadeElims, undefined);
    assert.equal(first.smokesUsed, undefined);
    assert.equal(first.grenadesUsed, undefined);
    assert.equal(first.molotovsUsed, undefined);
    assert.equal(first.flashUsed, undefined);
    assert.equal(first.airdrops, undefined);
    assert.equal(first.rescues, undefined);
    assert.equal(first.distDrove, undefined);
    assert.equal(first.distWalk, undefined);
    assert.equal(first.placePoints, undefined);
    assert.equal(first.totalPoints, undefined);
  });

  it('keeps the scoring columns at their real values', () => {
    const { rows } = parsePaste(partialPaste, 'excel', 'teams');

    assert.equal(rows[0].elims, 14);
    assert.equal(rows[0].rank, 1);
    assert.equal(rows[0].wwcd, true);
    // bonusPoints is scoring: always known, so it keeps a zero fallback.
    assert.equal(rows[0].bonusPoints, 0);
    assert.equal(rows[1].elims, 9);
  });

  it('turns an absent header into NULL in the DB payload', () => {
    const { rows } = parsePaste(partialPaste, 'excel', 'teams');
    const payload = teamDetailPayload(rows[0]);

    assert.equal(payload.damage, 2850);
    assert.equal(payload.survivalTime, null);
    assert.equal(payload.healing, null);
    assert.equal(payload.utilitiesTotal, null);
    assert.equal(payload.totalDist, null);

    // Absent columns are not reported as supplied either.
    assert.deepEqual(collectSuppliedFields(rows[0], TEAM_DETAIL_FIELDS), ['damage']);
  });

  it('turns an empty cell into NULL in the DB payload', () => {
    const { rows } = parsePaste(gapPaste, 'excel', 'teams');
    const blank = rows[1];

    assert.equal(blank.healing, 90); // the column was provided…
    assert.equal(blank.damage, undefined); // …this cell was left empty
    assert.equal(teamDetailPayload(blank).damage, null);
    assert.deepEqual(collectSuppliedFields(blank, TEAM_DETAIL_FIELDS), ['healing']);
  });

  it('preserves a genuine recorded 0', () => {
    const { rows } = parsePaste('Rank\tTeam\tDamage\n1\tTeam Soul\t0', 'excel', 'teams');

    assert.equal(rows[0].damage, 0);
    assert.equal(teamDetailPayload(rows[0]).damage, 0);
    assert.deepEqual(collectSuppliedFields(rows[0], TEAM_DETAIL_FIELDS), ['damage']);
  });

  it('still derives utilities/distance totals from the counters it read', () => {
    const { rows } = parsePaste('Team\tSmokes\tGrenades\tDistDrove\nSoul\t4\t2\t450', 'excel', 'teams');
    const payload = teamDetailPayload(rows[0]);

    assert.equal(payload.smokesUsed, 4);
    assert.equal(payload.grenadesUsed, 2);
    assert.equal(payload.utilitiesTotal, 6);
    assert.equal(payload.distDrove, 450);
    assert.equal(payload.totalDist, 450);
  });
});

describe('player mapping', () => {
  const partialPaste = `Tournament\tPlayer\tTeam\tElims\tDamage\tPowerplay\nBMPS\tManya\tTeam Soul\t4\t650\t2\nBMPS\tNakul\tTeam Soul\t3\t\t`;
  const gapPaste = `Tournament\tPlayer\tTeam\tElims\tDamage\tPowerplay\tHealing\nBMPS\tManya\tTeam Soul\t4\t650\t2\t120\nBMPS\tNakul\tTeam Soul\t3\t\t\t90`;

  it('leaves an absent player detail column undefined rather than 0', () => {
    const { rows } = parsePaste(partialPaste, 'excel', 'players');

    assert.equal(rows[0].damage, 650);
    assert.equal(rows[0].playerPowerplay, 2);
    assert.equal(rows[0].survivalTime, undefined);
    assert.equal(rows[0].healing, undefined);
    assert.equal(rows[0].damageReceived, undefined);
    assert.equal(rows[0].headshots, undefined);
    assert.equal(rows[0].assists, undefined);
    assert.equal(rows[0].knockouts, undefined);
    assert.equal(rows[0].longestElim, undefined);
    assert.equal(rows[0].vehicleElims, undefined);
    assert.equal(rows[0].grenadeElims, undefined);
    assert.equal(rows[0].smokesUsed, undefined);
    assert.equal(rows[0].utilities, undefined);
    assert.equal(rows[0].total_dist, undefined);
    assert.equal(rows[0].isMvp, undefined);
  });

  it('keeps elims (scoring) and turns absent details into NULL', () => {
    const { rows } = parsePaste(partialPaste, 'excel', 'players');

    assert.equal(rows[0].elims, 4);
    assert.equal(rows[1].elims, 3);

    const first = playerDetailPayload(rows[0]);
    assert.equal(first.damage, 650);
    assert.equal(first.playerPowerplay, 2);
    assert.equal(first.survivalTime, null);
    assert.equal(first.isMvp, null);

    const second = playerDetailPayload(rows[1]);
    assert.equal(second.damage, null);
    assert.equal(second.survivalTime, null);
    assert.equal(second.playerPowerplay, null);

    assert.deepEqual(collectSuppliedFields(rows[1], PLAYER_DETAIL_FIELDS), []);
  });

  it('carries a team bonus column through to the team cascade', () => {
    // `Bonus Pts` is team-level, and the only team column a player sheet spells
    // without the `Team ` prefix. Dropping it would make the cascade believe the
    // paste brought no team-level data and skip the write.
    const bonusPaste = 'Tournament\tPlayer\tTeam\tElims\tBonus Pts\nBMPS\tManya\tTeam Soul\t4\t2';
    const parsed = parsePaste(bonusPaste, 'excel', 'players');

    assert.equal(parsed.rows[0].bonusPoints, 2);
    // Supplied, so the preview stops calling it a fallback.
    assert.ok(!describeScoringFallbacks(parsed, 'players').some((note) => note.key === 'bonusPoints'));

    // Absent stays undefined — the cascade inherits the stored bonus, never 0.
    assert.equal(parsePaste(partialPaste, 'excel', 'players').rows[0].bonusPoints, undefined);
  });

  it('turns an empty player cell into NULL while keeping the rest of the row', () => {
    const { rows } = parsePaste(gapPaste, 'excel', 'players');
    const blank = rows[1];

    assert.equal(blank.healing, 90);
    assert.equal(playerDetailPayload(blank).damage, null);
    assert.equal(playerDetailPayload(blank).playerPowerplay, null);
    assert.deepEqual(collectSuppliedFields(blank, PLAYER_DETAIL_FIELDS), ['healing']);
  });
});

describe('column preview', () => {
  const paste = `Rank\tTeam\tElims\tDamage\n1\tTeam Soul\t14\t2850`;

  it('lists the columns that will be stored', () => {
    const { rows } = parsePaste(paste, 'excel', 'teams');
    const labels = summarisePasteColumns(rows, 'teams').present.map((column) => column.label);

    assert.ok(labels.includes('Team'));
    assert.ok(labels.includes('Rank'));
    assert.ok(labels.includes('Elims (scoring)'));
    assert.ok(labels.includes('Damage'));
    assert.ok(!labels.includes('Healing'));
  });

  it('lists the detail columns that will be stored blank', () => {
    const { rows } = parsePaste(paste, 'excel', 'teams');
    const labels = summarisePasteColumns(rows, 'teams').missingDetails.map((column) => column.label);

    assert.ok(labels.includes('Survival time'));
    assert.ok(labels.includes('Healing'));
    assert.ok(labels.includes('Headshots'));
    // Scoring columns always carry a value, so they are never "missing".
    assert.ok(!labels.includes('Elims (scoring)'));
    assert.ok(!labels.includes('Bonus points (scoring)'));
  });

  it('treats a column present but entirely blank as not provided', () => {
    const { rows } = parsePaste('Team\tDamage\tElims\nSoul\t\t5', 'excel', 'teams');
    const { missingDetails } = summarisePasteColumns(rows, 'teams');

    assert.ok(missingDetails.some((column) => column.key === 'damage'));
    assert.equal(rowHasValue(rows[0], 'damage'), false);
    assert.equal(rowHasValue(rows[0], 'team'), true);
    assert.equal(rowHasValue(rows[0], 'elims'), true);
  });

  it('reports no detail column as present in positional mode', () => {
    const { rows } = parsePaste('1\tTeam Soul\t10\t9', 'excel', 'teams');
    const { present, missingDetails } = summarisePasteColumns(rows, 'teams');

    assert.equal(present.filter((column) => column.detail).length, 0);
    assert.ok(missingDetails.length > 0);
  });
});
