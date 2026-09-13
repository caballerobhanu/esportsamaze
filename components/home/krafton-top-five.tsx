import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Trophy, Users, User } from 'lucide-react';
import { SectionHeading } from '@/components/home/section-heading';
import { fetchBoardEntries, fetchTeamTransfers } from '@/lib/krafton-data';
import { computeBoard } from '@/lib/krafton-standings';

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/15 text-xs font-black text-amber-500 dark:text-amber-400 shadow-xs">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-400/30 bg-slate-400/15 text-xs font-bold text-slate-700 dark:text-slate-300">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-orange-500/30 bg-orange-500/15 text-xs font-bold text-orange-600 dark:text-orange-400">
        3
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--ed-hair)] bg-[var(--ed-sand)] text-xs font-bold text-[var(--ed-stone)]">
      {rank}
    </span>
  );
}

/** Compact KRAFTON rankings block for the homepage — top 5 of each board. */
export async function KraftonTopFive() {
  const [teamEntries, playerEntries, transfers] = await Promise.all([
    fetchBoardEntries('TEAM').catch(() => []),
    fetchBoardEntries('PLAYER').catch(() => []),
    fetchTeamTransfers().catch(() => []),
  ]);

  const topTeams = computeBoard(teamEntries, transfers)
    .slice(0, 5)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  const topPlayers = computeBoard(playerEntries)
    .slice(0, 5)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const column = (
    title: string,
    subtitle: string,
    icon: React.ReactNode,
    rows: Array<{
      rank: number;
      entityName: string;
      totalPoints: number;
      key: string;
      board: string;
      latestTeamName?: string | null;
      events?: number;
    }>,
    detailBase: string,
    viewAllHref: string
  ) => (
    <div className="ed-card flex flex-col justify-between">
      <div>
        {/* Card Header with Solid Background */}
        <div className="flex items-center justify-between bg-slate-900 text-white dark:bg-slate-900 border-b border-slate-800 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-blue-400">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">{title}</h3>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{subtitle}</p>
            </div>
          </div>
          <Link
            href={viewAllHref}
            className="group flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-white transition-colors"
          >
            <span>Full board</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Rows List */}
        <div className="divide-y divide-[var(--ed-hair)]/60">
          {rows.map((r) => (
            <Link
              key={r.key}
              href={`${detailBase}/${encodeURIComponent(r.key)}`}
              className="group flex items-center justify-between gap-3 px-4 py-3 sm:px-5 transition-colors hover:bg-[var(--ed-sand)]/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <RankBadge rank={r.rank} />
                <div className="min-w-0">
                  <div className="truncate font-bold text-sm text-[var(--ed-ink)] transition-colors group-hover:text-[var(--ed-blue)]">
                    {r.entityName}
                  </div>
                  {r.board === 'PLAYER' && r.latestTeamName && (
                    <div className="truncate text-[11px] font-medium text-[var(--ed-stone)]">
                      {r.latestTeamName}
                    </div>
                  )}
                  {r.board === 'TEAM' && r.events && (
                    <div className="text-[11px] font-medium text-[var(--ed-stone)]">
                      {r.events} {r.events === 1 ? 'event' : 'events'} played
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="num font-extrabold text-sm text-[var(--ed-ink)] group-hover:text-[var(--ed-blue)] transition-colors">
                  {Math.round(r.totalPoints).toLocaleString('en-IN')}
                </span>
                <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-[var(--ed-stone)]">
                  pts
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between border-t border-[var(--ed-hair)]/70 bg-[var(--ed-sand)]/20 px-4 py-2.5 sm:px-5 text-[11px] text-[var(--ed-stone)]">
        <span className="flex items-center gap-1.5 font-medium">
          <Trophy className="h-3.5 w-3.5 text-amber-500/80" />
          Official Points Circuit
        </span>
        <Link
          href={viewAllHref}
          className="font-semibold text-[var(--ed-blue)] hover:underline"
        >
          View all ranks →
        </Link>
      </div>
    </div>
  );

  return (
    <section id="krafton-rankings" className="space-y-4">
      <SectionHeading
        id="krafton-rankings-heading"
        kicker="KRAFTON India Esports"
        title="BGMI Season Standings & Rankings"
        href="/rankings"
        linkLabel="All leaderboards"
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {column(
          'Top Teams',
          'Squad Leaderboard',
          <Users className="h-3.5 w-3.5" />,
          topTeams,
          '/rankings/team',
          '/rankings'
        )}
        {column(
          'Top Players',
          'Individual Fraggers',
          <User className="h-3.5 w-3.5" />,
          topPlayers,
          '/rankings/player',
          '/rankings?board=players'
        )}
      </div>
    </section>
  );
}
