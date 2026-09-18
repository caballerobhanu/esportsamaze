import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  describeScoringFallbacks,
  parsePaste,
  pasteColumnsFor,
  scoringFallbacksFor,
  summarisePasteColumns,
} from '../lib/paste-table-parse';
import { parseTimeTo24h, formatKickoffDate, formatKickoffTime } from '../lib/match-time';

/**
 * Booking a fixture and scoring it are separate acts. These tests pin the rule
 * that a schedule-only paste — one that carries no team, player or result column
 * — imports on its own, and that its times mean what the match form means by them.
 */

const SCHEDULE_HEADER =
  'Tournament\tStage\tDate\tTimeFormat\tTime\tOverallMatch\tStageMatch\tMap\tGroup\tType';

// Three match days of six, exactly as the sheet is exported from Excel.
const SCHEDULE_SHEET = `${SCHEDULE_HEADER}
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t22-09-2026\tIST\t1400\t1\t1\tRondo\tA\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t22-09-2026\tIST\t1440\t2\t2\tErangel\tA\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t22-09-2026\tIST\t1520\t3\t3\tErangel\tA\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t22-09-2026\tIST\t1600\t4\t4\tMiramar\tB\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t22-09-2026\tIST\t1640\t5\t5\tMiramar\tB\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t22-09-2026\tIST\t1720\t6\t6\tRondo\tB\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t23-09-2026\tIST\t1400\t7\t7\tRondo\tC\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t23-09-2026\tIST\t1440\t8\t8\tErangel\tC\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t23-09-2026\tIST\t1520\t9\t9\tErangel\tC\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t23-09-2026\tIST\t1600\t10\t10\tErangel\tA\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t23-09-2026\tIST\t1640\t11\t11\tMiramar\tA\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t23-09-2026\tIST\t1720\t12\t12\tMiramar\tA\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t24-09-2026\tIST\t1400\t13\t13\tRondo\tB\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t24-09-2026\tIST\t1440\t14\t14\tErangel\tB\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t24-09-2026\tIST\t1520\t15\t15\tErangel\tB\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t24-09-2026\tIST\t1600\t16\t16\tErangel\tC\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t24-09-2026\tIST\t1640\t17\t17\tMiramar\tC\tOffline
Battlegrounds Mobile India ShowDown 2026\tWeek 1\t24-09-2026\tIST\t1720\t18\t18\tMiramar\tC\tOffline`;

describe('schedule-only paste', () => {
  it('imports a fixture sheet that carries no team or player column', () => {
    const result = parsePaste(SCHEDULE_SHEET, 'excel', 'schedule');

    assert.equal(result.mode, 'header');
    assert.equal(result.error, null);
    assert.equal(result.rows.length, 18);
  });

  it('recognises every schedule header by name, so nothing is dropped', () => {
    const result = parsePaste(SCHEDULE_SHEET, 'excel', 'schedule');

    assert.deepEqual(result.unrecognisedHeaders, []);
    assert.deepEqual(result.resolvedKeys, [
      'tournament',
      'stage',
      'date',
      'timeformat',
      'time',
      'overallmatch',
      'stagematch',
      'map',
      'group',
      'type',
    ]);
  });

  it('maps the fixture identity without inventing a team or a score', () => {
    const [row] = parsePaste(SCHEDULE_SHEET, 'excel', 'schedule').rows;

    assert.equal(row.Tournament, 'Battlegrounds Mobile India ShowDown 2026');
    assert.equal(row.Stage, 'Week 1');
    assert.equal(row.Date, '22-09-2026');
    assert.equal(row.TimeFormat, 'IST');
    assert.equal(row.Time, '1400');
    assert.equal(row.OverallMatch, 1);
    assert.equal(row.StageMatch, 1);
    assert.equal(row.Map, 'Rondo');
    assert.equal(row.Group, 'A');
    assert.equal(row.Type, 'Offline');

    // A booked match exists before a squad does: the write path must not read the
    // absent team/score columns as the scorecard importers' missing-column error.
    assert.equal(row.team, undefined);
    assert.equal(row.player, undefined);
    assert.equal(row.elims, undefined);
    assert.equal(row.rank, undefined);
  });

  it('keeps both slot numbers, so a fixture list can be ordered', () => {
    const rows = parsePaste(SCHEDULE_SHEET, 'excel', 'schedule').rows;

    assert.equal(rows[0].OverallMatch, 1);
    assert.equal(rows[17].OverallMatch, 18);
    assert.equal(rows[17].StageMatch, 18);
    assert.equal(rows[17].Map, 'Miramar');
    assert.equal(rows[17].Group, 'C');
    assert.equal(rows[17].Date, '24-09-2026');
    assert.equal(rows[17].Time, '1720');
  });

  it('leaves an absent stage slot undefined rather than a fabricated match 1', () => {
    const result = parsePaste(
      'Tournament\tStage\tDate\tTime\tOverallMatch\tMap\nAlpha\tWeek 1\t22-09-2026\t1400\t3\tErangel',
      'excel',
      'schedule',
    );

    assert.equal(result.rows[0].StageMatch, undefined);
    assert.equal(result.rows[0].OverallMatch, 3);
  });

  it('offers only the ten schedule columns, none of them scorecard detail', () => {
    const columns = pasteColumnsFor('schedule');

    assert.deepEqual(
      columns.map((column) => column.key),
      [
        'Tournament',
        'Stage',
        'Date',
        'TimeFormat',
        'Time',
        'OverallMatch',
        'StageMatch',
        'Map',
        'Group',
        'Type',
      ],
    );
    assert.equal(columns.some((column) => column.detail), false);
  });

  it('reports no scoring fallbacks, because a schedule scores nothing', () => {
    assert.deepEqual(scoringFallbacksFor('schedule'), []);

    const result = parsePaste(SCHEDULE_SHEET, 'excel', 'schedule');
    assert.deepEqual(describeScoringFallbacks(result, 'schedule'), []);
  });

  it('previews every column as present and nothing as a blank detail', () => {
    const preview = summarisePasteColumns(parsePaste(SCHEDULE_SHEET, 'excel', 'schedule').rows, 'schedule');

    assert.equal(preview.present.length, 10);
    assert.deepEqual(preview.missingDetails, []);
  });

  it('leaves the scorecard targets untouched by the schedule columns', () => {
    // The same sheet read as a scorecard paste still maps its (empty) team cell —
    // the targets must not silently converge.
    const teamRows = parsePaste(SCHEDULE_SHEET, 'excel', 'teams').rows;

    assert.equal(teamRows[0].team, '');
    assert.equal(pasteColumnsFor('teams').length > 10, true);
    assert.equal(pasteColumnsFor('players').length > 10, true);
  });
});

describe('viewer kick-off formatting', () => {
  // 16:00 IST on 10 Aug 2026.
  const afternoon = new Date('2026-08-10T10:30:00Z');
  // 00:30 IST on 11 Aug 2026 — the day differs by zone.
  const afterMidnightIst = new Date('2026-08-10T19:00:00Z');

  it('renders the same instant in whichever zone it is given', () => {
    assert.ok(formatKickoffTime(afternoon, { locale: 'en-GB', timeZone: 'Asia/Kolkata' }).includes('16:00'));
    assert.ok(formatKickoffTime(afternoon, { locale: 'en-GB', timeZone: 'America/New_York' }).includes('06:30'));
  });

  it('does not render the same time for two different zones', () => {
    const ist = formatKickoffTime(afternoon, { locale: 'en-US', timeZone: 'Asia/Kolkata' });
    const us = formatKickoffTime(afternoon, { locale: 'en-US', timeZone: 'America/New_York' });

    assert.notEqual(ist, us);
  });

  it('moves the day with the time, so date and clock never disagree', () => {
    // A US reader sees the previous day's evening, not the IST day with a US clock.
    assert.ok(formatKickoffDate(afterMidnightIst, { locale: 'en-US', timeZone: 'Asia/Kolkata' }).includes('Aug 11'));
    assert.ok(formatKickoffDate(afterMidnightIst, { locale: 'en-US', timeZone: 'America/New_York' }).includes('Aug 10'));
  });

  it('names the zone it rendered, so the figure cannot be misread', () => {
    const formatted = formatKickoffTime(afternoon, { locale: 'en-US', timeZone: 'America/New_York' });

    assert.match(formatted, /[A-Za-z]{2,}/);
  });
});

describe('parseTimeTo24h', () => {
  it('reads the 4-digit military form a spreadsheet exports', () => {
    assert.equal(parseTimeTo24h('1400'), '14:00');
    assert.equal(parseTimeTo24h('0930'), '09:30');
    assert.equal(parseTimeTo24h('1720'), '17:20');
    assert.equal(parseTimeTo24h('1400 IST'), '14:00');
  });

  it('reads the colon and 12-hour forms unchanged', () => {
    assert.equal(parseTimeTo24h('15:40'), '15:40');
    assert.equal(parseTimeTo24h('15:40 IST'), '15:40');
    assert.equal(parseTimeTo24h('4:20 PM'), '16:20');
    assert.equal(parseTimeTo24h('9 am'), '09:00');
  });

  it('returns null rather than a stand-in time when nothing is readable', () => {
    assert.equal(parseTimeTo24h(''), null);
    assert.equal(parseTimeTo24h(null), null);
    assert.equal(parseTimeTo24h('TBA'), null);
    // Neither 24:00 nor 12:60 is a time.
    assert.equal(parseTimeTo24h('2400'), null);
    assert.equal(parseTimeTo24h('1260'), null);
  });
});
