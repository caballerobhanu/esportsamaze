'use client';

import React from 'react';
import { Trophy, ChevronUp, ChevronDown, Award, X, Users } from 'lucide-react';
import { calculateTournamentStandings, type AggregatedTeamStanding } from '@/lib/tournament-math';
import {
  getStageConfig,
  zoneForRank,
  STANDINGS_COLUMN_DEFS,
  STANDINGS_FILTER_DEFS,
  type StandingsConfig,
  type StandingsFilterKey,
  type StandingsColumnKey,
  type StandingsMatchLite,
  type StandingsTeamMeta,
  type StandingsStageSummary,
  type ZoneRule,
} from '@/lib/standings-config';

type SortKey = 'rank' | 'matchesPlayed' | 'wwcd' | 'placementPoints' | 'eliminationPoints' | 'totalPoints';

const SORT_FOR_COLUMN: Record<Exclude<StandingsColumnKey, 'form'>, SortKey> = {
  mp: 'matchesPlayed',
  wwcd: 'wwcd',
  place: 'placementPoints',
  elims: 'eliminationPoints',
  total: 'totalPoints',
};

const COLUMN_WIDTH: Record<StandingsColumnKey, number> = {
  mp: 3.5,
  wwcd: 4,
  place: 4,
  elims: 4,
  total: 5,
  form: 12,
};

const ZONE_ACCENTS = [
  'border-(--ed-blue)',
  'border-emerald-500',
  'border-amber-500',
  'border-(--ed-magenta)',
];

const ZONE_DOTS = [
  'bg-(--ed-blue)',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-(--ed-magenta)',
];

interface FormEntry {
  rank: number;
  wwcd: boolean;
  mapName: string | null;
  totalPoints: number;
}

interface Rows {
  sorted: AggregatedTeamStanding[];
  formByTeam: Map<string, FormEntry[]>;
}

export function TournamentStandingsPanel({
  stages,
  matches,
  teams,
  config,
  overallTopFragger,
}: {
  stages: StandingsStageSummary[];
  matches: StandingsMatchLite[];
  teams: Record<string, StandingsTeamMeta>;
  config: StandingsConfig;
  overallTopFragger?: { ign: string; teamName: string; kills: number } | null;
}) {
  const [active, setActive] = React.useState(stages[stages.length - 1]?.stageName ?? 'OVERALL');
  const [day, setDay] = React.useState('');
  const [map, setMap] = React.useState('');
  const [group, setGroup] = React.useState('');
  const [sortKey, setSortKey] = React.useState<SortKey>('rank');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  const stageCfg = React.useMemo(
    () =>
      active === 'OVERALL'
        ? { mode: 'STAGE' as const, groupMode: 'CUMULATIVE' as const, filters: config.filters, zones: config.zones }
        : getStageConfig(config, active),
    [active, config]
  );

  const scopeMatches = React.useMemo(() => {
    if (active === 'OVERALL') return matches;
    if (stageCfg.mode === 'CUMULATIVE') {
      const order = stages.map((s) => s.stageName);
      const idx = order.indexOf(active);
      const through = new Set(order.slice(0, idx === -1 ? order.length : idx + 1));
      return matches.filter((m) => through.has(m.stageName));
    }
    return matches.filter((m) => m.stageName === active);
  }, [active, matches, stages, stageCfg.mode]);

  const options = React.useMemo(() => {
    const days = [...new Set(scopeMatches.map((m) => m.day))].sort((a, b) => Number(a) - Number(b));
    const maps = [...new Set(scopeMatches.map((m) => m.mapName).filter((v): v is string => !!v))].sort();
    const groups = [...new Set(scopeMatches.map((m) => m.groupName).filter((v): v is string => !!v))].sort();
    return { days, maps, groups };
  }, [scopeMatches]);

  const perGroup = active !== 'OVERALL' && stageCfg.groupMode === 'PER_GROUP' && options.groups.length > 0;

  const filtered = React.useMemo(
    () =>
      scopeMatches.filter(
        (m) =>
          (!day || m.day === day) &&
          (!map || m.mapName === map) &&
          (!group || (perGroup ? true : m.groupName === group))
      ),
    [scopeMatches, day, map, group, perGroup]
  );

  const buildRows = React.useCallback(
    (subset: StandingsMatchLite[]): Rows => {
      const standings = calculateTournamentStandings(subset.flatMap((m) => m.results));
      const sorted = [...standings].sort((a, b) =>
        sortDir === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]
      );
      const formByTeam = new Map<string, FormEntry[]>();
      const completed = subset
        .filter((m) => m.status === 'COMPLETED')
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      for (const m of completed) {
        for (const r of m.results) {
          const list = formByTeam.get(r.teamId) ?? [];
          list.push({
            rank: r.rank,
            wwcd: !!r.wwcd || r.rank === 1,
            mapName: m.mapName,
            totalPoints: r.totalPoints ?? 0,
          });
          formByTeam.set(r.teamId, list);
        }
      }
      return { sorted, formByTeam };
    },
    [sortKey, sortDir]
  );

  const singleRows = React.useMemo(() => buildRows(filtered), [buildRows, filtered]);

  const groupRows = React.useMemo(() => {
    if (!perGroup) return new Map<string, Rows>();
    const mapByGroup = new Map<string, Rows>();
    for (const g of options.groups) {
      mapByGroup.set(g, buildRows(filtered.filter((m) => m.groupName === g)));
    }
    return mapByGroup;
  }, [perGroup, options.groups, filtered, buildRows]);

  const toggle = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' || key === 'matchesPlayed' ? 'asc' : 'desc');
    }
  };

  const columns = STANDINGS_COLUMN_DEFS.filter((c) => config.columns.includes(c.key));
  const gridTemplate = `minmax(11rem,1fr) ${columns.map((c) => `${COLUMN_WIDTH[c.key]}rem`).join(' ')}`;
  const minWidth = 176 + columns.reduce((sum, c) => sum + COLUMN_WIDTH[c.key] * 16, 0);

  const hasFilters = !!day || !!map || (!!group && !perGroup);
  const clearFilters = () => {
    setDay('');
    setMap('');
    setGroup('');
  };

  const switchStage = (name: string) => {
    setActive(name);
    clearFilters();
  };

  const zoneIndex = (zones: ZoneRule[], zone: ZoneRule | null) =>
    zone ? zones.indexOf(zone) % ZONE_ACCENTS.length : -1;

  const renderFilterRow = (key: StandingsFilterKey, label: string, opts: string[], value: string, set: (v: string) => void, labelFn: (o: string) => string) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="ed-label mr-1">{label}</span>
      <button
        onClick={() => set('')}
        className={`ed-chip transition-colors ${value === '' ? 'border-(--ed-blue) bg-(--ed-blue) text-white' : 'text-(--ed-stone) hover:border-(--ed-stone)/50'}`}
      >
        All
      </button>
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => set(value === o ? '' : o)}
          className={`ed-chip transition-colors ${value === o ? 'border-(--ed-blue) bg-(--ed-blue) text-white' : 'text-(--ed-stone) hover:border-(--ed-stone)/50'}`}
        >
          {labelFn(o)}
        </button>
      ))}
    </div>
  );

  const renderTable = (rows: Rows, zones: ZoneRule[]) => (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        {/* Header row */}
        <div
          className="grid border-b border-(--ed-hair) bg-(--ed-canvas)"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <button
            onClick={() => toggle('rank')}
            className="ed-th sticky left-0 z-10 bg-(--ed-canvas) px-3 text-left transition-colors hover:text-(--ed-ink)"
          >
            <span className="inline-flex items-center gap-1">
              #
              {sortKey === 'rank' &&
                (sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-(--ed-blue)" /> : <ChevronDown className="h-3 w-3 text-(--ed-blue)" />)}
            </span>
          </button>
          {columns.map((c) => {
            const key = c.key === 'form' ? null : SORT_FOR_COLUMN[c.key];
            return (
              <button
                key={c.key}
                onClick={key ? () => toggle(key) : undefined}
                className={`ed-th px-2 text-center ${key ? 'cursor-pointer transition-colors hover:text-(--ed-ink)' : 'cursor-default'}`}
              >
                <span className="inline-flex items-center gap-1">
                  {c.short}
                  {key && sortKey === key &&
                    (sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-(--ed-blue)" /> : <ChevronDown className="h-3 w-3 text-(--ed-blue)" />)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Team rows */}
        <div className="divide-y divide-(--ed-hair)">
          {rows.sorted.map((team: AggregatedTeamStanding) => {
            const meta = teams[team.teamId];
            const zone = zoneForRank(zones, team.rank);
            const zi = zoneIndex(zones, zone);
            const form = (rows.formByTeam.get(team.teamId) ?? []).slice(-5);
            return (
              <div
                key={team.teamId}
                className="group grid transition-colors hover:bg-(--ed-canvas)"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {/* Sticky team cell */}
                <div
                  className={`sticky left-0 z-10 flex items-center gap-2 border-l-2 bg-(--ed-surface) px-3 py-3 group-hover:bg-(--ed-canvas) ${
                    zi >= 0 ? ZONE_ACCENTS[zi] : 'border-transparent'
                  }`}
                >
                  <span className={`num w-6 shrink-0 text-sm ${team.rank <= 3 ? 'font-medium text-(--ed-ink)' : 'text-(--ed-stone)'}`}>
                    {String(team.rank).padStart(2, '0')}
                  </span>
                  {(config.logoMode === 'BOTH' || config.logoMode === 'COUNTRY') && meta?.countryCode && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://flagcdn.com/20x15/${meta.countryCode.toLowerCase()}.png`}
                      alt={meta.countryCode}
                      loading="lazy"
                      className="h-[15px] w-5 shrink-0 rounded-[2px] object-cover"
                    />
                  )}
                  {(config.logoMode === 'BOTH' || config.logoMode === 'TEAM') &&
                    (meta?.logoUrl || meta?.logoDarkUrl) && (
                      <>
                        {meta?.logoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={meta.logoUrl} alt="" className="h-6 w-6 shrink-0 object-contain dark:hidden" />
                        )}
                        {meta?.logoDarkUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={meta.logoDarkUrl}
                            alt=""
                            className={`h-6 w-6 shrink-0 object-contain ${meta.logoUrl ? 'hidden dark:block' : 'dark:block'}`}
                          />
                        )}
                      </>
                    )}
                  <span className="hidden truncate text-sm font-medium sm:inline">
                    {meta?.displayName || meta?.name || team.teamName}
                  </span>
                  <span className="truncate text-sm font-medium sm:hidden">
                    {meta?.tag || meta?.name || team.teamName}
                  </span>
                  {team.rank === 1 && (
                    <span className="hidden shrink-0 rounded-lg border border-amber-600/25 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-700 md:inline dark:border-amber-400/25 dark:text-amber-400">
                      Leader
                    </span>
                  )}
                </div>

                {columns.map((c) => (
                  <React.Fragment key={c.key}>
                    {c.key === 'mp' && (
                      <span className="num self-center px-2 text-center text-sm text-(--ed-stone)">{team.matchesPlayed}</span>
                    )}
                    {c.key === 'wwcd' && (
                      <span className="self-center px-2 text-center">
                        {team.wwcd > 0 ? (
                          <span className="num text-sm text-amber-700 dark:text-amber-400">{team.wwcd}</span>
                        ) : (
                          <span className="text-(--ed-stone) opacity-40">—</span>
                        )}
                      </span>
                    )}
                    {c.key === 'place' && (
                      <span className="num self-center px-2 text-center text-sm text-(--ed-stone)">{team.placementPoints}</span>
                    )}
                    {c.key === 'elims' && (
                      <span className="num self-center px-2 text-center text-sm text-(--ed-stone)">{team.eliminationPoints}</span>
                    )}
                    {c.key === 'total' && (
                      <span className="self-center px-2 text-center">
                        <span className="num text-[15px] font-medium text-(--ed-blue)">{team.totalPoints}</span>
                      </span>
                    )}
                    {c.key === 'form' && (
                      <span className="flex items-center justify-center gap-1 self-center px-2">
                        {Array.from({ length: 5 }).map((_, i) => {
                          const entry = form[i];
                          if (!entry)
                            return (
                              <span key={i} className="h-6 w-6 text-center text-xs leading-6 text-(--ed-stone) opacity-40">
                                —
                              </span>
                            );
                          return (
                            <span
                              key={i}
                              title={`${entry.mapName ?? 'Match'} · ${entry.totalPoints} pts`}
                              className={`num flex h-6 min-w-7 items-center justify-center rounded-md border px-1 text-[10px] ${
                                entry.wwcd
                                  ? 'border-amber-600/30 bg-amber-600/10 text-amber-700 dark:border-amber-400/30 dark:text-amber-400'
                                  : 'border-(--ed-hair) bg-(--ed-surface) text-(--ed-stone)'
                              }`}
                            >
                              {entry.totalPoints}
                            </span>
                          );
                        })}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderZoneLegend = (zones: ZoneRule[]) =>
    zones.length > 0 && (
      <div className="flex flex-wrap items-center gap-3">
        {zones.map((z, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs text-(--ed-stone)">
            <span className={`h-2 w-2 rounded-full ${ZONE_DOTS[i % ZONE_DOTS.length]}`} />
            <span className="num">#{z.from}–#{z.to}</span> {z.label}
          </span>
        ))}
      </div>
    );

  const emptyCard = (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <Trophy className="h-8 w-8 text-(--ed-stone) opacity-40" />
      <p className="font-display text-lg font-medium">No standings data recorded yet</p>
      <p className="max-w-sm text-sm text-(--ed-stone)">
        Standings calculate automatically once match scorecards are submitted.
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stage selector — underline tabs, default = latest stage */}
      <div className="flex items-end gap-6 overflow-x-auto border-b border-(--ed-hair)">
        {stages.map((s) => {
          const isActive = active === s.stageName;
          return (
            <button
              key={s.stageName}
              onClick={() => switchStage(s.stageName)}
              className={`ed-tab ${isActive ? 'ed-tab-active' : ''}`}
            >
              {s.stageName}
              <span className={`num text-xs ${isActive ? 'opacity-80' : 'text-(--ed-stone)'}`}>
                {s.matchesCount}m
              </span>
            </button>
          );
        })}
        {config.showOverall && (
          <button
            onClick={() => switchStage('OVERALL')}
            className={`ed-tab ${active === 'OVERALL' ? 'ed-tab-active' : ''}`}
          >
            <Trophy className="h-4 w-4" />
            Overall
          </button>
        )}
      </div>

      {/* Filter bar — button chips */}
      <div className="space-y-2.5">
        {STANDINGS_FILTER_DEFS.filter((f) => stageCfg.filters.includes(f.key)).map((f) => {
          const opts = f.key === 'day' ? options.days : f.key === 'map' ? options.maps : options.groups;
          if (opts.length < 2) return null;
          if (f.key === 'group' && perGroup) return null;
          const value = f.key === 'day' ? day : f.key === 'map' ? map : group;
          const set = f.key === 'day' ? setDay : f.key === 'map' ? setMap : setGroup;
          return renderFilterRow(
            f.key,
            f.label,
            opts,
            value,
            set,
            f.key === 'day' ? (o) => `Day ${o}` : (o) => o
          );
        })}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-medium text-(--ed-blue) hover:underline"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
        {active !== 'OVERALL' && stageCfg.mode === 'CUMULATIVE' && (
          <span className="ed-label">Cumulative through this stage</span>
        )}
        {perGroup && (
          <span className="ed-label flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Qualification decided per group
          </span>
        )}
      </div>

      {perGroup ? (
        /* One section per group, zones applied within each group */
        <div className="space-y-8">
          {options.groups.map((g) => {
            const rows = groupRows.get(g)!;
            return (
              <section key={g}>
                <div className="mb-3 space-y-2.5">
                  <h3 className="font-display flex items-center gap-2 text-lg font-medium tracking-tight">
                    {g}
                    <span className="num text-xs text-(--ed-stone)">{rows.sorted.length} teams</span>
                  </h3>
                  {renderZoneLegend(stageCfg.zones)}
                </div>
                <div className="ed-card">
                  {rows.sorted.length === 0 ? emptyCard : renderTable(rows, stageCfg.zones)}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {renderZoneLegend(stageCfg.zones)}
          <div className="ed-card">
            {singleRows.sorted.length === 0 ? emptyCard : renderTable(singleRows, stageCfg.zones)}
          </div>
        </div>
      )}

      {/* Footer notes */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--ed-hair) bg-(--ed-canvas) px-6 py-3">
        <p className="text-xs text-(--ed-stone)">Tie-breaker: Total Points → WWCDs → Placement Pts → Elimination Pts</p>
        {overallTopFragger && (
          <p className="flex items-center gap-1.5 text-xs text-(--ed-stone)">
            <Award className="h-3.5 w-3.5 text-(--ed-blue)" />
            Top fragger: <span className="font-medium text-(--ed-ink)">{overallTopFragger.ign}</span>
            <span className="num">({overallTopFragger.kills} elims)</span>
          </p>
        )}
      </div>
    </div>
  );
}
