'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, Swords, Map, Clock, Tv } from 'lucide-react';

interface TeamResultLite {
  id: string;
  rank: number;
  wwcd: boolean;
  placePoints: number;
  elimsPoints: number;
  totalPoints: number;
  damage: number;
  team: { id: string; name: string; tag?: string | null; logoUrl?: string | null; imageDarkUrl?: string | null };
}

interface PlayerStatLite {
  id: string;
  playerElims: number;
  damage: number;
  isMvp: boolean;
  player: { ign: string };
  team?: { tag?: string | null } | null;
}

export interface MatchLite {
  id: string;
  format: string;
  matchNumber?: number | null;
  overallMatchNumber?: number | null;
  mapName?: string | null;
  status: string;
  scheduledAt: Date | string;
  matchTime?: string | null;
  streamUrl?: string | null;
  teamResults: TeamResultLite[];
  playerStats: PlayerStatLite[];
}

export interface StageGroup {
  stageName: string;
  matches: MatchLite[];
}

function MapChip({ map }: { map?: string | null }) {
  return (
    <span className="num flex items-center gap-1 rounded-lg border border-(--ed-hair) px-2 py-0.5 text-[11px] uppercase text-(--ed-stone)">
      <Map className="h-3 w-3" />
      {map || 'TBA'}
    </span>
  );
}

function TeamLogo({ team, size = 20 }: { team: TeamResultLite['team']; size?: number }) {
  const src = team.imageDarkUrl || team.logoUrl;
  if (!src) {
    return (
      <span
        className="num flex items-center justify-center rounded-lg border border-(--ed-hair) bg-(--ed-canvas) text-[9px] font-medium text-(--ed-stone)"
        style={{ width: size, height: size }}
      >
        {team.tag?.slice(0, 2) || '??'}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}

function MatchRow({ match, forceOpen }: { match: MatchLite; forceOpen?: boolean }) {
  const [open, setOpen] = React.useState(Boolean(forceOpen));
  const completed = match.status === 'COMPLETED';
  const results = [...match.teamResults].sort((a, b) => a.rank - b.rank);
  const winner = results.find((r) => r.wwcd || r.rank === 1) ?? results[0];
  const runnerUp = results[1];
  const fraggers = [...match.playerStats].sort((a, b) => b.playerElims - a.playerElims || b.damage - a.damage).slice(0, 4);

  const scrollRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (node && forceOpen) {
        setTimeout(() => node.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
      }
    },
    [forceOpen]
  );

  return (
    <div
      ref={scrollRef}
      className={`overflow-hidden rounded-lg border bg-(--ed-surface) transition-colors ${
        forceOpen ? 'border-(--ed-blue)' : 'border-(--ed-hair) hover:border-(--ed-stone)/50'
      }`}
    >
      {/* Row header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-(--ed-canvas) sm:px-5"
      >
        <span className="num flex h-7 w-9 shrink-0 items-center justify-center rounded-lg border border-(--ed-hair) bg-(--ed-canvas) text-xs font-medium text-(--ed-stone)">
          {match.matchNumber ?? '–'}
        </span>

        {completed && winner ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <TeamLogo team={winner.team} />
            <span className="truncate text-sm font-medium">{winner.team.name}</span>
            <span className={`num shrink-0 text-sm font-medium ${winner.wwcd ? 'text-amber-700 dark:text-amber-400' : 'text-(--ed-blue)'}`}>
              {winner.totalPoints} pts
            </span>
            {winner.wwcd && (
              <span className="hidden shrink-0 rounded-lg border border-amber-600/25 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-700 sm:inline dark:border-amber-400/25 dark:text-amber-400">
                WWCD
              </span>
            )}
            {runnerUp && (
              <span className="hidden min-w-0 items-center gap-2 text-xs text-(--ed-stone) sm:flex">
                <span className="opacity-60">vs</span>
                <TeamLogo team={runnerUp.team} size={16} />
                <span className="truncate">{runnerUp.team.name}</span>
                <span className="num text-(--ed-ink)">({runnerUp.totalPoints})</span>
              </span>
            )}
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-sm font-medium">{match.format}</span>
          </div>
        )}

        <MapChip map={match.mapName} />

        {completed ? (
          <span className="num hidden w-20 text-right text-xs text-(--ed-stone) sm:block">{match.matchTime || 'Finished'}</span>
        ) : (
          <span className={`num hidden w-20 items-center justify-end gap-1.5 text-right text-xs sm:flex ${match.status === 'LIVE' ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-(--ed-stone)'}`}>
            {match.status === 'LIVE' && <Clock className="h-3 w-3 animate-live text-rose-500" />}
            {match.status === 'LIVE' ? 'LIVE' : match.matchTime || match.status}
          </span>
        )}

        {match.streamUrl && (
          <a
            href={match.streamUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hidden items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-0.5 text-[10px] font-medium uppercase text-rose-600 transition-colors hover:bg-rose-600 hover:text-white sm:flex dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/20"
          >
            <Tv className="h-3 w-3" /> Watch
          </a>
        )}

        <ChevronDown className={`h-4 w-4 shrink-0 text-(--ed-stone) transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Scorecard */}
      {open && (
        <div className="border-t border-(--ed-hair)">
          {results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-(--ed-hair)">
                    <th className="ed-th w-12 text-left">#</th>
                    <th className="ed-th text-left">Team</th>
                    <th className="ed-th text-center">Place Pts</th>
                    <th className="ed-th text-center">Elims Pts</th>
                    <th className="ed-th text-center">Damage</th>
                    <th className="ed-th text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--ed-hair)">
                  {results.map((r) => (
                    <tr
                      key={r.id}
                      className={`transition-colors hover:bg-(--ed-canvas) ${r.wwcd || r.rank === 1 ? 'bg-amber-500/[0.04]' : ''}`}
                    >
                      <td className="num px-4 py-2.5 text-(--ed-stone)">{r.rank}</td>
                      <td className="py-2.5">
                        <span className="flex items-center gap-2.5">
                          <TeamLogo team={r.team} size={16} />
                          <span className="font-medium">{r.team.name}</span>
                          {(r.wwcd || r.rank === 1) && (
                            <span className="rounded-lg border border-amber-600/25 px-1.5 py-px text-[9px] uppercase tracking-wide text-amber-700 dark:border-amber-400/25 dark:text-amber-400">
                              WWCD
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="num px-3 py-2.5 text-center text-(--ed-stone)">{r.placePoints}</td>
                      <td className="num px-3 py-2.5 text-center text-(--ed-stone)">{r.elimsPoints}</td>
                      <td className="num px-3 py-2.5 text-center text-(--ed-stone)">{r.damage.toLocaleString()}</td>
                      <td className="num px-4 py-2.5 text-right text-[13px] font-medium text-(--ed-blue)">{r.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-(--ed-stone)">Scorecard entry is pending for this match.</p>
          )}

          {fraggers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-(--ed-hair) bg-(--ed-canvas) px-5 py-3">
              <span className="ed-label mr-1">Top performers</span>
              {fraggers.map((f) => (
                <span key={f.id} className="ed-chip text-[11px]">
                  <span className="font-medium">{f.player.ign}</span>
                  <span className="num text-(--ed-magenta)">{f.playerElims}K</span>
                  <span className="num text-(--ed-stone)">({f.damage} dmg)</span>
                  {f.isMvp && (
                    <span className="rounded-md border border-amber-600/25 px-1 text-[9px] uppercase text-amber-700 dark:border-amber-400/25 dark:text-amber-400">
                      MVP
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TournamentMatchesPanel({ stageGroups }: { stageGroups: StageGroup[] }) {
  const params = useSearchParams();
  const matchId = params.get('matchId');

  return (
    <div className="space-y-12">
      {stageGroups.map((group) => (
        <section key={group.stageName}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2.5 text-xl font-medium tracking-tight">
              <Swords className="h-4.5 w-4.5 text-(--ed-blue)" />
              {group.stageName}
            </h2>
            <span className="num text-sm text-(--ed-stone)">{group.matches.length} matches</span>
          </div>
          <div className="space-y-3">
            {group.matches.map((m) => (
              <MatchRow key={m.id} match={m} forceOpen={matchId === m.id} />
            ))}
          </div>
        </section>
      ))}
      {stageGroups.length === 0 && (
        <div className="ed-card flex flex-col items-center gap-3 py-20 text-center">
          <Swords className="h-8 w-8 text-(--ed-stone) opacity-40" />
          <p className="font-display text-lg font-medium">No matches scheduled yet</p>
          <p className="max-w-sm text-sm text-(--ed-stone)">Matches and schedule will appear once stages are initialised.</p>
        </div>
      )}
    </div>
  );
}
