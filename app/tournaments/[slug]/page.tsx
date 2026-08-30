import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Gamepad2,
  Layers,
  Trophy,
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
  Tv,
  CheckCircle2,
  Award,
  ExternalLink,
  LayoutDashboard,
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
import { TournamentSubnav } from '@/components/tournaments/tournament-subnav';
import { TournamentOverviewHub } from '@/components/tournaments/tournament-overview-hub';
import { TournamentStageStandings, StageMatchData } from '@/components/tournaments/tournament-stage-standings';
import { TournamentMatchesHub } from '@/components/tournaments/tournament-matches-hub';
import { TournamentFormatHub } from '@/components/tournaments/tournament-format-hub';
import { TournamentSidebarInfo } from '@/components/tournaments/tournament-sidebar-info';

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
        description: `Official stage-wise standings, match scorecards, prize pool distribution, participating team rosters, and top fraggers for ${tournament.name}.`,
      };
    }
  } catch {
    /* fall through */
  }
  return { title: 'Tournament Details | Esports Amaze' };
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  ONGOING: { label: 'LIVE NOW', dot: 'bg-rose-500 animate-pulse', text: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  UPCOMING: { label: 'UPCOMING', dot: 'bg-indigo-400', text: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  COMPLETED: { label: 'COMPLETED', dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  CANCELED: { label: 'CANCELED', dot: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' },
};

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; match?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const activeTab = tab || 'overview';

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

  // ═══════════════════════════════════════════════════════════
  // STAGE-AWARE STANDINGS COMPUTATION
  // ═══════════════════════════════════════════════════════════
  const matchesByStageMap = new Map<string, typeof tournament.matches>();

  tournament.matches.forEach((m) => {
    let stg = m.stage?.name || m.stageType;
    if (!stg && m.format?.includes(' · ')) {
      stg = m.format.split(' · ')[1]?.split(' (')[0];
    }
    if (!stg) stg = 'Grand Finals';

    if (!matchesByStageMap.has(stg)) {
      matchesByStageMap.set(stg, []);
    }
    matchesByStageMap.get(stg)!.push(m);
  });

  const stagesData: StageMatchData[] = Array.from(matchesByStageMap.entries()).map(
    ([stageName, stageMatches]) => {
      const stageTeamResults = stageMatches.flatMap((m) => m.games.flatMap((g) => g.teamResults));
      const stagePlayerStats = stageMatches.flatMap((m) => m.games.flatMap((g) => g.playerStats));

      const stageStandings = calculateTournamentStandings(stageTeamResults);
      const stageFraggers = calculateTournamentFraggers(stagePlayerStats);
      const completedCount = stageMatches.filter((m) => m.status === 'COMPLETED').length;

      const topF = stageFraggers[0]
        ? {
            playerId: stageFraggers[0].playerId,
            ign: stageFraggers[0].ign,
            teamName: stageFraggers[0].teamName,
            tag: stageFraggers[0].teamTag,
            avatarUrl: stageFraggers[0].avatarUrl,
            kills: stageFraggers[0].elims,
            damage: stageFraggers[0].damage,
          }
        : null;

      return {
        stageName,
        matchesCount: stageMatches.length,
        completedMatchesCount: completedCount,
        matches: stageMatches,
        standings: stageStandings,
        topFragger: topF,
      };
    }
  );

  // Overall Cumulative
  const allTeamResults = tournament.matches.flatMap((m) =>
    m.games.flatMap((g) => g.teamResults)
  );
  const allPlayerStats = tournament.matches.flatMap((m) =>
    m.games.flatMap((g) => g.playerStats)
  );

  const overallStandings = calculateTournamentStandings(allTeamResults);
  const overallFraggers = calculateTournamentFraggers(allPlayerStats);
  const overallTopFragger = overallFraggers[0]
    ? {
        playerId: overallFraggers[0].playerId,
        ign: overallFraggers[0].ign,
        teamName: overallFraggers[0].teamName,
        tag: overallFraggers[0].teamTag,
        avatarUrl: overallFraggers[0].avatarUrl,
        kills: overallFraggers[0].elims,
        damage: overallFraggers[0].damage,
      }
    : null;

  const upcomingMatches = tournament.matches.filter((m) => m.status !== 'COMPLETED');
  const statusCfg = STATUS_CONFIG[tournament.status] ?? STATUS_CONFIG.COMPLETED;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#06080f] text-slate-900 dark:text-slate-100 transition-colors font-sans">
      <Navbar />

      {/* ═══════════════════════════════════════════════════════════
          CINEMATIC HIGH-CONTRAST TOURNAMENT HERO
      ═══════════════════════════════════════════════════════════ */}
      <div className="relative w-full overflow-hidden border-b border-slate-200 dark:border-slate-800 bg-[#070b16]">
        {/* Background image banner */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-xs scale-105"
          style={{
            backgroundImage: tournament.bannerUrl
              ? `url(${tournament.bannerUrl})`
              : 'linear-gradient(135deg, #050a18 0%, #0d1f4e 40%, #0A5FC4 80%, #1a0533 100%)',
          }}
        />
        {/* Dark vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b16] via-[#070b16]/70 to-transparent" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          {/* Breadcrumb */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tournaments</span>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Logo + Details */}
            <div className="flex items-center gap-4 sm:gap-6 min-w-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white/10 dark:bg-white/5 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0 overflow-hidden shadow-xl p-2">
                {tournament.imageUrl || tournament.imageDarkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tournament.imageDarkUrl || tournament.imageUrl || ''}
                    alt={tournament.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Trophy className="w-10 h-10 text-white/70" />
                )}
              </div>

              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${statusCfg.bg} ${statusCfg.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>

                  {/* Tier */}
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white border border-white/15">
                    {tournament.tier}
                  </span>

                  {/* Game */}
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0A5FC4]/30 text-blue-200 border border-[#0A5FC4]/40 flex items-center gap-1">
                    <Gamepad2 className="w-3 h-3" />
                    {tournament.game.name}
                  </span>

                  {/* Series */}
                  {tournament.series && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 text-white/70 border border-white/10 hidden sm:inline">
                      {tournament.series} {tournament.season ? `· ${tournament.season}` : ''}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight truncate">
                  {tournament.name}
                </h1>

                {/* Subtitle meta */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/70 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-white/50" />
                    {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-white/50" />
                    {tournament.venues && tournament.venues.length > 1
                      ? `${tournament.venues.map((v) => v.venue.city || v.venue.name).join(' & ')} (${tournament.venues.length} Venues)`
                      : tournament.venues?.[0]?.venue?.name
                      ? `${tournament.venues[0].venue.name}, ${tournament.venues[0].venue.city || tournament.region || 'India'}`
                      : tournament.region || 'South Asia'}
                  </span>
                  {tournament.eventType && (
                    <>
                      <span>·</span>
                      <span className="text-white font-bold">{tournament.eventType}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Prize Pool & Actions */}
            <div className="flex flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10">
              <div className="text-left lg:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">
                  Total Prize Pool
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                  <PrizePoolBadge
                    amount={tournament.prizePool}
                    currency={tournament.currency}
                    usdRate={tournament.usdRate}
                  />
                </div>
              </div>

              {/* Social / Stream buttons */}
              <div className="flex items-center gap-2">
                {officialEventUrl && (
                  <a
                    href={officialEventUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Official Portal</span>
                  </a>
                )}
                {tournament.matches.some((m) => m.streamUrl) && (
                  <Link
                    href={`/tournaments/${slug}?tab=matches`}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Watch Stream</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          STICKY TOP SUB-NAVIGATION
      ═══════════════════════════════════════════════════════════ */}
      <TournamentSubnav
        slug={slug}
        activeTab={activeTab}
        matchesCount={tournament.matches.length}
        teamsCount={tournament.teams.length}
      />

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT VIEWPORT
      ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ═══ TAB: OVERVIEW (COMMAND CENTER) ═══ */}
        {activeTab === 'overview' && (
          <TournamentOverviewHub
            tournament={tournament}
            stagesData={stagesData}
            overallStandings={overallStandings}
            overallTopFragger={overallTopFragger}
            overallFraggers={overallFraggers}
            pointsMatrix={formatRules.pointsMatrix}
            killMultiplier={formatRules.killPointsPerElim || 1}
          />
        )}

        {/* ═══ TAB: STANDINGS ═══ */}
        {activeTab === 'standings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <TournamentStageStandings
                stagesData={stagesData}
                overallStandings={overallStandings}
                overallTopFragger={overallTopFragger}
                tournamentName={tournament.name}
                pointsMatrix={formatRules.pointsMatrix}
                killMultiplier={formatRules.killPointsPerElim || 1}
                qualifyCount={16}
              />
            </div>
            <div className="lg:col-span-4">
              <TournamentSidebarInfo
                tournament={tournament}
                topFraggers={overallFraggers}
                upcomingMatches={upcomingMatches}
                prizeTopRanks={prizeDist.slice(0, 3)}
              />
            </div>
          </div>
        )}

        {/* ═══ TAB: MATCHES & SCHEDULE ═══ */}
        {activeTab === 'matches' && (
          <TournamentMatchesHub
            matches={tournament.matches as any}
            tournamentName={tournament.name}
          />
        )}

        {/* ═══ TAB: FORMAT & RULES ═══ */}
        {activeTab === 'format' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <TournamentFormatHub
                stages={tournament.stages as any}
                formatDetails={tournament.formatDetails}
                pointsMatrix={formatRules.pointsMatrix}
                killMultiplier={formatRules.killPointsPerElim || 1}
                gameMode={tournament.gameMode}
                eventType={tournament.eventType}
                device={tournament.device}
                streamUrl={tournament.matches.find((m) => m.streamUrl)?.streamUrl}
                vods={tournament.matches.find((m) => m.vods)?.vods}
              />
            </div>
            <div className="lg:col-span-4">
              <TournamentSidebarInfo
                tournament={tournament}
                topFraggers={overallFraggers}
                upcomingMatches={upcomingMatches}
                prizeTopRanks={prizeDist.slice(0, 3)}
              />
            </div>
          </div>
        )}

        {/* ═══ TAB: TEAMS & ROSTERS ═══ */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Contending Squads &amp; Player Rosters
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official registered teams and active starting lineups for {tournament.name}.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {tournament.teams.length} Squads
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {tournament.teams.map((tt) => {
                const rosterList = Array.isArray(tt.rosterJson)
                  ? (tt.rosterJson as Array<{ ign: string; role?: string; captain?: boolean } | string>)
                  : [];

                return (
                  <div
                    key={tt.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] overflow-hidden shadow-2xs hover:border-[#0A5FC4]/50 transition-colors flex flex-col justify-between"
                  >
                    {/* Team Top Info */}
                    <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden p-1">
                        {tt.team.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={tt.team.logoUrl}
                            alt={tt.team.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="font-bold text-xs text-slate-500">
                            {(tt.team.tag || tt.team.name).slice(0, 3).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/teams/${tt.team.slug}`}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-[#0A5FC4] transition-colors truncate block"
                        >
                          {tt.team.name}
                        </Link>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          {tt.team.tag && <span className="font-mono">[{tt.team.tag}]</span>}
                          {tt.team.region && <span>· {tt.team.region}</span>}
                          {tt.seed != null && <span>· Seed #{tt.seed}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Roster List */}
                    <div className="p-3 space-y-1 bg-slate-50/50 dark:bg-[#080d17]">
                      {rosterList.length > 0 ? (
                        rosterList.map((player, i) => {
                          const ign = typeof player === 'string' ? player : player.ign;
                          const role = typeof player === 'string' ? '' : player.role;
                          const isCaptain = typeof player === 'string' ? false : player.captain;

                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between py-1 px-2 rounded-md text-xs hover:bg-white dark:hover:bg-slate-800/60 transition-colors"
                            >
                              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                {ign}
                                {isCaptain && (
                                  <span className="text-[9px] px-1 rounded bg-amber-500 text-white font-bold">
                                    C
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400">{role || 'Player'}</span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-[11px] text-slate-400 italic block py-1">
                          Official roster TBA
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ TAB: PRIZE POOL ═══ */}
        {activeTab === 'prizepool' && (
          <div className="space-y-6">
            {/* Prize Header Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-6 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                Total Tournament Prize Pool
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                <PrizePoolBadge
                  amount={tournament.prizePool}
                  currency={tournament.currency}
                  usdRate={tournament.usdRate}
                />
              </div>
            </div>

            {/* Qualifications / Seeds if present */}
            {qualificationsList.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> Direct Qualification Tickets &amp; Seeds
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {qualificationsList.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#080d17] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs">
                          {q.place}
                        </span>
                        {q.description && (
                          <span className="text-[10px] text-slate-400">{q.description}</span>
                        )}
                      </div>
                      <div className="space-y-1 pt-1">
                        {q.events.map((ev: any, evIdx: number) => {
                          const evName = typeof ev === 'string' ? ev : ev.name;
                          return (
                            <div
                              key={evIdx}
                              className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1"
                            >
                              <Zap className="w-3 h-3 text-[#0A5FC4] shrink-0" />
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

            {/* Stage-wise Prize Breakdown Tables */}
            {prizeStages.map((stage, sIdx) => (
              <div
                key={sIdx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] overflow-hidden shadow-2xs"
              >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080d17] flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#0A5FC4]" /> {stage.stageName} Prize Distribution
                  </h3>
                  {stage.allocatedPrize != null && stage.allocatedPrize > 0 && (
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {tournament.currency} {stage.allocatedPrize.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[500px]">
                    <thead>
                      <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0c101d]">
                        <th className="py-2 px-3 text-left">Rank / Award</th>
                        <th className="py-2 px-3 text-left">Winner</th>
                        <th className="py-2 px-3 text-center">Share</th>
                        <th className="py-2 px-3 text-right">Prize ({tournament.currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {stage.ranks.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                            {p.rank}
                          </td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                            {p.playerName || p.teamName || '—'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">
                            {p.percentage ? `${p.percentage}%` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {p.rewardType === 'TITLE' ? (
                              <span className="text-amber-600 font-bold">🏆 Title</span>
                            ) : p.customReward ? (
                              <span>{p.customReward}</span>
                            ) : (
                              `${tournament.currency} ${Number(p.prize || 0).toLocaleString()}`
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ TAB: FRAGGERS & INDIVIDUAL STATS ═══ */}
        {activeTab === 'fraggers' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Individual Fragger Leaderboard
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Top performing battle royale combatants ranked by total finishes and combat damage.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {overallFraggers.length} Fraggers
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c101d] overflow-hidden shadow-2xs">
                {overallFraggers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No individual player stats recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[640px]">
                      <thead>
                        <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-[#080d17] border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2.5 px-3 text-left w-12">#</th>
                          <th className="py-2.5 px-3 text-left">Player (IGN)</th>
                          <th className="py-2.5 px-3 text-left">Team</th>
                          <th className="py-2.5 px-2 text-center">MP</th>
                          <th className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                            Elims
                          </th>
                          <th className="py-2.5 px-2 text-center">Damage</th>
                          <th className="py-2.5 px-2 text-center">Headshots</th>
                          <th className="py-2.5 px-2 text-center">Knockouts</th>
                          <th className="py-2.5 px-3 text-right">MVPs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {overallFraggers.map((f) => (
                          <tr key={f.playerId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-mono font-bold text-slate-500">
                              #{f.rank}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                              <div className="flex items-center gap-1.5">
                                <span>{f.ign}</span>
                                {f.mvps > 0 && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-white font-bold">
                                    MVP
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-500">{f.teamName}</td>
                            <td className="py-2 px-2 text-center font-mono text-slate-400">
                              {f.matchesPlayed}
                            </td>
                            <td className="py-2 px-2 text-center font-mono font-black text-rose-600 dark:text-rose-400">
                              {f.elims}
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-300">
                              {f.damage.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-500">
                              {f.headshots}
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-slate-500">
                              {f.knockouts}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                              {f.mvps > 0 ? `${f.mvps}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-4">
              <TournamentSidebarInfo
                tournament={tournament}
                topFraggers={overallFraggers}
                upcomingMatches={upcomingMatches}
                prizeTopRanks={prizeDist.slice(0, 3)}
              />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
