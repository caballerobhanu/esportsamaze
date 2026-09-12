/* Server-side data access for the KRAFTON rankings system (v2).
   Fetches entry rows shaped for the board engine and resolves site links. */

import prisma from '@/lib/prisma';
import type { KraftonBoard } from '@prisma/client';
import type { EntryRow, TransferRule } from '@/lib/krafton-standings';
import { computeBoard } from '@/lib/krafton-standings';

export async function fetchBoardEntries(board: KraftonBoard): Promise<EntryRow[]> {
  const rows = await prisma.kraftonEntry.findMany({
    where: { board },
    include: { event: { select: { name: true, endDate: true, tier: true } } },
  });
  return rows
    .map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventName: r.event.name,
      eventEndDate: r.event.endDate,
      tier: r.event.tier,
      board: r.board,
      entityId: r.entityId,
      entityName: r.entityName,
      teamName: r.teamName,
      teamId: r.teamId,
      rank: r.rank,
      finishes: r.finishes,
      mvp: r.mvp,
      finalsMvp: r.finalsMvp,
      igl: r.igl,
      survivor: r.survivor,
      emerging: r.emerging,
    }))
    .sort((a, b) => b.eventEndDate.getTime() - a.eventEndDate.getTime());
}

/** Board entries for one entity (by linked id or by entered name). */
export async function fetchEntityEntries(board: KraftonBoard, key: string): Promise<EntryRow[]> {
  const rows = await prisma.kraftonEntry.findMany({
    where: { board, OR: [{ entityId: key }, { entityName: decodeURIComponent(key) }] },
    include: { event: { select: { name: true, endDate: true, tier: true } } },
  });
  return rows
    .map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventName: r.event.name,
      eventEndDate: r.event.endDate,
      tier: r.event.tier,
      board: r.board,
      entityId: r.entityId,
      entityName: r.entityName,
      teamName: r.teamName,
      teamId: r.teamId,
      rank: r.rank,
      finishes: r.finishes,
      mvp: r.mvp,
      finalsMvp: r.finalsMvp,
      igl: r.igl,
      survivor: r.survivor,
      emerging: r.emerging,
    }))
    .sort((a, b) => b.eventEndDate.getTime() - a.eventEndDate.getTime());
}

/** Site profile link for a linked entity (slug lookup), or null when unlinked. */
export async function fetchProfileSlug(board: KraftonBoard, entityId: string | null): Promise<string | null> {
  if (!entityId) return null;
  try {
    if (board === 'TEAM') {
      const team = await prisma.team.findUnique({ where: { id: entityId }, select: { slug: true, tag: true } });
      return team?.slug || (team?.tag ? `/teams/${team.tag}` : null) || null;
    }
    const player = await prisma.player.findUnique({ where: { id: entityId }, select: { slug: true } });
    return player?.slug ?? null;
  } catch {
    return null;
  }
}

/** Entity display names for the detail header when linked. */
export async function fetchLinkedEntityName(board: KraftonBoard, entityId: string | null): Promise<string | null> {
  if (!entityId) return null;
  try {
    if (board === 'TEAM') {
      const team = await prisma.team.findUnique({ where: { id: entityId }, select: { displayName: true, name: true } });
      return team?.displayName || team?.name || null;
    }
    const player = await prisma.player.findUnique({ where: { id: entityId }, select: { ign: true } });
    return player?.ign ?? null;
  } catch {
    return null;
  }
}

export async function fetchTeamTransfers(): Promise<TransferRule[]> {
  const rows = await prisma.kraftonTransfer.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map((t) => ({
    id: t.id,
    fromTeamId: t.fromTeamId,
    fromName: t.fromName,
    toTeamId: t.toTeamId,
    toName: t.toName,
    cutoff: t.cutoff,
    mode: t.mode as 'add' | 'wipe',
    amount: t.amount,
  }));
}

export interface EntityStanding {
  rank: number;
  points: number;
  events: number;
  finishes: number;
}

/** New-system rank for a profile page: position within its board (live decay). */
export async function fetchEntityStanding(
  board: KraftonBoard,
  entityId: string
): Promise<EntityStanding | null> {
  const entries = await fetchBoardEntries(board);
  if (entries.length === 0) return null;
  const transfers = board === 'TEAM' ? await fetchTeamTransfers() : [];
  const ranked = computeBoard(entries, transfers).map((e, i) => ({ ...e, rank: i + 1 }));
  const me = ranked.find((e) => e.entityId === entityId);
  if (!me) return null;
  return {
    rank: me.rank,
    points: me.totalPoints,
    events: me.events,
    finishes: me.contributions.reduce((sum, c) => sum + c.finishes, 0),
  };
}
