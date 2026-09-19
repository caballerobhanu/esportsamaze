import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTemplateStages,
  normaliseStageTemplates,
  toTemplateStages,
} from '../lib/stage-templates';

test('toTemplateStages strips the per-event fields', () => {
  const [stage] = toTemplateStages([
    {
      id: 's1',
      name: 'Group Stage',
      sequence: 1,
      matchesPerDay: 6,
      startDate: '2026-01-01',
      endDate: '2026-01-05',
      dates: 'Jan 1 – Jan 5, 2026',
      customDates: ['2026-01-02'],
      groups: { 'Group A': [] },
    },
  ]);

  assert.equal(stage.name, 'Group Stage');
  assert.equal(stage.matchesPerDay, 6);
  assert.equal(stage.sequence, 1);
  for (const field of ['startDate', 'endDate', 'dates', 'customDates', 'groups']) {
    assert.equal(field in stage, false, `${field} must not be carried into a template`);
  }
});

test('toTemplateStages drops stages with no name', () => {
  assert.deepEqual(toTemplateStages([{ name: '   ', matchesPerDay: 6 }]), []);
});

test('applyTemplateStages keeps the event own dates and draw for stages it already has', () => {
  const template = [{ name: 'Group Stage', matchesPerDay: 6 }, { name: 'Grand Finals', matchesPerDay: 6 }];
  const current = [
    { id: 'existing-1', name: 'Group Stage', startDate: '2026-03-01', groups: { 'Group A': ['team-1'] } },
  ];

  const applied = applyTemplateStages(template, current);

  assert.equal(applied.length, 2);
  assert.equal(applied[0].startDate, '2026-03-01');
  assert.deepEqual(applied[0].groups, { 'Group A': ['team-1'] });
  assert.equal(applied[0].id, 'existing-1');

  // A stage the event does not have yet starts clean, with a fresh id.
  assert.equal('startDate' in applied[1], false);
  assert.deepEqual(applied[1].groups, {});
  assert.equal(applied[1].id, 'stage-2');
});

test('applyTemplateStages follows the template order, not the existing one', () => {
  const template = [{ name: 'A' }, { name: 'B' }];
  const current = [{ name: 'B', sequence: 1 }, { name: 'A', sequence: 2 }];

  const applied = applyTemplateStages(template, current);

  assert.deepEqual(applied.map((stage) => stage.name), ['A', 'B']);
  assert.deepEqual(applied.map((stage) => stage.sequence), [1, 2]);
});

test('normaliseStageTemplates keeps only well-formed entries', () => {
  const parsed = normaliseStageTemplates([
    { id: 't1', name: 'Standard 4-stage', createdAt: '2026-01-01T00:00:00.000Z', stages: [{ name: 'A' }] },
    null,
    'nope',
    { id: 't2' },
    { id: 't3', name: 'No stages' },
  ]);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, 't1');
  assert.equal(parsed[0].stages.length, 1);
});

test('normaliseStageTemplates tolerates anything that is not an array', () => {
  assert.deepEqual(normaliseStageTemplates(null), []);
  assert.deepEqual(normaliseStageTemplates(undefined), []);
  assert.deepEqual(normaliseStageTemplates({ nope: true }), []);
});
