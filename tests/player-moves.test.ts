import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveMoves, type Appearance } from '../lib/player-moves';

const at = (day: string) => new Date(`${day}T00:00:00.000Z`);
const appearance = (playerId: string, teamId: string, day: string): Appearance => ({
  playerId,
  teamId,
  date: at(day),
});

const show = (rows: Appearance[]) =>
  deriveMoves(rows).map((move) => ({
    playerId: move.playerId,
    from: move.fromTeamId,
    to: move.toTeamId,
    date: move.date.toISOString().slice(0, 10),
  }));

describe('deriveMoves', () => {
  it('returns nothing for a player who only ever appears for one team', () => {
    // The Kratos case: listed for Nebula in both events, so there is no move.
    assert.deepEqual(show([appearance('k', 'Nebula', '2026-06-09'), appearance('k', 'Nebula', '2026-08-10')]), []);
  });

  it('does not treat a first appearance as an arrival', () => {
    assert.deepEqual(show([appearance('a', 'Autobotz', '2026-06-09')]), []);
  });

  it('does not treat absence from a later event as a departure', () => {
    // The Truce case: listed for Nebula in BMPS, not listed in BGMS at all.
    assert.deepEqual(show([appearance('t', 'Nebula', '2026-06-09')]), []);
  });

  it('derives a move when the player appears for a different team later', () => {
    assert.deepEqual(
      show([appearance('p', 'Autobotz', '2026-06-09'), appearance('p', 'Epigrotive', '2026-08-10')]),
      [{ playerId: 'p', from: 'Autobotz', to: 'Epigrotive', date: '2026-08-10' }],
    );
  });

  it('is order-independent', () => {
    assert.deepEqual(
      show([appearance('p', 'Epigrotive', '2026-08-10'), appearance('p', 'Autobotz', '2026-06-09')]),
      [{ playerId: 'p', from: 'Autobotz', to: 'Epigrotive', date: '2026-08-10' }],
    );
  });

  it('reports each leg when a player moves twice', () => {
    assert.deepEqual(
      show([
        appearance('p', 'A', '2026-01-01'),
        appearance('p', 'B', '2026-04-01'),
        appearance('p', 'C', '2026-09-01'),
      ]),
      [
        { playerId: 'p', from: 'A', to: 'B', date: '2026-04-01' },
        { playerId: 'p', from: 'B', to: 'C', date: '2026-09-01' },
      ],
    );
  });

  it('treats a return to a previous team as its own move', () => {
    assert.deepEqual(
      show([
        appearance('p', 'A', '2026-01-01'),
        appearance('p', 'B', '2026-04-01'),
        appearance('p', 'A', '2026-09-01'),
      ]),
      [
        { playerId: 'p', from: 'A', to: 'B', date: '2026-04-01' },
        { playerId: 'p', from: 'B', to: 'A', date: '2026-09-01' },
      ],
    );
  });

  it('keeps players independent of one another', () => {
    assert.deepEqual(
      show([
        appearance('p1', 'Autobotz', '2026-06-09'),
        appearance('p2', 'Autobotz', '2026-06-09'),
        appearance('p1', 'Epigrotive', '2026-08-10'),
        appearance('p2', 'Epigrotive', '2026-08-10'),
      ]),
      [
        { playerId: 'p1', from: 'Autobotz', to: 'Epigrotive', date: '2026-08-10' },
        { playerId: 'p2', from: 'Autobotz', to: 'Epigrotive', date: '2026-08-10' },
      ],
    );
  });

  it('returns nothing for empty input', () => {
    assert.deepEqual(show([]), []);
  });
});
