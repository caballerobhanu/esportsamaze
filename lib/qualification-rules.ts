/**
 * Qualification rules: which finishing positions send a team into which event.
 *
 * A rule is a *position range* plus the events it qualifies for, so a rule can
 * overlap another — "the champion goes to PMGC" and "the top six go to BMIC" are
 * both true at rank 1. That overlap is the point, not an error to reconcile.
 *
 * These describe the *plan*, announced before the event. Which team actually took
 * a berth is the realised fact and lives per team (`TournamentTeam.berths`); the
 * two are deliberately never merged.
 *
 * Stored in `Tournament.qualifications`, which older events filled with a
 * free-text `place` ("1st Place", "Top 6", "Champion"). Those are read through
 * `parseRankRange`, so a legacy rule gains its numeric range on the way in rather
 * than needing a migration or a re-entry.
 *
 * Pure module: no Prisma, no React, no IO.
 */

import { parseRankRange, rankLabel } from '@/lib/prize-rows';

export interface QualificationTarget {
  name: string;
  tournamentId?: string | null;
  tournamentSlug?: string | null;
}

export interface QualificationRule {
  /** Inclusive finishing positions. Null when the rule could not be numbered. */
  from: number | null;
  to: number | null;
  /** The admin's original wording, kept for display when there is no range. */
  label: string | null;
  targets: QualificationTarget[];
  note: string | null;
}

function toPosition(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.trunc(parsed);
  return rounded >= 1 ? rounded : null;
}

function parseTargets(value: unknown): QualificationTarget[] {
  if (!Array.isArray(value)) return [];

  const targets: QualificationTarget[] = [];
  for (const entry of value) {
    if (typeof entry === 'string') {
      const name = entry.trim();
      if (name) targets.push({ name });
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as { name?: unknown; tournamentId?: unknown; tournamentSlug?: unknown };
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (!name) continue;
    targets.push({
      name,
      tournamentId: typeof row.tournamentId === 'string' ? row.tournamentId : null,
      tournamentSlug: typeof row.tournamentSlug === 'string' ? row.tournamentSlug : null,
    });
  }
  return targets;
}

/**
 * Normalises whatever shape the column holds into rules.
 *
 * A rule is kept when it says *something*: a destination, a wording, or a
 * position. A rule with a position but no destination is deliberately retained —
 * dropping it silently is how an admin's entry disappears from the page with no
 * explanation. Only a rule carrying none of the three is discarded, which is what
 * an untouched "add rule" row looks like.
 */
export function parseQualificationRules(value: unknown): QualificationRule[] {
  if (!Array.isArray(value)) return [];

  const rules: QualificationRule[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;

    const label = typeof row.place === 'string' && row.place.trim() ? row.place.trim() : null;
    const targets = parseTargets(row.events);

    const explicitFrom = toPosition(row.from);
    const explicitTo = toPosition(row.to);
    const legacyRange = label ? parseRankRange(label) : null;

    const from = explicitFrom ?? legacyRange?.from ?? null;
    if (targets.length === 0 && !label && from == null) continue;

    const to =
      explicitFrom != null
        ? Math.max(explicitTo ?? explicitFrom, explicitFrom)
        : legacyRange?.to ?? null;

    const note =
      typeof row.note === 'string' && row.note.trim()
        ? row.note.trim()
        : typeof row.description === 'string' && row.description.trim()
          ? row.description.trim()
          : null;

    rules.push({ from, to, label, targets, note });
  }
  return rules;
}

/** "1st", "1st - 6th", or the admin's own wording when it has no range. */
export function describeRulePosition(rule: QualificationRule): string {
  if (rule.from == null) return rule.label ?? 'Qualification';
  return rankLabel(rule.from, rule.to ?? rule.from);
}

/** Every rule a given finishing position satisfies — overlaps included. */
export function rulesCoveringRank(
  rules: readonly QualificationRule[],
  rank: number | null | undefined
): QualificationRule[] {
  if (rank == null || !Number.isFinite(rank)) return [];
  return rules.filter(
    (rule) => rule.from != null && rule.to != null && rank >= rule.from && rank <= rule.to
  );
}

/** The events a finishing position qualifies for, de-duplicated by name. */
export function qualificationTargetsForRank(
  rules: readonly QualificationRule[],
  rank: number | null | undefined
): QualificationTarget[] {
  const seen = new Set<string>();
  const targets: QualificationTarget[] = [];

  for (const rule of rulesCoveringRank(rules, rank)) {
    for (const target of rule.targets) {
      const key = target.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push(target);
    }
  }
  return targets;
}
