import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveTransferOrigins,
  orderTransfers,
  type PlayerTransferType,
  type TransferRecord,
} from '../lib/player-transfer-rule';

/** A transfer row with only the fields the rule reads. */
function move(
  id: string,
  type: PlayerTransferType,
  teamId: string,
  day: string,
  createdAt?: string,
): TransferRecord {
  return {
    id,
    type,
    teamId,
    date: new Date(`${day}T00:00:00.000Z`),
    createdAt: createdAt ? new Date(createdAt) : null,
  };
}

describe('deriveTransferOrigins', () => {
  it('gives the earliest movement no origin', () => {
    const origins = deriveTransferOrigins([move('a', 'JOINED', 'A', '2024-01-01')]);
    assert.equal(origins.get('a'), null);
  });

  it('derives the origin from the previous movement, not from entry order', () => {
    // The real bug: a June event for Autobotz entered AFTER an August event for
    // Epigrotive must not claim it came from Epigrotive.
    const origins = deriveTransferOrigins([
      move('june', 'JOINED', 'Autobotz', '2026-06-09'),
      move('aug', 'JOINED', 'Epigrotive', '2026-08-10'),
    ]);
    assert.equal(origins.get('june'), null);
    assert.equal(origins.get('aug'), 'Autobotz');
  });

  it('is order-independent', () => {
    const origins = deriveTransferOrigins([
      move('aug', 'JOINED', 'Epigrotive', '2026-08-10'),
      move('june', 'JOINED', 'Autobotz', '2026-06-09'),
    ]);
    assert.equal(origins.get('june'), null);
    assert.equal(origins.get('aug'), 'Autobotz');
  });

  it('never gives a LEFT an origin', () => {
    const rows = [
      move('a', 'JOINED', 'A', '2024-01-01'),
      move('b', 'LEFT', 'A', '2024-06-01'),
      move('c', 'JOINED', 'B', '2025-01-01'),
    ];
    const origins = deriveTransferOrigins(rows);
    assert.equal(origins.get('b'), null);
    // The last team the player was on was A, even though they had left it.
    assert.equal(origins.get('c'), 'A');
  });

  it('treats LOANED and BENCHED as decisive movements', () => {
    const rows = [
      move('a', 'JOINED', 'A', '2024-01-01'),
      move('b', 'LOANED', 'B', '2024-03-01'),
      move('c', 'BENCHED', 'B', '2024-05-01'),
      move('d', 'JOINED', 'C', '2024-09-01'),
    ];
    const origins = deriveTransferOrigins(rows);
    assert.equal(origins.get('b'), 'A');
    assert.equal(origins.get('c'), 'B');
    assert.equal(origins.get('d'), 'B');
  });

  it('returns an empty map for a player with no movements', () => {
    assert.equal(deriveTransferOrigins([]).size, 0);
  });
});

describe('orderTransfers', () => {
  it('does not mutate the input array', () => {
    const rows = [move('b', 'JOINED', 'B', '2025-01-01'), move('a', 'JOINED', 'A', '2024-01-01')];
    const before = rows.map((row) => row.id);
    orderTransfers(rows);
    assert.deepEqual(rows.map((row) => row.id), before);
  });

  it('orders oldest first', () => {
    const rows = [move('b', 'JOINED', 'B', '2025-01-01'), move('a', 'JOINED', 'A', '2024-01-01')];
    assert.deepEqual(orderTransfers(rows).map((row) => row.id), ['a', 'b']);
  });

  it('breaks a same-day tie by createdAt, then id', () => {
    const rows = [
      move('z', 'JOINED', 'B', '2024-01-01', '2024-01-01T10:00:00.000Z'),
      move('y', 'JOINED', 'C', '2024-01-01', '2024-01-01T09:00:00.000Z'),
      move('x', 'JOINED', 'D', '2024-01-01', '2024-01-01T09:00:00.000Z'),
    ];
    assert.deepEqual(orderTransfers(rows).map((row) => row.id), ['x', 'y', 'z']);
  });
});
