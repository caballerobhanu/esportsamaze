import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  describeRulePosition,
  parseQualificationRules,
  qualificationTargetsForRank,
  rulesCoveringRank,
} from '../lib/qualification-rules';

/* The BMSD shape: the champion goes to PMGC, and the top six — champion
   included — go to BMIC. Overlapping on purpose. */
const BMSD = [
  { from: 1, to: 1, events: [{ name: 'PMGC 2026', tournamentSlug: 'pmgc-2026' }] },
  { from: 1, to: 6, events: [{ name: 'BMIC 2026', tournamentSlug: 'bmic-2026' }] },
];

test('parseQualificationRules reads the numeric shape', () => {
  const rules = parseQualificationRules(BMSD);
  assert.equal(rules.length, 2);
  assert.deepEqual(rules[0], {
    from: 1,
    to: 1,
    label: null,
    targets: [{ name: 'PMGC 2026', tournamentId: null, tournamentSlug: 'pmgc-2026' }],
    note: null,
  });
});

test('parseQualificationRules turns a legacy place into a numeric range', () => {
  // The old shape had no numbers, so the range is derived from the wording —
  // no migration and no re-entry needed.
  const [single] = parseQualificationRules([
    { place: '1st Place', events: ['PMGC 2026'] },
  ]);
  assert.equal(single.from, 1);
  assert.equal(single.to, 1);
  assert.equal(single.label, '1st Place');

  const [band] = parseQualificationRules([{ place: 'Top 6', events: ['BMIC 2026'] }]);
  assert.equal(band.from, 1);
  assert.equal(band.to, 6);
});

test('parseQualificationRules keeps a description as the note', () => {
  const [rule] = parseQualificationRules([
    { place: '2nd', events: ['PMGC 2026'], description: 'Already qualified via BMSD' },
  ]);
  assert.equal(rule.note, 'Already qualified via BMSD');
});

test('parseQualificationRules keeps a rule whose destination is not filled in yet', () => {
  // This is the shape that vanished: the position was entered and saved, the
  // destination was not. Silently dropping it is how an admin's rule disappears
  // from the page with no explanation.
  const rules = parseQualificationRules([
    { from: 1, to: 1, events: [{ name: 'PMGC' }] },
    { from: 1, to: 6, events: [] },
  ]);
  assert.equal(rules.length, 2);
  assert.equal(rules[1].from, 1);
  assert.equal(rules[1].to, 6);
  assert.deepEqual(rules[1].targets, []);
});

test('parseQualificationRules is unaffected by field order in stored JSON', () => {
  // Postgres gives the keys back alphabetically: "events" before "from".
  const [rule] = parseQualificationRules([{ events: [{ name: 'BMIC 2026' }], from: 1, to: 6 }]);
  assert.equal(rule.from, 1);
  assert.equal(rule.to, 6);
  assert.equal(rule.targets.length, 1);
});

test('parseQualificationRules drops a rule that says nothing', () => {
  assert.deepEqual(parseQualificationRules([{ events: [] }, { place: '   ' }, null, 'x', 7]), []);
  assert.deepEqual(parseQualificationRules(null), []);
  assert.deepEqual(parseQualificationRules({ from: 1 }), []);
});

test('parseQualificationRules accepts a target that is not in the DB yet', () => {
  const [rule] = parseQualificationRules([{ from: 3, to: 4, events: [{ name: 'EWC 2026' }] }]);
  assert.deepEqual(rule.targets, [{ name: 'EWC 2026', tournamentId: null, tournamentSlug: null }]);
});

test('rulesCoveringRank returns every rule a position satisfies, overlap included', () => {
  const rules = parseQualificationRules(BMSD);
  assert.equal(rulesCoveringRank(rules, 1).length, 2);
  assert.equal(rulesCoveringRank(rules, 4).length, 1);
  assert.equal(rulesCoveringRank(rules, 7).length, 0);
  assert.equal(rulesCoveringRank(rules, null).length, 0);
});

test('qualificationTargetsForRank leads with the tighter rule and de-duplicates', () => {
  const targets = qualificationTargetsForRank(parseQualificationRules(BMSD), 1);
  assert.deepEqual(
    targets.map((t) => t.name),
    ['PMGC 2026', 'BMIC 2026']
  );

  // Rank 4 only satisfies the second rule.
  assert.deepEqual(
    qualificationTargetsForRank(parseQualificationRules(BMSD), 4).map((t) => t.name),
    ['BMIC 2026']
  );
});

test('qualificationTargetsForRank does not repeat an event across two rules', () => {
  const rules = parseQualificationRules([
    { from: 1, to: 1, events: [{ name: 'PMGC 2026' }] },
    { from: 1, to: 4, events: [{ name: 'PMGC 2026' }, { name: 'BMIC 2026' }] },
  ]);
  assert.deepEqual(
    qualificationTargetsForRank(rules, 1).map((t) => t.name),
    ['PMGC 2026', 'BMIC 2026']
  );
});

test('describeRulePosition formats the range, or falls back to the wording', () => {
  assert.equal(describeRulePosition({ from: 1, to: 1, label: null, targets: [], note: null }), '1st');
  assert.equal(
    describeRulePosition({ from: 5, to: 8, label: null, targets: [], note: null }),
    '5th - 8th'
  );
  assert.equal(
    describeRulePosition({ from: null, to: null, label: 'Best non-qualified', targets: [], note: null }),
    'Best non-qualified'
  );
});
