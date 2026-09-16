/* KRAFTON official rankings — standalone board engine (v2).
   Rules are identical to lib/krafton-rankings.ts (tier base tables, decay
   brackets, award bonuses) but the data model is standalone: ranking events
   with pasted placements, manual entity linking, and full decay schedules.

   All computation is live from event data — nothing decay-related is stored,
   so boards are always consistent with the entered events. */

import type { KraftonBoard } from '@prisma/client';

export type KraftonTier = 'Publisher' | 'Tier 1' | 'Tier 2' | 'Tier 3';
export const KRAFTON_TIERS: KraftonTier[] = ['Publisher', 'Tier 1', 'Tier 2', 'Tier 3'];

const DAY = 86_400_000;

/* ── Decay (identical brackets to the legacy engine) ── */

export function teamDecay(days: number): number {
  if (days <= 180) return 1;
  if (days <= 270) return 0.75;
  if (days <= 365) return 0.5;
  if (days <= 1095) return 0.1;
  return 0;
}

export function playerDecay(days: number): number {
  if (days <= 180) return 1;
  if (days <= 240) return 0.75;
  if (days <= 300) return 0.5;
  if (days <= 365) return 0.25;
  if (days <= 1095) return 0.1;
  return 0;
}

/** Calendar dates on which an event's decay multiplier steps down. */
export function decayMilestones(board: Extract<KraftonBoard, string>, endISO: Date | string): Array<{ days: number; date: Date; multiplier: number }> {
  const endDate = new Date(endISO);
  const brackets =
    board === 'TEAM'
      ? [
          { days: 181, multiplier: 0.75 },
          { days: 271, multiplier: 0.5 },
          { days: 366, multiplier: 0.1 },
          { days: 1096, multiplier: 0 },
        ]
      : [
          { days: 181, multiplier: 0.75 },
          { days: 241, multiplier: 0.5 },
          { days: 301, multiplier: 0.25 },
          { days: 366, multiplier: 0.1 },
          { days: 1096, multiplier: 0 },
        ];
  return brackets.map((b) => ({ days: b.days, date: new Date(endDate.getTime() + b.days * DAY), multiplier: b.multiplier }));
}

/* ── Base points (identical tables to the legacy engine) ── */

const TEAM_BASE_TOP5: Record<string, number[]> = {
  publisher: [1000, 800, 700, 600, 500],
  'tier 1': [800, 700, 600, 500, 400],
  'tier 2': [600, 500, 400, 300, 250],
  'tier 3': [400, 350, 300, 250, 200],
};
const TEAM_BASE_RANGES: Array<{ min: number; max: number; points: number[] }> = [
  { min: 6, max: 10, points: [400, 300, 200, 150] },
  { min: 11, max: 20, points: [300, 200, 150, 100] },
  { min: 21, max: 30, points: [200, 100, 75, 50] },
  { min: 31, max: 48, points: [100, 50, 35, 25] },
];

export function tierColumn(tier: string): number {
  const t = (tier || '').toLowerCase();
  if (t.includes('publisher')) return 0;
  if (t.includes('tier 1') || t === '1') return 1;
  if (t.includes('tier 2') || t === '2') return 2;
  if (t.includes('tier 3') || t === '3') return 3;
  return -1;
}

export function teamBasePoints(tier: string, rank: number): number {
  const col = tierColumn(tier);
  if (col === -1) return 0;
  if (rank >= 1 && rank <= 5) return TEAM_BASE_TOP5[Object.keys(TEAM_BASE_TOP5)[col]][rank - 1];
  for (const range of TEAM_BASE_RANGES) {
    if (rank >= range.min && rank <= range.max) return range.points[col];
  }
  return 0;
}

export function playerTierMultiplier(tier: string): number {
  const col = tierColumn(tier);
  if (col === 0) return 2;
  if (col === 1) return 1.5;
  return 1;
}

export interface PlayerAwards {
  mvp: number;
  finalsMvp: number;
  igl: number;
  survivor: number;
  emerging: number;
}

export function playerBasePoints(finishes: number, tier: string, awards: PlayerAwards): number {
  let base = (finishes || 0) * playerTierMultiplier(tier);
  if (awards.mvp) base += 20 * awards.mvp;
  if (awards.finalsMvp) base += 10 * awards.finalsMvp;
  if (awards.igl) base += 10 * awards.igl;
  if (awards.survivor) base += 10 * awards.survivor;
  if (awards.emerging) base += 5 * awards.emerging;
  return base;
}

/* ── Board computation ── */

export interface EntryRow {
  id: string;
  eventId: string;
  eventName: string;
  /** Display label for narrow viewports — null when the event has no short name. */
  eventShortName: string | null;
  eventEndDate: Date;
  tier: string;
  board: string;
  entityId: string | null;
  entityName: string;
  teamName: string | null;
  teamId: string | null;
  rank: number;
  finishes: number;
  mvp: number;
  finalsMvp: number;
  igl: number;
  survivor: number;
  emerging: number;
  tournamentId?: string | null;
  tournamentSlug?: string | null;
}

export interface TransferRule {
  id: string;
  fromTeamId: string;
  fromName: string;
  toTeamId: string;
  toName: string;
  /** A's events that ended BEFORE this date/time move to B. */
  cutoff: Date | string;
  /** 'add': B gains A's pre-cutoff points on top of its own.
      'own_only': only A's own events move (points A received from prior transfers stay in A).
      'wipe': B's own pre-cutoff points are erased before transfer. */
  mode: 'add' | 'wipe' | 'own_only';
  /** Fixed sum to transfer instead of A's actual balance (B starts from this). */
  amount: number | null;
  /** Priority / execution sequence for transfers on same date/time (lower runs first). */
  preference?: number;
}

export interface EventContribution {
  transferredFrom?: string;
  transferredFromTeamId?: string;
  transferredTo?: string;
  transferredToTeamId?: string;
  entryId: string;
  eventId: string;
  eventName: string;
  eventShortName: string | null;
  endDate: Date;
  tier: string;
  rank: number;
  finishes: number;
  teamName: string | null;
  teamId?: string | null;
  awards: PlayerAwards;
  basePoints: number;
  days: number;
  decay: number;
  points: number;
  milestones: Array<{ days: number; date: Date; multiplier: number }>;
  tournamentId?: string | null;
  tournamentSlug?: string | null;
}

export interface BoardEntity {
  key: string; // entityId when linked, else entityName
  board: string;
  entityId: string | null;
  entityName: string;
  latestTeamName: string | null;
  events: number;
  totalPoints: number;
  finishes?: number;
  contributions: EventContribution[]; // sorted by endDate desc
  /** Set when this entity's pre-cutoff points moved to another org. */
  transferredOutTo?: string;
  transferredOutToTeamId?: string;
  transferredOutPoints?: number;
  transferredOutContributions?: EventContribution[];
  /** Set when this entity received transferred points. */
  transferredInFrom?: string;
  transferredInFromTeamId?: string;
  transferredInPoints?: number;
}

function awardsOf(e: EntryRow): PlayerAwards {
  return { mvp: e.mvp, finalsMvp: e.finalsMvp, igl: e.igl, survivor: e.survivor, emerging: e.emerging };
}

function contributionFor(e: EntryRow, asOfInput: Date | string): EventContribution {
  const asOf = new Date(asOfInput);
  const endDate = new Date(e.eventEndDate);
  const days = Math.max(0, Math.floor((asOf.getTime() - endDate.getTime()) / DAY));
  const decay = e.board === 'TEAM' ? teamDecay(days) : playerDecay(days);
  const basePoints = e.board === 'TEAM' ? teamBasePoints(e.tier, e.rank) : playerBasePoints(e.finishes, e.tier, awardsOf(e));
  return {
    entryId: e.id,
    eventId: e.eventId,
    eventName: e.eventName,
    eventShortName: e.eventShortName,
    endDate,
    tier: e.tier,
    rank: e.rank,
    finishes: e.finishes,
    teamName: e.teamName,
    teamId: e.teamId || (e.board === 'TEAM' ? e.entityId : null),
    awards: awardsOf(e),
    basePoints,
    days,
    decay,
    points: Math.round(basePoints * decay * 100) / 100,
    milestones: decayMilestones(e.board as KraftonBoard, endDate),
    tournamentId: e.tournamentId ?? null,
    tournamentSlug: e.tournamentSlug ?? null,
  };
}

/** Groups entries into entities, applies point transfers, and computes
    live-decayed points per entity. */
export function computeBoard(
  entries: EntryRow[],
  transfers: TransferRule[] = [],
  asOfInput: Date | string = new Date()
): BoardEntity[] {
  const asOf = new Date(asOfInput);
  const asOfTime = asOf.getTime();
  const map = new Map<string, { entity: BoardEntity; contributions: EventContribution[] }>();

  // Filter entries to those that concluded on or before asOf for accurate historical snapshots
  const validEntries = entries.filter((e) => new Date(e.eventEndDate).getTime() <= asOfTime);

  for (const e of validEntries) {
    const key = e.entityId || e.entityName.toLowerCase();
    let group = map.get(key);
    if (!group) {
      group = {
        entity: {
          key,
          board: e.board,
          entityId: e.entityId,
          entityName: e.entityName,
          latestTeamName: null,
          events: 0,
          totalPoints: 0,
          contributions: [],
        },
        contributions: [],
      };
      map.set(key, group);
    }
    group.contributions.push(contributionFor(e, asOf));
  }

  // ── Point transfers (team board) ──
  // Sort transfers chronologically by cutoff timestamp, breaking ties by preference (lower executes first)
  const sortedTransfers = [...transfers].sort((a, b) => {
    const timeA = new Date(a.cutoff).getTime();
    const timeB = new Date(b.cutoff).getTime();
    if (timeA !== timeB) return timeA - timeB;
    const prefA = a.preference ?? 1;
    const prefB = b.preference ?? 1;
    return prefA - prefB;
  });

  for (const t of sortedTransfers) {
    const cutoffDate = new Date(t.cutoff);
    const cutoff = cutoffDate.getTime();
    // Only apply transfer if its cutoff date/time has passed as of the snapshot date
    if (cutoff > asOfTime) continue;

    const from = map.get(t.fromTeamId);
    let to = map.get(t.toTeamId);
    if (!to) {
      to = {
        entity: {
          key: t.toTeamId,
          board: 'TEAM',
          entityId: t.toTeamId,
          entityName: t.toName,
          latestTeamName: null,
          events: 0,
          totalPoints: 0,
          contributions: [],
        },
        contributions: [],
      };
      map.set(t.toTeamId, to);
    }

    if (t.mode === 'wipe') {
      // Erase B's own pre-cutoff history — B restarts on A's transferred points.
      to.contributions = to.contributions.filter((c) => new Date(c.endDate).getTime() >= cutoff);
    }

    if (from) {
      if (t.amount != null) {
        // Fixed sum: A loses its pre-cutoff entries, B receives the exact amount.
        const moved = from.contributions.filter((c) => {
          if (new Date(c.endDate).getTime() >= cutoff) return false;
          // In 'own_only' mode, do not move entries that were previously transferred from another team
          if (t.mode === 'own_only' && c.transferredFrom) return false;
          return true;
        });
        const movedIds = new Set(moved.map((c) => c.entryId));
        from.contributions = from.contributions.filter((c) => !movedIds.has(c.entryId));

        const days = Math.max(0, Math.floor((asOfTime - cutoff) / DAY));
        const decay = teamDecay(days);
        to.contributions.push({
          entryId: `transfer-${t.id}`,
          eventId: `transfer-${t.id}`,
          eventName: `Point transfer from ${t.fromName}`,
          eventShortName: null,
          endDate: cutoffDate,
          tier: '—',
          rank: 0,
          finishes: 0,
          teamName: t.fromName,
          transferredFrom: t.fromName,
          transferredFromTeamId: t.fromTeamId,
          awards: { mvp: 0, finalsMvp: 0, igl: 0, survivor: 0, emerging: 0 },
          basePoints: t.amount,
          days,
          decay,
          points: Math.round(t.amount * decay * 100) / 100,
          milestones: decayMilestones('TEAM', cutoffDate),
        });
        if (moved.length > 0) {
          const outItems = moved.map((c) => ({
            ...c,
            transferredTo: t.toName,
            transferredToTeamId: t.toTeamId,
          }));
          from.entity.transferredOutContributions = [
            ...(from.entity.transferredOutContributions || []),
            ...outItems,
          ];
          from.entity.transferredOutTo = t.toName;
          from.entity.transferredOutToTeamId = t.toTeamId;
          from.entity.transferredOutPoints = Math.round(((from.entity.transferredOutPoints || 0) + t.amount) * 100) / 100;
          to.entity.transferredInFrom = t.fromName;
          to.entity.transferredInFromTeamId = t.fromTeamId;
          to.entity.transferredInPoints = Math.round(((to.entity.transferredInPoints || 0) + t.amount) * 100) / 100;
        }
      } else {
        // Move A's actual pre-cutoff contributions to B (decay unchanged).
        const moved = from.contributions.filter((c) => {
          if (new Date(c.endDate).getTime() >= cutoff) return false;
          // In 'own_only' mode, do not move entries that were previously transferred from another team
          if (t.mode === 'own_only' && c.transferredFrom) return false;
          return true;
        });

        if (moved.length > 0) {
          const movedIds = new Set(moved.map((c) => c.entryId));
          from.contributions = from.contributions.filter((c) => !movedIds.has(c.entryId));
          const movedPoints = moved.reduce((sum, c) => sum + c.points, 0);

          const outItems = moved.map((c) => ({
            ...c,
            transferredTo: t.toName,
            transferredToTeamId: t.toTeamId,
          }));
          from.entity.transferredOutContributions = [
            ...(from.entity.transferredOutContributions || []),
            ...outItems,
          ];
          from.entity.transferredOutTo = t.toName;
          from.entity.transferredOutToTeamId = t.toTeamId;
          from.entity.transferredOutPoints = Math.round(((from.entity.transferredOutPoints || 0) + movedPoints) * 100) / 100;

          moved.forEach((c) => {
            c.transferredFrom = c.transferredFrom || t.fromName;
            c.transferredFromTeamId = c.transferredFromTeamId || t.fromTeamId;
            c.teamName = c.teamName || t.fromName;
            to.contributions.push(c);
          });
          to.entity.transferredInFrom = t.fromName;
          to.entity.transferredInFromTeamId = t.fromTeamId;
          to.entity.transferredInPoints = Math.round(((to.entity.transferredInPoints || 0) + movedPoints) * 100) / 100;
        }
      }
    }
  }

  const list = [...map.values()].map(({ entity, contributions }) => {
    contributions.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    const totalPoints = Math.round(contributions.reduce((sum, c) => sum + c.points, 0) * 100) / 100;
    const finishes = contributions.reduce((sum, c) => sum + (c.finishes || 0), 0);
    return {
      ...entity,
      latestTeamName: contributions.find((c) => c.teamName)?.teamName ?? null,
      events: contributions.length,
      totalPoints,
      finishes,
      contributions,
    };
  });

  return list.sort((a, b) => b.totalPoints - a.totalPoints || a.entityName.localeCompare(b.entityName));
}

export interface RankedBoardEntity extends BoardEntity {
  rank: number;
  previousRank: number | null;
  rankChange: number | 'NEW';
}

/** Computes current board and annotates each entity with rank change vs a prior date. */
export function computeBoardWithRankChanges(
  entries: EntryRow[],
  transfers: TransferRule[] = [],
  asOf: Date = new Date(),
  previousAsOf?: Date
): RankedBoardEntity[] {
  const current = computeBoard(entries, transfers, asOf);
  const currentRanked = current.map((e, idx) => ({ ...e, rank: idx + 1 }));

  if (!previousAsOf || previousAsOf.getTime() >= asOf.getTime()) {
    return currentRanked.map((e) => ({
      ...e,
      previousRank: null,
      rankChange: 0,
    }));
  }

  const prev = computeBoard(entries, transfers, previousAsOf);
  const prevMap = new Map<string, number>();
  prev.forEach((e, idx) => {
    prevMap.set(e.key, idx + 1);
  });

  return currentRanked.map((e) => {
    const prevRank = prevMap.get(e.key);
    if (prevRank === undefined) {
      return {
        ...e,
        previousRank: null,
        rankChange: 'NEW' as const,
      };
    }
    // rankChange: positive means rank moved up (#5 -> #2 = +3), negative means dropped
    const rankChange = prevRank - e.rank;
    return {
      ...e,
      previousRank: prevRank,
      rankChange,
    };
  });
}

/** Generate unique historical snapshot dates when events concluded or decay stepped down. */
export function generateHistoricalSnapshotDates(entries: EntryRow[], asOf: Date = new Date()): string[] {
  const set = new Set<string>();

  for (const e of entries) {
    const end = new Date(e.eventEndDate);
    if (end.getTime() <= asOf.getTime()) {
      set.add(end.toISOString().slice(0, 10));
    }
    const milestones = decayMilestones(e.board as KraftonBoard, end);
    for (const m of milestones) {
      if (m.date.getTime() <= asOf.getTime()) {
        set.add(m.date.toISOString().slice(0, 10));
      }
    }
  }

  // Fallback to asOf only if no event or decay dates are available
  if (set.size === 0) {
    set.add(asOf.toISOString().slice(0, 10));
  }

  return [...set].sort((a, b) => b.localeCompare(a));
}

/** Calculates the next upcoming decay milestone across an entity's contributions. */
export function computeNextDecay(
  contributions: EventContribution[],
  asOf: Date = new Date()
): {
  daysRemaining: number;
  date: Date;
  eventName: string;
  fromMultiplier: number;
  toMultiplier: number;
  estimatedPointLoss: number;
} | null {
  const upcoming: Array<{
    daysRemaining: number;
    date: Date;
    eventName: string;
    fromMultiplier: number;
    toMultiplier: number;
    estimatedPointLoss: number;
  }> = [];

  for (const c of contributions) {
    if (c.decay <= 0) continue; // Already at 0
    for (const m of c.milestones) {
      if (m.date.getTime() > asOf.getTime() && m.multiplier < c.decay) {
        const diffMs = m.date.getTime() - asOf.getTime();
        const daysRemaining = Math.max(1, Math.ceil(diffMs / DAY));
        const estimatedPointLoss = Math.round(c.basePoints * (c.decay - m.multiplier) * 100) / 100;
        upcoming.push({
          daysRemaining,
          date: m.date,
          eventName: c.eventName,
          fromMultiplier: c.decay,
          toMultiplier: m.multiplier,
          estimatedPointLoss,
        });
        break; // Only next immediate milestone for this event
      }
    }
  }

  if (upcoming.length === 0) return null;
  upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return upcoming[0];
}

export interface FutureProjectionItem {
  date: Date;
  dateStr: string;
  daysRemaining: number;
  eventName: string;
  fromMultiplier: number;
  toMultiplier: number;
  pointLoss: number;
  projectedTotalPoints: number;
}

/** Computes chronological future projections as points decay. */
export function computeEntityFutureProjections(
  entityKey: string,
  board: KraftonBoard,
  entries: EntryRow[],
  transfers: TransferRule[] = [],
  asOf: Date = new Date(),
  limit = 5
): FutureProjectionItem[] {
  const myEntries = entries.filter((e) => (e.entityId || e.entityName.toLowerCase()) === entityKey);
  const futureDatesSet = new Set<number>();

  for (const e of myEntries) {
    const end = new Date(e.eventEndDate);
    const milestones = decayMilestones(board, end);
    for (const m of milestones) {
      if (m.date.getTime() > asOf.getTime()) {
        futureDatesSet.add(m.date.getTime());
      }
    }
  }

  const sortedDates = [...futureDatesSet].sort((a, b) => a - b).slice(0, limit);
  const currentBoard = computeBoard(entries, transfers, asOf);
  const currentEntity = currentBoard.find((b) => b.key === entityKey);
  if (!currentEntity) return [];

  let runningPoints = currentEntity.totalPoints;
  const items: FutureProjectionItem[] = [];

  for (const ts of sortedDates) {
    const targetDate = new Date(ts);
    const targetBoard = computeBoard(entries, transfers, targetDate);
    const targetEntity = targetBoard.find((b) => b.key === entityKey);
    const newTotal = targetEntity?.totalPoints ?? 0;
    const pointLoss = Math.max(0, Math.round((runningPoints - newTotal) * 100) / 100);

    const nextMilestoneInfo = computeNextDecay(currentEntity.contributions, new Date(ts - DAY));

    items.push({
      date: targetDate,
      dateStr: targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
      daysRemaining: Math.max(1, Math.ceil((ts - asOf.getTime()) / DAY)),
      eventName: nextMilestoneInfo?.eventName ?? 'Ranked Event',
      fromMultiplier: nextMilestoneInfo?.fromMultiplier ?? 1,
      toMultiplier: nextMilestoneInfo?.toMultiplier ?? 0.75,
      pointLoss,
      projectedTotalPoints: newTotal,
    });

    runningPoints = newTotal;
  }

  return items;
}

export interface RankTrendPoint {
  date: string;
  dateLabel: string;
  rank: number;
  totalPoints: number;
  eventName?: string;
  changeType?: 'addition' | 'decay' | 'current';
}

/** Computes historical rank movement for an entity over time, including both event additions and decay step-downs. */
export function computeEntityRankTrend(
  entityKey: string,
  board: KraftonBoard,
  entries: EntryRow[],
  transfers: TransferRule[] = [],
  asOf: Date = new Date()
): RankTrendPoint[] {
  // Check if this entity received transferred points (new team / rebranded slot)
  const incomingTransfer = transfers.find(
    (t) => t.toTeamId === entityKey || t.toName.trim().toLowerCase() === entityKey.toLowerCase()
  );
  const predecessorKey = incomingTransfer?.fromTeamId;
  const cutoffTime = incomingTransfer ? new Date(incomingTransfer.cutoff).getTime() : 0;

  // Direct entries for this entity
  const directEntries = entries.filter(
    (e) =>
      (e.entityId || e.entityName.toLowerCase()) === entityKey ||
      e.entityName.toLowerCase() === entityKey.toLowerCase()
  );

  // If there is an incoming transfer, include pre-cutoff entries from the predecessor
  const transferredEntries = predecessorKey
    ? entries.filter(
        (e) =>
          ((e.entityId || e.entityName.toLowerCase()) === predecessorKey ||
            e.entityName.toLowerCase() === incomingTransfer?.fromName.toLowerCase()) &&
          new Date(e.eventEndDate).getTime() < cutoffTime
      )
    : [];

  const allMyEntries = [...directEntries, ...transferredEntries];
  if (allMyEntries.length === 0) return [];

  // Map keyed by YYYY-MM-DD to avoid duplicate calculations on the same day
  const dateMap = new Map<string, { date: Date; eventName: string; changeType: 'addition' | 'decay' | 'current' }>();

  // 1. Event addition dates for all contributing entries
  for (const e of allMyEntries) {
    const end = new Date(e.eventEndDate);
    if (end.getTime() <= asOf.getTime()) {
      const key = end.toISOString().slice(0, 10);
      dateMap.set(key, { date: end, eventName: e.eventName, changeType: 'addition' });
    }
  }

  // 2. Decay milestone dates for all contributing entries
  for (const e of allMyEntries) {
    const end = new Date(e.eventEndDate);
    const milestones = decayMilestones(board, end);
    for (const m of milestones) {
      if (m.date.getTime() <= asOf.getTime()) {
        const key = m.date.toISOString().slice(0, 10);
        // If an addition didn't happen on this exact date, record the decay step
        if (!dateMap.has(key) || dateMap.get(key)?.changeType === 'decay') {
          dateMap.set(key, {
            date: m.date,
            eventName: `${e.eventName} (${Math.round(m.multiplier * 100)}% Decay)`,
            changeType: 'decay',
          });
        }
      }
    }
  }

  // 3. Transfer cutoff date itself (if applicable and within asOf)
  if (incomingTransfer) {
    const cDate = new Date(incomingTransfer.cutoff);
    if (cDate.getTime() <= asOf.getTime()) {
      const key = cDate.toISOString().slice(0, 10);
      dateMap.set(key, {
        date: cDate,
        eventName: `Point Transfer from ${incomingTransfer.fromName}`,
        changeType: 'addition',
      });
    }
  }

  // 4. Today / current anchor if not already mapped
  const todayKey = asOf.toISOString().slice(0, 10);
  if (!dateMap.has(todayKey)) {
    dateMap.set(todayKey, { date: asOf, eventName: 'Current Standing', changeType: 'current' });
  }

  const sortedDays = [...dateMap.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  const trend: RankTrendPoint[] = [];

  for (const item of sortedDays) {
    const isBeforeCutoff = incomingTransfer && item.date.getTime() < cutoffTime;
    const lookupKey = isBeforeCutoff && predecessorKey ? predecessorKey : entityKey;
    const boardAtDate = computeBoard(entries, transfers, item.date);
    const rankedIndex = boardAtDate.findIndex(
      (b) => b.key === lookupKey || b.entityName.toLowerCase() === lookupKey.toLowerCase()
    );
    if (rankedIndex !== -1) {
      trend.push({
        date: item.date.toISOString().slice(0, 10),
        dateLabel: item.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
        rank: rankedIndex + 1,
        totalPoints: boardAtDate[rankedIndex].totalPoints,
        eventName: item.eventName,
        changeType: item.changeType,
      });
    }
  }

  return trend;
}

export interface UnifiedNextUpdate {
  type: 'event' | 'decay';
  daysRemaining: number;
  date: Date;
  dateStr: string;
  title: string;
  description: string;
}

/** Determines whether the next update is an event conclusion or a decay step-down (whichever is earlier). */
export function computeUnifiedNextUpdate(
  nextDecay: { daysRemaining: number; date: Date; eventName: string; toMultiplier: number; estimatedPointLoss?: number } | null,
  futureEvents: Array<{ name: string; endDate: Date }> = []
): UnifiedNextUpdate | null {
  const candidates: UnifiedNextUpdate[] = [];

  if (nextDecay) {
    candidates.push({
      type: 'decay',
      daysRemaining: nextDecay.daysRemaining,
      date: nextDecay.date,
      dateStr: nextDecay.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
      title: `${nextDecay.eventName} Decay Step-down`,
      // The multiplier is the same for every entity; the point loss is not —
      // it depends on each entity's own contributions, so a single figure would
      // be wrong for everyone who is not the entity it was computed from.
      description: `Points step down to ${Math.round(nextDecay.toMultiplier * 100)}%`,
    });
  }

  const now = Date.now();
  for (const fe of futureEvents) {
    const endMs = new Date(fe.endDate).getTime();
    if (endMs > now) {
      const days = Math.max(1, Math.ceil((endMs - now) / DAY));
      const endD = new Date(fe.endDate);
      candidates.push({
        type: 'event',
        daysRemaining: days,
        date: endD,
        dateStr: endD.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
        title: `${fe.name} Conclusion`,
        description: `Final event standings will be imported and added to official rankings`,
      });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return candidates[0];
}

export interface EntityRankMilestones {
  highestRank: number | null;
  daysAtHighest: number;
  isCurrentlyAtHighest: boolean;
  daysInTop5: number;
  isCurrentlyInTop5: boolean;
  currentRank: number | null;
}

/**
 * Computes historical ranking milestones for an entity:
 * - Peak/highest rank reached and cumulative days spent at that peak rank (with * active indicator if currently there).
 * - Total cumulative days spent in Top 5 (with * active indicator if currently in top 5).
 */
export function computeEntityRankMilestones(
  entityKey: string,
  board: KraftonBoard,
  entries: EntryRow[],
  transfers: TransferRule[] = [],
  asOf: Date = new Date()
): EntityRankMilestones {
  const incomingTransfer = transfers.find(
    (t) => t.toTeamId === entityKey || t.toName.trim().toLowerCase() === entityKey.toLowerCase()
  );
  const predecessorKey = incomingTransfer?.fromTeamId;
  const cutoffDate = incomingTransfer ? new Date(incomingTransfer.cutoff) : null;
  const cutoffTime = cutoffDate ? cutoffDate.getTime() : 0;

  const dateStringsAsc = generateHistoricalSnapshotDates(entries, asOf).sort();
  if (cutoffDate && cutoffTime <= asOf.getTime()) {
    const transferCutoffStr = cutoffDate.toISOString().slice(0, 10);
    if (!dateStringsAsc.includes(transferCutoffStr)) {
      dateStringsAsc.push(transferCutoffStr);
      dateStringsAsc.sort();
    }
  }

  const todayStr = asOf.toISOString().slice(0, 10);
  if (!dateStringsAsc.includes(todayStr)) {
    dateStringsAsc.push(todayStr);
    dateStringsAsc.sort();
  }

  let highestRank: number | null = null;
  const daysPerRank = new Map<number, number>();
  let daysInTop5 = 0;
  let currentRank: number | null = null;

  for (let i = 0; i < dateStringsAsc.length; i++) {
    const dStr = dateStringsAsc[i];
    const isToday = i === dateStringsAsc.length - 1;
    const d = new Date(`${dStr}T23:59:59Z`);

    const isBeforeCutoff = incomingTransfer && d.getTime() < cutoffTime;
    const lookupKey = isBeforeCutoff && predecessorKey ? predecessorKey : entityKey;

    const boardAtDate = computeBoard(entries, transfers, d);
    const rankedIndex = boardAtDate.findIndex(
      (b) => b.key === lookupKey || b.entityName.toLowerCase() === lookupKey.toLowerCase()
    );

    if (rankedIndex !== -1) {
      const rank = rankedIndex + 1;
      if (highestRank === null || rank < highestRank) {
        highestRank = rank;
      }

      if (isToday) {
        currentRank = rank;
        daysPerRank.set(rank, (daysPerRank.get(rank) || 0) + 1);
        if (rank <= 5) {
          daysInTop5 += 1;
        }
      } else {
        const nextDStr = dateStringsAsc[i + 1];
        const nextD = new Date(`${nextDStr}T23:59:59Z`);
        const days = Math.max(0, Math.round((nextD.getTime() - d.getTime()) / DAY));
        daysPerRank.set(rank, (daysPerRank.get(rank) || 0) + days);
        if (rank <= 5) {
          daysInTop5 += days;
        }
      }
    }
  }

  const daysAtHighest = highestRank !== null ? daysPerRank.get(highestRank) || 0 : 0;
  const isCurrentlyAtHighest = currentRank !== null && currentRank === highestRank;
  const isCurrentlyInTop5 = currentRank !== null && currentRank <= 5;

  return {
    highestRank,
    daysAtHighest,
    isCurrentlyAtHighest,
    daysInTop5,
    isCurrentlyInTop5,
    currentRank,
  };
}

/** One unbroken spell at rank #1. */
export interface RankOneReign {
  entityKey: string;
  entityId: string | null;
  entityName: string;
  /** ISO date the entity first held #1 in this spell. */
  startDate: string;
  /** ISO date the next holder took over — or `asOf` for the live spell. */
  endDate: string;
  days: number;
  isCurrent: boolean;
}

/**
 * Who held rank #1, coalesced into unbroken spells.
 *
 * Uses the same snapshot dates and day accounting as `computeEntityRankMilestones`
 * so a reign's `days` agrees with the per-entity "days at peak" on a detail page:
 * a snapshot date is worth the gap to the NEXT date, and the final date is worth
 * one day. A spell therefore ends on the date its successor takes over, which
 * means consecutive spells share a boundary — the handover day.
 *
 * Returned oldest first.
 */
export function computeRankOneReigns(
  entries: EntryRow[],
  transfers: TransferRule[] = [],
  asOf: Date = new Date()
): RankOneReign[] {
  const dateStringsAsc = generateHistoricalSnapshotDates(entries, asOf).sort();
  const todayStr = asOf.toISOString().slice(0, 10);
  if (!dateStringsAsc.includes(todayStr)) {
    dateStringsAsc.push(todayStr);
    dateStringsAsc.sort();
  }

  const snapshots = dateStringsAsc.map((dateStr, index) => {
    const d = new Date(`${dateStr}T23:59:59Z`);
    const isLast = index === dateStringsAsc.length - 1;
    const days = isLast
      ? 1
      : Math.max(
          0,
          Math.round(
            (new Date(`${dateStringsAsc[index + 1]}T23:59:59Z`).getTime() - d.getTime()) / DAY
          )
        );
    return { dateStr, days, top: computeBoard(entries, transfers, d)[0] ?? null };
  });

  const reigns: RankOneReign[] = [];
  snapshots.forEach((snapshot, index) => {
    if (!snapshot.top) return;
    const nextDateStr = snapshots[index + 1]?.dateStr ?? todayStr;
    const current = reigns[reigns.length - 1];

    if (current && current.entityKey === snapshot.top.key) {
      current.endDate = nextDateStr;
      current.days += snapshot.days;
      return;
    }

    reigns.push({
      entityKey: snapshot.top.key,
      entityId: snapshot.top.entityId ?? null,
      entityName: snapshot.top.entityName,
      startDate: snapshot.dateStr,
      endDate: nextDateStr,
      days: snapshot.days,
      isCurrent: false,
    });
  });

  if (reigns.length > 0) reigns[reigns.length - 1].isCurrent = true;
  return reigns;
}


/* ── Paste parsing (Excel / TSV copy) ── */

export interface PastedTeamRow {
  entityName: string;
  rank: number;
}
export interface PastedPlayerRow {
  entityName: string;
  teamName: string;
  finishes: number;
  mvp: number;
  finalsMvp: number;
  igl: number;
  survivor: number;
  emerging: number;
}

const num = (v: string | undefined): number => {
  const n = Number((v ?? '').trim().replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

/** Team paste: `Name<TAB>Rank` per line (extra columns ignored). */
export function parseTeamPaste(text: string): PastedTeamRow[] {
  const rows: PastedTeamRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.split('\t').map((c) => c.trim());
    if (cells.length < 2) continue;
    const rank = num(cells[1]);
    if (!cells[0] || rank < 1) continue;
    rows.push({ entityName: cells[0], rank });
  }
  return rows;
}

/**
 * Player paste: `IGN<TAB>Team<TAB>Finishes<TAB>MVP<TAB>FinalsMVP<TAB>IGL<TAB>Survivor<TAB>Emerging`.
 * Team and award columns are optional; finishes defaults to 0.
 */
export function parsePlayerPaste(text: string): PastedPlayerRow[] {
  const rows: PastedPlayerRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.split('\t').map((c) => c.trim());
    if (!cells[0]) continue;
    if (/^(name|ign|player|team)$/i.test(cells[0])) continue; // header row
    const first = num(cells[2]);
    if (!cells[1] && first === 0 && cells.length < 4) continue; // skip stray lines
    rows.push({
      entityName: cells[0],
      teamName: cells[1] || '',
      finishes: first,
      mvp: num(cells[3]),
      finalsMvp: num(cells[4]),
      igl: num(cells[5]),
      survivor: num(cells[6]),
      emerging: num(cells[7]),
    });
  }
  return rows;
}
