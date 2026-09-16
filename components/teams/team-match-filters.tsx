'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import { TournamentName } from '@/components/ui/tournament-name';

export interface TeamMatchFilterState {
  /** Tournament slug, or '' for all. */
  tournament: string;
  /** Exact `MatchGame.mapName`, or '' for all. */
  map: string;
  /** '1' when only WWCD games are shown. */
  wins: string;
  /** 'date' | 'points' */
  sort: string;
}

const chip =
  'inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition cursor-pointer';
const chipOn = 'border-[#0A5FC4] bg-[#0A5FC4] text-white';
const chipOff =
  'border-slate-200 text-slate-500 hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10 dark:text-slate-400';

/**
 * Match-history filters. Server-side and URL-driven, mirroring
 * `TeamsDirectoryExplorer.navigate()` — every change resets to page 1 so a
 * filter can never strand the reader on an out-of-range page.
 */
export function TeamMatchFilters({
  basePath,
  filters,
  tournaments,
  maps,
}: {
  basePath: string;
  filters: TeamMatchFilterState;
  tournaments: { id: string; name: string; fullName: string; shortName: string | null; slug: string }[];
  maps: string[];
}) {
  const router = useRouter();

  const navigate = (updates: Partial<TeamMatchFilterState>) => {
    const next: Record<string, string> = { ...filters, ...updates };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value && !(key === 'sort' && value === 'date')) query.set(key, value);
    }
    const qs = query.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0b1220]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Sort</span>
        <button
          type="button"
          onClick={() => navigate({ sort: 'date' })}
          aria-pressed={filters.sort !== 'points'}
          className={`${chip} ${filters.sort !== 'points' ? chipOn : chipOff}`}
        >
          By date
        </button>
        <button
          type="button"
          onClick={() => navigate({ sort: 'points' })}
          aria-pressed={filters.sort === 'points'}
          className={`${chip} ${filters.sort === 'points' ? chipOn : chipOff}`}
        >
          By points
        </button>

        <span className="mx-1 hidden h-5 w-px bg-slate-200 dark:bg-white/10 sm:block" />

        <button
          type="button"
          onClick={() => navigate({ wins: filters.wins ? '' : '1' })}
          aria-pressed={Boolean(filters.wins)}
          className={`${chip} ${filters.wins ? chipOn : chipOff}`}
        >
          Wins only
        </button>
      </div>

      {tournaments.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
            Tournament
          </span>
          <button
            type="button"
            onClick={() => navigate({ tournament: '' })}
            aria-pressed={!filters.tournament}
            className={`${chip} ${!filters.tournament ? chipOn : chipOff}`}
          >
            All
          </button>
          {tournaments.map((tournament) => (
            <button
              key={tournament.id}
              type="button"
              onClick={() => navigate({ tournament: tournament.slug })}
              aria-pressed={filters.tournament === tournament.slug}
              className={`${chip} ${filters.tournament === tournament.slug ? chipOn : chipOff}`}
            >
              <TournamentName name={tournament.fullName} shortName={tournament.shortName} />
            </button>
          ))}
        </div>
      )}

      {maps.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">Map</span>
          <button
            type="button"
            onClick={() => navigate({ map: '' })}
            aria-pressed={!filters.map}
            className={`${chip} ${!filters.map ? chipOn : chipOff}`}
          >
            All
          </button>
          {maps.map((map) => (
            <button
              key={map}
              type="button"
              onClick={() => navigate({ map })}
              aria-pressed={filters.map === map}
              className={`${chip} ${filters.map === map ? chipOn : chipOff}`}
            >
              {map}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
