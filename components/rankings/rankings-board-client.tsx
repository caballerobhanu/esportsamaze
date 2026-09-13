'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  Flame,
  Medal,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import type { RankedBoardEntity, TransferRule, UnifiedNextUpdate } from '@/lib/krafton-standings';
import { KraftonRulesDialog } from '@/components/rankings/krafton-rules-dialog';
import { KraftonTransferLedgerDialog } from '@/components/rankings/krafton-transfer-ledger-dialog';

export interface EntityLogoMeta {
  logoUrl: string | null;
  imageDarkUrl?: string | null;
  slug?: string | null;
  currentTeamName?: string | null;
  currentTeamSlug?: string | null;
}

const SOLID_TOP5_STYLES: Record<
  number,
  {
    bg: string;
    border: string;
    shadow: string;
    badgeBg: string;
    iconColor: string;
  }
> = {
  1: {
    bg: 'bg-[#B45309]', // Rich Gold / Amber
    border: 'border-amber-400/40',
    shadow: 'shadow-lg shadow-amber-950/20',
    badgeBg: 'bg-white/20 text-white border-white/30',
    iconColor: 'text-amber-200',
  },
  2: {
    bg: 'bg-[#334155]', // Sleek Slate / Silver Steel
    border: 'border-slate-400/35',
    shadow: 'shadow-lg shadow-slate-950/25',
    badgeBg: 'bg-white/20 text-white border-white/30',
    iconColor: 'text-slate-200',
  },
  3: {
    bg: 'bg-[#C2410C]', // Burnished Bronze / Terracotta
    border: 'border-orange-400/40',
    shadow: 'shadow-lg shadow-orange-950/20',
    badgeBg: 'bg-white/20 text-white border-white/30',
    iconColor: 'text-orange-200',
  },
  4: {
    bg: 'bg-[#0A5FC4]', // Signature Royal Blue
    border: 'border-blue-400/40',
    shadow: 'shadow-lg shadow-blue-950/20',
    badgeBg: 'bg-white/20 text-white border-white/30',
    iconColor: 'text-blue-200',
  },
  5: {
    bg: 'bg-[#4338CA]', // Deep Electric Indigo
    border: 'border-indigo-400/40',
    shadow: 'shadow-lg shadow-indigo-950/20',
    badgeBg: 'bg-white/20 text-white border-white/30',
    iconColor: 'text-indigo-200',
  },
};

const DEFAULT_SOLID_STYLE = {
  bg: 'bg-[#0A5FC4]',
  border: 'border-blue-400/40',
  shadow: 'shadow-lg shadow-blue-950/20',
  badgeBg: 'bg-white/20 text-white border-white/30',
  iconColor: 'text-blue-200',
};

export function RankingsBoardClient({
  board,
  ranked,
  snapshotDates,
  selectedDate,
  logosMap,
  transfers,
  nextUpdate,
}: {
  board: 'TEAM' | 'PLAYER';
  ranked: RankedBoardEntity[];
  snapshotDates: string[];
  selectedDate: string;
  logosMap: Record<string, EntityLogoMeta>;
  transfers: TransferRule[];
  nextUpdate?: UnifiedNextUpdate | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPlayers = board === 'PLAYER';
  const detailBase = isPlayers ? '/rankings/player' : '/rankings/team';

  // Search & quick filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterTier, setFilterTier] = React.useState<'ALL' | 'TOP10' | 'TOP25' | 'MULTI'>('ALL');

  // Filtered rows
  const filtered = React.useMemo(() => {
    let list = [...ranked];

    if (filterTier === 'TOP10') {
      list = list.slice(0, 10);
    } else if (filterTier === 'TOP25') {
      list = list.slice(0, 25);
    } else if (filterTier === 'MULTI') {
      list = list.filter((e) => e.events >= 2);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((e) => {
        const currentTeam = e.entityId ? logosMap[e.entityId]?.currentTeamName : null;
        return (
          e.entityName.toLowerCase().includes(q) ||
          (e.latestTeamName && e.latestTeamName.toLowerCase().includes(q)) ||
          (currentTeam && currentTeam.toLowerCase().includes(q))
        );
      });
    }

    return list;
  }, [ranked, filterTier, searchQuery, logosMap]);

  // Top 5 entities for designer leader cards
  const top5 = ranked.slice(0, 5);

  const handleDateSelect = (dateStr: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (dateStr === snapshotDates[0]) {
      params.delete('date');
    } else {
      params.set('date', dateStr);
    }
    router.push(`/rankings${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const isHistorical = selectedDate !== snapshotDates[0];

  return (
    <div className="space-y-8">
      {/* ── Masthead ── */}
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0A5FC4]/10 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:bg-[#0A5FC4]/20 dark:text-blue-300">
            <Trophy className="h-3.5 w-3.5" />
            <span>Official KRAFTON Standings</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {isPlayers ? 'Player Rankings' : 'Team Rankings'}
          </h1>
          <p className="max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Rolling points accrued across Publisher and Tier events with decay by recency. Roster acquisitions
            attribute points to the acquiring organisation prior to cutoff dates.
          </p>
        </div>

        {/* Action modals trigger strip */}
        <div className="flex flex-wrap items-center gap-2">
          <KraftonRulesDialog />
          <KraftonTransferLedgerDialog transfers={transfers} />
        </div>
      </div>

      {/* ── Capsule Tab Dock & Historical Status ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-white/10">
        <div className="flex w-fit items-center rounded-full bg-slate-200/70 p-1 dark:bg-white/10">
          <Link
            href="/rankings"
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition-all ${
              !isPlayers
                ? 'bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" /> Teams
          </Link>
          <Link
            href="/rankings?board=players"
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition-all ${
              isPlayers
                ? 'bg-[#0A5FC4] text-white shadow-md dark:bg-blue-600'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Players
          </Link>
        </div>

        {isHistorical && (
          <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-950/30 dark:text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Viewing Frozen Snapshot: {selectedDate}</span>
            <button
              type="button"
              onClick={() => handleDateSelect(snapshotDates[0])}
              className="ml-1 text-[11px] underline hover:no-underline font-mono"
            >
              Reset to Latest
            </button>
          </div>
        )}
      </div>

      {/* ── Unified Next Update Alert Strip ── */}
      {nextUpdate && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-xs font-semibold ${
            nextUpdate.type === 'event'
              ? 'border-blue-400/25 bg-blue-50/60 text-blue-950 dark:border-blue-500/20 dark:bg-blue-950/20 dark:text-blue-200'
              : 'border-amber-400/25 bg-amber-50/60 text-amber-950 dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock
              className={`h-4 w-4 ${
                nextUpdate.type === 'event' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            />
            <span>
              Next official rankings update in <strong className="font-black">{nextUpdate.daysRemaining} days</strong> —{' '}
              <span className="font-bold">{nextUpdate.title}</span> on {nextUpdate.dateStr}. {nextUpdate.description}.
            </span>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-black uppercase ${
              nextUpdate.type === 'event'
                ? 'bg-blue-200/60 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                : 'bg-amber-200/60 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
            }`}
          >
            {nextUpdate.type === 'event' ? 'Point Addition' : 'Point Decay'}
          </span>
        </div>
      )}

      {/* ── Snapshot Date Timeline Strip (Latest 7 updates) ── */}
      {snapshotDates.length > 0 && (() => {
        const top7 = snapshotDates.slice(0, 7);
        const visibleDates = top7.includes(selectedDate) ? top7 : [selectedDate, ...top7.slice(0, 6)];

        return (
          <div>
            {/* Mobile Dropdown (hidden on sm+) */}
            <div className="flex sm:hidden items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Historical Snapshot:</span>
              </div>
              <select
                value={selectedDate}
                onChange={(e) => handleDateSelect(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs dark:border-white/10 dark:bg-slate-800 dark:text-white"
                aria-label="Select snapshot date"
              >
                {snapshotDates.map((d, i) => (
                  <option key={d} value={d}>
                    {i === 0 ? `Latest (${d})` : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Pill Bar (hidden on mobile, visible on sm+) */}
            <div className="hidden sm:block space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Calendar className="h-3 w-3" />
                <span>Historical Ranking Snapshots (Latest 7 Updates)</span>
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {visibleDates.map((dateStr) => {
                    const isSelected = selectedDate === dateStr;
                    const isLatest = dateStr === snapshotDates[0];

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => handleDateSelect(dateStr)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-slate-950 text-white shadow-xs dark:bg-white dark:text-slate-950 ring-2 ring-(--ed-blue)'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                        }`}
                      >
                        <span>{isLatest ? `Latest (${dateStr})` : dateStr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Top 5 Designer Cards Deck ── */}
      {top5.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Flame className="h-3 w-3 text-amber-500" />
            <span>Current Top 5 Contenders</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {top5.map((entity) => {
              const logo = entity.entityId ? logosMap[entity.entityId] : null;
              const isFirst = entity.rank === 1;
              const isSecond = entity.rank === 2;
              const isThird = entity.rank === 3;
              const cardStyle = SOLID_TOP5_STYLES[entity.rank] || DEFAULT_SOLID_STYLE;
              const readableSlug =
                logo?.slug ||
                entity.entityName
                  .toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)/g, '') ||
                entity.key;
              const displayTeam = (isPlayers && logo?.currentTeamName)
                ? logo.currentTeamName
                : (entity.latestTeamName ?? null);

              return (
                <Link
                  key={entity.key}
                  href={`${detailBase}/${encodeURIComponent(readableSlug)}`}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 text-white transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${cardStyle.bg} ${cardStyle.border} ${cardStyle.shadow}`}
                >
                  {/* Subtle rank watermark in background */}
                  <span className="pointer-events-none absolute -bottom-3 -right-1 select-none font-mono text-7xl font-black text-white/10">
                    #{entity.rank}
                  </span>

                  {/* Top Bar: Rank & Change Badge */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-xs font-black backdrop-blur-xs ${cardStyle.badgeBg}`}
                    >
                      {isFirst ? (
                        <Trophy className="h-3 w-3 shrink-0 text-amber-200" />
                      ) : isSecond || isThird ? (
                        <Medal className={`h-3 w-3 shrink-0 ${cardStyle.iconColor}`} />
                      ) : (
                        <Sparkles className={`h-3 w-3 shrink-0 ${cardStyle.iconColor}`} />
                      )}
                      #{entity.rank}
                    </span>

                  {/* Rank change indicator */}
                  <RankChangeBadge change={entity.rankChange} onSolid />
                </div>

                {/* Body: Logo + Name */}
                <div className="relative z-10 my-3.5 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-md ring-1 ring-black/5">
                    {logo?.logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={logo.logoUrl}
                        alt={entity.entityName}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-base font-black text-slate-800">
                        {entity.entityName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black uppercase tracking-tight text-white transition-opacity group-hover:opacity-90">
                      {entity.entityName}
                    </p>
                    <p className="truncate text-[11px] font-semibold text-white/80">
                      {isPlayers && displayTeam
                        ? displayTeam
                        : `${entity.events} event${entity.events === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </div>

                  {/* Footer: Finishes (if player) & Points */}
                  <div className="relative z-10 flex items-baseline justify-between border-t border-white/20 pt-2.5">
                    {isPlayers ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                            Finishes
                          </span>
                          <span className="font-mono text-xs font-black text-white/90">
                            {(entity.finishes ?? entity.contributions.reduce((s, c) => s + (c.finishes || 0), 0)).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                            Points
                          </span>
                          <span className="font-mono text-base font-black text-white tracking-tight">
                            {Math.round(entity.totalPoints).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                          Points
                        </span>
                        <span className="font-mono text-base font-black text-white tracking-tight">
                          {Math.round(entity.totalPoints).toLocaleString('en-IN')}
                        </span>
                      </>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0b1220] sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isPlayers ? 'Search players by IGN or team name…' : 'Search teams by name…'}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'TOP10', label: 'Top 10' },
              { id: 'TOP25', label: 'Top 25' },
              { id: 'MULTI', label: '2+ Events' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterTier(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                filterTier === f.id
                  ? 'bg-[#0A5FC4] text-white shadow-xs dark:bg-blue-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
            {isPlayers ? 'Player Standings' : 'Team Standings'} · Showing {filtered.length} of {ranked.length}
          </h2>
          <span className="text-[11px] font-bold text-slate-400">
            {isHistorical ? `Snapshot as of ${selectedDate}` : 'Decay-adjusted as of today'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-0 text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/30 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/5 dark:bg-white/[0.01]">
              <tr>
                <th className="px-2 py-3 sm:px-5 text-center w-16">Rank</th>
                <th className="px-2 py-3 sm:px-5">{isPlayers ? 'Player' : 'Team'}</th>
                {isPlayers && <th className="hidden sm:table-cell px-5 py-3">Team</th>}
                <th className="hidden sm:table-cell px-5 py-3 text-center">Events</th>
                {isPlayers && <th className="px-3 py-3 sm:px-5 text-right">Finishes</th>}
                <th className="px-3 py-3 sm:px-5 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filtered.map((entity) => {
                const logo = entity.entityId ? logosMap[entity.entityId] : null;
                const readableSlug =
                  logo?.slug ||
                  entity.entityName
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '') ||
                  entity.key;
                const displayTeam = (isPlayers && logo?.currentTeamName)
                  ? logo.currentTeamName
                  : (entity.latestTeamName ?? '—');

                return (
                  <tr
                    key={entity.key}
                    className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5"
                    onClick={() => router.push(`${detailBase}/${encodeURIComponent(readableSlug)}`)}
                  >
                    {/* Rank with change indicator on the left */}
                    <td className="px-2 py-3 sm:px-5 text-center">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2">
                        <RankChangeBadge change={entity.rankChange} />
                        <span
                          className={`inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg text-xs font-black ${
                            entity.rank === 1
                              ? 'bg-amber-400 text-slate-950 shadow-xs'
                              : entity.rank === 2
                                ? 'bg-slate-300 text-slate-900'
                                : entity.rank === 3
                                  ? 'bg-orange-400/80 text-white'
                                  : 'text-slate-500 font-mono'
                          }`}
                        >
                          {entity.rank}
                        </span>
                      </div>
                    </td>

                    {/* Name + Logo */}
                    <td className="px-2 py-3 sm:px-5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Link
                          href={`${detailBase}/${encodeURIComponent(readableSlug)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex min-w-0 items-center gap-2 sm:gap-3"
                        >
                          {logo?.logoUrl ? (
                            <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-white/10 dark:bg-[#141e33]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={logo.logoUrl} alt="" className="h-full w-full object-contain p-0.5 dark:hidden" />
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={logo.imageDarkUrl || logo.logoUrl}
                                alt=""
                                className="hidden h-full w-full object-contain p-0.5 dark:block"
                              />
                            </span>
                          ) : (
                            <span className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 dark:border-white/10 dark:bg-[#141e33]">
                              {entity.entityName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <span className="block truncate font-black text-slate-900 transition-colors group-hover:text-[#0A5FC4] dark:text-white dark:group-hover:text-blue-400 text-xs sm:text-sm">
                              {entity.entityName}
                            </span>
                            {isPlayers && displayTeam && displayTeam !== '—' && (
                              <span className="block truncate text-[10px] text-slate-400 sm:hidden">
                                {displayTeam}
                              </span>
                            )}
                          </div>
                        </Link>

                        {/* Direct link to site profile */}
                        {logo?.slug && (
                          <Link
                            href={isPlayers ? `/players/${logo.slug}` : `/teams/${logo.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            title="Visit site profile"
                            className="hidden sm:inline-block rounded-md p-1 text-slate-300 hover:text-[#0A5FC4] dark:hover:text-blue-300"
                          >
                            →
                          </Link>
                        )}
                      </div>
                    </td>

                    {isPlayers && (
                      <td className="hidden sm:table-cell px-5 py-3 text-slate-600 dark:text-slate-300 font-medium">{displayTeam}</td>
                    )}

                    <td className="hidden sm:table-cell px-5 py-3 text-center font-mono text-slate-500">{entity.events}</td>

                    {isPlayers && (
                      <td className="px-3 py-3 sm:px-5 text-right font-mono font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                        {(entity.finishes ?? entity.contributions.reduce((s, c) => s + (c.finishes || 0), 0)).toLocaleString('en-IN')}
                      </td>
                    )}

                    <td className="px-3 py-3 sm:px-5 text-right font-black font-mono text-[#0A5FC4] dark:text-blue-300 text-sm sm:text-base">
                      {Math.round(entity.totalPoints).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isPlayers ? 6 : 4} className="px-5 py-12 text-center text-xs text-slate-400">
                    No results match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Rank change indicator on the left of the rank number. */
function RankChangeBadge({
  change,
  onSolid,
}: {
  change: number | 'NEW';
  onSolid?: boolean;
}) {
  if (change === 'NEW') {
    return (
      <span
        className={
          onSolid
            ? 'rounded-full border border-white/35 bg-white/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-xs'
            : 'rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-600 dark:text-amber-400'
        }
      >
        NEW
      </span>
    );
  }

  if (change > 0) {
    return (
      <span
        className={
          onSolid
            ? 'inline-flex items-center gap-0.5 rounded-md border border-emerald-400/35 bg-emerald-500/30 px-1.5 py-0.5 font-mono text-[10px] font-black text-emerald-100 backdrop-blur-xs'
            : 'font-mono text-[11px] font-black text-emerald-600 dark:text-emerald-400'
        }
      >
        ▲{change}
      </span>
    );
  }

  if (change < 0) {
    return (
      <span
        className={
          onSolid
            ? 'inline-flex items-center gap-0.5 rounded-md border border-rose-400/35 bg-rose-500/30 px-1.5 py-0.5 font-mono text-[10px] font-black text-rose-100 backdrop-blur-xs'
            : 'font-mono text-[11px] font-black text-rose-600 dark:text-rose-400'
        }
      >
        ▼{Math.abs(change)}
      </span>
    );
  }

  return (
    <span
      className={
        onSolid
          ? 'font-mono text-[11px] font-bold text-white/50'
          : 'font-mono text-[11px] font-bold text-slate-300 dark:text-slate-600'
      }
    >
      —
    </span>
  );
}
