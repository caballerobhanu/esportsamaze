'use client';

import * as React from 'react';
import Link from 'next/link';
import { TEAM_CHIP_BOX, TEAM_CHIP_FILL, TeamMark } from '@/components/ui/team-mark';
import type { StandingsLogoMode } from '@/lib/standings-config';

/** Shared preview table shell: hairline rows, no shadows, tight on a phone. */
function PreviewTable({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-white/5">
          {head}
        </thead>
        {children}
      </table>
    </div>
  );
}

function ShowMore({
  total,
  initial,
  expanded,
  onToggle,
}: {
  total: number;
  initial: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] shadow-sm transition-colors hover:border-[#0A5FC4] dark:border-white/10 dark:bg-[#0b1220] dark:text-blue-300"
    >
      {expanded ? `Show top ${initial}` : `Show all ${total}`}
    </button>
  );
}

export interface HeadToHeadRowView {
  key: string;
  name: string;
  fullName: string;
  faced: number;
  wins: number;
  losses: number;
  ties: number;
  diff: string;
  lastMeeting: string;
}

/**
 * Head to head — the desktop table, minus the opponent's average points column
 * (the diff already carries that comparison), with short names and the shorter
 * default list the board already uses.
 */
export function HeadToHeadPreviewTable({ rows, initial = 8 }: { rows: HeadToHeadRowView[]; initial?: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const shown = expanded ? rows : rows.slice(0, initial);

  return (
    <>
      <PreviewTable
        head={
          <tr>
            <th className="px-3 py-2">Opponent</th>
            <th className="px-2 py-2 text-center">Faced</th>
            <th className="px-2 py-2 text-center">W–L</th>
            <th className="px-2 py-2 text-center">Diff</th>
            <th className="px-3 py-2 text-right">Last</th>
          </tr>
        }
      >
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {shown.map((row) => (
            <tr key={row.key}>
              <td className="px-3 py-2 font-extrabold text-slate-900 dark:text-white" title={row.fullName}>
                {row.name}
              </td>
              <td className="px-2 py-2 text-center font-bold tabular-nums text-slate-500 dark:text-slate-400">
                {row.faced}
              </td>
              <td className="px-2 py-2 text-center font-black tabular-nums">
                <span className="text-emerald-600 dark:text-emerald-400">{row.wins}</span>
                <span className="text-slate-300 dark:text-slate-600">–</span>
                <span className="text-rose-600 dark:text-rose-400">{row.losses}</span>
                {row.ties > 0 ? <span className="text-slate-400">–{row.ties}</span> : null}
              </td>
              <td className="px-2 py-2 text-center font-black tabular-nums text-slate-500 dark:text-slate-400">
                {row.diff}
              </td>
              <td className="px-3 py-2 text-right text-[11px] font-bold tabular-nums text-slate-400">
                {row.lastMeeting}
              </td>
            </tr>
          ))}
        </tbody>
      </PreviewTable>

      {rows.length > initial ? (
        <ShowMore total={rows.length} initial={initial} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      ) : null}
    </>
  );
}

export interface MatchHistoryRowView {
  key: string;
  date: string;
  tournament: string;
  fullTournament: string;
  map: string;
  rank: number;
  wwcd: boolean;
  elims: number;
  total: number;
}

/**
 * Match history — the desktop table with the mobile column set: short date, short
 * event, map, rank (carrying the WWCD mark), elims and total.
 */
export function MatchHistoryPreviewTable({ rows }: { rows: MatchHistoryRowView[] }) {
  return (
    <PreviewTable
      head={
        <tr>
          <th className="px-3 py-2">Date</th>
          <th className="px-2 py-2">Event</th>
          <th className="px-2 py-2">Map</th>
          <th className="px-2 py-2 text-center">Rank</th>
          <th className="px-2 py-2 text-center">Elim</th>
          <th className="px-3 py-2 text-right">Total</th>
        </tr>
      }
    >
      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
        {rows.map((row) => (
          <tr key={row.key}>
            <td className="whitespace-nowrap px-3 py-2 font-bold tabular-nums text-slate-500 dark:text-slate-400">
              {row.date}
            </td>
            <td className="max-w-[92px] truncate px-2 py-2 font-extrabold text-slate-900 dark:text-white" title={row.fullTournament}>
              {row.tournament}
            </td>
            <td className="max-w-[72px] truncate px-2 py-2 font-semibold text-slate-500 dark:text-slate-400">
              {row.map}
            </td>
            <td className="whitespace-nowrap px-2 py-2 text-center font-black tabular-nums text-slate-900 dark:text-white">
              {row.rank ? `#${row.rank}` : '—'}
              {row.wwcd ? (
                <span className="ml-1 text-[10px]" title="Won the match (WWCD)">
                  🍗
                </span>
              ) : null}
            </td>
            <td className="px-2 py-2 text-center font-bold tabular-nums text-slate-500 dark:text-slate-400">
              {row.elims}
            </td>
            <td className="px-3 py-2 text-right font-black tabular-nums text-[#0A5FC4] dark:text-blue-300">
              {row.total}
            </td>
          </tr>
        ))}
      </tbody>
    </PreviewTable>
  );
}

export interface ScorecardRowView {
  key: string;
  rank: number;
  teamTag: string;
  teamName: string;
  teamHref: string;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  countryCode?: string | null;
  wwcd: boolean;
  placePoints: number;
  elimsPoints: number;
  totalPoints: number;
}

/**
 * Match scorecard — same row anatomy as the standings tab, because the two show
 * the same thing: the accent-left rank badge, the crest box, the short tag on a
 * phone, and the single-letter headers.
 */
export function ScorecardPreviewTable({
  rows,
  logoMode = 'TEAM',
}: {
  rows: ScorecardRowView[];
  logoMode?: StandingsLogoMode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10 dark:bg-white/5">
            <th className="w-8 py-2.5 pl-3 text-center">#</th>
            <th className="min-w-[75px] py-2.5 pl-2">Squad</th>
            <th className="w-7 py-2.5 px-1 text-center">W</th>
            <th className="w-8 py-2.5 px-1 text-center">E</th>
            <th className="w-8 py-2.5 px-1 text-center">P</th>
            <th className="w-12 py-2.5 pr-3 text-right">T</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
          {rows.map((row) => (
            <tr
              key={row.key}
              className="group text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5"
            >
              <td className="py-2.5 pl-3 text-center font-black">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black ${
                    row.rank === 1
                      ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/25'
                      : row.rank === 2
                        ? 'bg-slate-300 text-slate-900'
                        : row.rank === 3
                          ? 'bg-amber-600/20 text-amber-600 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                  }`}
                >
                  {row.rank}
                </span>
              </td>

              <td className="py-2.5 pl-2 pr-2">
                <div className="flex items-center gap-2">
                  <TeamMark
                    mode={logoMode}
                    name={row.teamName}
                    lightSrc={row.logoUrl}
                    darkSrc={row.logoDarkUrl}
                    countryCode={row.countryCode}
                    href={row.teamHref}
                    tileClassName={`${TEAM_CHIP_BOX} ${TEAM_CHIP_FILL} relative flex items-center justify-center overflow-hidden hover:scale-105 transition-transform`}
                    logoClassName="object-contain p-0.5"
                    fallbackClassName="text-[9px] font-black text-slate-400"
                  />
                  <Link
                    href={row.teamHref}
                    className="block truncate font-black text-xs uppercase tracking-wide text-slate-900 transition-colors hover:text-[#0A5FC4] dark:text-white"
                    title={row.teamName}
                  >
                    {row.teamTag}
                  </Link>
                </div>
              </td>

              <td className="px-1 py-2.5 text-center text-xs font-black text-amber-600 dark:text-amber-400">
                {row.wwcd ? '1' : '—'}
              </td>
              <td className="px-1 py-2.5 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
                {row.elimsPoints}
              </td>
              <td className="px-1 py-2.5 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
                {row.placePoints}
              </td>
              <td className="pr-3 py-2.5 text-right text-xs font-black text-[#0A5FC4] dark:text-blue-300">
                {row.totalPoints}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
