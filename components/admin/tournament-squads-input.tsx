'use client';

import * as React from 'react';
import { Link2, Sparkles, Plus, Trash2, CheckCircle2, UserPlus, HelpCircle } from 'lucide-react';

export interface SquadRosterEntry {
  playerId?: string | null;
  ign: string;
  role?: string | null;
  captain?: boolean;
}

export interface SquadRow {
  teamId: string;
  teamName: string;
  tag?: string | null;
  seed?: number | null;
  seedLabel?: string | null;
  seedTournamentId?: string | null;
  roster: SquadRosterEntry[];
  eventLogoUrl?: string | null;
  eventLogoDarkUrl?: string | null;
  shortName?: string | null;
  displayName?: string | null;
  country?: string | null;
}

const ROLES = ['Assaulter', 'IGL', 'Support', 'Sniper', 'Flex'];

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5FC4]';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

export function TournamentSquadsInput({
  initialSquads,
  allTeams,
  allPlayers,
  allTournaments = [],
}: {
  initialSquads: SquadRow[];
  allTeams: { id: string; name: string; tag?: string | null }[];
  allPlayers: { id: string; ign: string; name?: string | null; currentTeam?: { id: string; name: string } | null }[];
  allTournaments?: { id: string; name: string; slug: string }[];
}) {
  const [squads, setSquads] = React.useState<SquadRow[]>(initialSquads);
  const [bulkPasteOpen, setBulkPasteOpen] = React.useState<number | null>(null);
  const [bulkPasteText, setBulkPasteText] = React.useState<string>('');

  const update = (index: number, patch: Partial<SquadRow>) => {
    setSquads((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const updateRoster = (index: number, roster: SquadRosterEntry[]) => {
    update(index, { roster });
  };

  const addSquad = () => {
    const first = allTeams[0];
    setSquads((prev) => [
      ...prev,
      {
        teamId: first?.id ?? '',
        teamName: first?.name ?? '',
        seed: null,
        seedLabel: 'Direct Invite',
        seedTournamentId: null,
        roster: [],
        eventLogoUrl: null,
        eventLogoDarkUrl: null,
      },
    ]);
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

  // Handle Quick Paste Roster (e.g. "Manya, Nakul, Rony, Joker")
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
        role: null,
        captain: false,
      };
    });

    const existingRoster = squads[squadIdx].roster;
    updateRoster(squadIdx, [...existingRoster, ...newEntries]);
    setBulkPasteText('');
    setBulkPasteOpen(null);
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name="squadsJson" value={JSON.stringify(squads)} />

      {/* ── Top Helper Bar with Auto-Link Tool ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            👥 {squads.length} Participating Squads
          </span>
          <span className="text-[11px] text-slate-500">
            Players can be entered freely as custom IGNs without creating separate player pages.
          </span>
        </div>

        <button
          type="button"
          onClick={handleAutoLinkAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-500/20 transition-colors cursor-pointer"
          title="Auto-match unlinked player IGNs with existing player profiles in the database"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          Auto-Link Registered Players
        </button>
      </div>

      {squads.length === 0 && (
        <p className="text-xs text-slate-500">
          No squads attached yet. Add teams with custom seed labels, rosters and optional event-specific logos.
        </p>
      )}

      {squads.map((squad, i) => (
        <div
          key={`${squad.teamId}-${i}`}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            <div className="sm:col-span-4">
              <label className={labelCls}>Team</label>
              <select
                className={inputCls}
                value={squad.teamId}
                onChange={(e) => {
                  const team = allTeams.find((t) => t.id === e.target.value);
                  update(i, { teamId: e.target.value, teamName: team?.name ?? '' });
                }}
              >
                <option value="">— select team —</option>
                {allTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
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

            <div className="sm:col-span-4">
              <label className={labelCls}>Linked Qualifier Event</label>
              <select
                className={inputCls}
                value={squad.seedTournamentId ?? ''}
                onChange={(e) => update(i, { seedTournamentId: e.target.value || null })}
              >
                <option value="">— none (standalone label) —</option>
                {allTournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1 flex justify-end pt-6">
              <button
                type="button"
                onClick={() => setSquads((prev) => prev.filter((_, idx) => idx !== i))}
                className="px-2.5 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                title="Remove Squad"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Overrides */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <label className={labelCls}>Country Override</label>
              <input
                className={inputCls}
                value={squad.country ?? ''}
                onChange={(e) => update(i, { country: e.target.value || null })}
                placeholder="e.g. India, IN"
              />
            </div>
          </div>

          {/* Roster Section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Verified Roster ({squad.roster.length} players)</label>
              <button
                type="button"
                onClick={() => setBulkPasteOpen(bulkPasteOpen === i ? null : i)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Quick Paste Roster
              </button>
            </div>

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
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                  >
                    Add to Roster
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {squad.roster.map((p, j) => {
                const isLinked = !!p.playerId;
                return (
                  <div key={j} className="grid grid-cols-1 sm:grid-cols-[1fr_10rem_auto_auto] gap-2 items-center">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        className={`${inputCls} ${isLinked ? 'border-emerald-300 dark:border-emerald-700' : ''}`}
                        value={p.playerId ?? ''}
                        onChange={(e) => {
                          const player = allPlayers.find((pl) => pl.id === e.target.value);
                          const roster = squad.roster.map((r, idx) =>
                            idx === j ? { ...r, playerId: player?.id ?? null, ign: player?.ign ?? r.ign } : r
                          );
                          updateRoster(i, roster);
                        }}
                      >
                        <option value="">— Unlinked IGN —</option>
                        {allPlayers.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.ign} {pl.name && pl.name !== pl.ign ? `(${pl.name})` : ''}
                            {pl.currentTeam ? ` — ${pl.currentTeam.name}` : ''}
                          </option>
                        ))}
                      </select>

                      <input
                        className={inputCls}
                        value={p.ign}
                        onChange={(e) => {
                          const val = e.target.value;
                          const clean = val.trim().toLowerCase();
                          // auto-match if matches registered player
                          const match = allPlayers.find((pl) => pl.ign.trim().toLowerCase() === clean);
                          const roster = squad.roster.map((r, idx) =>
                            idx === j ? { ...r, ign: val, playerId: match?.id ?? r.playerId } : r
                          );
                          updateRoster(i, roster);
                        }}
                        placeholder="Player IGN"
                      />
                    </div>

                    <select
                      className={inputCls}
                      value={p.role ?? ''}
                      onChange={(e) => {
                        const roster = squad.roster.map((r, idx) => (idx === j ? { ...r, role: e.target.value || null } : r));
                        updateRoster(i, roster);
                      }}
                    >
                      <option value="">Role</option>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!p.captain}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const roster = squad.roster.map((r, idx) => ({ ...r, captain: idx === j ? checked : false }));
                          updateRoster(i, roster);
                        }}
                      />
                      Captain
                    </label>

                    <button
                      type="button"
                      onClick={() => updateRoster(i, squad.roster.filter((_, idx) => idx !== j))}
                      className="px-2 py-1.5 rounded-md text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => updateRoster(i, [...squad.roster, { playerId: null, ign: '', role: null, captain: false }])}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                + Add player
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addSquad}
        className="px-4 py-2 rounded-lg bg-[#0A5FC4] text-white text-xs font-bold hover:bg-[#094ea3] cursor-pointer"
      >
        + Add squad
      </button>
    </div>
  );
}
