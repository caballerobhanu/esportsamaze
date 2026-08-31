'use client';

import * as React from 'react';
import {
  normalizeStandingsConfig,
  STANDINGS_COLUMN_DEFS,
  STANDINGS_FILTER_DEFS,
  type StandingsConfig,
  type StandingsFilterKey,
  type StandingsColumnKey,
  type StandingsLogoMode,
  type ZoneRule,
} from '@/lib/standings-config';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

function ZonesEditor({
  zones,
  onChange,
}: {
  zones: ZoneRule[];
  onChange: (zones: ZoneRule[]) => void;
}) {
  return (
    <div className="space-y-2">
      {zones.map((z, i) => (
        <div key={i} className="grid grid-cols-[5rem_5rem_1fr_auto] gap-2 items-center">
          <input
            type="number"
            min={1}
            className={inputCls}
            value={z.from}
            placeholder="From"
            onChange={(e) =>
              onChange(zones.map((row, idx) => (idx === i ? { ...row, from: parseInt(e.target.value, 10) || 1 } : row)))
            }
          />
          <input
            type="number"
            min={1}
            className={inputCls}
            value={z.to}
            placeholder="To"
            onChange={(e) =>
              onChange(
                zones.map((row, idx) =>
                  idx === i ? { ...row, to: Math.max(row.from, parseInt(e.target.value, 10) || row.from) } : row
                )
              )
            }
          />
          <input
            className={inputCls}
            value={z.label}
            placeholder="e.g. Qualify to Semifinals"
            onChange={(e) => onChange(zones.map((row, idx) => (idx === i ? { ...row, label: e.target.value } : row)))}
          />
          <button
            type="button"
            onClick={() => onChange(zones.filter((_, idx) => idx !== i))}
            className="px-2 py-1.5 rounded-md text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...zones, { from: zones.length ? zones[zones.length - 1].to + 1 : 1, to: (zones.length ? zones[zones.length - 1].to : 0) + 6, label: '' }])}
        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        + Add zone
      </button>
    </div>
  );
}

export function TournamentStandingsConfigInput({
  initialConfig,
  stageNames,
}: {
  initialConfig: unknown;
  stageNames: string[];
}) {
  const [config, setConfig] = React.useState<StandingsConfig>(() => normalizeStandingsConfig(initialConfig));
  const [overrideFilters, setOverrideFilters] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const name of stageNames) init[name] = !!config.stages[name]?.filters;
    return init;
  });
  const [overrideZones, setOverrideZones] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const name of stageNames) init[name] = !!config.stages[name]?.zones;
    return init;
  });

  const patch = (p: Partial<StandingsConfig>) => setConfig((c) => ({ ...c, ...p }));

  const patchStage = (name: string, p: Record<string, unknown>) =>
    setConfig((c) => ({ ...c, stages: { ...c.stages, [name]: { ...c.stages[name], ...p } } }));

  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <div className="space-y-5">
      <input type="hidden" name="standingsConfigJson" value={JSON.stringify(config)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Logo Display</label>
          <select
            className={inputCls}
            value={config.logoMode}
            onChange={(e) => patch({ logoMode: e.target.value as StandingsLogoMode })}
          >
            <option value="BOTH">Country flag + team logo</option>
            <option value="TEAM">Team logo only</option>
            <option value="COUNTRY">Country flag only</option>
            <option value="NONE">No logos</option>
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={config.showOverall}
              onChange={(e) => patch({ showOverall: e.target.checked })}
            />
            Show Overall standings tab
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Standings Filters (enabled for visitors)</label>
          <div className="flex flex-wrap gap-3">
            {STANDINGS_FILTER_DEFS.map((f) => (
              <label key={f.key} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={config.filters.includes(f.key)}
                  onChange={() => patch({ filters: toggleIn<StandingsFilterKey>(config.filters, f.key) })}
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Standings Columns (visible)</label>
          <div className="flex flex-wrap gap-3">
            {STANDINGS_COLUMN_DEFS.map((c) => (
              <label key={c.key} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={config.columns.includes(c.key)}
                  onChange={() => patch({ columns: toggleIn<StandingsColumnKey>(config.columns, c.key) })}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Default Qualification Zones (Overall &amp; stages without overrides)</label>
        <ZonesEditor zones={config.zones} onChange={(zones) => patch({ zones })} />
      </div>

      {stageNames.length > 0 && (
        <div className="space-y-3">
          <label className={labelCls}>Per-Stage Settings</label>
          {stageNames.map((name) => {
            const stage = config.stages[name] ?? {};
            return (
              <div key={name} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{name}</span>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                    Standings scope
                    <select
                      className={inputCls + ' w-auto'}
                      value={stage.mode ?? 'STAGE'}
                      onChange={(e) => patchStage(name, { mode: e.target.value })}
                    >
                      <option value="STAGE">This stage only</option>
                      <option value="CUMULATIVE">Cumulative (incl. earlier stages)</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                    Group qualification
                    <select
                      className={inputCls + ' w-auto'}
                      value={stage.groupMode ?? 'CUMULATIVE'}
                      onChange={(e) => patchStage(name, { groupMode: e.target.value })}
                    >
                      <option value="CUMULATIVE">Combined across all groups</option>
                      <option value="PER_GROUP">Separate per group (top N of each qualifies)</option>
                    </select>
                  </label>
                </div>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={!!overrideFilters[name]}
                    onChange={(e) => {
                      setOverrideFilters((prev) => ({ ...prev, [name]: e.target.checked }));
                      if (!e.target.checked) patchStage(name, { filters: undefined });
                      else patchStage(name, { filters: config.filters });
                    }}
                  />
                  Override enabled filters for this stage
                </label>
                {overrideFilters[name] && (
                  <div className="flex flex-wrap gap-3">
                    {STANDINGS_FILTER_DEFS.map((f) => (
                      <label key={f.key} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={(stage.filters ?? []).includes(f.key)}
                          onChange={() => patchStage(name, { filters: toggleIn<StandingsFilterKey>(stage.filters ?? [], f.key) })}
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={!!overrideZones[name]}
                    onChange={(e) => {
                      setOverrideZones((prev) => ({ ...prev, [name]: e.target.checked }));
                      if (!e.target.checked) patchStage(name, { zones: undefined });
                      else patchStage(name, { zones: config.zones });
                    }}
                  />
                  Override qualification zones for this stage
                </label>
                {overrideZones[name] && (
                  <ZonesEditor zones={stage.zones ?? []} onChange={(zones) => patchStage(name, { zones })} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
