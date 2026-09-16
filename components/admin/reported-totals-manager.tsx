'use client';

import * as React from 'react';
import { CheckCircle2, ClipboardPaste, Trash2, Upload } from 'lucide-react';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

export interface ReportedTotalsRowView {
  id: string;
  scope: string;
  label: string;
  stageName: string | null;
  entityName: string;
  /** Compact "matches 18 · total points 170 · elims 74" summary. */
  summary: string;
}

const SCOPE_LABELS: Record<string, string> = {
  DAY: 'Day',
  STAGE: 'Stage',
  EVENT: 'Whole event',
};

/**
 * Enter and review REPORTED tournament totals — the day / stage / event ladder
 * used when an event has no match-by-match scorecards.
 *
 * Deliberately separate from the scorecard matrix: these rows have no relationship
 * to match data, and a parent level is refused while its children exist.
 */
export function ReportedTotalsManager({
  tournamentId,
  stageOptions,
  teamRows,
  playerRows,
  notice,
  saveAction,
  deleteAction,
}: {
  tournamentId: string;
  stageOptions: { id: string; name: string }[];
  teamRows: ReportedTotalsRowView[];
  playerRows: ReportedTotalsRowView[];
  notice: { tone: 'ok' | 'error'; text: string } | null;
  saveAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const [kind, setKind] = React.useState<'TEAM' | 'PLAYER'>('TEAM');
  const [scope, setScope] = React.useState<'DAY' | 'STAGE' | 'EVENT'>('DAY');

  const rows = kind === 'TEAM' ? teamRows : playerRows;
  const needsStage = scope !== 'EVENT';
  const sample =
    kind === 'TEAM'
      ? 'Team\tPlacement\tMatches\tWWCD\tPlace Points\tElims Points\tBonus\tTotal Points\tElims'
      : 'Player\tTeam\tMatches\tElims\tDamage\tHeadshots';

  return (
    <div className="space-y-5">
      {notice && (
        <p
          className={`rounded-lg border px-4 py-2.5 text-xs font-semibold ${
            notice.tone === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          {notice.text}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        For events with no match-by-match scorecards — a day sheet, a stage summary or a whole-event
        table. These totals never touch match data. Levels roll upward (day → stage → event), so a
        parent level is refused while its children exist. Blank cells are stored as “not reported”,
        never as zero.
      </p>

      <form action={saveAction} className="space-y-3">
        <input type="hidden" name="tournamentId" value={tournamentId} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className={labelCls}>Rows are</label>
            <select
              name="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value === 'PLAYER' ? 'PLAYER' : 'TEAM')}
              className={inputCls}
            >
              <option value="TEAM">Team totals</option>
              <option value="PLAYER">Player totals</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Level</label>
            <select
              name="scope"
              value={scope}
              onChange={(event) =>
                setScope(
                  event.target.value === 'STAGE' ? 'STAGE' : event.target.value === 'EVENT' ? 'EVENT' : 'DAY',
                )
              }
              className={inputCls}
            >
              <option value="DAY">Day</option>
              <option value="STAGE">Stage</option>
              <option value="EVENT">Whole event</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Stage {needsStage ? '' : '(not used)'}</label>
            <select name="stageId" disabled={!needsStage} className={inputCls}>
              <option value="">—</option>
              {stageOptions.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Label {scope === 'DAY' ? '(required)' : ''}</label>
            <input
              name="label"
              placeholder={scope === 'DAY' ? 'Day 3' : scope === 'STAGE' ? 'Grand Finals' : ''}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>
            <ClipboardPaste className="mr-1 inline h-3 w-3" />
            Paste the sheet (tab or comma separated, first row is the header)
          </label>
          <textarea
            name="paste"
            rows={6}
            spellCheck={false}
            placeholder={sample}
            className={`${inputCls} font-mono text-xs`}
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) hover:brightness-110 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5" />
          Save reported totals
        </button>
      </form>

      <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Reported data currently on this event ({teamRows.length} team · {playerRows.length} player)
        </p>

        {rows.length === 0 ? (
          <p className="text-xs text-slate-400">Nothing reported for this event yet.</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60"
              >
                <span className="rounded bg-(--ed-blue)/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-(--ed-blue) dark:text-blue-300">
                  {SCOPE_LABELS[row.scope] ?? row.scope}
                </span>
                <span className="text-xs font-extrabold">{row.entityName}</span>
                <span className="text-[11px] text-slate-400">
                  {row.stageName ? `${row.stageName} · ` : ''}
                  {row.label || 'no label'}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {row.summary}
                </span>
                <form action={deleteAction}>
                  <input type="hidden" name="tournamentId" value={tournamentId} />
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="kind" value={kind} />
                  <button
                    type="submit"
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 cursor-pointer"
                    title={`Delete reported totals for ${row.entityName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Reported totals are read alongside computed data; where both exist, computed wins.
          </p>
        )}
      </div>
    </div>
  );
}
