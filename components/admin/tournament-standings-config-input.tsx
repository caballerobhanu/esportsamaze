'use client';

import * as React from 'react';
import {
  normalizeStandingsConfig,
  STANDINGS_COLUMN_DEFS,
  STANDINGS_FILTER_DEFS,
  MATCH_COLUMN_DEFS,
  DEFAULT_MATCH_COLUMNS,
  PLAYER_STAT_COLUMN_DEFS,
  PLAYER_METRIC_FIELDS,
  PLAYER_METRIC_AGGREGATORS,
  generateCustomColumnLabel,
  type PlayerMetricField,
  type PlayerMetricAggregator,
  type CustomPlayerColumn,
  type PlayerStatColumnKey,
  type MatchColumnKey,
  type StandingsConfig,
  type StandingsFilterKey,
  type StandingsColumnKey,
  type StandingsCustomTab,
  type StandingsTabGroup,
  type StandingsNavigationItem,
  type ZoneRule,
  type ZoneColor,
  ZONE_COLOR_OPTIONS,
  TOURNAMENT_AVAILABLE_TABS,
  ALL_TOURNAMENT_TAB_IDS,
  type TournamentTabId,
} from '@/lib/standings-config';
import { parseStandingsZoneSheet, planZoneFiling, type ParsedZoneRow } from '@/lib/standings-zone-parse';
import { TabPasteBox, type TabPastePreview } from '@/components/admin/tab-paste-box';
import {
  Sparkles,
  Trash2,
  Plus,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  Flame,
  Calendar,
  Crosshair,
  Copy,
  LayoutDashboard,
  Trophy,
  Swords,
  Route,
  ScrollText,
  Users,
  Banknote,
  Eye,
  Sliders,
} from 'lucide-react';

const TAB_ICONS: Record<TournamentTabId, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  standings: Trophy,
  matches: Swords,
  progression: Route,
  format: ScrollText,
  teams: Users,
  prizepool: Banknote,
  statistics: Crosshair,
};

export interface AdminStageDetail {
  name: string;
  matchCount: number;
  groups?: string[];
  matches?: {
    id: string;
    format: string;
    matchNumber?: number | null;
    overallMatchNumber?: number | null;
    mapName?: string | null;
    groupName?: string | null;
  }[];
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

function ZonesEditor({
  zones,
  stageNames = [],
  onChange,
}: {
  zones: ZoneRule[];
  stageNames?: string[];
  onChange: (zones: ZoneRule[]) => void;
}) {
  return (
    <div className="space-y-2">
      {zones.map((z, i) => (
        <div key={i} className="grid grid-cols-[3.5rem_3.5rem_1fr_9rem_7rem_6.5rem_auto] gap-1.5 items-center">
          <input
            type="number"
            min={1}
            className={inputCls}
            value={z.from}
            placeholder="From"
            onChange={(e) =>
              onChange(
                zones.map((row, idx) => (idx === i ? { ...row, from: parseInt(e.target.value, 10) || 1 } : row))
              )
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
            placeholder="e.g. Top 4 to Round 2 Group A"
            onChange={(e) =>
              onChange(zones.map((row, idx) => (idx === i ? { ...row, label: e.target.value } : row)))
            }
          />

          {/* Linked Target Stage Dropdown */}
          <select
            className={`${inputCls} font-semibold text-xs`}
            value={z.targetStageName || ''}
            onChange={(e) => {
              const val = e.target.value;
              onChange(
                zones.map((row, idx) => {
                  if (idx !== i) return row;
                  const prefix =
                    row.label && row.label.includes(' to ')
                      ? row.label.split(' to ')[0]
                      : `Top ${row.to - row.from + 1}`;
                  const newLabel = val
                    ? `${prefix} to ${val}${row.targetGroupName ? ` (${row.targetGroupName})` : ''}`
                    : row.label;
                  return {
                    ...row,
                    targetStageName: val || undefined,
                    label: newLabel || row.label,
                  };
                })
              );
            }}
            title="Link this qualification zone to an actual tournament stage (e.g. Round 2)"
          >
            <option value="">🎯 Link Stage</option>
            {stageNames.map((s) => (
              <option key={s} value={s}>
                ➔ {s}
              </option>
            ))}
          </select>

          {/* Linked Target Group Input */}
          <input
            className={`${inputCls} text-xs`}
            value={z.targetGroupName || ''}
            placeholder="Target Grp"
            title="Optional target group in that stage (e.g. Group A)"
            onChange={(e) => {
              const val = e.target.value;
              onChange(
                zones.map((row, idx) => {
                  if (idx !== i) return row;
                  const prefix =
                    row.label && row.label.includes(' to ')
                      ? row.label.split(' to ')[0]
                      : `Top ${row.to - row.from + 1}`;
                  const newLabel = row.targetStageName
                    ? `${prefix} to ${row.targetStageName}${val ? ` (${val})` : ''}`
                    : row.label;
                  return {
                    ...row,
                    targetGroupName: val || undefined,
                    label: newLabel || row.label,
                  };
                })
              );
            }}
          />

          <select
            className={inputCls}
            value={z.color || 'blue'}
            onChange={(e) =>
              onChange(
                zones.map((row, idx) =>
                  idx === i ? { ...row, color: e.target.value as ZoneColor } : row
                )
              )
            }
          >
            {ZONE_COLOR_OPTIONS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onChange(zones.filter((_, idx) => idx !== i))}
            className="p-2 rounded-md text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
            title="Delete Zone"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...zones,
            {
              from: zones.length ? zones[zones.length - 1].to + 1 : 1,
              to: (zones.length ? zones[zones.length - 1].to : 0) + 6,
              label: '',
              color: 'green',
            },
          ])
        }
        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> Add Qualification Zone
      </button>
    </div>
  );
}

// -------------------------------------------------------------
// Hierarchical Tab Groups & Sub-Divisions Manager
// -------------------------------------------------------------
function TabGroupsEditor({
  tabGroups,
  stagesInfo,
  stageNames,
  onChange,
}: {
  tabGroups: StandingsTabGroup[];
  stagesInfo: AdminStageDetail[];
  stageNames: string[];
  onChange: (groups: StandingsTabGroup[]) => void;
}) {
  const [selectedStageToAdd, setSelectedStageToAdd] = React.useState<Record<string, string>>({});
  const [activeGroupZoneMap, setActiveGroupZoneMap] = React.useState<Record<string, string>>({});
  const [newGroupInputMap, setNewGroupInputMap] = React.useState<Record<string, string>>({});

  const addSubDivision = () => {
    const defaultName =
      tabGroups.length === 0
        ? 'League Weeks'
        : tabGroups.length === 1
        ? 'Weekends'
        : tabGroups.length === 2
        ? 'Playoffs'
        : `Division #${tabGroups.length + 1}`;

    const newGroup: StandingsTabGroup = {
      id: `group-${Date.now()}`,
      name: defaultName,
      items: [],
    };
    onChange([...tabGroups, newGroup]);
  };

  const updateGroup = (groupIndex: number, patch: Partial<StandingsTabGroup>) => {
    onChange(tabGroups.map((g, idx) => (idx === groupIndex ? { ...g, ...patch } : g)));
  };

  const removeGroup = (groupIndex: number) => {
    onChange(tabGroups.filter((_, idx) => idx !== groupIndex));
  };

  const moveGroup = (groupIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1;
    if (targetIndex < 0 || targetIndex >= tabGroups.length) return;
    const copy = [...tabGroups];
    const temp = copy[groupIndex];
    copy[groupIndex] = copy[targetIndex];
    copy[targetIndex] = temp;
    onChange(copy);
  };

  // Item Management inside a Group
  const addStageItem = (groupIndex: number, stageName: string) => {
    if (!stageName) return;
    const group = tabGroups[groupIndex];
    const newItem: StandingsNavigationItem = {
      id: `item-${Date.now()}`,
      type: 'STAGE',
      label: stageName,
      stageName,
      zones: [],
    };
    updateGroup(groupIndex, { items: [...group.items, newItem] });
  };

  const addCustomCumulativeItem = (groupIndex: number) => {
    const group = tabGroups[groupIndex];
    const newItem: StandingsNavigationItem = {
      id: `item-${Date.now()}`,
      type: 'CUSTOM_TAB',
      label: `Overall ${group.name}`,
      shortLabel: group.name,
      description: `Cumulative standings across selected stages`,
      includeStages: stageNames.slice(0, 2),
      zones: [
        { from: 1, to: 6, label: 'Advance to Grand Finals', color: 'blue' },
        { from: 7, to: 16, label: 'Advance to Playoffs', color: 'green' },
      ],
    };
    updateGroup(groupIndex, { items: [...group.items, newItem] });
  };

  const updateItem = (groupIndex: number, itemIndex: number, patch: Partial<StandingsNavigationItem>) => {
    const group = tabGroups[groupIndex];
    const newItems = group.items.map((it, idx) => (idx === itemIndex ? { ...it, ...patch } : it));
    updateGroup(groupIndex, { items: newItems });
  };

  const removeItem = (groupIndex: number, itemIndex: number) => {
    const group = tabGroups[groupIndex];
    updateGroup(groupIndex, { items: group.items.filter((_, idx) => idx !== itemIndex) });
  };

  const moveItem = (groupIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    const group = tabGroups[groupIndex];
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= group.items.length) return;
    const copy = [...group.items];
    const temp = copy[itemIndex];
    copy[itemIndex] = copy[targetIndex];
    copy[targetIndex] = temp;
    updateGroup(groupIndex, { items: copy });
  };

  const toggleStageInCumulative = (groupIndex: number, itemIndex: number, stageName: string) => {
    const item = tabGroups[groupIndex].items[itemIndex];
    const current = item.includeStages || [];
    const exists = current.some((s) => s.toLowerCase() === stageName.toLowerCase());
    const updated = exists
      ? current.filter((s) => s.toLowerCase() !== stageName.toLowerCase())
      : [...current, stageName];
    updateItem(groupIndex, itemIndex, { includeStages: updated });
  };

  return (
    <div className="space-y-6">
      {tabGroups.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/30 space-y-3">
          <FolderPlus className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
            No Sub-Divisions Configured
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create sub-divisions (e.g. <strong>League Weeks</strong>, <strong>Weekends</strong>, <strong>Playoffs</strong>, <strong>Grand Finals</strong>) to group your stages and custom cumulative standings cleanly.
          </p>
          <button
            type="button"
            onClick={addSubDivision}
            className="px-4 py-2 rounded-xl bg-(--ed-blue) text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 mx-auto hover:bg-(--ed-blue) transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create First Sub-Division
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {tabGroups.map((grp, gIdx) => (
            <div
              key={grp.id || gIdx}
              className="p-5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 shadow-xs space-y-4"
            >
              {/* ── Sub-Division Header & Ordering ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <span className="px-2 py-0.5 rounded bg-(--ed-blue) text-white text-[10px] font-black uppercase">
                    Tab Group #{gIdx + 1}
                  </span>
                  <input
                    className={`${inputCls} font-bold text-sm max-w-sm`}
                    value={grp.name}
                    placeholder="e.g. League Weeks or Weekends"
                    onChange={(e) => updateGroup(gIdx, { name: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={gIdx === 0}
                    onClick={() => moveGroup(gIdx, 'up')}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    title="Move Sub-Division Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={gIdx === tabGroups.length - 1}
                    onClick={() => moveGroup(gIdx, 'down')}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    title="Move Sub-Division Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGroup(gIdx)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-1 cursor-pointer ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Group
                  </button>
                </div>
              </div>

              {/* ── Items inside this Sub-Division ── */}
              <div className="space-y-3 pl-2">
                <div className="flex items-center justify-between">
                  <label className={labelCls}>
                    Sub-Tabs inside &quot;{grp.name}&quot; ({grp.items.length} Items)
                  </label>
                </div>

                {grp.items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No items in this sub-division yet. Add individual stages or custom combined standings below.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {grp.items.map((item, iIdx) => {
                      const isCustom = item.type === 'CUSTOM_TAB';

                      return (
                        <div
                          key={item.id || iIdx}
                          className={`p-4 rounded-xl border ${
                            isCustom
                              ? 'border-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60'
                          } space-y-3`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  isCustom
                                    ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {isCustom ? '⭐ Combined View' : '📅 Stage Tab'}
                              </span>
                              <input
                                className={`${inputCls} font-bold text-xs max-w-xs`}
                                value={item.label}
                                placeholder="Display Name"
                                onChange={(e) => updateItem(gIdx, iIdx, { label: e.target.value })}
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={iIdx === 0}
                                onClick={() => moveItem(gIdx, iIdx, 'up')}
                                className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                                title="Move Item Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={iIdx === grp.items.length - 1}
                                onClick={() => moveItem(gIdx, iIdx, 'down')}
                                className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                                title="Move Item Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(gIdx, iIdx)}
                                className="p-1 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer ml-1"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* If Custom Combined Standings, show multi-stage checkboxes */}
                          {isCustom && (
                            <div className="space-y-2.5 pt-1 border-t border-indigo-500/10">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-slate-500">
                                  Stages Aggregated in this Combined Tab:
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                  {stageNames.map((sName) => {
                                    const isSelected = (item.includeStages || []).some(
                                      (s) => s.toLowerCase() === sName.toLowerCase()
                                    );
                                    return (
                                      <button
                                        type="button"
                                        key={sName}
                                        onClick={() => toggleStageInCumulative(gIdx, iIdx, sName)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${
                                          isSelected
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                                        }`}
                                      >
                                        {isSelected ? '✓ ' : '+ '}
                                        {sName}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Multi-Stage Precedence & Elimination Configuration */}
                              <div className="space-y-3 pt-2 border-t border-indigo-500/10">
                                <div>
                                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                                    Exclude Teams Eliminated In Stage(s):
                                  </label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {stageNames.map((sName) => {
                                      const currentExcluded =
                                        item.excludeEliminatedFromStages ||
                                        (item.excludeEliminatedFromStage ? [item.excludeEliminatedFromStage] : []);
                                      const isSelected = currentExcluded.some(
                                        (s) => s.toLowerCase() === sName.toLowerCase()
                                      );
                                      return (
                                        <button
                                          type="button"
                                          key={sName}
                                          onClick={() => {
                                            const updated = isSelected
                                              ? currentExcluded.filter(
                                                  (s) => s.toLowerCase() !== sName.toLowerCase()
                                                )
                                              : [...currentExcluded, sName];
                                            updateItem(gIdx, iIdx, {
                                              excludeEliminatedFromStages: updated,
                                              excludeEliminatedFromStage: undefined,
                                            });
                                          }}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${
                                            isSelected
                                              ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                                          }`}
                                        >
                                          {isSelected ? '❌ Exclude ' : '+ '}
                                          {sName}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                                    Precedence Carry-Forward From Tab(s):
                                  </label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {tabGroups
                                      .flatMap((g) => g.items)
                                      .filter((it) => it.id !== item.id)
                                      .map((other) => {
                                        const currentPrecedences =
                                          item.precedenceFromTabIds ||
                                          (item.precedenceFromTabId ? [item.precedenceFromTabId] : []);
                                        const isSelected = currentPrecedences.includes(other.id);

                                        return (
                                          <button
                                            type="button"
                                            key={other.id}
                                            onClick={() => {
                                              const updated = isSelected
                                                ? currentPrecedences.filter((id) => id !== other.id)
                                                : [...currentPrecedences, other.id];
                                              updateItem(gIdx, iIdx, {
                                                precedenceFromTabIds: updated,
                                                precedenceFromTabId: undefined,
                                              });
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${
                                              isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                                            }`}
                                          >
                                            {isSelected ? '✓ ' : '+ '}
                                            {other.label}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Tier 3: Group Sub-Tabs Configuration */}
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
                            <div className="flex flex-wrap items-center gap-4">
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.enableGroupSubTabs)}
                                  onChange={(e) => updateItem(gIdx, iIdx, { enableGroupSubTabs: e.target.checked })}
                                  className="rounded text-(--ed-blue)"
                                />
                                <span>Enable Group Sub-Tabs (Groups A, B, C, D...)</span>
                              </label>

                              {item.enableGroupSubTabs && (
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-500 select-none">
                                  <input
                                    type="checkbox"
                                    checked={item.showOverallInGroupTabs !== false}
                                    onChange={(e) => updateItem(gIdx, iIdx, { showOverallInGroupTabs: e.target.checked })}
                                    className="rounded text-(--ed-blue)"
                                  />
                                  <span>Include Combined Overall (64 Teams) Tab</span>
                                </label>
                              )}
                            </div>

                            {item.enableGroupSubTabs ? (
                              (() => {
                                const itemKey = item.id || `item-${gIdx}-${iIdx}`;
                                const stageTarget = item.stageName || item.label;
                                const matchedStage = stagesInfo.find(
                                  (s) => s.name.toLowerCase() === stageTarget.toLowerCase()
                                );
                                const fromStage = matchedStage?.groups || [];
                                const fromMatches = (matchedStage?.matches || [])
                                  .map((m) => m.groupName?.trim())
                                  .filter((g): g is string => Boolean(g));
                                const fromConfig = Object.keys(item.groupZones || {});

                                // Deduplicate candidate groups case- and prefix-insensitively (e.g. 'A' vs 'Group A')
                                const rawCandidates = [...fromStage, ...fromMatches, ...fromConfig];
                                const canonicalMap = new Map<string, string>();
                                for (const raw of rawCandidates) {
                                  if (!raw || !raw.trim()) continue;
                                  const trimmed = raw.trim();
                                  const canonical = trimmed.replace(/^group\s*/i, '').trim().toUpperCase();
                                  const existing = canonicalMap.get(canonical);
                                  if (!existing) {
                                    canonicalMap.set(canonical, trimmed);
                                  } else if (/^group\s+/i.test(trimmed) && !/^group\s+/i.test(existing)) {
                                    canonicalMap.set(canonical, trimmed);
                                  }
                                }
                                const detectedGroups = canonicalMap.size > 0
                                  ? Array.from(canonicalMap.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                                  : ['Group A', 'Group B', 'Group C', 'Group D'];

                                const itemGroups = item.groups && item.groups.length > 0 ? item.groups : detectedGroups;
                                const rawActiveKey = activeGroupZoneMap[itemKey] || (item.showOverallInGroupTabs !== false ? 'OVERALL' : (itemGroups[0] || 'Group A'));
                                const effectiveZoneKey =
                                  rawActiveKey !== 'OVERALL' && !itemGroups.includes(rawActiveKey)
                                    ? (item.showOverallInGroupTabs !== false ? 'OVERALL' : (itemGroups[0] || 'Group A'))
                                    : rawActiveKey;

                                const getZonesForGroup = (grpName: string) => {
                                  if (!item.groupZones) return [];
                                  if (item.groupZones[grpName]) return item.groupZones[grpName];
                                  const short = grpName.replace(/^group\s*/i, '').trim();
                                  if (item.groupZones[short]) return item.groupZones[short];
                                  const long = `Group ${short}`;
                                  if (item.groupZones[long]) return item.groupZones[long];
                                  const matchKey = Object.keys(item.groupZones).find(
                                    (k) =>
                                      k.toLowerCase() === grpName.toLowerCase() ||
                                      k.toLowerCase() === short.toLowerCase() ||
                                      k.toLowerCase() === long.toLowerCase()
                                  );
                                  return matchKey ? item.groupZones[matchKey] : [];
                                };

                                return (
                                  <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-50/30 dark:bg-blue-950/10 space-y-3">
                                    {/* Active Groups Management */}
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                          Configured Groups in &quot;{item.label}&quot;:
                                        </label>
                                        <span className="text-[10px] text-slate-400">
                                          {itemGroups.length} Groups Configured
                                        </span>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {itemGroups.map((grp) => (
                                          <span
                                            key={grp}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs"
                                          >
                                            <span>{grp}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const filtered = itemGroups.filter((g) => g !== grp);
                                                const nextGroupZones = { ...(item.groupZones || {}) };
                                                delete nextGroupZones[grp];
                                                const short = grp.replace(/^group\s*/i, '').trim();
                                                delete nextGroupZones[short];
                                                delete nextGroupZones[`Group ${short}`];
                                                updateItem(gIdx, iIdx, {
                                                  groups: filtered,
                                                  groupZones: nextGroupZones,
                                                });
                                                if (effectiveZoneKey === grp) {
                                                  setActiveGroupZoneMap((prev) => ({
                                                    ...prev,
                                                    [itemKey]: item.showOverallInGroupTabs !== false ? 'OVERALL' : (filtered[0] || 'Group A'),
                                                  }));
                                                }
                                              }}
                                              className="text-slate-400 hover:text-rose-500 p-0.5 ml-0.5 transition-colors cursor-pointer"
                                              title={`Remove ${grp}`}
                                            >
                                              ✕
                                            </button>
                                          </span>
                                        ))}

                                        {/* Add Group input */}
                                        <div className="flex items-center gap-1 ml-1">
                                          <input
                                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-(--ed-blue)"
                                            placeholder="e.g. Group E"
                                            value={newGroupInputMap[itemKey] || ''}
                                            onChange={(e) =>
                                              setNewGroupInputMap((prev) => ({ ...prev, [itemKey]: e.target.value }))
                                            }
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = (newGroupInputMap[itemKey] || '').trim();
                                                if (val && !itemGroups.includes(val)) {
                                                  updateItem(gIdx, iIdx, { groups: [...itemGroups, val] });
                                                  setNewGroupInputMap((prev) => ({ ...prev, [itemKey]: '' }));
                                                  setActiveGroupZoneMap((prev) => ({ ...prev, [itemKey]: val }));
                                                }
                                              }
                                            }}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const val = (newGroupInputMap[itemKey] || '').trim();
                                              if (val && !itemGroups.includes(val)) {
                                                updateItem(gIdx, iIdx, { groups: [...itemGroups, val] });
                                                setNewGroupInputMap((prev) => ({ ...prev, [itemKey]: '' }));
                                                setActiveGroupZoneMap((prev) => ({ ...prev, [itemKey]: val }));
                                              }
                                            }}
                                            className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Group-Wise Zones Pill Selector */}
                                    <div className="space-y-2 pt-2 border-t border-blue-500/10">
                                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                                        Select View / Group To Configure Advancement Zones:
                                      </label>

                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {item.showOverallInGroupTabs !== false && (
                                          <button
                                            type="button"
                                            onClick={() => setActiveGroupZoneMap((prev) => ({ ...prev, [itemKey]: 'OVERALL' }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                                              effectiveZoneKey === 'OVERALL'
                                                ? 'bg-(--ed-blue) border-(--ed-blue) text-white shadow-sm'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                                            }`}
                                          >
                                            <span>Combined Overall</span>
                                            <span
                                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                                                effectiveZoneKey === 'OVERALL'
                                                  ? 'bg-white/20 text-white'
                                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                              }`}
                                            >
                                              {(item.zones || []).length} zones
                                            </span>
                                          </button>
                                        )}

                                        {itemGroups.map((grp) => {
                                          const isSelected = effectiveZoneKey === grp;
                                          const groupZonesList = getZonesForGroup(grp);
                                          const groupZoneCount = groupZonesList.length;
                                          const hasCustomZones = groupZoneCount > 0;

                                          return (
                                            <button
                                              type="button"
                                              key={grp}
                                              onClick={() => setActiveGroupZoneMap((prev) => ({ ...prev, [itemKey]: grp }))}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                                                isSelected
                                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                                              }`}
                                            >
                                              <span>{grp}</span>
                                              <span
                                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                                                  isSelected
                                                    ? 'bg-white/20 text-white'
                                                    : hasCustomZones
                                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                }`}
                                              >
                                                {hasCustomZones ? `${groupZoneCount} zones` : 'fallback'}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Editor Context Title & Quick Copy Actions */}
                                    <div className="pt-2 border-t border-blue-500/10 flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                          {effectiveZoneKey === 'OVERALL' ? (
                                            <>Combined Overall Qualification Zones</>
                                          ) : (
                                            <>Specific Qualification Zones for &quot;{effectiveZoneKey}&quot;</>
                                          )}
                                        </h5>
                                        <p className="text-[11px] text-slate-500">
                                          {effectiveZoneKey === 'OVERALL'
                                            ? 'These rules apply when viewing the Combined Overall table.'
                                            : `Rules configured here apply exclusively when viewing standings for ${effectiveZoneKey}. If empty, it falls back to the Overall zones.`}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        {effectiveZoneKey !== 'OVERALL' ? (
                                          <>
                                            {/* Duplicate from Overall into this group */}
                                            {(item.zones || []).length > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextGroupZones = {
                                                    ...(item.groupZones || {}),
                                                    [effectiveZoneKey]: JSON.parse(JSON.stringify(item.zones || [])),
                                                  };
                                                  updateItem(gIdx, iIdx, { groupZones: nextGroupZones });
                                                }}
                                                className="px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                                                title="Copy the Overall zones into this group as a starting template"
                                              >
                                                <Copy className="w-3 h-3" /> Duplicate Overall Zones
                                              </button>
                                            )}

                                            {/* Copy this group's zones to all other groups */}
                                            {(item.groupZones?.[effectiveZoneKey] || []).length > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const currentGroupZones = item.groupZones?.[effectiveZoneKey] || [];
                                                  const nextGroupZones = { ...(item.groupZones || {}) };
                                                  for (const g of itemGroups) {
                                                    nextGroupZones[g] = JSON.parse(JSON.stringify(currentGroupZones));
                                                  }
                                                  updateItem(gIdx, iIdx, { groupZones: nextGroupZones });
                                                }}
                                                className="px-2 py-1 rounded-md text-[10px] font-bold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 flex items-center gap-1 cursor-pointer"
                                                title="Copy this group's zones to all other groups in this stage"
                                              >
                                                <Copy className="w-3 h-3" /> Copy to All Groups
                                              </button>
                                            )}

                                            {/* Clear this group's zones */}
                                            {(item.groupZones?.[effectiveZoneKey] || []).length > 0 && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const nextGroupZones = { ...(item.groupZones || {}) };
                                                  delete nextGroupZones[effectiveZoneKey];
                                                  updateItem(gIdx, iIdx, { groupZones: nextGroupZones });
                                                }}
                                                className="px-2 py-1 rounded-md text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                                                title="Clear custom zones for this group and use fallback"
                                              >
                                                Clear Custom Zones
                                              </button>
                                            )}
                                          </>
                                        ) : (
                                          (item.zones || []).length > 0 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const currentOverallZones = item.zones || [];
                                                const nextGroupZones = { ...(item.groupZones || {}) };
                                                for (const g of itemGroups) {
                                                  nextGroupZones[g] = JSON.parse(JSON.stringify(currentOverallZones));
                                                }
                                                updateItem(gIdx, iIdx, { groupZones: nextGroupZones });
                                              }}
                                              className="px-2 py-1 rounded-md text-[10px] font-bold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 flex items-center gap-1 cursor-pointer"
                                              title="Copy overall zones to all groups"
                                            >
                                              <Copy className="w-3 h-3" /> Copy Overall to All Groups
                                            </button>
                                          )
                                        )}
                                      </div>
                                    </div>

                                    {/* The Active Zones Editor */}
                                    <ZonesEditor
                                      zones={
                                        effectiveZoneKey === 'OVERALL'
                                          ? item.zones || []
                                          : getZonesForGroup(effectiveZoneKey)
                                      }
                                      stageNames={stageNames}
                                      onChange={(updatedZones) => {
                                        if (effectiveZoneKey === 'OVERALL') {
                                          updateItem(gIdx, iIdx, { zones: updatedZones });
                                        } else {
                                          const nextGroupZones = {
                                            ...(item.groupZones || {}),
                                            [effectiveZoneKey]: updatedZones,
                                          };
                                          const short = effectiveZoneKey.replace(/^group\s*/i, '').trim();
                                          if (short !== effectiveZoneKey && nextGroupZones[short]) {
                                            delete nextGroupZones[short];
                                          }
                                          updateItem(gIdx, iIdx, { groupZones: nextGroupZones });
                                        }
                                      }}
                                    />
                                  </div>
                                );
                              })()
                            ) : (
                              /* Standard Single-Stage Zones Editor */
                              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-slate-500">
                                  Advancement / Qualification Zones for this Sub-Tab:
                                </label>
                                <ZonesEditor
                                  zones={item.zones || []}
                                  stageNames={stageNames}
                                  onChange={(updatedZones) => updateItem(gIdx, iIdx, { zones: updatedZones })}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Controls to Add Stage or Combined View */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <select
                      className={`${inputCls} text-xs py-1.5`}
                      value={selectedStageToAdd[grp.id] || (stageNames[0] ?? '')}
                      onChange={(e) =>
                        setSelectedStageToAdd((prev) => ({ ...prev, [grp.id]: e.target.value }))
                      }
                    >
                      {stageNames.map((sName) => (
                        <option key={sName} value={sName}>
                          {sName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        addStageItem(gIdx, selectedStageToAdd[grp.id] || (stageNames[0] ?? ''))
                      }
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:bg-slate-100 flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-500" /> Add Stage Tab
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => addCustomCumulativeItem(gIdx)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> + Add Combined Standings Tab
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSubDivision}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            <FolderPlus className="w-4 h-4 text-blue-400" />
            <span>+ Add Another Sub-Division (e.g. Playoffs or Finals)</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function TournamentStandingsConfigInput({
  initialConfig,
  stageNames,
  stagesInfo = [],
}: {
  initialConfig: unknown;
  stageNames: string[];
  stagesInfo?: AdminStageDetail[];
}) {
  const [config, setConfig] = React.useState<StandingsConfig>(() => normalizeStandingsConfig(initialConfig));

  const resolvedStagesInfo: AdminStageDetail[] = React.useMemo(() => {
    if (stagesInfo && stagesInfo.length > 0) return stagesInfo;
    return stageNames.map((name) => ({ name, matchCount: 0 }));
  }, [stagesInfo, stageNames]);

  const patch = (p: Partial<StandingsConfig>) => setConfig((c) => ({ ...c, ...p }));

  // ---- Paste advancement zones straight into this tab ----
  // A zone lives at one of four places, and the sheet's Stage/Group columns decide which:
  // blank stage → the default list, stage only → that stage's zones (tab item, or the flat
  // per-stage config), stage + group → that tab's per-group zones.
  const toZoneRule = (row: ParsedZoneRow): ZoneRule => ({
    from: row.from,
    to: row.to,
    label: row.label,
    color: row.color,
    targetStageName: row.targetStageName,
    targetGroupName: row.targetGroupName,
  });

  /** The stage/group names this config already has, which is all a row can be filed against. */
  const zoneFilingTargets = () => {
    const tabStageNames: string[] = [];
    const tabGroupNames: Record<string, string[]> = {};

    for (const group of config.tabGroups ?? []) {
      for (const item of group.items) {
        if (item.type === 'STAGE' && item.stageName) {
          tabStageNames.push(item.stageName);
          tabGroupNames[item.stageName] = item.groups ?? [];
        }
      }
    }

    return { tabStageNames, tabGroupNames, configStageNames: Object.keys(config.stages ?? {}) };
  };

  const previewZonePaste = (text: string): TabPastePreview => {
    const res = parseStandingsZoneSheet(text);
    if (res.error) return { summary: [], unrecognised: res.unrecognisedHeaders, error: res.error };

    const plan = planZoneFiling(res.rows, zoneFilingTargets());
    const summary: string[] = [];

    if (plan.defaultRows.length > 0) summary.push(`${plan.defaultRows.length} → the default zone list`);
    for (const target of plan.tabTargets) {
      const groupTotal = target.groups.reduce((sum, group) => sum + group.rows.length, 0);
      const groups = target.groups.map((group) => `${group.groupName} (${group.rows.length})`).join(', ');
      summary.push(
        `${target.rows.length + groupTotal} → ${target.stageName}${groups ? ` — ${groups}` : ' (tab zones)'}`,
      );
    }
    for (const target of plan.stageConfigTargets) summary.push(`${target.rows.length} → ${target.stageName} (stage zones)`);
    if (summary.length === 0) summary.push('Nothing could be filed against this config');

    return {
      summary,
      unrecognised: plan.unmatched.length
        ? [...res.unrecognisedHeaders, `${plan.unmatched.length} row(s) named a stage or group this config has not got — they will be skipped`]
        : res.unrecognisedHeaders,
      error: null,
    };
  };

  const applyZonePaste = (text: string) => {
    const { rows } = parseStandingsZoneSheet(text);
    const plan = planZoneFiling(rows, zoneFilingTargets());
    const next: StandingsConfig = { ...config };

    if (plan.defaultRows.length > 0) next.zones = plan.defaultRows.map(toZoneRule);

    if (plan.stageConfigTargets.length > 0) {
      const stages = { ...(config.stages ?? {}) };
      for (const target of plan.stageConfigTargets) {
        stages[target.stageName] = { ...(stages[target.stageName] ?? {}), zones: target.rows.map(toZoneRule) };
      }
      next.stages = stages;
    }

    if (plan.tabTargets.length > 0) {
      next.tabGroups = (config.tabGroups ?? []).map((group) => ({
        ...group,
        items: group.items.map((item) => {
          const target = plan.tabTargets.find(
            (entry) => item.type === 'STAGE' && entry.stageName === item.stageName,
          );
          if (!target) return item;

          const groupZones = { ...(item.groupZones ?? {}) };
          for (const entry of target.groups) groupZones[entry.groupName] = entry.rows.map(toZoneRule);

          return {
            ...item,
            zones: target.rows.length > 0 ? target.rows.map(toZoneRule) : item.zones,
            groupZones,
            // Group sub-tabs have to be on for group zones to render, and the group has to be
            // listed — otherwise the zones are stored but never shown.
            enableGroupSubTabs: item.enableGroupSubTabs || target.groups.length > 0,
            groups: [...new Set([...(item.groups ?? []), ...target.groups.map((entry) => entry.groupName)])],
          };
        }),
      }));
    }

    patch(next);
  };

  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  // Custom Player Metric Column Builder State
  const [showAddCustomCol, setShowAddCustomCol] = React.useState(false);
  const [newMetric, setNewMetric] = React.useState<PlayerMetricField>('damage');
  const [newAggregator, setNewAggregator] = React.useState<PlayerMetricAggregator>('max');
  const [newThreshold, setNewThreshold] = React.useState<number>(500);
  const [newCustomLabel, setNewCustomLabel] = React.useState<string>('Max Damage in Match');
  const [newCustomShort, setNewCustomShort] = React.useState<string>('Max Dmg');
  const [statsConfigTab, setStatsConfigTab] = React.useState<'players' | 'teams'>(
    () => config.statisticsConfig?.defaultView || 'players'
  );

  React.useEffect(() => {
    if (config.statisticsConfig?.defaultView) {
      setStatsConfigTab(config.statisticsConfig.defaultView);
    }
  }, [config.statisticsConfig?.defaultView]);

  const currentVisibleTabs: TournamentTabId[] =
    config.visibleTabs && config.visibleTabs.length > 0
      ? config.visibleTabs
      : [...ALL_TOURNAMENT_TAB_IDS];

  const toggleTab = (tabId: TournamentTabId) => {
    if (currentVisibleTabs.includes(tabId)) {
      if (currentVisibleTabs.length <= 1) return; // Prevent disabling all tabs
      patch({ visibleTabs: currentVisibleTabs.filter((id) => id !== tabId) });
    } else {
      const nextTabs = ALL_TOURNAMENT_TAB_IDS.filter(
        (id) => currentVisibleTabs.includes(id) || id === tabId
      );
      patch({ visibleTabs: nextTabs });
    }
  };

  const setPresetTabs = (preset: TournamentTabId[]) => {
    patch({ visibleTabs: preset });
  };

  return (
    <div className="space-y-6">
      <input type="hidden" name="standingsConfigJson" value={JSON.stringify(config)} />

      {/* ── Public Tournament Tabs Visibility & Toggles ── */}
      <div className="p-5 rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 dark:from-slate-900/90 dark:via-[#0b1220] dark:to-slate-900/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                <Eye className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Public Tournament Tabs Visibility
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-black rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                {currentVisibleTabs.length} / {ALL_TOURNAMENT_TAB_IDS.length} Active
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
              Turn individual tabs ON or OFF for visitors on the public tournament page. Use presets for upcoming events (hiding empty matches/standings) or customize per tournament.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Sliders className="w-3 h-3" /> Presets:
            </span>
            <button
              type="button"
              onClick={() => setPresetTabs([...ALL_TOURNAMENT_TAB_IDS])}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              🌟 All Tabs (Default)
            </button>
            <button
              type="button"
              onClick={() => setPresetTabs(['overview', 'format', 'teams', 'prizepool'])}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
            >
              ⏳ Upcoming Event
            </button>
            <button
              type="button"
              onClick={() => setPresetTabs(['overview', 'standings', 'matches', 'teams', 'prizepool', 'statistics'])}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
            >
              🔥 Live Event
            </button>
            <button
              type="button"
              onClick={() => setPresetTabs(['overview', 'standings', 'teams'])}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 transition-colors cursor-pointer"
            >
              ⚡ Minimal
            </button>
          </div>
        </div>

        {/* 8 Tab Toggle Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {TOURNAMENT_AVAILABLE_TABS.map((tab) => {
            const isEnabled = currentVisibleTabs.includes(tab.id);
            const Icon = TAB_ICONS[tab.id];

            return (
              <div
                key={tab.id}
                onClick={() => toggleTab(tab.id)}
                className={`group relative p-3 rounded-xl border transition-all duration-200 select-none cursor-pointer flex flex-col justify-between ${
                  isEnabled
                    ? 'border-blue-500/50 bg-white dark:bg-slate-900 shadow-xs hover:border-blue-600'
                    : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg transition-colors ${
                        isEnabled
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      {tab.label}
                    </span>
                  </div>

                  {/* Switch Toggle Button */}
                  <div
                    className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                      isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs transition-all" />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {tab.description}
                </p>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className={`font-black uppercase tracking-wider ${isEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                    {isEnabled ? '✓ Visible to Users' : '✕ Hidden'}
                  </span>
                  <span className="text-slate-400 font-mono text-[9px]">tab={tab.id}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Public Pill Dock Preview */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Live Public Navigation Dock Preview (What visitors will see):
            </span>
            <span className="text-slate-400 text-[10px]">
              {currentVisibleTabs.length} tabs will render
            </span>
          </div>

          <div className="flex items-center justify-center p-2 rounded-xl bg-slate-100/70 dark:bg-[#070b13] border border-slate-200/60 dark:border-white/5 overflow-x-auto">
            <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1 dark:border-white/10 dark:bg-[#0b1220]/95 shadow-sm">
              {currentVisibleTabs.map((tabId, idx) => {
                const tabDef = TOURNAMENT_AVAILABLE_TABS.find((t) => t.id === tabId);
                const Icon = TAB_ICONS[tabId];
                const isFirst = idx === 0;

                return (
                  <div
                    key={tabId}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
                      isFirst
                        ? 'bg-[#0A5FC4] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5'
                    }`}
                  >
                    <Icon className={`h-3 w-3 ${isFirst ? 'text-white' : 'text-slate-400'}`} />
                    <span>{tabDef?.label || tabId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Global Standings Controls ── */}
      {/* The logo/flag choice is per surface and lives on the Basics tab. */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showOverall}
              onChange={(e) => patch({ showOverall: e.target.checked })}
            />
            Show Global Overall Standings Tab
          </label>
        </div>
      </div>

      <div>
        <label className={labelCls}>Standings Filters (enabled for visitors)</label>
        <div className="flex flex-wrap gap-3">
          {STANDINGS_FILTER_DEFS.map((f) => (
            <label key={f.key} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
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

      {/* ── Full Visible Columns Manager with Presets & Categories ── */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block">
              Visible Leaderboard Columns ({config.columns.length} of {STANDINGS_COLUMN_DEFS.length} Selected)
            </label>
            <p className="text-[11px] text-slate-500">
              Select which metrics appear on the public standings tables.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => patch({ columns: STANDINGS_COLUMN_DEFS.map((c) => c.key) })}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              ✓ Select All ({STANDINGS_COLUMN_DEFS.length})
            </button>
            <button
              type="button"
              onClick={() => patch({ columns: ['mp', 'wwcd', 'place', 'elims', 'total', 'form'] })}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Standard Preset
            </button>
            <button
              type="button"
              onClick={() =>
                patch({
                  columns: ['mp', 'wwcd', 'place', 'elims', 'total', 'damage', 'headshots', 'knockouts', 'form'],
                })
              }
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Combat Stats Preset
            </button>
            <button
              type="button"
              onClick={() => patch({ columns: ['total'] })}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Categorized Column Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['Scoring', 'Combat', 'Utility', 'Movement'] as const).map((cat) => {
            const catCols = STANDINGS_COLUMN_DEFS.filter((c) => c.category === cat);
            return (
              <div key={cat} className="space-y-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-(--ed-blue) block pb-1 border-b border-slate-100 dark:border-slate-800">
                  {cat === 'Scoring' ? '🏆 Scoring & Core' : cat === 'Combat' ? '⚔️ Combat & Damage' : cat === 'Utility' ? '💣 Utilities & Support' : '🏃 Distance & Movement'}
                </span>
                <div className="space-y-1.5 pt-1">
                  {catCols.map((c) => {
                    const isChecked = config.columns.includes(c.key);
                    return (
                      <label
                        key={c.key}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-blue-600"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => patch({ columns: toggleIn<StandingsColumnKey>(config.columns, c.key) })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>{c.label}</span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono ml-auto">
                          ({c.short})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Visible Match Scorecard Columns (Admin Configurable) ── */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white block">
              Visible Match Scorecard Columns ({(config.matchColumns || DEFAULT_MATCH_COLUMNS).length} of {MATCH_COLUMN_DEFS.length} Selected)
            </label>
            <p className="text-[11px] text-slate-500">
              Select which metric columns appear inside individual match scorecards and match tables.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => patch({ matchColumns: MATCH_COLUMN_DEFS.map((c) => c.key) })}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              ✓ Select All ({MATCH_COLUMN_DEFS.length})
            </button>
            <button
              type="button"
              onClick={() => patch({ matchColumns: ['place', 'elims', 'damage', 'total'] })}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Standard Preset
            </button>
            <button
              type="button"
              onClick={() =>
                patch({
                  matchColumns: ['place', 'elims', 'damage', 'headshots', 'knockouts', 'total'],
                })
              }
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Combat Preset
            </button>
            <button
              type="button"
              onClick={() => patch({ matchColumns: ['total'] })}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Categorized Match Column Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['Scoring', 'Combat', 'Utility'] as const).map((cat) => {
            const catCols = MATCH_COLUMN_DEFS.filter((c) => c.category === cat);
            const curCols = config.matchColumns || DEFAULT_MATCH_COLUMNS;
            return (
              <div key={cat} className="space-y-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-(--ed-blue) block pb-1 border-b border-slate-100 dark:border-slate-800">
                  {cat === 'Scoring' ? '🏆 Scoring' : cat === 'Combat' ? '⚔️ Combat Stats' : '💣 Utilities & Support'}
                </span>
                <div className="space-y-1.5 pt-1">
                  {catCols.map((c) => {
                    const isChecked = curCols.includes(c.key);
                    return (
                      <label
                        key={c.key}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-blue-600"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => patch({ matchColumns: toggleIn<MatchColumnKey>(curCols, c.key) })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>{c.label}</span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono ml-auto">
                          ({c.short})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Global Default Qualification Zones ── */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-3">
        <div>
          <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
            Default Tournament Advancement Zones
          </h4>
          <p className="text-[11px] text-slate-500">
            Applied to the Overall Standings tab and stages that do not have custom overrides.
          </p>
        </div>
        <ZonesEditor zones={config.zones} stageNames={stageNames} onChange={(zones) => patch({ zones })} />
      </div>

      <TabPasteBox
        label="Advancement zones — paste from a sheet"
        hint="One row per zone. The range is either From and To columns, or a single Rank cell like 1-4. Leave Stage blank to carry the row above down, and Group blank for that stage's own zones — so each stage and its groups read as a block instead of repeating the stage on every row."
        sampleHeader={'Stage\tGroup\tFrom\tTo\tLabel\tColour\tTarget Stage'}
        parse={previewZonePaste}
        onApply={applyZonePaste}
      />

      {/* ── Hierarchical Standings Sub-Divisions (e.g. League Weeks, Weekends, Playoffs, Finals) ── */}
      <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-(--ed-blue)" />
            <div>
              <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                Standings Sub-Divisions &amp; Tab Groups
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize tabs into sub-divisions (e.g. <strong>League Weeks</strong>, <strong>Weekends</strong>, <strong>Playoffs</strong>, <strong>Finals</strong>). Reorder them and nest stages and combined standings within each.
              </p>
            </div>
          </div>
        </div>

        <TabGroupsEditor
          tabGroups={config.tabGroups || []}
          stagesInfo={resolvedStagesInfo}
          stageNames={stageNames}
          onChange={(tabGroups) => patch({ tabGroups })}
        />
      </div>

      {/* ── Statistics Display Settings (Player Performance & Team Performance) ── */}
      <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div>
              <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                Statistics Tab Display Configuration
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure which player performance columns appear on the public statistics page and default landing card.
              </p>
            </div>
          </div>
        </div>

        {/* Default View Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Default Public Landing View</label>
            <select
              className={inputCls}
              value={config.statisticsConfig?.defaultView || 'players'}
              onChange={(e) => {
                const val = e.target.value as 'players' | 'teams';
                patch({
                  statisticsConfig: {
                    ...config.statisticsConfig,
                    defaultView: val,
                  },
                });
                setStatsConfigTab(val);
              }}
            >
              <option value="players">👥 Player Performance (Fraggers Table)</option>
              <option value="teams">🛡️ Team Performance (Map Breakdown &amp; Metrics)</option>
            </select>
          </div>

          <div className="flex items-center">
            <div className="text-xs p-3 rounded-xl border border-purple-300/40 dark:border-purple-800/40 bg-white/80 dark:bg-slate-900/80 w-full flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Active Public Landing Tab: </span>
                <span className="text-purple-600 dark:text-purple-400 font-extrabold">
                  {config.statisticsConfig?.defaultView === 'teams'
                    ? '🛡️ Team Performance (Map Breakdown & Standings)'
                    : '👥 Player Performance (Kill Leaders & Fraggers)'}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {config.statisticsConfig?.defaultView === 'teams'
                    ? 'Visitors clicking "Statistics" will immediately see the Team Leaders Podium, map-by-map table & WWCD records.'
                    : 'Visitors clicking "Statistics" will immediately see the Top Fraggers Podium & individual player metrics.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Configuration Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-purple-200/40 dark:border-purple-900/40 flex-wrap">
          <button
            type="button"
            onClick={() => setStatsConfigTab('players')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statsConfigTab === 'players'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>👥 Configure Player Performance</span>
            {config.statisticsConfig?.defaultView !== 'teams' && (
              <span className="text-[10px] bg-purple-400/30 text-white px-1.5 py-0.5 rounded-full font-black uppercase">
                Landing Default
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setStatsConfigTab('teams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statsConfigTab === 'teams'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>🛡️ Configure Team Performance</span>
            {config.statisticsConfig?.defaultView === 'teams' && (
              <span className="text-[10px] bg-purple-400/30 text-white px-1.5 py-0.5 rounded-full font-black uppercase">
                Landing Default
              </span>
            )}
          </button>
        </div>

        {/* ── PLAYER CONFIGURATION TAB ── */}
        {statsConfigTab === 'players' && (
          <div className="space-y-4 pt-1">
            {/* Player Columns to Showcase */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={labelCls}>
                  Showcase Player Columns (Fraggers Table)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        statisticsConfig: {
                          ...config.statisticsConfig,
                          playerColumns: ['elims', 'powerplay', 'avgElims'],
                        },
                      })
                    }
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Reset to Essential (Elims &amp; Powerplay)
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        statisticsConfig: {
                          ...config.statisticsConfig,
                          playerColumns: PLAYER_STAT_COLUMN_DEFS.map((c) => c.key),
                        },
                      })
                    }
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Select All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {PLAYER_STAT_COLUMN_DEFS.map((col) => {
                  const currentCols = config.statisticsConfig?.playerColumns || ['elims', 'powerplay', 'avgElims'];
                  const isChecked = currentCols.includes(col.key);
                  return (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const updated = isChecked
                            ? currentCols.filter((k) => k !== col.key)
                            : [...currentCols, col.key];
                          patch({
                            statisticsConfig: {
                              ...config.statisticsConfig,
                              playerColumns: updated,
                            },
                          });
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Custom Calculated Metric Columns */}
            <div className="space-y-3 pt-3 border-t border-purple-200/40 dark:border-purple-900/40">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className={labelCls}>
                    Admin Custom Calculated Metric Columns
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Create custom aggregated metrics (e.g. Max Damage in a Match, Sum of Damage, Avg Damage/Match, 0-Value Matches, Thresholds).
                  </p>
                </div>
                {!showAddCustomCol && (
                  <button
                    type="button"
                    onClick={() => setShowAddCustomCol(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Custom Column</span>
                  </button>
                )}
              </div>

              {/* Add Custom Column Drawer/Inline Form */}
              {showAddCustomCol && (
                <div className="p-4 rounded-xl border border-purple-500/40 bg-white dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-purple-700 dark:text-purple-300">
                      Define New Aggregated Metric Column
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomCol(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Base Metric</label>
                      <select
                        className={inputCls}
                        value={newMetric}
                        onChange={(e) => {
                          const m = e.target.value as PlayerMetricField;
                          setNewMetric(m);
                          const generated = generateCustomColumnLabel(m, newAggregator, newThreshold);
                          setNewCustomLabel(generated.label);
                          setNewCustomShort(generated.short);
                        }}
                      >
                        {PLAYER_METRIC_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Aggregation Operation</label>
                      <select
                        className={inputCls}
                        value={newAggregator}
                        onChange={(e) => {
                          const a = e.target.value as PlayerMetricAggregator;
                          setNewAggregator(a);
                          const generated = generateCustomColumnLabel(newMetric, a, newThreshold);
                          setNewCustomLabel(generated.label);
                          setNewCustomShort(generated.short);
                        }}
                      >
                        {PLAYER_METRIC_AGGREGATORS.map((a) => (
                          <option key={a.key} value={a.key}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {newAggregator === 'count_gte' && (
                      <div>
                        <label className={labelCls}>Threshold Value (≥)</label>
                        <input
                          type="number"
                          className={inputCls}
                          value={newThreshold}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setNewThreshold(val);
                            const generated = generateCustomColumnLabel(newMetric, newAggregator, val);
                            setNewCustomLabel(generated.label);
                            setNewCustomShort(generated.short);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Full Column Header Label</label>
                      <input
                        className={inputCls}
                        value={newCustomLabel}
                        onChange={(e) => setNewCustomLabel(e.target.value)}
                        placeholder="e.g. Max Damage in Match"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Short Header (Abbreviation)</label>
                      <input
                        className={inputCls}
                        value={newCustomShort}
                        onChange={(e) => setNewCustomShort(e.target.value)}
                        placeholder="e.g. Max Dmg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCustomCol(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newCol: CustomPlayerColumn = {
                          id: `custom_${Date.now()}`,
                          label: newCustomLabel.trim() || 'Custom Metric',
                          short: newCustomShort.trim() || 'Custom',
                          metric: newMetric,
                          aggregator: newAggregator,
                          threshold: newAggregator === 'count_gte' ? newThreshold : undefined,
                        };
                        const existing = config.statisticsConfig?.customPlayerColumns || [];
                        patch({
                          statisticsConfig: {
                            ...config.statisticsConfig,
                            customPlayerColumns: [...existing, newCol],
                          },
                        });
                        setShowAddCustomCol(false);
                      }}
                      className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                    >
                      Save Column
                    </button>
                  </div>
                </div>
              )}

              {/* Configured Custom Columns List */}
              {config.statisticsConfig?.customPlayerColumns && config.statisticsConfig.customPlayerColumns.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {config.statisticsConfig.customPlayerColumns.map((col) => (
                    <div
                      key={col.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-xs"
                    >
                      <div>
                        <p className="font-bold text-purple-900 dark:text-purple-200">{col.label}</p>
                        <p className="text-[10px] text-purple-600 dark:text-purple-400">
                          {col.metric} · {col.aggregator === 'count_gte' ? `≥ ${col.threshold ?? 5}` : col.aggregator}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (config.statisticsConfig?.customPlayerColumns || []).filter(
                            (c) => c.id !== col.id
                          );
                          patch({
                            statisticsConfig: {
                              ...config.statisticsConfig,
                              customPlayerColumns: updated,
                            },
                          });
                        }}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Delete custom column"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No custom calculated columns added yet. Click &quot;+ Create Custom Column&quot; to define custom metric aggregations (e.g. Max Damage in a match, Sum of Damage, Avg Knocks).
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── TEAM CONFIGURATION TAB ── */}
        {statsConfigTab === 'teams' && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm">Team Performance Configuration Active</span>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  When visitors navigate to the public tournament statistics page, they will land directly on the <strong>Team Performance Podium and Map Breakdown</strong> view.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Default Points Aggregation Mode</label>
                <select
                  className={inputCls}
                  value={config.statisticsConfig?.defaultTeamPointsMode || 'sum'}
                  onChange={(e) =>
                    patch({
                      statisticsConfig: {
                        ...config.statisticsConfig,
                        defaultTeamPointsMode: e.target.value as 'sum' | 'avg' | 'max',
                      },
                    })
                  }
                >
                  <option value="sum">📊 Cumulative Total Points (Sum)</option>
                  <option value="avg">📈 Average Points / Match (Avg)</option>
                  <option value="max">🔥 Peak Match Total Points (Max)</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Determines whether the public team table ranks and displays cumulative points, average points per game, or peak match score.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-4 space-y-2">
              <h5 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                Team Performance Features Included On Public Page
              </h5>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                <li><strong>Team Leaders Podium:</strong> Top 3 teams spotlight by total points, win rate %, and eliminations.</li>
                <li><strong>Map-by-Map Breakdown:</strong> Detailed team performance across Erangel, Miramar, Sanhok, etc.</li>
                <li><strong>Win Rate &amp; WWCD Ratio:</strong> Percentage of matches won and chicken dinner count.</li>
                <li><strong>Placement vs Elims Ratio:</strong> Combat aggression vs survival score distribution.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
