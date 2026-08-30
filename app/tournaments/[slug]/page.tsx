import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Gamepad2,
  Layers,
  Trophy,
  Crown,
  Users,
  Camera,
  Globe,
  MessageCircle,
  AtSign,
  PlaySquare,
  Flame,
  Crosshair,
  DollarSign,
  Shield,
  Swords,
  MapPin,
  Calendar,
  Zap,
  Target,
  ChevronRight,
  User,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { formatDate, formatPrizePool } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/navbar';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';
import { Footer } from '@/components/footer';
import {
  calculateTournamentStandings,
  calculateTournamentFraggers,
} from '@/lib/tournament-math';
import { StandingsTable } from '@/components/ui/standings-table';
import { TournamentSidebar } from '@/components/ui/tournament-sidebar';

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

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  ONGOING: { label: 'LIVE', dot: 'bg-rose-500 animate-pulse', text: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  UPCOMING: { label: 'UPCOMING', dot: 'bg-indigo-400', text: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  COMPLETED: { label: 'COMPLETED', dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  CANCELED: { label: 'CANCELED', dot: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' },
};

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

  const rawSocials = (tournament.socialLinks ?? {}) as Record<string, unknown>;
  const socials: SocialMap = {};
  for (const [k, v] of Object.entries(rawSocials)) {
    if (typeof v === 'string' && v.trim().length > 0) {
      socials[k] = v.trim();
    }
  }
  const officialEventUrl = tournament.liquipedia || socials.website;

  const rawPrizeDist = tournament.prizeDistribution as any;
  const isMultiStage = Boolean(rawPrizeDist && rawPrizeDist.stages && Array.isArray(rawPrizeDist.stages));
  const prizeStages: Array<{
    stageName: string;
    allocatedPrize?: number;
    percentage?: number;
    ranks: Array<{
      rank: string;
      percentage?: number;
      prize: number;
      rewardType?: 'MONEY' | 'ITEM' | 'TITLE';
      customReward?: string;
      recipientType?: 'TEAM' | 'PLAYER';
      teamName?: string;
      playerName?: string;
      qualifications?: string[];
    }>;
  }> = isMultiStage
    ? rawPrizeDist.stages
    : [
        {
          stageName: 'Grand Finals',
          allocatedPrize: tournament.prizePool ?? 0,
          ranks: Array.isArray(tournament.prizeDistribution)
            ? (tournament.prizeDistribution as any)
            : [],
        },
      ];

  const prizeDist = prizeStages.flatMap((s) => s.ranks);

  const qualificationsList = Array.isArray((tournament as any).qualifications)
    ? ((tournament as any).qualifications as Array<{ place: string; events: string[]; description?: string }>)
    : [];

  const formatRules = (tournament.formatDetails ?? {}) as {
    pointsMatrix?: Record<string, number>;
    killPointsPerElim?: number;
    stagesDescription?: string;
    description?: string;
  };

  const allTeamResults = tournament.matches.flatMap((m) =>
    m.games.flatMap((g) => g.teamResults)
  );
  const allPlayerStats = tournament.matches.flatMap((m) =>
    m.games.flatMap((g) => g.playerStats)
  );

  const standings = calculateTournamentStandings(allTeamResults);
  const fraggers = calculateTournamentFraggers(allPlayerStats);

  const finalWinner = standings[0]?.teamName || tournament.winner || '';
  const finalRunnerUp = standings[1]?.teamName || tournament.runnerUp || '';

  const activeMatch = match
    ? tournament.matches.find((m) => m.id === match) || tournament.matches[0]
    : tournament.matches[0];
  const activeMatchGame = activeMatch?.games[0];

  const countriesList = Array.isArray(tournament.countries)
    ? (tournament.countries as string[])
    : [];

  const statusCfg = STATUS_CONFIG[tournament.status] ?? STATUS_CONFIG.COMPLETED;

  const NAV_TABS = [
    { id: 'standings', label: 'Standings', icon: Trophy },
    { id: 'matches', label: 'Matches', icon: Swords, count: tournament.matches.length },
    { id: 'match-center', label: 'Scorecards', icon: Crosshair },
    { id: 'prizepool', label: 'Prize Pool', icon: DollarSign },
    { id: 'format', label: 'Format', icon: Layers },
    { id: 'teams', label: 'Teams', icon: Users, count: tournament.teams.length },
    { id: 'stats', label: 'Stats', icon: Flame },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#06080f] text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      {/* ═══════════════════════════════════════════════════════════
          CINEMATIC FULL-BLEED HERO
      ═══════════════════════════════════════════════════════════ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: '340px' }}>
        {/* Background image / gradient */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: tournament.bannerUrl
              ? `url(${tournament.bannerUrl})`
              : 'linear-gradient(135deg, #050a18 0%, #0d1f4e 40%, #0A5FC4 80%, #1a0533 100%)',
          }}
        />
        {/* Dark overlay — always dark for readability, heavier at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
        {/* Left vignette on desktop */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden lg:block" />

        {/* Hero content */}
        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-8 pb-10 flex flex-col justify-end" style={{ minHeight: '340px' }}>

          {/* Breadcrumb */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white/90 transition-colors mb-8 w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Tournaments
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-10">
            {/* Tournament Logo */}
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 overflow-hidden shadow-2xl">
              {tournament.imageUrl || tournament.imageDarkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tournament.imageDarkUrl || tournament.imageUrl || ''}
                  alt={tournament.name}
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <span className="text-2xl font-black text-white tracking-tight">
                  {(tournament.series || tournament.name).slice(0, 4).toUpperCase()}
                </span>
              )}
            </div>

            {/* Title block */}
            <div className="flex-1 min-w-0">
              {/* Status + tier row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border', statusCfg.bg, statusCfg.text)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                  {statusCfg.label}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 text-white/70 bg-white/10">
                  {tournament.tier}
                </span>
                {tournament.game && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/60">
                    <Gamepad2 className="w-3 h-3" />
                    {tournament.game.name}
                  </span>
                )}
              </div>

              {/* Tournament name — massive */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none mb-4 drop-shadow-lg">
                {tournament.name}
              </h1>

              {/* Quick meta strip */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/60">
                <PrizePoolBadge
                  amount={tournament.prizePool}
                  currency={tournament.currency}
                  usdRate={tournament.usdRate}
                  className="font-black text-amber-400 text-lg"
                />
                <span className="w-px h-4 bg-white/20 hidden sm:block" />
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-white/40" />
                  {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}
                </span>
                {(tournament.venues.length > 0 || countriesList.length > 0) && (
                  <>
                    <span className="w-px h-4 bg-white/20 hidden sm:block" />
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-white/40" />
                      {tournament.venues.map((v) => v.venue.name).join(', ') || countriesList.join(', ')}
                    </span>
                  </>
                )}
                {finalWinner && (
                  <>
                    <span className="w-px h-4 bg-white/20 hidden sm:block" />
                    <span className="inline-flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-white font-bold">{finalWinner}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions & Social Links — right aligned on desktop */}
            {(officialEventUrl || Object.keys(socials).length > 0) && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {officialEventUrl && (
                  <a
                    href={officialEventUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-xs font-bold text-white transition-colors shadow-sm"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>Official Event Page ↗</span>
                  </a>
                )}
                {Object.entries(socials)
                  .filter(([k]) => k !== 'website')
                  .map(([key, val]) => {
                    const Icon = SOCIAL_ICONS[key] ?? Globe;
                    return (
                      <a
                        key={key}
                        href={String(val)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        title={key}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </a>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MAIN LAYOUT: SIDEBAR + CONTENT
      ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex">
        {/* Sidebar component (client, handles collapse state) */}
        <TournamentSidebar
          slug={tournament.slug}
          activeTab={activeTab}
          tabs={NAV_TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon.name, count: t.count }))}
          meta={{
            eventType: tournament.eventType,
            gameMode: tournament.gameMode,
            platform: tournament.platform,
            device: tournament.device,
            teamsCount: tournament.teams.length,
            matchesCount: tournament.matches.length,
          }}
        />

        {/* Mobile horizontal tabs (shown below lg) */}
        <div className="lg:hidden w-full sticky top-14 z-30 bg-slate-50/95 dark:bg-[#06080f]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-1 px-4 overflow-x-auto scrollbar-none py-2">
            {NAV_TABS.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${tournament.slug}?tab=${t.id}`}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0',
                  activeTab === t.id
                    ? 'bg-[#0A5FC4] text-white shadow-sm shadow-blue-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800/60'
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {t.count != null && (
                  <span className={cn(
                    'text-[10px] font-black px-1 rounded',
                    activeTab === t.id ? 'text-white/70' : 'text-slate-400'
                  )}>
                    {t.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 min-w-0 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">

          {/* ═══ TAB: STANDINGS ═══ */}
          {activeTab === 'standings' && (
            <div className="space-y-6">
              {/* Champion Banner — replaces the generic podium cards */}
              {standings.length >= 1 && (
                <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent dark:from-amber-500/15 dark:via-amber-500/5 dark:to-transparent">
                  <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #f59e0b 0%, transparent 60%)' }}
                  />
                  <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-4xl font-black text-amber-500/30 font-mono select-none hidden sm:block">01</div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">
                          <Crown className="w-3 h-3" /> Champion
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                          {standings[0].teamName}
                          {standings[0].tag && (
                            <span className="ml-2 text-sm font-mono text-slate-400 font-normal">[{standings[0].tag}]</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          <span><span className="font-black text-amber-600 dark:text-amber-400">{standings[0].totalPoints}</span> pts</span>
                          <span>{standings[0].wwcd} 🍗 wins</span>
                          <span>{standings[0].eliminationPoints} elims</span>
                        </div>
                      </div>
                    </div>
                    {/* Runner-up */}
                    {standings.length >= 2 && (
                      <div className="flex items-center gap-3 sm:border-l sm:border-amber-500/20 sm:pl-6">
                        <div className="text-2xl font-black text-slate-300/40 font-mono hidden sm:block">02</div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Runner-Up</div>
                          <div className="text-lg font-black text-slate-700 dark:text-slate-200">{standings[1].teamName}</div>
                          <div className="text-xs text-slate-400 font-mono">{standings[1].totalPoints} pts</div>
                        </div>
                      </div>
                    )}
                    {standings.length >= 3 && (
                      <div className="flex items-center gap-3 sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-6">
                        <div className="text-2xl font-black text-slate-200/30 font-mono hidden sm:block">03</div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">3rd Place</div>
                          <div className="text-lg font-black text-slate-700 dark:text-slate-200">{standings[2].teamName}</div>
                          <div className="text-xs text-slate-400 font-mono">{standings[2].totalPoints} pts</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Standings Table */}
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
                title="Overall Standings"
                subtitle={`${standings.length} teams · Sorted by total points`}
                qualifyZone={tournament.teams.length >= 16 ? 16 : undefined}
              />
            </div>
          )}

          {/* ═══ TAB: MATCHES ═══ */}
          {activeTab === 'matches' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-tight">
                  Match Schedule
                  <span className="ml-2 text-sm font-mono text-slate-400 font-normal">{tournament.matches.length} matches</span>
                </h2>
              </div>

              {/* Timeline match list */}
              <div className="space-y-0 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0b101c]">
                {tournament.matches.length === 0 && (
                  <div className="py-16 text-center text-sm text-slate-400">
                    No matches scheduled yet.
                  </div>
                )}
                {tournament.matches.map((m, idx) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 group',
                      idx > 0 && 'border-t border-slate-100 dark:border-slate-800/60'
                    )}
                  >
                    {/* Match number */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black font-mono text-slate-500 dark:text-slate-400">
                        #{m.matchNumber ?? idx + 1}
                      </span>
                    </div>

                    {/* Match info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {m.format || m.stageType || 'Match'}
                        </span>
                        <span className={cn(
                          'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0',
                          STATUS_STYLES[m.status]
                        )}>
                          {m.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {m.mapName && <span className="font-medium">{m.mapName}</span>}
                        {m.mapName && <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />}
                        <span>{m.matchTime || formatDate(m.scheduledAt)}</span>
                        {m.stage?.name && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <span>{m.stage.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick result — team count if completed */}
                    {m.status === 'COMPLETED' && m.games[0]?.teamResults.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 shrink-0">
                        <span className="font-mono">{m.games[0].teamResults.length} teams</span>
                      </div>
                    )}

                    {/* Scorecard link */}
                    <Link
                      href={`/tournaments/${tournament.slug}?tab=match-center&match=${m.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#0A5FC4] dark:text-blue-400 hover:underline shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Scorecard <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ TAB: MATCH CENTER ═══ */}
          {activeTab === 'match-center' && activeMatch && (
            <div className="space-y-5">
              {/* Match selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {tournament.matches.map((m) => (
                  <Link
                    key={m.id}
                    href={`/tournaments/${tournament.slug}?tab=match-center&match=${m.id}`}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0',
                      activeMatch.id === m.id
                        ? 'bg-[#0A5FC4] text-white shadow-sm'
                        : 'bg-white dark:bg-[#0b101c] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-[#0A5FC4]'
                    )}
                  >
                    #{m.matchNumber ?? 1} · {m.mapName || 'Map'}
                  </Link>
                ))}
              </div>

              {/* Match header */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[#0A5FC4] dark:text-blue-400 mb-1">
                    {activeMatch.stageType || activeMatch.stage?.name || 'Grand Finals'} · {activeMatch.matchType}
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {activeMatch.format}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Map: <strong className="text-slate-800 dark:text-slate-200">{activeMatch.mapName}</strong>
                    {' · '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {activeMatch.matchTime || formatDate(activeMatch.scheduledAt)}
                    </strong>
                  </p>
                </div>
                {activeMatch.streamUrl && (
                  <a
                    href={activeMatch.streamUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase transition-colors"
                  >
                    <PlaySquare className="w-4 h-4" /> Watch VOD
                  </a>
                )}
              </div>

              {/* Team scorecard */}
              {activeMatchGame && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080d17] flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#0A5FC4]" /> Team Scorecard
                    </h3>
                    <span className="text-xs font-mono text-slate-400">{activeMatchGame.teamResults.length} Teams</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[760px]">
                      <thead>
                        <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-[#0a0f1d]">
                          <th className="py-2.5 px-3 text-center w-14">Rank</th>
                          <th className="py-2.5 px-3 text-left">Team</th>
                          <th className="py-2.5 px-2 text-center">Place Pts</th>
                          <th className="py-2.5 px-2 text-center">Elim Pts</th>
                          <th className="py-2.5 px-2 text-center text-[#0A5FC4]">Total</th>
                          <th className="py-2.5 px-2 text-center">Damage</th>
                          <th className="py-2.5 px-2 text-center">Survival</th>
                          <th className="py-2.5 px-2 text-center">Utilities</th>
                          <th className="py-2.5 px-2 text-center">Km Drove</th>
                          <th className="py-2.5 px-2 text-center">Km Walk</th>
                          <th className="py-2.5 px-2 text-center">Revives</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {activeMatchGame.teamResults.map((tr) => (
                          <tr key={tr.id} className={cn(
                            'hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors',
                            tr.rank === 1 && 'bg-amber-500/5 dark:bg-amber-500/10 border-l-2 border-amber-500'
                          )}>
                            <td className="py-2.5 px-3 text-center font-mono font-black">
                              {tr.rank === 1 ? '🥇' : tr.rank === 2 ? '🥈' : tr.rank === 3 ? '🥉' : `#${tr.rank}`}
                              {tr.wwcd && <span className="ml-1 text-[10px]">🍗</span>}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {tr.team.name}
                              {tr.shortCode && <span className="ml-1 text-slate-400 font-mono text-[10px]">[{tr.shortCode}]</span>}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">{tr.placePoints}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-300">{tr.elimsPoints}</td>
                            <td className="py-2.5 px-2 text-center font-mono font-black text-[#0A5FC4] dark:text-blue-400">{tr.totalPoints}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">{tr.damage}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">
                              {Math.floor(tr.survivalTime / 60)}:{(tr.survivalTime % 60).toString().padStart(2, '0')}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">{tr.utilitiesTotal}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">{tr.distDrove}m</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">{tr.distWalk}m</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">{tr.rescues}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Player stats */}
              {activeMatchGame && activeMatchGame.playerStats.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080d17] flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                      <Target className="w-4 h-4 text-rose-500" /> Player Performances
                    </h3>
                    <span className="text-xs font-mono text-slate-400">{activeMatchGame.playerStats.length} Players</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[760px]">
                      <thead>
                        <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-[#0a0f1d]">
                          <th className="py-2.5 px-3 text-left">Player</th>
                          <th className="py-2.5 px-2 text-left">Team</th>
                          <th className="py-2.5 px-2 text-center text-rose-500">Elims</th>
                          <th className="py-2.5 px-2 text-center">Damage</th>
                          <th className="py-2.5 px-2 text-center">HS</th>
                          <th className="py-2.5 px-2 text-center">KOs</th>
                          <th className="py-2.5 px-2 text-center">Powerplay</th>
                          <th className="py-2.5 px-2 text-center">Longest</th>
                          <th className="py-2.5 px-2 text-center">Grenade</th>
                          <th className="py-2.5 px-2 text-center">MVP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {activeMatchGame.playerStats.map((ps) => (
                          <tr key={ps.id} className="hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              <span className="flex items-center gap-1.5">
                                {ps.player.ign}
                                {ps.isMvp && <span className="px-1.5 py-px rounded bg-amber-500 text-white font-black text-[9px]">MVP</span>}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-slate-400">{ps.team?.name || '—'}</td>
                            <td className="py-2.5 px-2 text-center font-mono font-black text-rose-600 dark:text-rose-400 text-sm">{ps.playerElims}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">{ps.damage}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">{ps.headshots}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">{ps.knockouts}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">{ps.playerPowerplay}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">{ps.longestElim ? `${ps.longestElim}m` : '—'}</td>
                            <td className="py-2.5 px-2 text-center font-mono text-slate-500">{ps.grenadeElims}</td>
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

          {/* ═══ TAB: PRIZE POOL ═══ */}
          {activeTab === 'prizepool' && (
            <div className="space-y-6">
              {/* Big prize display */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] overflow-hidden">
                <div className="px-6 pt-8 pb-6 bg-gradient-to-br from-amber-500/8 via-transparent to-transparent dark:from-amber-500/12">
                  <div className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Total Prize Pool</div>
                  <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                    <PrizePoolBadge
                      amount={tournament.prizePool}
                      currency={tournament.currency}
                      usdRate={tournament.usdRate}
                    />
                  </div>
                </div>

                {/* Overall Top Distribution bars */}
                {prizeDist.length > 0 && (
                  <div className="px-6 pb-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Overall Distribution Overview</div>
                    <div className="space-y-2">
                      {prizeDist.slice(0, 6).map((p, idx) => {
                        const pct = p.percentage || ((p.prize / (tournament.prizePool ?? 1)) * 100);
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-xs font-bold w-28 shrink-0 text-slate-600 dark:text-slate-300 truncate">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '  '} {p.rank}
                            </span>
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-[#0A5FC4]/60')}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white w-28 text-right shrink-0">
                              {tournament.currency} {p.prize.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Event Qualification Seeds Section with Direct Links */}
              {qualificationsList.length > 0 && (
                <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#0A5FC4]/5 via-transparent to-transparent dark:from-[#0A5FC4]/10 bg-white dark:bg-[#0b101c] p-6 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 mb-4 flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> Qualified Events &amp; Tournament Seeds
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {qualificationsList.map((q, qIdx) => (
                      <div
                        key={qIdx}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-xs">
                            {q.place}
                          </span>
                          {q.description && (
                            <span className="text-[10px] text-slate-400 font-medium">{q.description}</span>
                          )}
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {q.events.map((ev: any, evIdx: number) => {
                            const evName = typeof ev === 'string' ? ev : ev.name;
                            const evSlug = typeof ev === 'object' ? ev.tournamentSlug : undefined;

                            if (evSlug) {
                              return (
                                <Link
                                  key={evIdx}
                                  href={`/tournaments/${evSlug}`}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A5FC4] dark:text-blue-400 hover:underline"
                                >
                                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>{evName}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">(View Event →)</span>
                                </Link>
                              );
                            }

                            return (
                              <div
                                key={evIdx}
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100"
                              >
                                <Zap className="w-3.5 h-3.5 text-[#0A5FC4] shrink-0" />
                                <span>{evName}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stage-Wise Full Breakdown Tables */}
              {prizeStages.map((stage, sIdx) => (
                <div
                  key={sIdx}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] overflow-hidden shadow-sm"
                >
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080d17] flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#0A5FC4]" /> {stage.stageName} Breakdown
                    </h3>
                    {stage.allocatedPrize != null && stage.allocatedPrize > 0 && (
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        Allocated: {tournament.currency} {stage.allocatedPrize.toLocaleString()}
                        {stage.percentage ? ` (${stage.percentage}%)` : ''}
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[560px]">
                      <thead>
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-[#0a0f1d]">
                          <th className="py-3 px-4 text-left">Placement / Award</th>
                          <th className="py-3 px-3 text-left">Winner (Team / Player)</th>
                          <th className="py-3 px-3 text-center">Share</th>
                          <th className="py-3 px-3 text-right">Prize ({tournament.currency})</th>
                          <th className="py-3 px-4 text-right">USD Approx</th>
                          <th className="py-3 px-4 text-left">Seeds &amp; Qualifications</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {stage.ranks.map((p: any, idx) => (
                          <tr
                            key={idx}
                            className={cn(
                              'hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors',
                              idx === 0 && 'bg-amber-500/5 dark:bg-amber-500/10'
                            )}
                          >
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️'} {p.rank}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                              {p.playerName ? (
                                <span className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-300">
                                  <User className="w-3.5 h-3.5 shrink-0" />
                                  <span>{p.playerName}</span>
                                  {p.teamName && (
                                    <span className="text-[10px] text-slate-400 font-normal">({p.teamName})</span>
                                  )}
                                </span>
                              ) : p.teamName ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5 text-[#0A5FC4] shrink-0" />
                                  <span>{p.teamName}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal italic">TBA / Unassigned</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-slate-400">
                              {p.rewardType === 'TITLE' ? '—' : p.percentage ? `${p.percentage}%` : '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                              {p.rewardType === 'TITLE' ? (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  👑 Title &amp; Trophy
                                </span>
                              ) : p.rewardType === 'ITEM' || p.customReward ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-xs text-purple-600 dark:text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                    🎁 {p.customReward || 'Physical Reward'}
                                  </span>
                                  {p.prize > 0 && (
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      + {tournament.currency} {Number(p.prize).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span>
                                  {tournament.currency} {Number(p.prize || 0).toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400">
                              {p.rewardType === 'TITLE' || (p.rewardType === 'ITEM' && (!p.prize || p.prize <= 0))
                                ? '—'
                                : tournament.usdRate
                                ? `$${Math.round(Number(p.prize || 0) * tournament.usdRate).toLocaleString()}`
                                : '—'}
                            </td>
                            <td className="py-3 px-4">
                              {Array.isArray(p.qualifications) && p.qualifications.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {p.qualifications.map((q: any, qIdx: number) => {
                                    const qName = typeof q === 'string' ? q : q.name;
                                    const qSlug = typeof q === 'object' ? q.tournamentSlug : undefined;
                                    if (qSlug) {
                                      return (
                                        <Link
                                          key={qIdx}
                                          href={`/tournaments/${qSlug}`}
                                          className="px-2 py-0.5 rounded bg-blue-500/10 text-[#0A5FC4] dark:text-blue-300 font-bold text-[10px] hover:underline"
                                        >
                                          {qName} ↗
                                        </Link>
                                      );
                                    }
                                    return (
                                      <span
                                        key={qIdx}
                                        className="px-2 py-0.5 rounded bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-300 font-bold text-[10px]"
                                      >
                                        {qName}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {prizeDist.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-400">
                  Prize distribution will be published prior to the finals.
                </p>
              )}
            </div>
          )}

          {/* ═══ TAB: FORMAT ═══ */}
          {activeTab === 'format' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-black tracking-tight flex items-center gap-2 mb-3">
                    <Layers className="w-5 h-5 text-[#0A5FC4]" /> Format & Scoring
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {formatRules.stagesDescription || formatRules.description ||
                      'The tournament features sequential stages with battle royale points scoring based on placement rank and individual finish eliminations.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                    Placement Points System
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 text-center">
                    {[
                      { rank: 'WWCD', pts: 10, special: true },
                      { rank: '2nd', pts: 6 },
                      { rank: '3rd', pts: 5 },
                      { rank: '4th', pts: 4 },
                      { rank: '5th', pts: 3 },
                      { rank: '6th', pts: 2 },
                      { rank: '7th', pts: 1 },
                      { rank: '8th', pts: 1 },
                      { rank: '9–16th', pts: 0 },
                    ].map((p, i) => (
                      <div
                        key={i}
                        className={cn(
                          'py-3 px-2 rounded-xl border text-xs',
                          (p as { rank: string; pts: number; special?: boolean }).special
                            ? 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080d17]'
                        )}
                      >
                        <div className="text-[10px] text-slate-400 font-sans mb-1">{p.rank}</div>
                        <div className={cn(
                          'font-black text-sm',
                          (p as { rank: string; pts: number; special?: boolean }).special ? 'text-amber-600 dark:text-amber-400' : 'text-[#0A5FC4] dark:text-blue-400'
                        )}>
                          {p.pts}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    + <strong>1 point</strong> per player elimination
                  </p>
                </div>

                {/* Stages */}
                {tournament.stages.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Tournament Stages</h3>
                    <div className="space-y-2">
                      {tournament.stages.map((stage) => (
                        <div
                          key={stage.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-[#080d17]"
                        >
                          <div className="w-6 h-6 rounded-full bg-[#0A5FC4]/10 text-[#0A5FC4] dark:text-blue-400 flex items-center justify-center text-[10px] font-black">
                            {stage.sequence}
                          </div>
                          <div className="flex-1 font-bold text-sm text-slate-900 dark:text-white">{stage.name}</div>
                          {stage.groups.length > 0 && (
                            <span className="text-xs text-slate-400">{stage.groups.length} groups</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ TAB: TEAMS ═══ */}
          {activeTab === 'teams' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black tracking-tight">
                Teams & Rosters
                <span className="ml-2 text-sm font-mono text-slate-400 font-normal">{tournament.teams.length} teams</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {tournament.teams.map((tt) => {
                  const rosterList = Array.isArray(tt.rosterJson)
                    ? (tt.rosterJson as Array<{ ign: string; role?: string; captain?: boolean } | string>)
                    : [];

                  return (
                    <div
                      key={tt.id}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] overflow-hidden hover:border-[#0A5FC4]/50 dark:hover:border-[#0A5FC4]/50 transition-colors group"
                    >
                      {/* Team header */}
                      <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                          {tt.team.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={tt.team.logoUrl} alt="" className="max-h-full max-w-full object-contain p-1" />
                          ) : (
                            <span className="font-black text-sm text-slate-500">
                              {(tt.team.tag || tt.team.name).slice(0, 3).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/teams/${tt.team.slug}`}
                            className="font-black text-base text-slate-900 dark:text-white hover:text-[#0A5FC4] transition-colors block truncate"
                          >
                            {tt.team.name}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            {tt.team.tag && <span className="font-mono">[{tt.team.tag}]</span>}
                            {tt.team.tag && tt.team.region && <span>·</span>}
                            {tt.team.region && <span>{tt.team.region}</span>}
                            {tt.seed != null && <><span>·</span><span>Seed #{tt.seed}</span></>}
                          </div>
                        </div>
                      </div>

                      {/* Roster */}
                      {rosterList.length > 0 && (
                        <div className="px-4 py-3 space-y-1">
                          {rosterList.map((player, i) => {
                            const ign = typeof player === 'string' ? player : player.ign;
                            const role = typeof player === 'string' ? '' : player.role;
                            const isCaptain = typeof player === 'string' ? false : player.captain;
                            return (
                              <div key={i} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                  {ign}
                                  {isCaptain && <span className="text-[9px] px-1 py-px rounded bg-amber-500 text-white font-black">C</span>}
                                </span>
                                <span className="text-[10px] text-slate-400">{role || 'Player'}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ TAB: STATS ═══ */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Top 3 fraggers hero cards */}
              {fraggers.length >= 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {fraggers.slice(0, 3).map((f, idx) => (
                    <div
                      key={f.playerId}
                      className={cn(
                        'rounded-2xl border p-5 flex items-start gap-4',
                        idx === 0
                          ? 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c]'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-mono font-black text-lg',
                        idx === 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      )}>
                        {idx === 0 ? '🔥' : `#${idx + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn('font-black text-base truncate', idx === 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white')}>
                          {f.ign}
                          {f.mvps > 0 && <span className="ml-1.5 text-[10px] px-1.5 py-px rounded bg-amber-500 text-white font-black">MVP ×{f.mvps}</span>}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{f.teamName} {f.teamTag && `[${f.teamTag}]`}</div>
                        <div className="mt-2 flex items-center gap-3 text-xs font-mono">
                          <span className="font-black text-rose-600 dark:text-rose-400 text-base">{f.elims}</span>
                          <span className="text-slate-400">elims</span>
                          <span className="text-slate-500">{f.damage.toLocaleString()} dmg</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Fraggers leaderboard */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101c] shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#080d17] flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-500" /> Top Fraggers
                  </h2>
                  <span className="text-xs font-mono text-slate-400">{fraggers.length} Players</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[720px]">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-[#0a0f1d]">
                        <th className="py-3 px-3 text-center w-12">#</th>
                        <th className="py-3 px-3 text-left">Player</th>
                        <th className="py-3 px-2 text-left">Team</th>
                        <th className="py-3 px-2 text-center">MP</th>
                        <th className="py-3 px-2 text-center text-rose-500">Elims</th>
                        <th className="py-3 px-2 text-center">Damage</th>
                        <th className="py-3 px-2 text-center">HS</th>
                        <th className="py-3 px-2 text-center">KOs</th>
                        <th className="py-3 px-2 text-center">Powerplay</th>
                        <th className="py-3 px-2 text-center">Longest</th>
                        <th className="py-3 px-2 text-center">MVPs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {fraggers.map((f) => (
                        <tr key={f.playerId} className={cn(
                          'hover:bg-slate-50 dark:hover:bg-[#121929] transition-colors',
                          f.rank <= 3 && 'font-semibold'
                        )}>
                          <td className="py-3 px-3 text-center font-mono font-black text-slate-500">
                            {f.rank === 1 ? '🔥' : f.rank === 2 ? '💥' : f.rank === 3 ? '⚡' : `#${f.rank}`}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                            {f.ign}
                            {f.mvps > 0 && <span className="ml-1.5 px-1.5 py-px rounded bg-amber-500 text-white font-black text-[9px]">⭐ {f.mvps}</span>}
                          </td>
                          <td className="py-3 px-2 text-slate-400">{f.teamName}</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-400">{f.matchesPlayed}</td>
                          <td className="py-3 px-2 text-center font-mono font-black text-rose-600 dark:text-rose-400 text-sm">{f.elims}</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-500">{f.damage.toLocaleString()}</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-500">{f.headshots}</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-500">{f.knockouts}</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-500">{f.powerplayElims}</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-500">{f.longestElim ? `${f.longestElim}m` : '—'}</td>
                          <td className="py-3 px-2 text-center font-mono text-slate-500">{f.mvps > 0 ? `×${f.mvps}` : '—'}</td>
                        </tr>
                      ))}
                      {fraggers.length === 0 && (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-xs text-slate-400">
                            No player stats yet.
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
      </div>

      <Footer />
    </div>
  );
}
