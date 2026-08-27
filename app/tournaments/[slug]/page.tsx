import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
  Handshake,
  Gamepad2,
  Layers,
  MonitorSmartphone,
  Trophy,
  Crown,
  Medal,
  Users,
  Camera,
  Globe,
  MessageCircle,
  AtSign,
  PlaySquare,
  Flame,
  Crosshair,
  Award,
  DollarSign,
  Sparkles,
  Shield,
  Clock,
  Zap,
  Swords,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { formatDate, formatPrizePool } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import {
  calculateTournamentStandings,
  calculateTournamentFraggers,
} from '@/lib/tournament-math';
import { StandingsTable } from '@/components/ui/standings-table';

export const dynamic = 'force-dynamic';

type SocialMap = Record<string, string>;

const SOCIAL_ICONS: Record<string, typeof Globe> = {
  instagram: Camera,
  youtube: PlaySquare,
  twitter: AtSign,
  x: AtSign,
  facebook: Globe,
  discord: MessageCircle,
  website: Globe,
  kick: PlaySquare,
  twitch: PlaySquare,
  liquipedia: Globe,
};

async function getTournamentData(slug: string) {
  try {
    return await prisma.tournament.findUnique({
      where: { slug },
      include: {
        game: true,
        organizers: { include: { organizer: true } },
        sponsors: { include: { sponsor: true } },
        venues: { include: { venue: true } },
        stages: {
          orderBy: { sequence: 'asc' },
          include: { groups: true },
        },
        teams: {
          orderBy: { seed: 'asc' },
          include: {
            team: {
              select: {
                id: true,
                name: true,
                tag: true,
                logoUrl: true,
                imageDarkUrl: true,
                slug: true,
                region: true,
                players: { select: { id: true, ign: true, role: true, avatarUrl: true } },
              },
            },
          },
        },
        matches: {
          orderBy: { scheduledAt: 'asc' },
          include: {
            stage: { select: { name: true } },
            games: {
              orderBy: { sequence: 'asc' },
              include: {
                teamResults: {
                  orderBy: { rank: 'asc' },
                  include: {
                    team: { select: { id: true, name: true, tag: true, logoUrl: true, imageDarkUrl: true } },
                  },
                },
                playerStats: {
                  orderBy: { playerElims: 'desc' },
                  include: {
                    player: { select: { id: true, ign: true, avatarUrl: true } },
                    team: { select: { id: true, name: true, tag: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { slug },
      select: { name: true, prizePool: true, currency: true },
    });
    if (tournament) {
      return {
        title: `${tournament.name} — Esports Amaze Standings, Matches & Stats`,
        description: `Official standings, match scorecards, prize pool distribution, participating team rosters, and top fraggers for ${tournament.name}.`,
      };
    }
  } catch {
    /* fall through */
  }
  return { title: 'Tournament Details | Esports Amaze' };
}

const STATUS_STYLES: Record<string, string> = {
  ONGOING: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  UPCOMING: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  CANCELED: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20',
};

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; match?: string }>;
}) {
  const { slug } = await params;
  const { tab, match } = await searchParams;
  const activeTab = tab || 'standings';

  const tournament = await getTournamentData(slug);
  if (!tournament) notFound();

  const socials = (tournament.socialLinks ?? {}) as SocialMap;
  const prizeDist = Array.isArray(tournament.prizeDistribution)
    ? (tournament.prizeDistribution as Array<{ rank: string; percentage?: number; prize: number }>)
    : [];

  const formatRules = (tournament.formatDetails ?? {}) as {
    pointsMatrix?: Record<string, number>;
    killPointsPerElim?: number;
    stagesDescription?: string;
    description?: string;
  };

  // Flatten match results for cumulative tournament stats
  const allTeamResults = tournament.matches.flatMap((m) =>
    m.games.flatMap((g) => g.teamResults)
  );
  const allPlayerStats = tournament.matches.flatMap((m) =>
    m.games.flatMap((g) => g.playerStats)
  );

  const standings = calculateTournamentStandings(allTeamResults);
  const fraggers = calculateTournamentFraggers(allPlayerStats);

  // Auto-calculated Winner & Runner Up
  const finalWinner = standings[0]?.teamName || tournament.winner || '';
  const finalRunnerUp = standings[1]?.teamName || tournament.runnerUp || '';

  // Selected Match for Match Center Deep-Dive
  const activeMatch = match
    ? tournament.matches.find((m) => m.id === match) || tournament.matches[0]
    : tournament.matches[0];
  const activeMatchGame = activeMatch?.games[0];

  const durationDays = Math.max(
    1,
    Math.round(
      (tournament.endDate.getTime() - tournament.startDate.getTime()) / 86_400_000
    ) + 1
  );

  const countriesList = Array.isArray(tournament.countries)
    ? (tournament.countries as string[])
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#07090e] text-slate-900 dark:text-slate-100 transition-colors selection:bg-[#0A5FC4] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#0A5FC4] dark:hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Tournaments
        </Link>

        {/* ================= HERO HEADER ================= */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div
            className="h-32 sm:h-44 bg-cover bg-center relative"
            style={{
              backgroundImage: tournament.bannerUrl
                ? `url(${tournament.bannerUrl})`
                : 'linear-gradient(to right, #0A5FC4, #4f46e5, #090d16)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>

          <div className="px-5 sm:px-8 pb-6 -mt-14 sm:-mt-16 relative">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
              {/* Dual theme tournament logo */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-[#0b101c] border-2 border-slate-200 dark:border-slate-700 shadow-xl flex items-center justify-center shrink-0 p-2 overflow-hidden">
                {tournament.imageUrl || tournament.imageDarkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tournament.imageDarkUrl || tournament.imageUrl || ''}
                    alt={tournament.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-2xl font-black text-[#0A5FC4] tracking-tight">
                    {(tournament.series || tournament.name).slice(0, 4).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="space-y-2 flex-1 min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                    {tournament.name}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider',
                      STATUS_STYLES[tournament.status]
                    )}
                  >
                    {tournament.status}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-200">
                    {tournament.tier}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {tournament.eventType}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    {tournament.gameMode}
                  </span>
                  {tournament.device && (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      📱 {tournament.device}
                    </span>
                  )}
                  {tournament.game && (
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                      <Gamepad2 className="w-3.5 h-3.5 text-purple-500" />
                      {tournament.game.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Social links on hero */}
              {Object.keys(socials).length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-end">
                  {Object.entries(socials).map(([key, val]) => {
                    const Icon = SOCIAL_ICONS[key] ?? Globe;
                    return (
                      <a
                        key={key}
                        href={String(val)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#0A5FC4] hover:text-white transition-colors text-slate-500 dark:text-slate-400"
                        title={key}
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Info Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-100 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800/80 bg-slate-50/50 dark:bg-[#080d17]">
            <div className="p-3 sm:p-4 text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                Total Prize Pool
              </span>
              <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                {formatPrizePool(tournament.prizePool ?? 0, tournament.currency, tournament.usdRate)}
              </span>
            </div>
            <div className="p-3 sm:p-4 text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                Tournament Dates
              </span>
              <span className="text-xs font-bold block mt-1">
                {formatDate(tournament.startDate)} → {formatDate(tournament.endDate)}
              </span>
            </div>
            <div className="p-3 sm:p-4 text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                Venues &amp; Countries
              </span>
              <span className="text-xs font-bold block mt-1 truncate">
                {tournament.venues.map((v) => v.venue.name).join(', ') || countriesList.join(', ') || 'Online'}
              </span>
            </div>
            <div className="p-3 sm:p-4 text-center">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                Champion &amp; Runner Up
              </span>
              <span className="text-xs font-black block mt-1 text-emerald-600 dark:text-emerald-400 truncate">
                🏆 {finalWinner || 'TBD'} {finalRunnerUp ? `(2nd: ${finalRunnerUp})` : ''}
              </span>
            </div>
          </div>
        </section>

        {/* ================= 7-TAB NAVIGATION BAR ================= */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2 scrollbar-none">
          {[
            { id: 'standings', label: 'Standings & Overview', icon: Trophy },
            { id: 'matches', label: `Matches (${tournament.matches.length})`, icon: Swords },
            { id: 'match-center', label: 'Match Center (Scorecards)', icon: Crosshair },
            { id: 'prizepool', label: 'Prize Pool', icon: DollarSign },
            { id: 'format', label: 'Format & Rules', icon: Layers },
            { id: 'teams', label: `Teams & Rosters (${tournament.teams.length})`, icon: Users },
            { id: 'stats', label: 'Tournament Stats & Fraggers', icon: Flame },
          ].map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${tournament.slug}?tab=${t.id}`}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors',
                activeTab === t.id
                  ? 'bg-[#0A5FC4] text-white shadow-sm'
                  : 'bg-white dark:bg-[#0b101c] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#0A5FC4]'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </Link>
          ))}
        </div>

        {/* ================= TAB 1: STANDINGS & OVERVIEW ================= */}
        {activeTab === 'standings' && (
          <div className="space-y-6">
            {/* Top 3 Champion Podium */}
            {standings.length >= 2 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 2nd Place */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-5 shadow-sm flex items-center gap-4 order-2 md:order-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-black text-xl flex items-center justify-center text-slate-400">
                    #2
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Runner-Up
                    </span>
                    <h3 className="font-black text-base">{standings[1].teamName}</h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {standings[1].totalPoints} Pts ({standings[1].wwcd} WWCD · {standings[1].eliminationPoints} Elims)
                    </p>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="rounded-xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-white to-white dark:via-[#0b101c] dark:to-[#0b101c] p-6 shadow-md flex items-center gap-4 order-1 md:order-2 ring-2 ring-amber-500/20">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white font-mono font-black text-2xl flex items-center justify-center shadow-lg shrink-0">
                    🏆
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Champion
                    </span>
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">{standings[0].teamName}</h3>
                    <p className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                      {standings[0].totalPoints} Total Points ({standings[0].wwcd} WWCD · {standings[0].eliminationPoints} Elims)
                    </p>
                  </div>
                </div>

                {/* 3rd Place */}
                {standings.length >= 3 && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-5 shadow-sm flex items-center gap-4 order-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-black text-xl flex items-center justify-center text-amber-700">
                      #3
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        3rd Place
                      </span>
                      <h3 className="font-black text-base">{standings[2].teamName}</h3>
                      <p className="text-xs text-slate-500 font-mono">
                        {standings[2].totalPoints} Pts ({standings[2].wwcd} WWCD · {standings[2].eliminationPoints} Elims)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Standings Points Table */}
            <StandingsTable
              rows={standings.map((s) => ({
                teamId: s.teamId,
                teamName: s.teamName,
                tag: s.tag,
                logoUrl: s.logoUrl ?? null,
                slug: null,
                rank: s.rank,
                matchesPlayed: s.matchesPlayed,
                wwcd: s.wwcd,
                placementPoints: s.placementPoints,
                eliminationPoints: s.eliminationPoints,
                totalPoints: s.totalPoints,
              }))}
              title="Cumulative Overall Standings"
              subtitle={`${standings.length} teams · Ranked by total points`}
              qualifyZone={tournament.teams.length >= 16 ? 16 : undefined}
            />
          </div>
        )}

        {/* ================= TAB 2: MATCHES & SCHEDULE ================= */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Swords className="w-4 h-4 text-[#0A5FC4]" /> Match Calendar &amp; Schedule
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tournament.matches.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-4 shadow-sm space-y-3 hover:border-[#0A5FC4] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono">
                        #{m.matchNumber ?? 1}
                      </span>
                      {m.format}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-black uppercase',
                        STATUS_STYLES[m.status]
                      )}
                    >
                      {m.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Map</span>
                      <span className="font-bold text-slate-900 dark:text-white">{m.mapName || 'Erangel'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Scheduled Time</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {m.matchTime || formatDate(m.scheduledAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">
                      {m.stageType || m.stage?.name || 'Tournament Match'}
                    </span>
                    <Link
                      href={`/tournaments/${tournament.slug}?tab=match-center&match=${m.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0A5FC4] hover:underline"
                    >
                      View Match Scorecard →
                    </Link>
                  </div>
                </div>
              ))}
              {tournament.matches.length === 0 && (
                <p className="p-8 text-center text-xs text-slate-400 col-span-2">
                  No matches scheduled yet for this tournament.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: MATCH CENTER (SCORECARDS DEEP DIVE) ================= */}
        {activeTab === 'match-center' && activeMatch && (
          <div className="space-y-6">
            {/* Match Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {tournament.matches.map((m) => (
                <Link
                  key={m.id}
                  href={`/tournaments/${tournament.slug}?tab=match-center&match=${m.id}`}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors',
                    activeMatch.id === m.id
                      ? 'bg-[#0A5FC4] text-white shadow-sm'
                      : 'bg-white dark:bg-[#0b101c] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-[#0A5FC4]'
                  )}
                >
                  #{m.matchNumber ?? 1} · {m.mapName || 'Map'}
                </Link>
              ))}
            </div>

            {/* Selected Match Card Header */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 block">
                  {activeMatch.stageType || activeMatch.stage?.name || 'Grand Finals'} · {activeMatch.matchType}
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {activeMatch.format}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Map: <span className="font-bold text-slate-900 dark:text-white">{activeMatch.mapName}</span> · Time:{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {activeMatch.matchTime || formatDate(activeMatch.scheduledAt)}
                  </span>
                </p>
              </div>
              {activeMatch.streamUrl && (
                <a
                  href={activeMatch.streamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase transition-colors"
                >
                  <PlaySquare className="w-4 h-4" /> Watch VOD / Stream
                </a>
              )}
            </div>

            {/* Team Results for Selected Match */}
            {activeMatchGame && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden space-y-0">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080d17] flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#0A5FC4]" /> Team Match Scorecard
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    {activeMatchGame.teamResults.length} Teams Scored
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[760px]">
                    <thead>
                      <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-[#0a0f1d]">
                        <th className="py-2.5 px-3 text-center w-14">Rank</th>
                        <th className="py-2.5 px-3 text-left">Team</th>
                        <th className="py-2.5 px-2 text-center">Place Pts</th>
                        <th className="py-2.5 px-2 text-center">Elim Pts</th>
                        <th className="py-2.5 px-2 text-center font-black text-sm text-[#0A5FC4]">Total Pts</th>
                        <th className="py-2.5 px-2 text-center">Damage</th>
                        <th className="py-2.5 px-2 text-center">Survival</th>
                        <th className="py-2.5 px-2 text-center">Utilities Total</th>
                        <th className="py-2.5 px-2 text-center">Dist Drove</th>
                        <th className="py-2.5 px-2 text-center">Dist Walk</th>
                        <th className="py-2.5 px-2 text-center">Revives</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                      {activeMatchGame.teamResults.map((tr) => (
                        <tr key={tr.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors font-sans">
                          <td className="py-2.5 px-3 text-center font-mono font-black">
                            #{tr.rank} {tr.wwcd && <span title="WWCD">🍗</span>}
                          </td>
                          <td className="py-2.5 px-3 font-bold">
                            {tr.team.name} {tr.shortCode && <span className="text-slate-400 font-mono text-[10px]">[{tr.shortCode}]</span>}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono">{tr.placePoints}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{tr.elimsPoints}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-black text-sm text-[#0A5FC4] dark:text-blue-400">
                            {tr.totalPoints}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono">{tr.damage}</td>
                          <td className="py-2.5 px-2 text-center font-mono">
                            {Math.floor(tr.survivalTime / 60)}:{(tr.survivalTime % 60).toString().padStart(2, '0')}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono">
                            {tr.utilitiesTotal} <span className="text-[9px] text-slate-400">(S:{tr.smokesUsed} G:{tr.grenadesUsed} M:{tr.molotovsUsed})</span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono">{tr.distDrove}m</td>
                          <td className="py-2.5 px-2 text-center font-mono">{tr.distWalk}m</td>
                          <td className="py-2.5 px-2 text-center font-mono">{tr.rescues}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Player Stats for Selected Match */}
            {activeMatchGame && activeMatchGame.playerStats.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080d17] flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0A5FC4]" /> Player Performances in Match
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    {activeMatchGame.playerStats.length} Players
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[760px]">
                    <thead>
                      <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-[#0a0f1d]">
                        <th className="py-2.5 px-3 text-left">Player</th>
                        <th className="py-2.5 px-2 text-left">Team</th>
                        <th className="py-2.5 px-2 text-center font-bold text-rose-500">Elims</th>
                        <th className="py-2.5 px-2 text-center">Damage</th>
                        <th className="py-2.5 px-2 text-center">Headshots</th>
                        <th className="py-2.5 px-2 text-center">Knockouts</th>
                        <th className="py-2.5 px-2 text-center">Powerplay</th>
                        <th className="py-2.5 px-2 text-center">Longest Elim</th>
                        <th className="py-2.5 px-2 text-center">Grenade Elims</th>
                        <th className="py-2.5 px-2 text-center">MVP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                      {activeMatchGame.playerStats.map((ps) => (
                        <tr key={ps.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors font-sans">
                          <td className="py-2.5 px-3 font-bold flex items-center gap-2">
                            <span>{ps.player.ign}</span>
                            {ps.isMvp && <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white font-black text-[9px]">MVP</span>}
                          </td>
                          <td className="py-2.5 px-2 text-slate-400">{ps.team?.name || '—'}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                            {ps.playerElims}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono">{ps.damage}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{ps.headshots}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{ps.knockouts}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{ps.playerPowerplay}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{ps.longestElim ? `${ps.longestElim}m` : '—'}</td>
                          <td className="py-2.5 px-2 text-center font-mono">{ps.grenadeElims}</td>
                          <td className="py-2.5 px-2 text-center">{ps.isMvp ? '⭐' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: PRIZE POOL & DISTRIBUTION ================= */}
        {activeTab === 'prizepool' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-500" /> Prize Pool Allocation &amp; Rewards
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official breakdown of the {tournament.currency}{' '}
                    {tournament.prizePool?.toLocaleString()} prize pool.
                  </p>
                </div>
              </div>

              {prizeDist.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[500px]">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080d17]">
                        <th className="py-3 px-3 text-left">Placement / Award</th>
                        <th className="py-3 px-3 text-center">Share (%)</th>
                        <th className="py-3 px-3 text-right">Prize ({tournament.currency})</th>
                        <th className="py-3 px-3 text-right">USD Approx</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                      {prizeDist.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors font-sans">
                          <td className="py-3 px-3 font-bold flex items-center gap-2">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️'} {p.rank}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {p.percentage ? `${p.percentage}%` : '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                            {tournament.currency} {p.prize.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-400">
                            ${tournament.usdRate ? Math.round(p.prize * tournament.usdRate).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-slate-400">
                  Prize pool distribution matrix will be published prior to finals.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 5: FORMAT & RULES ================= */}
        {activeTab === 'format' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0A5FC4]" /> Tournament Format &amp; Scoring Matrix
              </h2>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {formatRules.stagesDescription ||
                  formatRules.description ||
                  'The tournament features sequential stages with battle royale points scoring based on placement rank and individual finish eliminations.'}
              </p>

              {/* Points System Breakdown */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                  Battle Royale Placement Points System (10-Pt Standard Matrix)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs text-center">
                  {[
                    { rank: '1st (WWCD)', pts: 10 },
                    { rank: '2nd', pts: 6 },
                    { rank: '3rd', pts: 5 },
                    { rank: '4th', pts: 4 },
                    { rank: '5th', pts: 3 },
                    { rank: '6th', pts: 2 },
                    { rank: '7th', pts: 1 },
                    { rank: '8th', pts: 1 },
                    { rank: '9th - 16th', pts: 0 },
                  ].map((p, i) => (
                    <div key={i} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080d17]">
                      <span className="text-[10px] text-slate-400 block font-sans">{p.rank}</span>
                      <span className="font-black text-sm text-[#0A5FC4] dark:text-blue-400">{p.pts} Pts</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2 font-sans">
                  * Each player elimination awards <strong>1 Elimination Point</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 6: TEAMS & ROSTERS ================= */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0A5FC4]" /> Participating Teams &amp; Active Rosters
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournament.teams.map((tt) => {
                const rosterList = Array.isArray(tt.rosterJson)
                  ? (tt.rosterJson as Array<{ ign: string; role?: string; captain?: boolean } | string>)
                  : [];

                return (
                  <div
                    key={tt.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-5 shadow-sm space-y-4 hover:border-[#0A5FC4] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        {tt.team.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={tt.team.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="font-black text-sm text-slate-500">
                            {(tt.team.tag || tt.team.name).slice(0, 3)}
                          </span>
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/teams/${tt.team.slug}`}
                          className="font-black text-base hover:text-[#0A5FC4] transition-colors block"
                        >
                          {tt.team.name}
                        </Link>
                        <span className="text-xs text-slate-400 font-mono">
                          Seed #{tt.seed ?? '—'} · {tt.team.region || 'India'}
                        </span>
                      </div>
                    </div>

                    {/* Roster list */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">
                        Squad Roster
                      </span>
                      <div className="space-y-1.5 text-xs">
                        {rosterList.map((player, i) => {
                          const ign = typeof player === 'string' ? player : player.ign;
                          const role = typeof player === 'string' ? '' : player.role;
                          const isCaptain = typeof player === 'string' ? false : player.captain;

                          return (
                            <div key={i} className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                              <span className="font-bold flex items-center gap-1.5">
                                {ign} {isCaptain && <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-white">C</span>}
                              </span>
                              <span className="text-[10px] text-slate-400">{role || 'Player'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 7: TOURNAMENT STATISTICS & TOP FRAGGERS ================= */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Top Fraggers Leaderboard */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080d17] flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" /> Top Fraggers &amp; MVP Leaderboard
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  {fraggers.length} Ranked Players
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[720px]">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-[#0a0f1d]">
                      <th className="py-3 px-3 text-center w-14">Rank</th>
                      <th className="py-3 px-3 text-left">Player</th>
                      <th className="py-3 px-2 text-left">Team</th>
                      <th className="py-3 px-2 text-center">MP</th>
                      <th className="py-3 px-2 text-center font-black text-sm text-rose-600 dark:text-rose-400">Elims</th>
                      <th className="py-3 px-2 text-center">Damage</th>
                      <th className="py-3 px-2 text-center">Headshots</th>
                      <th className="py-3 px-2 text-center">Knockouts</th>
                      <th className="py-3 px-2 text-center">Powerplay (Zone 1)</th>
                      <th className="py-3 px-2 text-center">Longest Elim</th>
                      <th className="py-3 px-2 text-center">MVP Awards</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {fraggers.map((f) => (
                      <tr key={f.playerId} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors font-sans">
                        <td className="py-3 px-3 text-center font-mono font-black">
                          #{f.rank}
                        </td>
                        <td className="py-3 px-3 font-bold flex items-center gap-2">
                          <span className="text-sm">{f.ign}</span>
                          {f.mvps > 0 && <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white font-black text-[9px]">⭐ {f.mvps}</span>}
                        </td>
                        <td className="py-3 px-2 text-slate-400">{f.teamName}</td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400">{f.matchesPlayed}</td>
                        <td className="py-3 px-2 text-center font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                          {f.elims}
                        </td>
                        <td className="py-3 px-2 text-center font-mono">{f.damage.toLocaleString()}</td>
                        <td className="py-3 px-2 text-center font-mono">{f.headshots}</td>
                        <td className="py-3 px-2 text-center font-mono">{f.knockouts}</td>
                        <td className="py-3 px-2 text-center font-mono">{f.powerplayElims}</td>
                        <td className="py-3 px-2 text-center font-mono">{f.longestElim ? `${f.longestElim}m` : '—'}</td>
                        <td className="py-3 px-2 text-center font-mono">{f.mvps > 0 ? `${f.mvps} MVP` : '—'}</td>
                      </tr>
                    ))}
                    {fraggers.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-12 text-center text-xs text-slate-400 font-sans">
                          No player stats scored yet for this tournament.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
