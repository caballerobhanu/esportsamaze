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
        'inline-flex items-center justify-center w-5 h-5 rounded text-xs num font-bold shrink-0',
        rank === 1 && 'bg-amber-400 text-slate-950 font-bold',
        rank === 2 && 'bg-slate-300 dark:bg-slate-700 text-[var(--ed-ink)] font-bold',
        rank === 3 && 'bg-amber-700/20 text-amber-700 dark:text-amber-400 font-bold',
        rank > 3 && 'bg-[var(--ed-sand)] text-[var(--ed-stone)]'
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
    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[var(--ed-sand)] text-[10px] font-bold text-[var(--ed-stone)] shrink-0">
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

  return (
    <section id="krafton-rankings" className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--ed-blue)]" />
          <h2 className="font-display text-xl font-medium tracking-tight text-[var(--ed-ink)]">
            KRAFTON Rankings
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="ed-chip text-[var(--ed-stone)]">
            Decay-Adjusted Rolling Points
          </span>
          <Link
            href="/rankings"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ed-blue)] hover:underline"
          >
            Full rankings →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Teams column */}
        <div className="ed-card">
          <div className="ed-card-head">
            <span className="font-semibold text-xs uppercase tracking-wider text-[var(--ed-ink)]">
              Teams
            </span>
            <span className="ed-chip text-[var(--ed-stone)]">Top 10</span>
          </div>

          {loading ? (
            <RankSkeleton rowsWithSub={false} />
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[var(--ed-sand)]/50 border-b border-[var(--ed-hair)]">
                  <th className="ed-th text-center w-10">#</th>
                  <th className="ed-th">Team</th>
                  <th className="ed-th text-center w-14">Events</th>
                  <th className="ed-th text-right w-20">Points</th>
                </tr>
              </thead>
              <tbody className="ed-rows font-medium">
                {(data?.teams ?? []).map((team) => (
                  <tr
                    key={team.name}
                    className="hover:bg-[var(--ed-sand)]/30 transition-colors"
                  >
                    <td className="py-2.5 px-2 text-center">
                      <RankBadge rank={team.rank} />
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-2 min-w-0">
                        <TeamLogo name={team.name} logos={data?.logos ?? {}} />
                        <Link
                          href={`/teams/${encodeURIComponent(team.name.toLowerCase().replace(/\s+/g, '-'))}`}
                          className="font-semibold text-[var(--ed-ink)] truncate hover:text-[var(--ed-blue)] transition-colors"
                        >
                          {team.name}
                        </Link>
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center num text-[var(--ed-stone)]">
                      {team.events}
                    </td>
                    <td className="py-2.5 px-3 text-right num font-bold text-[var(--ed-ink)]">
                      {team.points.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Players column */}
        <div className="ed-card">
          <div className="ed-card-head">
            <span className="font-semibold text-xs uppercase tracking-wider text-[var(--ed-ink)]">
              Players
            </span>
            <span className="ed-chip text-[var(--ed-stone)]">Top 10</span>
          </div>

          {loading ? (
            <RankSkeleton rowsWithSub />
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[var(--ed-sand)]/50 border-b border-[var(--ed-hair)]">
                  <th className="ed-th text-center w-10">#</th>
                  <th className="ed-th">Player</th>
                  <th className="ed-th text-center w-14">Finishes</th>
                  <th className="ed-th text-right w-20">Points</th>
                </tr>
              </thead>
              <tbody className="ed-rows font-medium">
                {(data?.players ?? []).map((player) => (
                  <tr
                    key={player.name}
                    className="hover:bg-[var(--ed-sand)]/30 transition-colors"
                  >
                    <td className="py-2.5 px-2 text-center">
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
                              className="font-semibold text-[var(--ed-ink)] truncate hover:text-[var(--ed-blue)] transition-colors"
                            >
                              {player.name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-[var(--ed-ink)] truncate">
                              {player.name}
                            </span>
                          )}
                          <div
                            className={cn(
                              'text-[10px] truncate',
                              player.team
                                ? 'text-[var(--ed-stone)]'
                                : 'text-[var(--ed-stone)] italic opacity-70'
                            )}
                          >
                            {player.team ? (
                              player.teamSlug ? (
                                <Link
                                  href={`/teams/${player.teamSlug}`}
                                  className="hover:text-[var(--ed-blue)] transition-colors"
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
                    <td className="py-2.5 px-2 text-center num text-[var(--ed-stone)]">
                      {player.totalFinishes}
                    </td>
                    <td className="py-2.5 px-3 text-right num font-bold text-[var(--ed-ink)]">
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
