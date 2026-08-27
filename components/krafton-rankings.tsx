'use client';

import * as React from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankedTeam {
  rank: number;
  name: string;
  events: number;
  points: number;
}

interface RankedPlayer {
  rank: number;
  name: string;
  slug?: string;
  team: string;
  teamSlug?: string;
  totalFinishes: number;
  points: number;
}

interface RankingsResponse {
  teams: RankedTeam[];
  players: RankedPlayer[];
  logos: Record<string, { logoUrl: string | null; imageDarkUrl: string | null }>;
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black shrink-0',
        rank === 1 && 'bg-amber-500 text-slate-950',
        rank === 2 && 'bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white',
        rank === 3 && 'bg-amber-700/30 text-amber-700 dark:text-amber-400',
        rank > 3 && 'bg-slate-100 dark:bg-[#111726] text-slate-500 dark:text-slate-400'
      )}
    >
      {rank}
    </span>
  );
}

function TeamLogo({ name, logos }: { name: string; logos: RankingsResponse['logos'] }) {
  const logo = logos[name.toLowerCase()];
  if (logo?.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo.logoUrl}
        alt=""
        className="w-5 h-5 rounded object-contain shrink-0"
        loading="lazy"
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <span className="w-5 h-5 rounded bg-gradient-to-br from-[#0A5FC4]/70 to-indigo-700/70 text-white text-[9px] font-black flex items-center justify-center shrink-0">
      {initials}
    </span>
  );
}

export function KraftonRankings() {
  const [data, setData] = React.useState<RankingsResponse | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/rankings')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled || !json?.data) return;
        setData(json.data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = data === null && !failed;

  return (
    <section id="krafton-rankings" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#0A5FC4] dark:text-amber-400" />
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
            KRAFTON Rankings
          </h2>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Decay-Adjusted Rolling Points
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Teams column */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17] flex items-center justify-between">
            <span className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Teams
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Top 10</span>
          </div>

          {loading ? (
            <RankSkeleton rowsWithSub={false} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                  <th className="py-2 pl-3 w-10 text-center">#</th>
                  <th className="py-2 text-left">Team</th>
                  <th className="py-2 pr-2 text-center w-14">Events</th>
                  <th className="py-2 pr-3 text-right w-20">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(data?.teams ?? []).map((team) => (
                  <tr
                    key={team.name}
                    className={cn(
                      'hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors',
                      team.rank === 1 && 'bg-amber-500/5',
                      team.rank <= 3 && team.rank !== 1 && 'bg-slate-50/50 dark:bg-white/[0.02]'
                    )}
                  >
                    <td className="py-2.5 pl-3 text-center">
                      <RankBadge rank={team.rank} />
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2 min-w-0">
                        <TeamLogo name={team.name} logos={data?.logos ?? {}} />
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {team.name}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
                      {team.events}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                      {team.points.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Players column */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17] flex items-center justify-between">
            <span className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Players
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Top 10</span>
          </div>

          {loading ? (
            <RankSkeleton rowsWithSub />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                  <th className="py-2 pl-3 w-10 text-center">#</th>
                  <th className="py-2 text-left">Player</th>
                  <th className="py-2 pr-2 text-center w-14">Finishes</th>
                  <th className="py-2 pr-3 text-right w-20">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(data?.players ?? []).map((player) => (
                  <tr
                    key={player.name}
                    className={cn(
                      'hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors',
                      player.rank === 1 && 'bg-amber-500/5',
                      player.rank <= 3 && player.rank !== 1 && 'bg-slate-50/50 dark:bg-white/[0.02]'
                    )}
                  >
                    <td className="py-2.5 pl-3 text-center align-middle">
                      <RankBadge rank={player.rank} />
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <TeamLogo
                          name={player.team || 'Free Agent'}
                          logos={data?.logos ?? {}}
                        />
                        <div className="min-w-0 leading-tight">
                          {player.slug ? (
                            <Link
                              href={`/players/${player.slug}`}
                              className="font-bold text-slate-900 dark:text-white truncate hover:text-[#0A5FC4] dark:hover:text-amber-400 transition-colors"
                            >
                              {player.name}
                            </Link>
                          ) : (
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {player.name}
                            </span>
                          )}
                          <div
                            className={cn(
                              'text-[10px] truncate',
                              player.team
                                ? 'text-slate-400'
                                : 'text-slate-400 italic opacity-70'
                            )}
                          >
                            {player.team ? (
                              player.teamSlug ? (
                                <Link
                                  href={`/teams/${player.teamSlug}`}
                                  className="hover:text-[#0A5FC4] dark:hover:text-amber-400 transition-colors"
                                >
                                  {player.team}
                                </Link>
                              ) : (
                                player.team
                              )
                            ) : (
                              'Free Agent'
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-2 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
                      {player.totalFinishes}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                      {player.points.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {failed && (
        <p className="text-center text-xs text-slate-400 py-4">
          Rankings are unavailable right now.
        </p>
      )}
    </section>
  );
}

function RankSkeleton({ rowsWithSub }: { rowsWithSub: boolean }) {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/60 last:border-0"
        >
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#111726]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-slate-100 dark:bg-[#111726]" />
            {rowsWithSub && (
              <div className="h-2 w-20 rounded bg-slate-50 dark:bg-[#0e1524]" />
            )}
          </div>
          <div className="h-3 w-10 rounded bg-slate-50 dark:bg-[#0e1524]" />
          <div className="h-3 w-12 rounded bg-slate-100 dark:bg-[#111726]" />
        </div>
      ))}
    </div>
  );
}
