'use client';

import * as React from 'react';
import { COUNTRIES, POPULAR_REGIONS } from '@/lib/countries';
import {
  Link2,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  UserPlus,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  UploadCloud,
  Shield,
  Users,
  ArrowUp,
  ArrowDown,
  Download,
} from 'lucide-react';
import { SearchableSelect, SearchableSelectOption } from '../ui/searchable-select';
import { TournamentSquadBulkImporter } from './tournament-squad-bulk-importer';
import { MediaPickButton } from './media-field';

export interface SquadRosterEntry {
  playerId?: string | null;
  ign: string;
  role?: string | null;
  captain?: boolean;
  isStaff?: boolean; // true = coaching / support staff member, not a competing player
  staffRole?: string | null;
  statusTag?: 'MAIN' | 'SUB' | 'LOANED' | 'BENCHED' | 'STANDIN' | null;
}

export interface SquadRow {
  /** Null for an unfilled seat: a place in the field with no team yet. */
  teamId: string | null;
  teamName: string;
  tag?: string | null;
  seed?: number | null;
  /** For an unfilled seat this is the row's name — "Korean League". */
  seedLabel?: string | null;
  seedTournamentId?: string | null;
  roster: SquadRosterEntry[];
  eventLogoUrl?: string | null;
  eventLogoDarkUrl?: string | null;
  shortName?: string | null;
  displayName?: string | null;
  /** Doubles as the region the teams tab groups by; `region` groups countries. */
  country?: string | null;
  region?: string | null;
}

const ROLES = ['Assaulter', 'IGL', 'Support', 'Sniper', 'Flex'];
const STAFF_ROLES = [
  'Head Coach',
  'Coach',
  'Assistant Coach',
  'Analyst',
  'Performance Coach',
  'Manager',
  'Content Creator',
];
const STATUS_TAGS: Array<'MAIN' | 'SUB' | 'LOANED' | 'BENCHED' | 'STANDIN'> = [
  'MAIN',
  'SUB',
  'LOANED',
  'BENCHED',
  'STANDIN',
];

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

export function TournamentSquadsInput({
  initialSquads,
  allTeams,
  allPlayers,
  allTournaments = [],
  allRegions = [],
}: {
  initialSquads: SquadRow[];
  allTeams: { id: string; name: string; tag?: string | null }[];
  allPlayers: {
    id: string;
    ign: string;
    name?: string | null;
    currentTeam?: { id: string; name: string } | null;
    isPlayer?: boolean;
    role?: string | null;
    staffRole?: string | null;
    status?: string | null;
  }[];
  allTournaments?: { id: string; name: string; slug: string }[];
  /** Regions already in use, offered as suggestions in the per-row Region box. */
  allRegions?: { name: string }[];
}) {
  const [squads, setSquads] = React.useState<SquadRow[]>(initialSquads);

  /** Region names to suggest: what the admin has already used, plus the usual ones. */
  const regionNames = React.useMemo(() => {
    const names = new Set<string>(POPULAR_REGIONS);
    for (const region of allRegions) if (region.name.trim()) names.add(region.name.trim());
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allRegions]);
  const regionListId = React.useId();

  const [bulkPasteOpen, setBulkPasteOpen] = React.useState<number | null>(null);
  const [bulkPasteText, setBulkPasteText] = React.useState<string>('');
  /** What the last roster import did, per squad row — a button that silently no-ops is worse than none. */
  const [rosterImportNote, setRosterImportNote] = React.useState<Record<number, string>>({});
  const [bulkImporterOpen, setBulkImporterOpen] = React.useState(false);
  const [squadSearch, setSquadSearch] = React.useState('');

  // Manage collapsed/expanded squads (default: first 3 expanded, or all collapsed if >10 squads)
  const [expandedIndices, setExpandedIndices] = React.useState<Set<number>>(() => {
    if (initialSquads.length > 8) return new Set();
    return new Set(initialSquads.map((_, i) => i));
  });

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedIndices(new Set(squads.map((_, i) => i)));
  };

  const handleCollapseAll = () => {
    setExpandedIndices(new Set());
  };

  const teamOptions: SearchableSelectOption[] = React.useMemo(
    () => [
      { value: '', label: '— select team —' },
      ...allTeams.map((t) => ({
        value: t.id,
        label: t.name,
        subtitle: t.tag || undefined,
      })),
    ],
    [allTeams]
  );

  const playerOptions: SearchableSelectOption[] = React.useMemo(
    () => [
      { value: '', label: '— Unlinked IGN —' },
      ...allPlayers.map((pl) => ({
        value: pl.id,
        label: pl.ign,
        subtitle: [
          pl.name && pl.name !== pl.ign ? pl.name : null,
          pl.currentTeam?.name ? pl.currentTeam.name : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
      })),
    ],
    [allPlayers]
  );

  const tournamentOptions: SearchableSelectOption[] = React.useMemo(
    () => [
      { value: '', label: '— none (standalone label) —' },
      ...allTournaments.map((t) => ({
        value: t.id,
        label: t.name,
      })),
    ],
    [allTournaments]
  );

  const update = (index: number, patch: Partial<SquadRow>) => {
    setSquads((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const updateRoster = (index: number, roster: SquadRosterEntry[]) => {
    update(index, { roster });
  };

  /**
   * Moves a row. Seeds are deliberately *not* rewritten — a move is an edit to
   * the list, not a claim about the seeding — so an event whose seeding was
   * never published keeps its blanks.
   */
  const moveSquad = (index: number, direction: -1 | 1) => {
    setSquads((prev) => {
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  /** The explicit act of numbering the field 1..N in the order shown. */
  const renumberSeeds = () => {
    setSquads((prev) => prev.map((squad, idx) => ({ ...squad, seed: idx + 1 })));
  };

  /** True once the seeds, in list order, are already 1..N. */
  const seedsAreSequential = squads.every((squad, idx) => squad.seed === idx + 1);

  const addSquad = () => {
    const newIdx = squads.length;
    setSquads((prev) => [
      ...prev,
      {
        // A place starts open: fill it with a team, or leave it as a seat with an
        // entry label and a region.
        teamId: null,
        teamName: '',
        seed: prev.length + 1,
        seedLabel: null,
        seedTournamentId: null,
        roster: [],
        eventLogoUrl: null,
        eventLogoDarkUrl: null,
      },
    ]);
    setExpandedIndices((prev) => new Set(prev).add(newIdx));
  };

  // One-click Auto-Link unlinked players across all squads
  const handleAutoLinkAll = () => {
    setSquads((prev) =>
      prev.map((squad) => ({
        ...squad,
        roster: squad.roster.map((p) => {
          if (p.playerId) return p;
          const cleanIgn = p.ign.trim().toLowerCase();
          const match = allPlayers.find(
            (pl) => pl.ign.trim().toLowerCase() === cleanIgn || (pl.name && pl.name.trim().toLowerCase() === cleanIgn)
          );
          if (match) {
            return { ...p, playerId: match.id };
          }
          return p;
        }),
      }))
    );
  };

  // Handle Quick Paste Roster for a single squad (e.g. "Manya, Nakul, Rony, Joker")
  const handleApplyBulkPaste = (squadIdx: number) => {
    if (!bulkPasteText.trim()) {
      setBulkPasteOpen(null);
      return;
    }

    const tokens = bulkPasteText
      .split(/[\n,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newEntries: SquadRosterEntry[] = tokens.map((token) => {
      const clean = token.toLowerCase();
      const match = allPlayers.find(
        (pl) => pl.ign.trim().toLowerCase() === clean || (pl.name && pl.name.trim().toLowerCase() === clean)
      );
      return {
        playerId: match?.id ?? null,
        ign: match?.ign ?? token,
        role: 'Assaulter', // Default role is Assaulter
        captain: false,
        statusTag: 'MAIN',
        isStaff: false,
      };
    });

    const existingRoster = squads[squadIdx].roster;
    updateRoster(squadIdx, [...existingRoster, ...newEntries]);
    setBulkPasteText('');
    setBulkPasteOpen(null);
  };

  /**
   * Fills a squad's roster from the team's own members — the roster the org page already
   * shows — so a squad does not have to be retyped from the team record.
   *
   * ACTIVE and BENCHED both belong to the team and map onto this roster's own status tags;
   * INACTIVE and RETIRED are left out. Anyone already present is skipped, by player where
   * linked and by IGN otherwise, so pressing it twice changes nothing and hand-typed
   * entries are never thrown away.
   */
  const importTeamRoster = (squadIdx: number) => {
    const squad = squads[squadIdx];
    if (!squad?.teamId) return;

    const members = allPlayers.filter(
      (p) => p.currentTeam?.id === squad.teamId && (p.status === 'ACTIVE' || p.status === 'BENCHED')
    );

    const existingPlayerIds = new Set(squad.roster.map((entry) => entry.playerId).filter(Boolean));
    const existingIgns = new Set(squad.roster.map((entry) => entry.ign.trim().toLowerCase()).filter(Boolean));

    let addedPlayers = 0;
    let addedStaff = 0;
    const additions: SquadRosterEntry[] = [];

    for (const member of members) {
      if (existingPlayerIds.has(member.id)) continue;
      if (existingIgns.has(member.ign.trim().toLowerCase())) continue;

      if (member.isPlayer === false) {
        additions.push({
          playerId: member.id,
          ign: member.ign,
          role: member.staffRole ?? null,
          captain: false,
          isStaff: true,
          staffRole: member.staffRole ?? 'Coach',
          statusTag: null,
        });
        addedStaff += 1;
      } else {
        additions.push({
          playerId: member.id,
          ign: member.ign,
          role: member.role ?? null,
          captain: false,
          isStaff: false,
          statusTag: member.status === 'BENCHED' ? 'BENCHED' : 'MAIN',
        });
        addedPlayers += 1;
      }
    }

    if (additions.length > 0) updateRoster(squadIdx, [...squad.roster, ...additions]);

    setRosterImportNote((prev) => ({
      ...prev,
      [squadIdx]:
        additions.length === 0
          ? members.length === 0
            ? 'This team has no active members.'
            : 'Already up to date — nothing to add.'
          : `Added ${addedPlayers} player${addedPlayers === 1 ? '' : 's'}${addedStaff > 0 ? ` and ${addedStaff} staff` : ''}.`,
    }));
  };

  // Handle Bulk Squads Import (TSV or JSON)
  const handleBulkImport = (newSquads: SquadRow[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setSquads(newSquads);
      setExpandedIndices(new Set());
    } else {
      const currentCount = squads.length;
      setSquads((prev) => [...prev, ...newSquads]);
    }
  };

  // Filtered squads for fast navigation among 100+ squads
  const filteredSquads = React.useMemo(() => {
    const q = squadSearch.trim().toLowerCase();
    if (!q) return squads.map((s, idx) => ({ squad: s, origIndex: idx }));

    return squads
      .map((s, idx) => ({ squad: s, origIndex: idx }))
      .filter(({ squad }) => {
        return (
          squad.teamName.toLowerCase().includes(q) ||
          (squad.tag && squad.tag.toLowerCase().includes(q)) ||
          (squad.seedLabel && squad.seedLabel.toLowerCase().includes(q)) ||
          squad.roster.some((r) => r.ign.toLowerCase().includes(q))
        );
      });
  }, [squads, squadSearch]);

  const totalPlayers = squads.reduce((acc, s) => acc + s.roster.filter((r) => !r.isStaff).length, 0);
  const totalStaff = squads.reduce((acc, s) => acc + s.roster.filter((r) => r.isStaff).length, 0);

  return (
    <div className="space-y-4">
      <input type="hidden" name="squadsJson" value={JSON.stringify(squads)} />

      {/* ── Top Helper & Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              👥 Participating Squads
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">
              {squads.length} Teams
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
              {totalPlayers} Players
            </span>
            {totalStaff > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                {totalStaff} Staff
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Players default to Assaulter. Unlimited squad sizes, Sub/Loaned tags, and multiple staff supported.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkImporterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            ⚡ Bulk Import (Excel &amp; JSON)
          </button>

          <button
            type="button"
            onClick={handleAutoLinkAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-500/20 transition-colors cursor-pointer"
            title="Auto-match unlinked player IGNs with existing player profiles"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Auto-Link
          </button>

          {squads.length > 3 && (
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-xs">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Expand All Squads"
              >
                Expand All
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Collapse All Squads"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Numbering the field in the order shown is a deliberate act, not an
          automatic side effect of moving a row: reordering must never invent
          seeding for an event that never published any. */}
      {squads.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {seedsAreSequential
              ? `Seeds run 1–${squads.length} in this order.`
              : 'Seeds are not sequential in this order yet.'}
          </p>
          <button
            type="button"
            onClick={renumberSeeds}
            disabled={seedsAreSequential}
            className="shrink-0 cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Renumber seeds 1→{squads.length}
          </button>
        </div>
      )}

      {/* Suggestions for the per-row Region box. Typing a name that is not here
          simply adds it — the save records it in the region list. */}
      <datalist id={regionListId}>
        {regionNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* ── Search Bar (For 24 - 100+ Squads) ── */}
      {squads.length > 5 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={squadSearch}
            onChange={(e) => setSquadSearch(e.target.value)}
            placeholder={`Filter ${squads.length} squads by team, tag, player, or seed…`}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
          />
        </div>
      )}

      {squads.length === 0 && (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
          <p className="text-xs text-slate-500">
            No squads registered yet. Add teams individually or use Bulk Import to paste 16–100+ squads from Excel.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setBulkImporterOpen(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
            >
              ⚡ Bulk Import Squads
            </button>
            <button
              type="button"
              onClick={addSquad}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              + Add Single Squad
            </button>
          </div>
        </div>
      )}

      {/* ── Squads List (Collapsible Accordion / Cards) ── */}
      <div className="space-y-3">
        {filteredSquads.map(({ squad, origIndex: i }) => {
          const isExpanded = expandedIndices.has(i);
          const players = squad.roster.filter((p) => !p.isStaff);
          const staff = squad.roster.filter((p) => p.isStaff);

          return (
            <div
              key={`${squad.teamId}-${i}`}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all shadow-xs"
            >
              {/* Squad Header Bar */}
              <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 cursor-pointer select-none">
                <div
                  className="flex items-center gap-2.5 flex-1 min-w-0"
                  onClick={() => toggleExpand(i)}
                >
                  <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 text-[11px] font-mono font-bold flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                    {i + 1}
                  </span>

                  <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {squad.teamId
                        ? squad.teamName || '— Unnamed Team —'
                        : squad.seedLabel || '— Open seat —'}
                    </span>
                    {squad.tag && (
                      <span className="px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                        [{squad.tag}]
                      </span>
                    )}
                    {squad.seed != null && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/15 font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        #{squad.seed}
                      </span>
                    )}
                    {squad.teamId && squad.seedLabel && (
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        · {squad.seedLabel}
                      </span>
                    )}
                  </div>

                  {/* Summary badges */}
                  <div className="flex items-center gap-1.5 ml-auto mr-2 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300">
                      {players.length} Players
                    </span>
                    {staff.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300">
                        {staff.length} Staff
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveSquad(i, -1)}
                    disabled={i === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveSquad(i, 1)}
                    disabled={i === squads.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleExpand(i)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSquads((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    title="Remove Squad"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Squad Details (Revealed on Expand) */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    <div className="sm:col-span-4">
                      <label className={labelCls}>Team (leave empty for an open seat)</label>
                      <div className="flex items-center gap-1.5">
                        <SearchableSelect
                          options={teamOptions}
                          value={squad.teamId ?? ''}
                          size="admin"
                          placeholder="— open seat, no team yet —"
                          searchPlaceholder="Type team name or tag…"
                          onChange={(val) => {
                            const team = allTeams.find((t) => t.id === val);
                            update(i, { teamId: val || null, teamName: team?.name ?? '', tag: team?.tag ?? squad.tag });
                          }}
                        />
                        {squad.teamId && (
                          <button
                            type="button"
                            onClick={() => update(i, { teamId: null, teamName: '' })}
                            className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400"
                            title="Clear the team, leaving this place open"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelCls}>Seed</label>
                      <input
                        type="number"
                        min={1}
                        className={inputCls}
                        value={squad.seed ?? ''}
                        onChange={(e) =>
                          update(i, { seed: e.target.value === '' ? null : Number(e.target.value) })
                        }
                        placeholder="1"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className={labelCls}>Seed / Entry Label</label>
                      <input
                        className={inputCls}
                        value={squad.seedLabel ?? ''}
                        onChange={(e) => update(i, { seedLabel: e.target.value || null })}
                        placeholder="e.g. Direct Invite, BGIS Champion"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className={labelCls}>Linked Qualifier Event</label>
                      <SearchableSelect
                        options={tournamentOptions}
                        searchUrl="/api/admin/search?type=tournament"
                        value={squad.seedTournamentId ?? ''}
                        size="admin"
                        placeholder="— none (standalone label) —"
                        searchPlaceholder="Search qualifier tournament…"
                        onChange={(val) => update(i, { seedTournamentId: val || null })}
                      />
                    </div>
                  </div>

                  {/* Overrides */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div>
                      <label className={labelCls}>Display Name Override</label>
                      <input
                        className={inputCls}
                        value={squad.displayName ?? ''}
                        onChange={(e) => update(i, { displayName: e.target.value || null })}
                        placeholder="e.g. Sponsor / Event Name"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Short Tag Override</label>
                      <input
                        className={inputCls}
                        value={squad.shortName ?? ''}
                        onChange={(e) => update(i, { shortName: e.target.value || null })}
                        placeholder="e.g. SOUL"
                      />
                    </div>
                    <div>
                      {/* Region is a grouping the publisher decides, so it is typed
                          rather than chosen: matching what exists already, or adding
                          a name the list does not have yet. Same treatment as the
                          tournament's own region field. */}
                      <label className={labelCls}>Region</label>
                      <input
                        type="text"
                        list={regionListId}
                        value={squad.region ?? ''}
                        onChange={(e) => update(i, { region: e.target.value || null })}
                        placeholder="e.g. Asia, EMEA, India"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      {/* Countries are a fixed list — nobody needs to maintain them. */}
                      <label className={labelCls}>Country</label>
                      <SearchableSelect
                        options={COUNTRIES.map((country) => ({
                          value: country.name,
                          label: country.name,
                        }))}
                        value={squad.country ?? ''}
                        onChange={(val) => update(i, { country: val || null })}
                        placeholder="— none —"
                        size="admin"
                      />
                    </div>
                  </div>

                  {/* Event-specific logo overrides. Optional: an unfilled squad falls back
                      to the team's own logo. */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Event Logo Override</label>
                      <div className="flex items-center gap-2">
                        <input
                          className={inputCls}
                          value={squad.eventLogoUrl ?? ''}
                          onChange={(e) => update(i, { eventLogoUrl: e.target.value || null })}
                          placeholder="URL, or pick from the library…"
                        />
                        <MediaPickButton
                          prefix="squad-logo-light"
                          onPick={(url) => update(i, { eventLogoUrl: url })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Event Logo Override (dark)</label>
                      <div className="flex items-center gap-2">
                        <input
                          className={inputCls}
                          value={squad.eventLogoDarkUrl ?? ''}
                          onChange={(e) => update(i, { eventLogoDarkUrl: e.target.value || null })}
                          placeholder="URL, or pick from the library…"
                        />
                        <MediaPickButton
                          prefix="squad-logo-dark"
                          onPick={(url) => update(i, { eventLogoDarkUrl: url })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Roster Section */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <label className={labelCls}>
                        Competing Roster ({players.length} players)
                      </label>
                      <div className="flex items-center gap-3">
                        {/* Only meaningful once the row has a team to import from. */}
                        {squad.teamId && (
                          <button
                            type="button"
                            onClick={() => importTeamRoster(i)}
                            title="Add this team's current players and staff to this squad"
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Import team roster
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setBulkPasteOpen(bulkPasteOpen === i ? null : i)}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Quick Paste Player IGNs
                        </button>
                      </div>
                    </div>

                    {rosterImportNote[i] && (
                      <p className="mb-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {rosterImportNote[i]}
                      </p>
                    )}

                    {/* Quick Paste Modal / Inline Input */}
                    {bulkPasteOpen === i && (
                      <div className="mb-3 p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2">
                        <span className="text-xs font-bold text-blue-900 dark:text-blue-200 block">
                          Paste Player IGNs (comma or line separated):
                        </span>
                        <textarea
                          rows={2}
                          value={bulkPasteText}
                          onChange={(e) => setBulkPasteText(e.target.value)}
                          placeholder="e.g. Manya, Nakul, Rony, Joker"
                          className="w-full text-xs font-mono p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setBulkPasteOpen(null)}
                            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyBulkPaste(i)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer"
                          >
                            Add to Roster
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Players List */}
                    <div className="space-y-2">
                      {squad.roster
                        .map((p, j) => ({ p, j }))
                        .filter(({ p }) => !p.isStaff)
                        .map(({ p, j }) => {
                          const isLinked = !!p.playerId;
                          return (
                            <div
                              key={j}
                              className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_7rem_auto_auto] gap-2 items-center"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <SearchableSelect
                                  options={playerOptions}
                                  value={p.playerId ?? ''}
                                  size="admin"
                                  placeholder="— Unlinked IGN —"
                                  searchPlaceholder="Type player IGN, name or team…"
                                  onChange={(val) => {
                                    const player = allPlayers.find((pl) => pl.id === val);
                                    const roster = squad.roster.map((r, idx) =>
                                      idx === j
                                        ? { ...r, playerId: player?.id ?? null, ign: player?.ign ?? r.ign }
                                        : r
                                    );
                                    updateRoster(i, roster);
                                  }}
                                  triggerClassName={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition-all text-left ${
                                    isLinked
                                      ? 'border-emerald-400 bg-emerald-50/30 text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/20 dark:text-emerald-300'
                                      : 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                                  }`}
                                />

                                <input
                                  className={inputCls}
                                  value={p.ign}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const clean = val.trim().toLowerCase();
                                    const match = allPlayers.find((pl) => pl.ign.trim().toLowerCase() === clean);
                                    const roster = squad.roster.map((r, idx) =>
                                      idx === j ? { ...r, ign: val, playerId: match?.id ?? r.playerId } : r
                                    );
                                    updateRoster(i, roster);
                                  }}
                                  placeholder="Player IGN"
                                />
                              </div>

                              {/* Role Selector (Default: Assaulter) */}
                              <select
                                className={inputCls}
                                value={p.role || 'Assaulter'}
                                onChange={(e) => {
                                  const roster = squad.roster.map((r, idx) =>
                                    idx === j ? { ...r, role: e.target.value || 'Assaulter' } : r
                                  );
                                  updateRoster(i, roster);
                                }}
                              >
                                {ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>

                              {/* Status Tag (Main, Sub, Loaned, Benched, Standin) */}
                              <select
                                className={`${inputCls} font-bold text-xs ${
                                  p.statusTag === 'SUB'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : p.statusTag === 'LOANED'
                                    ? 'text-purple-600 dark:text-purple-400'
                                    : p.statusTag === 'BENCHED'
                                    ? 'text-slate-400'
                                    : 'text-slate-700 dark:text-slate-200'
                                }`}
                                value={p.statusTag || 'MAIN'}
                                onChange={(e) => {
                                  const roster = squad.roster.map((r, idx) =>
                                    idx === j
                                      ? { ...r, statusTag: e.target.value as SquadRosterEntry['statusTag'] }
                                      : r
                                  );
                                  updateRoster(i, roster);
                                }}
                              >
                                {STATUS_TAGS.map((tag) => (
                                  <option key={tag} value={tag}>
                                    {tag === 'MAIN' ? 'Active Roster' : tag}
                                  </option>
                                ))}
                              </select>

                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!p.captain}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const roster = squad.roster.map((r, idx) => ({
                                      ...r,
                                      captain: idx === j ? checked : false,
                                    }));
                                    updateRoster(i, roster);
                                  }}
                                />
                                Captain
                              </label>

                              <button
                                type="button"
                                onClick={() => updateRoster(i, squad.roster.filter((_, idx) => idx !== j))}
                                className="px-2 py-1.5 rounded-md text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                                title="Remove Player"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}

                      <button
                        type="button"
                        onClick={() =>
                          updateRoster(i, [
                            ...squad.roster,
                            { playerId: null, ign: '', role: 'Assaulter', captain: false, statusTag: 'MAIN', isStaff: false },
                          ])
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        + Add player
                      </button>
                    </div>

                    {/* ── Support Staff (Multiple Coaches / Analysts / Managers) ── */}
                    <div className="pt-3 mt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <label className={labelCls}>
                          Coaching &amp; Support Staff ({staff.length} staff)
                        </label>
                      </div>

                      {squad.roster
                        .map((p, j) => ({ p, j }))
                        .filter(({ p }) => p.isStaff)
                        .map(({ p, j }) => {
                          const isLinked = !!p.playerId;
                          return (
                            <div
                              key={j}
                              className="grid grid-cols-1 sm:grid-cols-[1fr_12rem_auto] gap-2 items-center mb-2"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <SearchableSelect
                                  options={playerOptions}
                                  value={p.playerId ?? ''}
                                  size="admin"
                                  placeholder="— Unlinked IGN —"
                                  searchPlaceholder="Type staff IGN, name or team…"
                                  onChange={(val) => {
                                    const player = allPlayers.find((pl) => pl.id === val);
                                    const roster = squad.roster.map((r, idx) =>
                                      idx === j
                                        ? { ...r, playerId: player?.id ?? null, ign: player?.ign ?? r.ign }
                                        : r
                                    );
                                    updateRoster(i, roster);
                                  }}
                                  triggerClassName={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition-all text-left ${
                                    isLinked
                                      ? 'border-emerald-400 bg-emerald-50/30 text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/20 dark:text-emerald-300'
                                      : 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
                                  }`}
                                />

                                <input
                                  className={inputCls}
                                  value={p.ign}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const clean = val.trim().toLowerCase();
                                    const match = allPlayers.find((pl) => pl.ign.trim().toLowerCase() === clean);
                                    const roster = squad.roster.map((r, idx) =>
                                      idx === j ? { ...r, ign: val, playerId: match?.id ?? r.playerId } : r
                                    );
                                    updateRoster(i, roster);
                                  }}
                                  placeholder="Staff name / IGN"
                                />
                              </div>

                              <select
                                className={inputCls}
                                value={p.staffRole || p.role || 'Coach'}
                                onChange={(e) => {
                                  const roster = squad.roster.map((r, idx) =>
                                    idx === j
                                      ? { ...r, role: e.target.value, staffRole: e.target.value }
                                      : r
                                  );
                                  updateRoster(i, roster);
                                }}
                              >
                                {STAFF_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => updateRoster(i, squad.roster.filter((_, idx) => idx !== j))}
                                className="px-2 py-1.5 rounded-md text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                                title="Remove Staff"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}

                      <button
                        type="button"
                        onClick={() =>
                          updateRoster(i, [
                            ...squad.roster,
                            {
                              playerId: null,
                              ign: '',
                              role: 'Coach',
                              staffRole: 'Coach',
                              captain: false,
                              isStaff: true,
                              statusTag: null,
                            },
                          ])
                        }
                        className="px-3 py-1.5 rounded-lg border border-indigo-300/60 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
                      >
                        + Add staff member (Coach, Analyst, etc.)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={addSquad}
          className="px-4 py-2 rounded-lg bg-(--ed-blue) text-white text-xs font-bold hover:bg-[#094ea3] cursor-pointer"
        >
          + Add single squad
        </button>

        <button
          type="button"
          onClick={() => setBulkImporterOpen(true)}
          className="px-4 py-2 rounded-lg border border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
        >
          ⚡ Bulk Import (Excel / JSON)
        </button>
      </div>

      {/* Bulk Importer Modal */}
      {bulkImporterOpen && (
        <TournamentSquadBulkImporter
          allTeams={allTeams}
          allPlayers={allPlayers}
          onImport={handleBulkImport}
          onClose={() => setBulkImporterOpen(false)}
        />
      )}
    </div>
  );
}
