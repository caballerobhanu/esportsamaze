'use client';

import * as React from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankedTeam {
  rank: number;
  name: string;
  slug?: string;
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
        'inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-black shrink-0',
        rank === 1 && 'bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 shadow-xs',
        rank === 2 && 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
        rank === 3 && 'bg-amber-600/20 text-amber-700 dark:text-amber-400',
        rank > 3 && 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500'
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
        className="w-5 h-5 rounded-md object-contain shrink-0"
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
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400 shrink-0">
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
      .then((json: { data?: RankingsResponse } & RankingsResponse) => {
        if (!cancelled && json) {
          setData(json.data ?? json);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = data === null && !failed;
  const empty =
    !loading &&
    !failed &&
    (data?.teams?.length ?? 0) === 0 &&
    (data?.players?.length ?? 0) === 0;

  return (
    <section id="krafton-rankings" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A5FC4]/10 text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
            <Shield className="w-4 h-4" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white">
            KRAFTON Power Rankings
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block rounded-full bg-slate-200/60 px-3 py-1 text-[11px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400">
            Decay-Adjusted Rolling Points
          </span>
          <Link
            href="/rankings"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A5FC4] hover:underline dark:text-blue-400"
          >
            <span>Full rankings</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {empty ? (
        <p className="py-8 text-center text-xs text-slate-400">
          No ranking events have been recorded yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teams column */}
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
              <span className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Teams
              </span>
              <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
                Top 10
              </span>
            </div>

            {loading ? (
              <RankSkeleton rowsWithSub={false} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/30 dark:border-white/5 dark:bg-white/[0.01]">
                      <th className="py-2.5 px-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 w-10">#</th>
                      <th className="py-2.5 px-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Team</th>
                      <th className="py-2.5 px-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 w-14">Events</th>
                      <th className="py-2.5 px-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400 w-20">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                    {(data?.teams ?? []).map((team) => (
                      <tr
                        key={team.name}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2.5 px-2 text-center">
                          <RankBadge rank={team.rank} />
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="flex items-center gap-2.5 min-w-0">
                            <TeamLogo name={team.name} logos={data?.logos ?? {}} />
                            <Link
                              href={`/teams/${encodeURIComponent(team.slug || team.name.toLowerCase().replace(/\s+/g, '-'))}`}
                              className="font-bold text-slate-900 truncate hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400 transition-colors"
                            >
                              {team.name}
                            </Link>
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-500 dark:text-slate-400">
                          {team.events}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                          {team.points.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Players column */}
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02]">
              <span className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Players
              </span>
              <span className="rounded-full bg-[#0A5FC4]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
                Top 10
              </span>
            </div>

            {loading ? (
              <RankSkeleton rowsWithSub />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/30 dark:border-white/5 dark:bg-white/[0.01]">
                      <th className="py-2.5 px-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 w-10">#</th>
                      <th className="py-2.5 px-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Player</th>
                      <th className="py-2.5 px-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400 w-14">Finishes</th>
                      <th className="py-2.5 px-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-400 w-20">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                    {(data?.players ?? []).map((player) => (
                      <tr
                        key={player.name}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2.5 px-2 text-center">
                          <RankBadge rank={player.rank} />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <TeamLogo
                              name={player.team || 'Free Agent'}
                              logos={data?.logos ?? {}}
                            />
                            <div className="min-w-0 leading-tight">
                              {player.slug ? (
                                <Link
                                  href={`/players/${player.slug}`}
                                  className="font-bold text-slate-900 truncate hover:text-[#0A5FC4] dark:text-white dark:hover:text-blue-400 transition-colors"
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
                                  'text-[10px] truncate font-medium',
                                  player.team
                                    ? 'text-slate-400'
                                    : 'text-slate-400 italic opacity-70'
                                )}
                              >
                                {player.team ? (
                                  player.teamSlug ? (
                                    <Link
                                      href={`/teams/${player.teamSlug}`}
                                      className="hover:text-[#0A5FC4] dark:hover:text-blue-400 transition-colors"
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
                        <td className="py-2.5 px-2 text-center font-bold text-slate-500 dark:text-slate-400">
                          {player.totalFinishes}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                          {player.points.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

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
