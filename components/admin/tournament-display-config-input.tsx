'use client';

import * as React from 'react';
import {
  DISPLAY_SURFACES,
  logoModesFromConfig,
  type StandingsLogoMode,
} from '@/lib/standings-config';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

const MODE_OPTIONS: { value: StandingsLogoMode; label: string }[] = [
  { value: 'TEAM', label: 'Team logo only' },
  { value: 'COUNTRY', label: 'Country flag only' },
  { value: 'BOTH', label: 'Country flag + team logo' },
  { value: 'NONE', label: 'No logos' },
];

/**
 * Chooses what is drawn beside each team, per public tab.
 *
 * Takes the stored standings config (`Tournament.standingsConfig`) and reads the per-surface
 * choice out of it, so the dropdowns open on what was saved rather than on the default.
 *
 * Owns its own state and posts `logoModeBySurfaceJson`, because the standings config's own
 * hidden field lives inside the Standings tab's editor. The save action merges the two.
 */
export function TournamentDisplayConfigInput({ initialConfig }: { initialConfig?: unknown }) {
  const [modes, setModes] = React.useState(() => logoModesFromConfig(initialConfig));

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DISPLAY_SURFACES.map(({ key, label }) => (
          <div key={key}>
            <label className={labelCls}>{label}</label>
            <select
              className={inputCls}
              value={modes[key]}
              onChange={(e) => {
                const value = e.target.value as StandingsLogoMode;
                setModes((prev) => ({ ...prev, [key]: value }));
              }}
            >
              {MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <input type="hidden" name="logoModeBySurfaceJson" value={JSON.stringify(modes)} />
    </div>
  );
}
