import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultMatchFor, initialStageIndex, matchHasResults, stageIndexForMatchId } from '../lib/match-selection';

/**
 * The rules that decide what a matches surface opens on. They only bite when a
 * stage contains an unplayed fixture — the case that used to open an empty
 * scorecard for an otherwise finished stage.
 */

const played = (id: string) => ({ id, teamResults: [{ id: `${id}-r1` }] });
const unplayed = (id: string) => ({ id, teamResults: [] });

describe('matchHasResults', () => {
  it('is true only when the match actually carries a scorecard', () => {
    assert.equal(matchHasResults(played('a')), true);
    assert.equal(matchHasResults(unplayed('a')), false);
    assert.equal(matchHasResults({ id: 'a' }), false);
    assert.equal(matchHasResults({ id: 'a', teamResults: null }), false);
  });
});

describe('defaultMatchFor', () => {
  it('picks the latest match that has results, not the latest fixture', () => {
    const matches = [played('m1'), played('m2'), unplayed('m3'), unplayed('m4')];

    assert.equal(defaultMatchFor(matches)?.id, 'm2');
  });

  it('picks the very latest match when every one is played', () => {
    assert.equal(defaultMatchFor([played('m1'), played('m2'), played('m3')])?.id, 'm3');
  });

  it('falls back to the FIRST fixture when nothing is played yet', () => {
    // An upcoming event opens on its opening match, not on its last one.
    assert.equal(defaultMatchFor([unplayed('m1'), unplayed('m2')])?.id, 'm1');
  });

  it('returns nothing for an empty stage rather than throwing', () => {
    assert.equal(defaultMatchFor([]), null);
  });

  it('does not mutate the list it is given', () => {
    const matches = [played('m1'), unplayed('m2')];
    defaultMatchFor(matches);

    assert.deepEqual(
      matches.map((m) => m.id),
      ['m1', 'm2']
    );
  });
});

/** One stage, in schedule order. */
const stage = (...matches: ReturnType<typeof played>[]) => ({ matches });

describe('initialStageIndex', () => {
  it('opens the final stage of a finished event', () => {
    const groups = [
      stage(played('qf1'), played('qf2')),
      stage(played('sf1'), played('sf2')),
      stage(played('gf1'), played('gf2')),
    ];

    assert.equal(initialStageIndex(groups), 2);
  });

  it('opens the stage being played on an ongoing event, not a later untouched one', () => {
    // Week 1 is live; Week 2 is scheduled and has nothing played yet.
    const groups = [
      stage(played('w1m1'), played('w1m2'), unplayed('w1m3')),
      stage(unplayed('w2m1'), unplayed('w2m2')),
    ];

    assert.equal(initialStageIndex(groups), 0);
  });

  it('moves to the next stage as soon as that stage has a result', () => {
    const groups = [
      stage(played('w1m1'), played('w1m2')),
      stage(played('w2m1'), unplayed('w2m2')),
    ];

    assert.equal(initialStageIndex(groups), 1);
  });

  it('opens the first stage of an event that has not started', () => {
    const groups = [stage(unplayed('w1m1'), unplayed('w1m2')), stage(unplayed('w2m1'))];

    assert.equal(initialStageIndex(groups), 0);
  });

  it('returns the first stage rather than throwing when there are none', () => {
    assert.equal(initialStageIndex([]), 0);
  });
});

describe('what the matches tab opens on', () => {
  it('a finished event — the last match of the last stage', () => {
    const groups = [stage(played('qf1'), played('qf2')), stage(played('gf1'), played('gf2'))];
    const idx = initialStageIndex(groups);

    assert.equal(defaultMatchFor(groups[idx].matches)?.id, 'gf2');
  });

  it('an ongoing event — the last played match of the stage in progress', () => {
    // Week 1 has reached match 6 of 18; Week 2 is scheduled but unplayed. The tab
    // must open on Week 1's match 6, not on Week 2's last fixture.
    const week1 = stage(
      played('w1m1'),
      played('w1m2'),
      played('w1m3'),
      played('w1m4'),
      played('w1m5'),
      played('w1m6'),
      ...Array.from({ length: 12 }, (_, i) => unplayed(`w1m${i + 7}`))
    );
    const week2 = stage(...Array.from({ length: 18 }, (_, i) => unplayed(`w2m${i + 1}`)));
    const groups = [week1, week2];

    const idx = initialStageIndex(groups);
    assert.equal(idx, 0);
    assert.equal(defaultMatchFor(groups[idx].matches)?.id, 'w1m6');
  });

  it('an upcoming event — the first match of the first stage', () => {
    const groups = [
      stage(...Array.from({ length: 18 }, (_, i) => unplayed(`w1m${i + 1}`))),
      stage(...Array.from({ length: 18 }, (_, i) => unplayed(`w2m${i + 1}`))),
    ];

    const idx = initialStageIndex(groups);
    assert.equal(idx, 0);
    assert.equal(defaultMatchFor(groups[idx].matches)?.id, 'w1m1');
  });
});

describe('stageIndexForMatchId', () => {
  const groups = [
    { matches: [played('a1'), played('a2')] },
    { matches: [unplayed('b1'), unplayed('b2')] },
  ];

  it('resolves the stage that holds the linked match, even a later one', () => {
    // The calendar links by match id, which says nothing about the stage.
    assert.equal(stageIndexForMatchId(groups, 'b2'), 1);
  });

  it('resolves an early stage too', () => {
    assert.equal(stageIndexForMatchId(groups, 'a1'), 0);
  });

  it('reports no stage for an id no stage holds', () => {
    assert.equal(stageIndexForMatchId(groups, 'missing'), -1);
  });

  it('reports no stage when there is no id to resolve', () => {
    assert.equal(stageIndexForMatchId(groups, null), -1);
    assert.equal(stageIndexForMatchId(groups, ''), -1);
  });
});
