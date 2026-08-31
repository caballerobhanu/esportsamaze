'use client';

import * as React from 'react';

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
}: {
  initialSquads: SquadRow[];
  allTeams: { id: string; name: string; tag?: string | null }[];
  allPlayers: { id: string; ign: string; currentTeam?: { id: string; name: string } | null }[];
}) {
  const [squads, setSquads] = React.useState<SquadRow[]>(initialSquads);

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
        seed: prev.length + 1,
        roster: [],
        eventLogoUrl: null,
        eventLogoDarkUrl: null,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name="squadsJson" value={JSON.stringify(squads)} />

      {squads.length === 0 && (
        <p className="text-xs text-slate-500">
          No squads attached yet. Add teams with seeds, rosters and optional event-specific logos.
        </p>
      )}

      {squads.map((squad, i) => (
        <div
          key={`${squad.teamId}-${i}`}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
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
                    {t.tag ? ` [${t.tag}]` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Seed</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={squad.seed ?? ''}
                onChange={(e) => update(i, { seed: e.target.value ? parseInt(e.target.value, 10) : null })}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setSquads((prev) => prev.filter((_, idx) => idx !== i))}
                className="px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                Remove squad
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Display Name Override</label>
              <input
                className={inputCls}
                value={squad.displayName ?? ''}
                onChange={(e) => update(i, { displayName: e.target.value || null })}
                placeholder="e.g. iQOO Team X (blank = global name)"
              />
            </div>
            <div>
              <label className={labelCls}>Short Name Override</label>
              <input
                className={inputCls}
                value={squad.shortName ?? ''}
                onChange={(e) => update(i, { shortName: e.target.value || null })}
                placeholder="e.g. TMX (blank = global tag)"
              />
            </div>
            <div>
              <label className={labelCls}>Country Override</label>
              <input
                className={inputCls}
                value={squad.country ?? ''}
                onChange={(e) => update(i, { country: e.target.value || null })}
                placeholder="e.g. India or IN (blank = global)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Event Logo (Light) URL</label>
              <input
                className={inputCls}
                value={squad.eventLogoUrl ?? ''}
                onChange={(e) => update(i, { eventLogoUrl: e.target.value || null })}
                placeholder="Leave blank to use the team's global logo"
              />
              <label className={labelCls + ' mt-2'}>…or upload</label>
              <input type="file" name={`squadLogoLight${i}`} accept="image/*" className="w-full text-xs text-slate-500" />
            </div>
            <div>
              <label className={labelCls}>Event Logo (Dark) URL</label>
              <input
                className={inputCls}
                value={squad.eventLogoDarkUrl ?? ''}
                onChange={(e) => update(i, { eventLogoDarkUrl: e.target.value || null })}
                placeholder="Optional dark variant"
              />
              <label className={labelCls + ' mt-2'}>…or upload</label>
              <input type="file" name={`squadLogoDark${i}`} accept="image/*" className="w-full text-xs text-slate-500" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Roster</label>
            <div className="space-y-2">
              {squad.roster.map((p, j) => (
                <div key={j} className="grid grid-cols-1 sm:grid-cols-[1fr_10rem_auto_auto] gap-2 items-center">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      className={inputCls}
                      value={p.playerId ?? ''}
                      onChange={(e) => {
                        const player = allPlayers.find((pl) => pl.id === e.target.value);
                        const roster = squad.roster.map((r, idx) =>
                          idx === j ? { ...r, playerId: player?.id ?? null, ign: player?.ign ?? r.ign } : r
                        );
                        updateRoster(i, roster);
                      }}
                    >
                      <option value="">— custom IGN —</option>
                      {allPlayers.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.ign}
                          {pl.currentTeam ? ` — ${pl.currentTeam.name}` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputCls}
                      value={p.ign}
                      onChange={(e) => {
                        const roster = squad.roster.map((r, idx) => (idx === j ? { ...r, ign: e.target.value } : r));
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
                    className="px-2 py-1.5 rounded-md text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => updateRoster(i, [...squad.roster, { playerId: null, ign: '', role: null, captain: false }])}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
        className="px-4 py-2 rounded-lg bg-[#0A5FC4] text-white text-xs font-bold hover:bg-[#094ea3]"
      >
        + Add squad
      </button>
    </div>
  );
}
