'use client';

import * as React from 'react';
import { Plus, Trash2, Trophy, Link as LinkIcon, X } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  describeRulePosition,
  parseQualificationRules,
  type QualificationRule,
} from '@/lib/qualification-rules';
import { parseQualificationSheet } from '@/lib/tournament-scaffold-parse';
import { TabPasteBox, type TabPastePreview } from '@/components/admin/tab-paste-box';

/** An event a rule qualifies into. Mirrors the stored target shape. */
export interface SeedEventItem {
  name: string;
  tournamentId?: string | null;
  tournamentSlug?: string | null;
}

export interface TournamentSummaryOption {
  id: string;
  name: string;
  slug: string;
  tier?: string | null;
}

interface TournamentQualificationsInputProps {
  /** The stored column, in either its numeric or its legacy `place` shape. */
  initialQualifications?: unknown;
  allTournaments?: TournamentSummaryOption[];
}

const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-400';
const inputCls =
  'w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-(--ed-blue)';

/**
 * Qualification rules: a finishing-position range and the events it feeds.
 *
 * Ranges may overlap on purpose — "the champion goes to PMGC" and "the top six
 * go to BMIC" are both true at rank 1. Nothing is reconciled between them.
 *
 * Legacy rules that carry only a `place` string are normalised on load, so the
 * old wording gains a real range the first time the event is opened and saved.
 */
export function TournamentQualificationsInput({
  initialQualifications = [],
  allTournaments = [],
}: TournamentQualificationsInputProps) {
  // ---- Paste qualification rules straight into this tab ----
  // Targets are matched to real events by name, exactly as the loader below does for
  // stored rules, so a pasted destination becomes a link rather than loose text.
  const buildQualificationRules = (text: string): QualificationRule[] =>
    parseQualificationSheet(text).rows.map((row) => ({
      from: row.from,
      to: row.to,
      label: row.label,
      targets: row.targets.map((target) => {
        const match = allTournaments.find((tour) => tour.name.toLowerCase() === target.name.toLowerCase());
        return { name: target.name, tournamentId: match?.id ?? null, tournamentSlug: match?.slug ?? null };
      }),
      note: row.note,
    }));

  const previewQualificationPaste = (text: string): TabPastePreview => {
    const res = parseQualificationSheet(text);
    if (res.error) return { summary: [], unrecognised: res.unrecognisedHeaders, error: res.error };
    return {
      summary: [`${res.rows.length} rule${res.rows.length === 1 ? '' : 's'} recognised`],
      unrecognised: res.unrecognisedHeaders,
      error: null,
    };
  };

  const applyQualificationPaste = (text: string) => {
    const next = buildQualificationRules(text);
    if (next.length > 0) setRules(next);
  };

  const [rules, setRules] = React.useState<QualificationRule[]>(() =>
    parseQualificationRules(initialQualifications).map((rule) => ({
      ...rule,
      // A rule typed against a plain name is matched back to a real event when
      // one exists by that name, so the link is restored rather than lost.
      targets: rule.targets.map((target) => {
        if (target.tournamentSlug || !target.name) return target;
        const match = allTournaments.find(
          (t) => t.name.toLowerCase() === target.name.toLowerCase()
        );
        return match
          ? { name: match.name, tournamentId: match.id, tournamentSlug: match.slug }
          : target;
      }),
    }))
  );
  const [customDrafts, setCustomDrafts] = React.useState<Record<number, string>>({});

  /**
   * A new rule starts empty. Seeding it with a position would make an abandoned
   * row look like a real rule and publish a placing nobody ever entered.
   */
  const addRule = () => {
    setRules((prev) => [...prev, { from: null, to: null, label: null, targets: [], note: null }]);
  };

  const removeRule = (index: number) => setRules((prev) => prev.filter((_, i) => i !== index));

  const setRange = (index: number, from: number | null, to: number | null) => {
    setRules((prev) =>
      prev.map((rule, i) => {
        if (i !== index) return rule;
        const start = from != null && from >= 1 ? Math.trunc(from) : null;
        const end = to != null && start != null && to > start ? Math.trunc(to) : start;
        // A range replaces the old wording; the wording survives only while there
        // is no range to replace it with.
        return { ...rule, from: start, to: end, label: start == null ? rule.label : null };
      })
    );
  };

  const setLabel = (index: number, label: string) => {
    setRules((prev) =>
      prev.map((rule, i) =>
        i === index ? { ...rule, label: label || null, from: null, to: null } : rule
      )
    );
  };

  const setNote = (index: number, note: string) => {
    setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, note: note || null } : rule)));
  };

  const addTarget = (index: number, target: SeedEventItem) => {
    const name = target.name.trim();
    if (!name) return;
    setRules((prev) =>
      prev.map((rule, i) => {
        if (i !== index) return rule;
        if (rule.targets.some((t) => t.name.toLowerCase() === name.toLowerCase())) return rule;
        return { ...rule, targets: [...rule.targets, { ...target, name }] };
      })
    );
  };

  const removeTarget = (index: number, targetIndex: number) => {
    setRules((prev) =>
      prev.map((rule, i) =>
        i === index ? { ...rule, targets: rule.targets.filter((_, t) => t !== targetIndex) } : rule
      )
    );
  };

  const takeDraft = (index: number) => {
    const name = (customDrafts[index] ?? '').trim();
    if (!name) return;
    const match = allTournaments.find((t) => t.name.toLowerCase() === name.toLowerCase());
    addTarget(index, match ? { name: match.name, tournamentId: match.id, tournamentSlug: match.slug } : { name });
    setCustomDrafts((prev) => ({ ...prev, [index]: '' }));
  };

  // Only the fields the reader understands are stored; `label` is an input
  // convenience, not something a new rule should carry.
  const payload = rules.map((rule) => ({
    from: rule.from,
    to: rule.to,
    events: rule.targets,
    note: rule.note,
    ...(rule.from == null && rule.label ? { place: rule.label } : {}),
  }));

  return (
    <div className="space-y-3">
      <TabPasteBox
        label="Qualification rules — paste from a sheet"
        hint="One row per rule. A rule needs a rank range or a target to count. A pasted target is linked automatically when it matches an event by name."
        sampleHeader={'From\tTo\tTargets\tNote'}
        parse={previewQualificationPaste}
        onApply={applyQualificationPaste}
      />

      <input type="hidden" name="qualificationsJson" value={JSON.stringify(payload)} />

      {rules.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center dark:border-slate-800 dark:bg-slate-900/30">
          <p className="mb-2 text-xs text-slate-500">
            No qualification rules yet. Add one like &ldquo;1st goes to PMGC&rdquo;, or
            &ldquo;1&ndash;6 go to BMIC&rdquo;.
          </p>
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Add Qualification Rule
          </button>
        </div>
      )}

      {rules.map((rule, idx) => (
        <div
          key={idx}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-end gap-3">
            <div className="w-20">
              <label className={labelCls}>From rank</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={rule.from ?? ''}
                onChange={(e) =>
                  setRange(idx, e.target.value === '' ? null : Number(e.target.value), rule.to)
                }
                placeholder="1"
              />
            </div>
            <div className="w-20">
              <label className={labelCls}>To rank</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={rule.to ?? ''}
                onChange={(e) =>
                  setRange(idx, rule.from, e.target.value === '' ? null : Number(e.target.value))
                }
                placeholder="—"
                title="Leave blank for a single position; set it for a range (1-6)"
              />
            </div>

            <p className="flex-1 pb-1 text-xs font-bold text-(--ed-blue) dark:text-blue-300">
              {rule.from == null && rule.label
                ? `${rule.label} — not a numbered range`
                : describeRulePosition(rule)}
            </p>

            <button
              type="button"
              onClick={() => removeRule(idx)}
              className="mb-0.5 rounded p-1 text-slate-400 transition-colors hover:text-rose-500"
              title="Remove rule"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {rule.from == null && (
            <div>
              <label className={labelCls}>Wording (for a rule with no rank)</label>
              <input
                className={inputCls}
                value={rule.label ?? ''}
                onChange={(e) => setLabel(idx, e.target.value)}
                placeholder="e.g. Best non-qualified squad"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className={labelCls}>Qualifies for</label>

            {rule.targets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {rule.targets.map((target, targetIdx) => (
                  <span
                    key={targetIdx}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                      target.tournamentSlug
                        ? 'border-blue-500/30 bg-blue-500/10 text-(--ed-blue) dark:text-blue-300'
                        : 'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {target.tournamentSlug ? (
                      <LinkIcon className="h-3 w-3 shrink-0 text-(--ed-blue)" />
                    ) : (
                      <Trophy className="h-3 w-3 shrink-0 text-slate-400" />
                    )}
                    <span>{target.name}</span>
                    <button
                      type="button"
                      onClick={() => removeTarget(idx, targetIdx)}
                      className="ml-0.5 rounded p-0.5 text-slate-400 transition-colors hover:text-rose-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
              <SearchableSelect
                options={allTournaments.map((t) => ({ value: t.id, label: t.name }))}
                value=""
                onChange={(val) => {
                  const match = allTournaments.find((t) => t.id === val);
                  if (match) {
                    addTarget(idx, {
                      name: match.name,
                      tournamentId: match.id,
                      tournamentSlug: match.slug,
                    });
                  }
                }}
                placeholder="+ Link an event in the DB…"
                size="admin"
              />

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customDrafts[idx] ?? ''}
                  onChange={(e) => setCustomDrafts((prev) => ({ ...prev, [idx]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      takeDraft(idx);
                    }
                  }}
                  placeholder="…or type an event not in the DB"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => takeDraft(idx)}
                  className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {rule.targets.length === 0 && rule.from != null && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
              No destination yet — this publishes as “{describeRulePosition(rule)}” with no event
              named. Add one below, or remove the rule.
            </p>
          )}

          <div>
            <label className={labelCls}>Note (optional)</label>
            <input
              className={inputCls}
              value={rule.note ?? ''}
              onChange={(e) => setNote(idx, e.target.value)}
              placeholder="e.g. already qualified via BMSD"
            />
          </div>
        </div>
      ))}

      {rules.length > 0 && (
        <button
          type="button"
          onClick={addRule}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-(--ed-blue) transition-colors hover:bg-(--ed-blue)/5 dark:border-slate-700 dark:text-blue-400"
        >
          <Plus className="h-3.5 w-3.5" /> Add Another Rule
        </button>
      )}
    </div>
  );
}
