/* Server-side data access for the KRAFTON rankings system (v2).
   Fetches entry rows shaped for the board engine and resolves site links. */

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import type { KraftonBoard } from '@prisma/client';
import type { EntryRow, RankedBoardEntity, TransferRule } from '@/lib/krafton-standings';
import {
  computeBoard,
  computeBoardWithRankChanges,
  generateHistoricalSnapshotDates,
} from '@/lib/krafton-standings';

export const fetchBoardEntries = unstable_cache(
  async (board: KraftonBoard): Promise<EntryRow[]> => {
    const rows = await prisma.kraftonEntry.findMany({
      where: { board },
      include: {
        event: {
          select: {
            name: true,
            endDate: true,
            tier: true,
            tournamentId: true,
            tournament: { select: { id: true, slug: true } },
          },
        },
      },
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
        tournamentId: r.event.tournamentId ?? null,
        tournamentSlug: r.event.tournament?.slug ?? null,
      }))
      .sort((a, b) => b.eventEndDate.getTime() - a.eventEndDate.getTime());
  },
  ['krafton-board-entries'],
  { tags: ['krafton-rankings'], revalidate: 3600 }
);

/** Board entries for one entity (by linked id, slug, or entered name). */
export async function fetchEntityEntries(board: KraftonBoard, key: string): Promise<EntryRow[]> {
  const decoded = decodeURIComponent(key);
  const unhyphenated = decoded.replace(/-/g, ' ');

  let linkedEntityId: string | null = null;
  let linkedEntityName: string | null = null;

  try {
    if (board === 'TEAM') {
      const team = await prisma.team.findFirst({
        where: {
          OR: [
            { id: decoded },
            { slug: decoded },
            { slug: decoded.toLowerCase() },
          ],
        },
        select: { id: true, name: true },
      });
      if (team) {
        linkedEntityId = team.id;
        linkedEntityName = team.name;
      }
    } else {
      const player = await prisma.player.findFirst({
        where: {
          OR: [
            { id: decoded },
            { slug: decoded },
            { slug: decoded.toLowerCase() },
          ],
        },
        select: { id: true, ign: true },
      });
      if (player) {
        linkedEntityId = player.id;
        linkedEntityName = player.ign;
      }
    }
  } catch {
    // ignore lookup errors
  }

  // If a specific team/player record was matched by id or unique slug, return its entries directly
  if (linkedEntityId) {
    const rows = await prisma.kraftonEntry.findMany({
      where: {
        board,
        entityId: linkedEntityId,
      },
      include: {
        event: {
          select: {
            name: true,
            endDate: true,
            tier: true,
            tournamentId: true,
            tournament: { select: { id: true, slug: true } },
          },
        },
      },
    });
    if (rows.length > 0) {
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
          tournamentId: r.event.tournamentId ?? null,
          tournamentSlug: r.event.tournament?.slug ?? null,
        }))
        .sort((a, b) => b.eventEndDate.getTime() - a.eventEndDate.getTime());
    }
  }

  // Next, check for unlinked entries (entityId is null) with this name
  const unlinkedRows = await prisma.kraftonEntry.findMany({
    where: {
      board,
      entityId: null,
      OR: [
        { entityName: decoded },
        { entityName: { equals: decoded, mode: 'insensitive' } },
        { entityName: { equals: unhyphenated, mode: 'insensitive' } },
      ],
    },
    include: {
      event: {
        select: {
          name: true,
          endDate: true,
          tier: true,
          tournamentId: true,
          tournament: { select: { id: true, slug: true } },
        },
      },
    },
  });

  if (unlinkedRows.length > 0) {
    return unlinkedRows
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
        tournamentId: r.event.tournamentId ?? null,
        tournamentSlug: r.event.tournament?.slug ?? null,
      }))
      .sort((a, b) => b.eventEndDate.getTime() - a.eventEndDate.getTime());
  }

  // Fallback: check loose name/ign match to find an entityId if unlinked had no entries
  let looseEntityId: string | null = null;
  try {
    if (board === 'TEAM') {
      const loose = await prisma.team.findFirst({
        where: {
          OR: [
            { name: { equals: decoded, mode: 'insensitive' } },
            { name: { equals: unhyphenated, mode: 'insensitive' } },
            { tag: { equals: decoded, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      if (loose) looseEntityId = loose.id;
    } else {
      const loose = await prisma.player.findFirst({
        where: {
          OR: [
            { ign: { equals: decoded, mode: 'insensitive' } },
            { ign: { equals: unhyphenated, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      if (loose) looseEntityId = loose.id;
    }
  } catch {}

  if (looseEntityId) {
    const rows = await prisma.kraftonEntry.findMany({
      where: {
        board,
        entityId: looseEntityId,
      },
      include: {
        event: {
          select: {
            name: true,
            endDate: true,
            tier: true,
            tournamentId: true,
            tournament: { select: { id: true, slug: true } },
          },
        },
      },
    });
    if (rows.length > 0) {
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
          tournamentId: r.event.tournamentId ?? null,
          tournamentSlug: r.event.tournament?.slug ?? null,
        }))
        .sort((a, b) => b.eventEndDate.getTime() - a.eventEndDate.getTime());
    }
  }

  // Broad fallback
  const orConditions: Array<Record<string, unknown>> = [
    { entityId: key },
    { entityName: decoded },
    { entityName: { equals: decoded, mode: 'insensitive' } },
    { entityName: { equals: unhyphenated, mode: 'insensitive' } },
  ];

  const rows = await prisma.kraftonEntry.findMany({
    where: {
      board,
      OR: orConditions,
    },
    include: {
      event: {
        select: {
          name: true,
          endDate: true,
          tier: true,
          tournamentId: true,
          tournament: { select: { id: true, slug: true } },
        },
      },
    },
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
      tournamentId: r.event.tournamentId ?? null,
      tournamentSlug: r.event.tournament?.slug ?? null,
    }))
    .sort((a, b) => b.eventEndDate.getTime() - a.eventEndDate.getTime());
}

/** Site profile link for a linked entity (slug lookup), or null when unlinked. */
export async function fetchProfileSlug(board: KraftonBoard, entityId: string | null): Promise<string | null> {
  if (!entityId) return null;
  try {
    if (board === 'TEAM') {
      const team = await prisma.team.findUnique({ where: { id: entityId }, select: { slug: true, tag: true } });
      return team?.slug || team?.tag || null;
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

export const fetchTeamTransfers = unstable_cache(
  async (): Promise<TransferRule[]> => {
    const rows = await prisma.kraftonTransfer.findMany({
      orderBy: [{ cutoff: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((t) => ({
      id: t.id,
      fromTeamId: t.fromTeamId,
      fromName: t.fromName,
      toTeamId: t.toTeamId,
      toName: t.toName,
      cutoff: t.cutoff,
      mode: (t.mode as 'add' | 'wipe' | 'own_only') || 'add',
      amount: t.amount,
      preference: t.cutoff.getUTCSeconds() > 0 ? t.cutoff.getUTCSeconds() : 1,
    }));
  },
  ['krafton-team-transfers'],
  { tags: ['krafton-rankings'], revalidate: 3600 }
);

export const fetchFutureKraftonEvents = unstable_cache(
  async () => {
    return prisma.kraftonEvent.findMany({
      where: { endDate: { gt: new Date() } },
      orderBy: { endDate: 'asc' },
      select: { id: true, name: true, endDate: true, tier: true },
    });
  },
  ['krafton-future-events'],
  { tags: ['krafton-rankings'], revalidate: 3600 }
);

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

/** Fetches historical snapshot dates and computes the board with rank changes for a given snapshot. */
export async function fetchBoardSnapshot(
  board: KraftonBoard,
  snapshotIso?: string
): Promise<{
  ranked: RankedBoardEntity[];
  snapshotDates: string[];
  selectedDate: string;
}> {
  const [entries, transfers] = await Promise.all([
    fetchBoardEntries(board),
    board === 'TEAM' ? fetchTeamTransfers() : Promise.resolve([]),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const snapshotDates = generateHistoricalSnapshotDates(entries);
  const selectedDate = snapshotIso && snapshotDates.includes(snapshotIso) ? snapshotIso : snapshotDates[0] || todayIso;

  // Selected date as of Date: live Date() for latest snapshot
  const asOf = selectedDate === snapshotDates[0] || selectedDate === todayIso ? new Date() : new Date(`${selectedDate}T23:59:59Z`);

  // Previous date index
  const currentIndex = snapshotDates.indexOf(selectedDate);
  const previousIso = currentIndex !== -1 && currentIndex < snapshotDates.length - 1 ? snapshotDates[currentIndex + 1] : undefined;
  const previousAsOf = previousIso ? new Date(`${previousIso}T23:59:59Z`) : undefined;

  const ranked = computeBoardWithRankChanges(entries, transfers, asOf, previousAsOf);

  return {
    ranked,
    snapshotDates,
    selectedDate,
  };
}
