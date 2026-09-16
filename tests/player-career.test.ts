import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCareerHistory, type CareerAppearance } from '../lib/player-career';

const at = (day: string) => new Date(`${day}T00:00:00.000Z`);
const show = (appearances: CareerAppearance[], currentTeamId: string | null) =>
  buildCareerHistory(appearances, currentTeamId).map((entry) => ({
    teamId: entry.teamId,
    roles: entry.roles,
    spans: entry.spans.map((span) => [
      span.start ? span.start.toISOString().slice(0, 10) : null,
      span.end ? span.end.toISOString().slice(0, 10) : null,
    ]),
  }));

describe('buildCareerHistory', () => {
  it('returns nothing for a player with no appearances', () => {
    assert.deepEqual(show([], null), []);
  });

  it('collapses consecutive events for one team into a single open tenure', () => {
    const result = show(
      [
        { teamId: 'A', date: at('2026-01-10') },
        { teamId: 'A', date: at('2026-03-05') },
        { teamId: 'A', date: at('2026-05-20') },
      ],
      'A',
    );
    assert.deepEqual(result, [{ teamId: 'A', roles: [], spans: [['2026-01-10', null]] }]);
  });

  it('ends a tenure when the next event is a different team', () => {
    const result = show(
      [
        { teamId: 'Autobotz', date: at('2026-06-09') },
        { teamId: 'Epigrotive', date: at('2026-08-10') },
      ],
      'Epigrotive',
    );
    assert.deepEqual(result, [
      { teamId: 'Epigrotive', roles: [], spans: [['2026-08-10', null]] },
      { teamId: 'Autobotz', roles: [], spans: [['2026-06-09', '2026-08-10']] },
    ]);
  });

  it('closes the final tenure when the player is not on that team now', () => {
    const result = show([{ teamId: 'A', date: at('2025-02-01') }], 'B');
    assert.deepEqual(result, [{ teamId: 'A', roles: [], spans: [['2025-02-01', '2025-02-01']] }]);
  });

  it('keeps separate tenures when a player leaves and returns', () => {
    const result = show(
      [
        { teamId: 'A', date: at('2024-01-01') },
        { teamId: 'B', date: at('2024-04-01') },
        { teamId: 'A', date: at('2024-09-01') },
      ],
      'A',
    );
    assert.deepEqual(result, [
      { teamId: 'A', roles: [], spans: [['2024-09-01', null], ['2024-01-01', '2024-04-01']] },
      { teamId: 'B', roles: [], spans: [['2024-04-01', '2024-09-01']] },
    ]);
  });

  it('is order-independent and collects staff roles', () => {
    const result = show(
      [
        { teamId: 'B', date: at('2024-04-01'), role: 'Coach' },
        { teamId: 'A', date: at('2024-01-01'), role: 'IGL' },
      ],
      'B',
    );
    assert.deepEqual(result, [
      { teamId: 'B', roles: ['Coach'], spans: [['2024-04-01', null]] },
      { teamId: 'A', roles: ['IGL'], spans: [['2024-01-01', '2024-04-01']] },
    ]);
  });
});
