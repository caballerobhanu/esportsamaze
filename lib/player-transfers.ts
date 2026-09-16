/**
 * Roster membership and the admin-only transfer ledger.
 *
 * These are deliberately separate:
 *
 *  - **Membership** (`Player.currentTeamId`) is a stored roster slot, written by
 *    event/scorecard imports and admin roster edits. It is NOT derived from the
 *    ledger — a player is on a team because a roster says so, not because a
 *    transfer was recorded.
 *  - **Transfers** are history recorded by an admin on the Transfers page and
 *    nothing else. The only derived value is each row's `fromTeamId`.
 *
 * Every helper takes a `Prisma.TransactionClient` so related writes move together.
 */

import type { Prisma } from '@prisma/client';

import {
  deriveTransferOrigins,
  type PlayerTransferType,
} from './player-transfer-rule';

type Db = Prisma.TransactionClient;

export interface TransferInput {
  playerId: string;
  teamId: string;
  type: PlayerTransferType;
  date: Date;
  staffRole?: string | null;
  notes?: string | null;
}

/**
 * Note the absence of `fromTeamId`: the origin is derived from the timeline, so
 * callers cannot set it (or set it wrong) — see `deriveTransferOrigins`.
 */
const LEDGER_SELECT = {
  id: true,
  type: true,
  teamId: true,
  date: true,
  createdAt: true,
  fromTeamId: true,
} as const;

function readLedger(db: Db, playerId: string) {
  return db.transfer.findMany({ where: { playerId }, select: LEDGER_SELECT });
}

/* ── Roster membership ─────────────────────────────────────────────────── */

/**
 * Point a player at a team (or at nothing) and stamp when it happened.
 * Unconditional — this is the explicit roster slot write.
 */
export async function setRosterMembership(
  db: Db,
  playerId: string,
  teamId: string | null,
  options: { since?: Date } = {},
): Promise<void> {
  await db.player.update({
    where: { id: playerId },
    data: { currentTeamId: teamId, currentTeamSince: options.since ?? new Date() },
  });
}

/**
 * Membership from an event appearance. Applies only when the event is at least as
 * recent as whatever last set the team, so re-importing an older event (BGIS in
 * January, after BMPS in June) can never move a player back. Returns whether it
 * applied.
 */
export async function applyRosterMembership(
  db: Db,
  playerId: string,
  teamId: string | null,
  eventDate: Date,
): Promise<boolean> {
  const player = await db.player.findUnique({
    where: { id: playerId },
    select: { currentTeamId: true, currentTeamSince: true },
  });
  if (!player) return false;

  const since = player.currentTeamSince;
  if (since && since.getTime() > eventDate.getTime()) return false;
  if (player.currentTeamId === teamId && since?.getTime() === eventDate.getTime()) return false;

  await setRosterMembership(db, playerId, teamId, { since: eventDate });
  return true;
}

/* ── Transfers (admin-only history) ────────────────────────────────────── */

/**
 * Rebuild every row's derived origin from the recorded timeline. Safe to call
 * when nothing changed — it writes only the values that differ.
 */
export async function rebuildTransferOrigins(db: Db, playerId: string): Promise<void> {
  const transfers = await readLedger(db, playerId);
  if (transfers.length === 0) return;

  const origins = deriveTransferOrigins(transfers);
  for (const row of transfers) {
    const desired = origins.get(row.id) ?? null;
    if (row.fromTeamId !== desired) {
      await db.transfer.update({ where: { id: row.id }, data: { fromTeamId: desired } });
    }
  }
}

/**
 * A recorded transfer also moves the player: the destination (or nothing, for a
 * LEFT) is applied through the same date gate, so a back-dated transfer cannot
 * undo a more recent roster slot.
 */
async function applyTransferToMembership(db: Db, input: TransferInput): Promise<void> {
  const nextTeam = input.type === 'LEFT' ? null : input.teamId;
  await applyRosterMembership(db, input.playerId, nextTeam, input.date);
}

export async function createTransfer(db: Db, input: TransferInput) {
  const created = await db.transfer.create({
    data: {
      playerId: input.playerId,
      teamId: input.teamId,
      type: input.type,
      date: input.date,
      staffRole: input.staffRole ?? null,
      notes: input.notes ?? null,
    },
  });
  await rebuildTransferOrigins(db, input.playerId);
  await applyTransferToMembership(db, input);
  return created;
}

export async function updateTransfer(db: Db, id: string, input: TransferInput) {
  const previous = await db.transfer.findUnique({ where: { id }, select: { playerId: true } });

  const updated = await db.transfer.update({
    where: { id },
    data: {
      playerId: input.playerId,
      teamId: input.teamId,
      type: input.type,
      date: input.date,
      staffRole: input.staffRole ?? null,
      notes: input.notes ?? null,
    },
  });

  // A re-parented row leaves the old player's ledger short one movement.
  if (previous && previous.playerId !== input.playerId) {
    await rebuildTransferOrigins(db, previous.playerId);
  }
  await rebuildTransferOrigins(db, input.playerId);
  await applyTransferToMembership(db, input);
  return updated;
}

export async function deleteTransfer(db: Db, id: string) {
  const row = await db.transfer.findUnique({ where: { id }, select: { playerId: true } });
  if (!row) return;
  await db.transfer.delete({ where: { id } });
  // The roster slot is unaffected: it was set by a roster, not by this row.
  await rebuildTransferOrigins(db, row.playerId);
}
