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
export function decayMilestones(board: Extract<KraftonBoard, string>, endISO: Date): Array<{ days: number; date: Date; multiplier: number }> {
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
  return brackets.map((b) => ({ days: b.days, date: new Date(endISO.getTime() + b.days * DAY), multiplier: b.multiplier }));
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
}

export interface TransferRule {
  id: string;
  fromTeamId: string;
  fromName: string;
  toTeamId: string;
  toName: string;
  /** A's events that ended BEFORE this date move to B. */
  cutoff: Date;
  /** 'add': B gains A's pre-cutoff points on top of its own. 'wipe': B's own
      pre-cutoff points are erased and replaced by A's transferred balance. */
  mode: 'add' | 'wipe';
  /** Fixed sum to transfer instead of A's actual balance (B starts from this). */
  amount: number | null;
}

export interface EventContribution {
  transferredFrom?: string;
  entryId: string;
  eventId: string;
  eventName: string;
  endDate: Date;
  tier: string;
  rank: number;
  finishes: number;
  teamName: string | null;
  awards: PlayerAwards;
  basePoints: number;
  days: number;
  decay: number;
  points: number;
  milestones: Array<{ days: number; date: Date; multiplier: number }>;
}

export interface BoardEntity {
  key: string; // entityId when linked, else entityName
  board: string;
  entityId: string | null;
  entityName: string;
  latestTeamName: string | null;
  events: number;
  totalPoints: number;
  contributions: EventContribution[]; // sorted by endDate desc
  /** Set when this entity's pre-cutoff points moved to another org. */
  transferredOutTo?: string;
  transferredOutPoints?: number;
  /** Set when this entity received transferred points. */
  transferredInFrom?: string;
  transferredInPoints?: number;
}

function awardsOf(e: EntryRow): PlayerAwards {
  return { mvp: e.mvp, finalsMvp: e.finalsMvp, igl: e.igl, survivor: e.survivor, emerging: e.emerging };
}

function contributionFor(e: EntryRow, asOf: Date): EventContribution {
  const endDate = new Date(e.eventEndDate);
  const days = Math.max(0, Math.floor((asOf.getTime() - endDate.getTime()) / DAY));
  const decay = e.board === 'TEAM' ? teamDecay(days) : playerDecay(days);
  const basePoints = e.board === 'TEAM' ? teamBasePoints(e.tier, e.rank) : playerBasePoints(e.finishes, e.tier, awardsOf(e));
  return {
    entryId: e.id,
    eventId: e.eventId,
    eventName: e.eventName,
    endDate,
    tier: e.tier,
    rank: e.rank,
    finishes: e.finishes,
    teamName: e.teamName,
    awards: awardsOf(e),
    basePoints,
    days,
    decay,
    points: Math.round(basePoints * decay * 100) / 100,
    milestones: decayMilestones(e.board as KraftonBoard, endDate),
  };
}

/** Groups entries into entities, applies point transfers, and computes
    live-decayed points per entity. */
export function computeBoard(
  entries: EntryRow[],
  transfers: TransferRule[] = [],
  asOf: Date = new Date()
): BoardEntity[] {
  const map = new Map<string, { entity: BoardEntity; contributions: EventContribution[] }>();

  for (const e of entries) {
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
  for (const t of transfers) {
    const from = map.get(t.fromTeamId);
    const cutoff = t.cutoff.getTime();

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
      to.contributions = to.contributions.filter((c) => c.endDate.getTime() >= cutoff);
    }

    if (from) {
      if (t.amount != null) {
        // Fixed sum: A loses its pre-cutoff entries, B receives the exact amount.
        const moved = from.contributions.filter((c) => c.endDate.getTime() < cutoff);
        from.contributions = from.contributions.filter((c) => c.endDate.getTime() >= cutoff);
        const days = Math.max(0, Math.floor((asOf.getTime() - cutoff) / DAY));
        const decay = teamDecay(days);
        to.contributions.push({
          entryId: `transfer-${t.id}`,
          eventId: `transfer-${t.id}`,
          eventName: `Point transfer from ${t.fromName}`,
          endDate: t.cutoff,
          tier: '—',
          rank: 0,
          finishes: 0,
          teamName: null,
          transferredFrom: t.fromName,
          awards: { mvp: 0, finalsMvp: 0, igl: 0, survivor: 0, emerging: 0 },
          basePoints: t.amount,
          days,
          decay,
          points: Math.round(t.amount * decay * 100) / 100,
          milestones: decayMilestones('TEAM', t.cutoff),
        });
        if (moved.length > 0) {
          to.entity.transferredInFrom = t.fromName;
          to.entity.transferredInPoints = Math.round(t.amount * 100) / 100;
        }
      } else {
        // Move A's actual pre-cutoff contributions to B (decay unchanged).
        const moved = from.contributions.filter((c) => c.endDate.getTime() < cutoff);
        if (moved.length > 0) {
          from.contributions = from.contributions.filter((c) => c.endDate.getTime() >= cutoff);
          const movedPoints = moved.reduce((sum, c) => sum + c.points, 0);
          moved.forEach((c) => {
            c.transferredFrom = t.fromName;
            to.contributions.push(c);
          });
          to.entity.transferredInFrom = t.fromName;
          to.entity.transferredInPoints = Math.round(movedPoints * 100) / 100;
          from.entity.transferredOutTo = t.toName;
          from.entity.transferredOutPoints = Math.round(movedPoints * 100) / 100;
        }
      }
    }
  }

  const list = [...map.values()].map(({ entity, contributions }) => {
    contributions.sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
    const totalPoints = Math.round(contributions.reduce((sum, c) => sum + c.points, 0) * 100) / 100;
    return {
      ...entity,
      latestTeamName: contributions.find((c) => c.teamName)?.teamName ?? null,
      events: contributions.length,
      totalPoints,
      contributions,
    };
  });

  return list.sort((a, b) => b.totalPoints - a.totalPoints || a.entityName.localeCompare(b.entityName));
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
