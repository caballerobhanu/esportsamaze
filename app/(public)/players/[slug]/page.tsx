import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  AtSign,
  Briefcase,
  Camera,
  Check,
  Coins,
  CalendarDays,
  Gamepad2,
  Globe,
  MessageCircle,
  PlaySquare,
  Trophy,
  Users,
  Crosshair,
  Swords,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { computePlayerRankings } from '@/lib/krafton-rankings';
import { formatDate } from '@/lib/utils';
import { getExchangeRatesForDate, resolveCurrencyUsdRate } from '@/lib/currency';
import { EarningsAmount } from '@/components/players/earnings-amount';
import { RecentFormChart } from '@/components/players/recent-form-chart';
import { loadTransferRules } from '@/lib/ranking-rules';

interface PlayerPageProps {
  params: Promise<{ slug: string }>;
}
type SocialMap = Record<string, string>;

export const dynamic = 'force-dynamic';

const socialIcons: Record<string, typeof Globe> = {
  instagram: Camera,
  youtube: PlaySquare,
  twitter: AtSign,
  x: AtSign,
  discord: MessageCircle,
  website: Globe,
};

function socialHref(key: string, value: string) {
  const clean = value.trim();
  if (/^(javascript|data|vbscript):/i.test(clean)) return '#';
  if (/^https?:\/\//i.test(clean)) return clean;
  const handle = clean.replace(/^@/, '');
  if (key === 'instagram') return `https://instagram.com/${handle}`;
  if (key === 'youtube') return `https://youtube.com/@${handle}`;
  if (key === 'twitter' || key === 'x') return `https://twitter.com/${handle}`;
  if (key === 'discord') return `https://discord.gg/${handle}`;
  return `https://${clean}`;
}

function calcAge(date: Date | null) {
  return date ? Math.floor((Date.now() - date.getTime()) / (365.25 * 86_400_000)) : null;
}

/** Per-match eliminations — importers write either playerElims or the legacy kills alias. */
function eliminations(stat: { playerElims: number; kills: number }) {
  return Math.max(stat.playerElims ?? 0, stat.kills ?? 0);
}

/** Rate lookup is keyed by the event's start date — historical rates for past events, live for future/undated. */
function rateKeyFor(startDate: Date | string | null) {
  if (!startDate) return 'live';
  const d = startDate instanceof Date ? startDate : new Date(startDate);
  return isNaN(d.getTime()) ? 'live' : d.toISOString().slice(0, 10);
}

function monthsBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (30.44 * 86_400_000)));
}

function fmtTenure(months: number) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m} mo`;
  return m ? `${y} yr ${m} mo` : `${y} yr${y > 1 ? 's' : ''}`;
}

function fmtMonthYear(date: Date) {
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

interface PrizeRankEntry {
  rank?: string;
  prize?: number;
  recipientType?: string;
  playerId?: string;
  playerName?: string;
}

/** Individual (PLAYER-recipient) cash awards for this player from a tournament's prize distribution JSON. */
function extractIndividualPrizes(prizeDistribution: unknown, playerId: string, ign: string) {
  const stages = Array.isArray(prizeDistribution)
    ? prizeDistribution
    : prizeDistribution && typeof prizeDistribution === 'object' && Array.isArray((prizeDistribution as { stages?: unknown[] }).stages)
      ? (prizeDistribution as { stages: unknown[] }).stages
      : [];
  const out: { label: string; amount: number }[] = [];
  for (const stage of stages) {
    const ranks = (stage && typeof stage === 'object' && Array.isArray((stage as { ranks?: unknown[] }).ranks)
      ? (stage as { ranks: unknown[] }).ranks
      : []) as PrizeRankEntry[];
    for (const r of ranks) {
      if (!r || r.recipientType !== 'PLAYER') continue;
      const isMe = r.playerId ? r.playerId === playerId : (r.playerName ?? '').trim().toLowerCase() === ign.toLowerCase();
      if (!isMe) continue;
      const amount = Number(r.prize ?? 0);
      if (amount > 0) out.push({ label: String(r.rank ?? 'Cash prize'), amount });
    }
  }
  return out;
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const player = await prisma.player.findFirst({
      where: {
        OR: [
          { slug },
          { ign: { equals: slug, mode: 'insensitive' } },
          { id: slug },
        ],
      },
      select: { ign: true },
    });
    return {
      title: player ? `${player.ign} — Player Profile | eSportsAmaze` : 'Player Profile | eSportsAmaze',
    };
  } catch {
    return { title: 'Player Profile | eSportsAmaze' };
  }
}

async function getStanding(ign: string) {
  try {
    const [rows, rules] = await Promise.all([
      prisma.playerRanking.findMany({
        select: {
          tier: true,
          endDate: true,
          finishes: true,
          mvpTourney: true,
          mvpFinals: true,
          igl: true,
          survivor: true,
          emerging: true,
          tournamentId: true,
          tournament: { select: { rankingIncluded: true } },
          player: { select: { ign: true } },
        },
      }),
      loadTransferRules(),
    ]);
    const standings = computePlayerRankings(
      rows
        .filter((r) => !r.tournamentId || r.tournament?.rankingIncluded !== false)
        .map((r) => ({
        tournament: '',
        tier: r.tier,
        endDate: r.endDate.toISOString().slice(0, 10),
        player: r.player.ign,
        team: '',
        finishes: r.finishes,
        mvpTourney: r.mvpTourney > 0,
        mvpFinals: r.mvpFinals > 0,
        igl: r.igl > 0,
        survivor: r.survivor > 0,
        emerging: r.emerging > 0,
      })),
      new Date(),
      rules
    );
    return standings.find((s) => s.name.toLowerCase() === ign.toLowerCase()) ?? null;
  } catch {
    return null;
  }
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug).trim();
  const player = await prisma.player.findFirst({
    where: {
      OR: [
        { slug },
        { slug: decoded },
        { ign: { equals: decoded, mode: 'insensitive' } },
        { id: slug },
      ],
    },
    include: { currentTeam: true, game: true },
  });
  if (!player) notFound();

  const [standing, prevPlayer, nextPlayer, allStats, transfers] = await Promise.all([
    getStanding(player.ign),
    prisma.player.findFirst({
      where: { id: { lt: player.id } },
      orderBy: { id: 'desc' },
      select: { slug: true, ign: true },
    }),
    prisma.player.findFirst({
      where: { id: { gt: player.id } },
      orderBy: { id: 'asc' },
      select: { slug: true, ign: true },
    }),
    // Full match-by-match history (powers the form chart, career totals and teammates matrix)
    prisma.matchPlayerStat.findMany({
      where: { playerId: player.id },
      orderBy: { matchGame: { match: { scheduledAt: 'desc' } } },
      select: {
        id: true,
        kills: true,
        playerElims: true,
        assists: true,
        deaths: true,
        matchGameId: true,
        teamId: true,
        matchGame: {
          select: {
            mapName: true,
            match: {
              select: {
                scheduledAt: true,
                tournament: { select: { id: true, name: true, slug: true, startDate: true, currency: true, usdRate: true, prizeDistribution: true } },
              },
            },
          },
        },
      },
    }),
    prisma.transfer.findMany({
      where: { playerId: player.id },
      orderBy: { date: 'desc' },
      include: { team: { select: { id: true, name: true, tag: true, slug: true } } },
    }),
  ]);

  // Scope squad participations to candidate teams and tournaments associated with this player
  const candidateTeamIds = Array.from(
    new Set([
      ...(player.currentTeamId ? [player.currentTeamId] : []),
      ...transfers.map((t) => t.teamId),
      ...allStats.map((s) => s.teamId).filter((id): id is string => Boolean(id)),
    ])
  );
  const candidateTournamentIds = Array.from(
    new Set(allStats.map((s) => s.matchGame.match.tournament?.id).filter((id): id is string => Boolean(id)))
  );

  const squadParticipations =
    candidateTeamIds.length > 0 || candidateTournamentIds.length > 0
      ? await prisma.tournamentTeam.findMany({
          where: {
            OR: [
              ...(candidateTeamIds.length > 0 ? [{ teamId: { in: candidateTeamIds } }] : []),
              ...(candidateTournamentIds.length > 0 ? [{ tournamentId: { in: candidateTournamentIds } }] : []),
            ],
          },
          take: 50,
          orderBy: { tournament: { startDate: 'desc' } },
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                slug: true,
                startDate: true,
                currency: true,
                usdRate: true,
                prizeDistribution: true,
              },
            },
            team: { select: { id: true, name: true, tag: true, slug: true } },
          },
        })
      : [];

  const socials = (player.socialLinks ?? {}) as SocialMap;
  const realName = [player.firstName, player.lastName].filter(Boolean).join(' ') || 'Name not disclosed';
  const age = calcAge(player.birthDate);
  const avatar = player.avatarUrl;

  // ── Career totals across ALL recorded matches ──
  const games = allStats.length;
  const totalKills = allStats.reduce((sum, s) => sum + eliminations(s), 0);
  const avgKills = games ? totalKills / games : null;
  const recentStats = allStats.slice(0, 20);
  const recentKills = recentStats.reduce((sum, s) => sum + eliminations(s), 0);
  const recentAvg = recentStats.length ? recentKills / recentStats.length : null;
  const chartPoints = recentStats.map((s) => ({
    elims: eliminations(s),
    dateLabel: new Date(s.matchGame.match.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    tournament: s.matchGame.match.tournament?.name ?? 'Match',
    map: s.matchGame.mapName ?? '',
  }));

  const heroStats = [
    { label: 'Global Rank', value: standing ? `#${standing.rank}` : '—', accent: true },
    { label: 'Total Kills', value: games ? totalKills.toLocaleString('en-IN') : '—' },
    { label: 'Avg Kills / Match', value: avgKills !== null ? avgKills.toFixed(1) : '—' },
    { label: 'Last 20 Avg', value: recentAvg !== null ? recentAvg.toFixed(1) : '—' },
  ];

  // ── Career history: every tenure from the transfer ledger, with periods ──
  const historyTeams = new Map<string, { team: (typeof transfers)[number]['team']; records: (typeof transfers)[number][] }>();
  for (const tr of transfers) {
    let entry = historyTeams.get(tr.teamId);
    if (!entry) {
      entry = { team: tr.team, records: [] };
      historyTeams.set(tr.teamId, entry);
    }
    entry.records.push(tr);
  }

  // Pair JOINED → LEFT records into tenure spans; an unmatched JOINED runs to "Present"
  const spansFor = (records: (typeof transfers)[number][]) => {
    const asc = [...records].sort((a, b) => a.date.getTime() - b.date.getTime());
    const spans: { start: Date | null; end: Date | null }[] = [];
    let open: { start: Date } | null = null;
    for (const r of asc) {
      if (r.type === 'LEFT' || r.type === 'BENCHED') {
        if (open) {
          spans.push({ start: open.start, end: r.date });
          open = null;
        } else {
          spans.push({ start: null, end: r.date });
        }
      } else if (open) {
        spans.push({ start: open.start, end: null });
        open = { start: r.date };
      } else {
        open = { start: r.date };
      }
    }
    if (open) spans.push({ start: open.start, end: null });
    return spans;
  };

  const historyList = [...historyTeams.values()].map(({ team, records }) => {
    const roles = [...new Set(records.map((r) => r.staffRole).filter(Boolean))] as string[];
    return { team, records, roles, spans: spansFor(records) };
  });

  // ── Played-with matrix: teammates from shared match games on the same team ──
  const gameTeam = new Map<string, string | null>();
  const gameTournament = new Map<string, { id: string; name: string; slug: string | null }>();
  for (const s of allStats) {
    gameTeam.set(s.matchGameId, s.teamId);
    if (s.matchGame.match.tournament) gameTournament.set(s.matchGameId, s.matchGame.match.tournament);
  }
  const gameIds = [...gameTeam.keys()];
  const teammates: { player: { id: string; ign: string; slug: string | null; avatarUrl: string | null }; matches: number; events: number }[] = [];
  if (gameIds.length) {
    const mateRows = await prisma.matchPlayerStat.findMany({
      where: { matchGameId: { in: gameIds }, playerId: { not: player.id } },
      select: {
        matchGameId: true,
        teamId: true,
        player: { select: { id: true, ign: true, slug: true, avatarUrl: true } },
      },
    });
    const agg = new Map<string, { player: (typeof mateRows)[number]['player']; gameSet: Set<string>; eventSet: Set<string> }>();
    for (const row of mateRows) {
      const myTeam = gameTeam.get(row.matchGameId);
      if (!myTeam || row.teamId !== myTeam) continue;
      let entry = agg.get(row.player.id);
      if (!entry) {
        entry = { player: row.player, gameSet: new Set(), eventSet: new Set() };
        agg.set(row.player.id, entry);
      }
      entry.gameSet.add(row.matchGameId);
      const t = gameTournament.get(row.matchGameId);
      if (t) entry.eventSet.add(t.id);
    }
    teammates.push(
      ...[...agg.values()]
        .map((e) => ({ player: e.player, matches: e.gameSet.size, events: e.eventSet.size }))
        .sort((a, b) => b.matches - a.matches)
        .slice(0, 12)
    );
  }

  // ── Event participation from squad line-ups ──
  const ignLower = player.ign.toLowerCase();
  const inRoster = (json: unknown) =>
    Array.isArray(json) &&
    json.some((e) => {
      if (!e || typeof e !== 'object') return false;
      const entry = e as { playerId?: string | null; ign?: string; isStaff?: boolean };
      if (entry.isStaff) return false;
      if (entry.playerId) return entry.playerId === player.id;
      return (entry.ign ?? '').trim().toLowerCase() === ignLower;
    });

  const teamById = new Map<string, (typeof squadParticipations)[number]['team']>();
  const lineupByTournament = new Map<string, { team: (typeof squadParticipations)[number]['team']; finalRank: number | null }>();
  for (const tt of squadParticipations) {
    teamById.set(tt.team.id, tt.team);
    if (!inRoster(tt.rosterJson)) continue;
    const existing = lineupByTournament.get(tt.tournament.id);
    if (!existing || (existing.finalRank ?? 999) > (tt.finalRank ?? 999)) {
      lineupByTournament.set(tt.tournament.id, { team: tt.team, finalRank: tt.finalRank });
    }
  }

  // ── FX conversion: always the exchange rate on the event's start date ──
  const ratesByDate = new Map<string, Record<string, number>>();
  const ensureRates = async (startDate: Date | null) => {
    const key = rateKeyFor(startDate);
    if (!ratesByDate.has(key)) {
      ratesByDate.set(key, await getExchangeRatesForDate(key === 'live' ? null : key));
    }
    return key;
  };
  const usdFor = async (amount: number, currency?: string | null, startDate?: Date | null) => {
    const key = await ensureRates(startDate ?? null);
    return amount * resolveCurrencyUsdRate(currency || 'USD', ratesByDate.get(key));
  };

  // ── Career earnings: one ledger line per earning (team prize and individual awards kept separate) ──
  interface EarningLine {
    key: string;
    tournament: (typeof squadParticipations)[number]['tournament'];
    kind: 'team' | 'individual';
    label: string;
    sub: string | null;
    amount: number;
    currency: string | null;
    usd: number;
    dateKey: number;
  }

  const earningLines: EarningLine[] = [];
  for (const row of squadParticipations) {
    if (!inRoster(row.rosterJson)) continue;
    const dateKey = row.tournament.startDate?.getTime() ?? 0;
    if ((row.prizeWon ?? 0) > 0) {
      earningLines.push({
        key: `${row.tournament.id}-team`,
        tournament: row.tournament,
        kind: 'team',
        label: 'Team prize',
        sub: `${row.team.name}${row.finalRank ? ` · Finish #${row.finalRank}` : ''}`,
        amount: row.prizeWon ?? 0,
        currency: row.tournament.currency,
        usd: await usdFor(row.prizeWon ?? 0, row.tournament.currency, row.tournament.startDate),
        dateKey,
      });
    }
    for (const [idx, prize] of extractIndividualPrizes(row.tournament.prizeDistribution, player.id, player.ign).entries()) {
      earningLines.push({
        key: `${row.tournament.id}-ind-${idx}`,
        tournament: row.tournament,
        kind: 'individual',
        label: prize.label,
        sub: `${row.team.name} · Individual award`,
        amount: prize.amount,
        currency: row.tournament.currency,
        usd: await usdFor(prize.amount, row.tournament.currency, row.tournament.startDate),
        dateKey,
      });
    }
  }
  // Individual awards from events that have no recorded squad line-up
  for (const s of allStats) {
    const t = s.matchGame.match.tournament;
    if (!t || [...lineupByTournament.keys()].includes(t.id)) continue;
    for (const [idx, prize] of extractIndividualPrizes(t.prizeDistribution, player.id, player.ign).entries()) {
      earningLines.push({
        key: `${t.id}-ind-${idx}`,
        tournament: t,
        kind: 'individual',
        label: prize.label,
        sub: 'Individual award',
        amount: prize.amount,
        currency: t.currency,
        usd: await usdFor(prize.amount, t.currency, t.startDate),
        dateKey: t.startDate?.getTime() ?? 0,
      });
    }
  }
  earningLines.sort((a, b) => b.dateKey - a.dateKey || (a.kind === 'team' ? -1 : 1));

  const individualTotalUsd = earningLines.filter((l) => l.kind === 'individual').reduce((sum, l) => sum + l.usd, 0);
  const teamTotalUsd = earningLines.filter((l) => l.kind === 'team').reduce((sum, l) => sum + l.usd, 0);
  const careerTotalUsd = individualTotalUsd + teamTotalUsd;

  // ── Events performance: matches & eliminations per event + team result ──
  const perfMap = new Map<
    string,
    { tournament: (typeof allStats)[number]['matchGame']['match']['tournament']; teamCounts: Map<string, number>; matches: number; kills: number }
  >();
  for (const s of allStats) {
    const t = s.matchGame.match.tournament;
    if (!t) continue;
    let entry = perfMap.get(t.id);
    if (!entry) {
      entry = { tournament: t, teamCounts: new Map(), matches: 0, kills: 0 };
      perfMap.set(t.id, entry);
    }
    entry.matches += 1;
    entry.kills += eliminations(s);
    if (s.teamId) entry.teamCounts.set(s.teamId, (entry.teamCounts.get(s.teamId) ?? 0) + 1);
  }
  const performanceRows = [...perfMap.values()]
    .map((e) => {
      const topTeamId = [...e.teamCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const lineup = lineupByTournament.get(e.tournament.id);
      return {
        tournament: e.tournament,
        team: lineup?.team ?? (topTeamId ? teamById.get(topTeamId) ?? null : null),
        finalRank: lineup?.finalRank ?? null,
        matches: e.matches,
        kills: e.kills,
      };
    })
    .sort((a, b) => (b.tournament.startDate?.getTime() ?? 0) - (a.tournament.startDate?.getTime() ?? 0));

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 dark:bg-[#070b14] dark:text-white">
      <main>
        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_42%,rgba(10,95,196,.06)_42%,rgba(10,95,196,.06)_43%,transparent_43%),radial-gradient(circle_at_85%_-10%,rgba(10,95,196,.18),transparent_45%)] dark:bg-[linear-gradient(115deg,transparent_42%,rgba(255,255,255,.03)_42%,rgba(255,255,255,.03)_43%,transparent_43%),radial-gradient(circle_at_85%_-10%,rgba(37,99,235,.25),transparent_45%)]" />
          <div className="pointer-events-none absolute -right-10 bottom-0 select-none text-[22vw] font-black leading-none tracking-tighter text-slate-900/[0.04] dark:text-white/[0.03]">
            {player.ign.slice(0, 3).toUpperCase()}
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-0 pt-5 sm:px-6 lg:px-8">
            {/* breadcrumb + pager */}
            <div className="mb-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-slate-400 dark:text-slate-500">
                <Link href="/" className="hover:text-[#0A5FC4]">Home</Link>
                <span>/</span>
                <span>{player.game?.name || 'Esports'}</span>
                <span>/</span>
                <span className="text-[#0A5FC4] dark:text-blue-300">Player profile</span>
              </div>
              <div className="flex gap-2">
                {prevPlayer && (
                  <Link
                    href={`/players/${prevPlayer.slug}`}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                    aria-label={`Previous player: ${prevPlayer.ign}`}
                  >
                    <ArrowRight className="h-4 w-4 rotate-180" />
                  </Link>
                )}
                {nextPlayer && (
                  <Link
                    href={`/players/${nextPlayer.slug}`}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                    aria-label={`Next player: ${nextPlayer.ign}`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>

            <div className="grid items-center gap-10 pb-12 lg:grid-cols-[auto_1fr] lg:pb-16">
              {/* Portrait card */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-3 -rotate-2 rounded-[2.8rem] bg-[#0A5FC4]/10 dark:bg-[#0A5FC4]/20" />
                  <div className="relative h-64 w-64 overflow-hidden rounded-[2.5rem] border-8 border-white bg-gradient-to-br from-blue-100 via-slate-100 to-blue-200 shadow-[0_25px_70px_-20px_rgba(10,95,196,.5)] dark:border-[#182338] dark:from-blue-950 dark:via-slate-900 dark:to-[#0A5FC4]/30 sm:h-72 sm:w-72">
                    {avatar ? (
                      <Image src={avatar} alt={player.ign} fill className="object-contain object-bottom" priority />
                    ) : (
                      <div className="flex h-full items-center justify-center text-8xl font-black text-[#0A5FC4]/30">
                        {player.ign.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white dark:border-[#182338]">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Identity block */}
              <div className="text-center lg:text-left">
                <div className="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  {player.isPlayer && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active player
                    </span>
                  )}
                  {player.staffRole && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                      <Briefcase className="h-3.5 w-3.5" /> {player.staffRole}
                    </span>
                  )}
                  <span className="rounded-full bg-[#0A5FC4]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-300">
                    {player.game?.name || 'Competitive player'}
                  </span>
                </div>
                <h1 className="text-6xl font-black tracking-[-.06em] text-slate-950 dark:text-white sm:text-7xl lg:text-8xl">
                  {player.ign}
                </h1>
                <p className="mt-4 text-base font-medium text-slate-500 dark:text-slate-400">
                  {realName}
                  <span className="mx-2 text-slate-300">•</span>
                  {player.role || (player.staffRole ? player.staffRole : 'Professional player')}
                </p>

                {player.currentTeam && (
                  <Link
                    href={`/teams/${player.currentTeam.slug}`}
                    className="mt-7 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-extrabold transition hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A5FC4] text-xs text-white">
                      {player.currentTeam.tag?.slice(0, 3) || 'TM'}
                    </span>
                    <span>{player.currentTeam.name}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                )}
              </div>
            </div>

            {/* Stat band — full-bleed under hero */}
            <div className="grid grid-cols-2 divide-slate-200 border-t border-slate-200 dark:divide-white/10 dark:border-white/10 md:grid-cols-4 md:divide-x">
              {heroStats.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1 px-2 py-6 text-center">
                  <span className={`text-3xl font-black tracking-tight ${stat.accent ? 'text-[#0A5FC4] dark:text-blue-300' : ''}`}>
                    {stat.value}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-400">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ BODY ============ */}
        <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
            <div className="space-y-8">
              {/* Recent form — line chart of the last 20 matches */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                      Performance log
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">Recent form</h2>
                  </div>
                  <Gamepad2 className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                </div>

                {chartPoints.length ? (
                  <RecentFormChart points={chartPoints} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-white/10">
                    Match-by-match performance will appear here once results are published.
                  </div>
                )}
              </section>

              {/* Played alongside — teammates matrix */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                      Played alongside
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">Teammates</h2>
                  </div>
                  <Users className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                </div>

                {teammates.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left">
                      <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                        <tr>
                          <th className="pb-3">Player</th>
                          <th className="pb-3 text-center">Events</th>
                          <th className="pb-3 text-center">Matches</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                        {teammates.map((mate) => (
                          <tr key={mate.player.id} className="text-sm">
                            <td className="py-3 pr-3">
                              <Link
                                href={`/players/${mate.player.slug || mate.player.ign.toLowerCase()}`}
                                className="group flex items-center gap-3"
                              >
                                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-black/40">
                                  {mate.player.avatarUrl ? (
                                    <Image src={mate.player.avatarUrl} alt={mate.player.ign} fill className="object-cover" />
                                  ) : (
                                    <span className="text-xs font-black text-slate-400">
                                      {mate.player.ign.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span className="font-bold transition-colors group-hover:text-[#0A5FC4]">
                                  {mate.player.ign}
                                </span>
                              </Link>
                            </td>
                            <td className="py-3 text-center font-bold text-slate-500">{mate.events}</td>
                            <td className="py-3 text-center font-black text-[#0A5FC4] dark:text-blue-300">{mate.matches}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-white/10">
                    Teammate history will appear here once match results are published.
                  </div>
                )}
              </section>

              {/* Career earnings — one ledger line per earning */}
              {earningLines.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
                  <div className="mb-7 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                        Prize money
                      </p>
                      <h2 className="mt-1 text-2xl font-black tracking-tight">Career earnings</h2>
                    </div>
                    <Coins className="h-6 w-6 text-amber-400" />
                  </div>

                  {/* Totals strip */}
                  <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <Crosshair className="mb-3 h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
                      <EarningsAmount amountUsd={individualTotalUsd} className="text-xl font-black tracking-tight" />
                      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
                        Individual winnings
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <Swords className="mb-3 h-4 w-4 text-[#0A5FC4] dark:text-blue-300" />
                      <EarningsAmount amountUsd={teamTotalUsd} className="text-xl font-black tracking-tight" />
                      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-400">
                        Team prize winnings
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-300/50 bg-amber-400/10 p-4">
                      <Trophy className="mb-3 h-4 w-4 text-amber-500" />
                      <EarningsAmount amountUsd={careerTotalUsd} className="text-xl font-black tracking-tight" />
                      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[.16em] text-amber-600 dark:text-amber-300">
                        Career total
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left">
                      <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                        <tr>
                          <th className="pb-3">Event</th>
                          <th className="pb-3">Earning</th>
                          <th className="pb-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                        {earningLines.map((line) => (
                          <tr key={line.key} className="text-sm">
                            <td className="py-4 pr-3">
                              <Link
                                href={`/tournaments/${line.tournament.slug}`}
                                className="font-bold transition-colors hover:text-[#0A5FC4]"
                              >
                                {line.tournament.name}
                              </Link>
                              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {line.tournament.startDate
                                  ? new Date(line.tournament.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                                  : ''}
                              </p>
                            </td>
                            <td className="py-4 pr-3">
                              <span
                                className={
                                  'font-bold ' +
                                  (line.kind === 'team' ? 'text-[#0A5FC4] dark:text-blue-300' : 'text-amber-600 dark:text-amber-400')
                                }
                              >
                                {line.label}
                              </span>
                              {line.sub && (
                                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{line.sub}</p>
                              )}
                            </td>
                            <td className="py-4 text-right font-black">
                              <EarningsAmount
                                amountUsd={line.usd}
                                native={{ amount: line.amount, currency: line.currency ?? 'USD' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Events performance — team results & per-event output */}
              {performanceRows.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
                  <div className="mb-7 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#0A5FC4] dark:text-blue-300">
                        Team tournament results
                      </p>
                      <h2 className="mt-1 text-2xl font-black tracking-tight">Events performance</h2>
                    </div>
                    <Trophy className="h-6 w-6 text-slate-300 dark:text-slate-700" />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left">
                      <thead className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-white/10">
                        <tr>
                          <th className="pb-3">Event</th>
                          <th className="pb-3">Team</th>
                          <th className="pb-3 text-center">Result</th>
                          <th className="pb-3 text-center">Matches</th>
                          <th className="pb-3 text-center">Elims</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                        {performanceRows.map((row) => (
                          <tr key={row.tournament.id} className="text-sm">
                            <td className="py-4 pr-3">
                              <Link
                                href={`/tournaments/${row.tournament.slug}`}
                                className="font-bold transition-colors hover:text-[#0A5FC4]"
                              >
                                {row.tournament.name}
                              </Link>
                              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {row.tournament.startDate
                                  ? new Date(row.tournament.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                                  : ''}
                              </p>
                            </td>
                            <td className="py-4 pr-3 text-slate-500">
                              {row.team ? (
                                <Link href={`/teams/${row.team.slug}`} className="font-bold transition-colors hover:text-[#0A5FC4]">
                                  {row.team.name}
                                </Link>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-4 text-center">
                              {row.finalRank ? (
                                <span className="rounded-md bg-[#0A5FC4]/10 px-2 py-0.5 text-xs font-black text-[#0A5FC4] dark:text-blue-300">
                                  #{row.finalRank}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-4 text-center font-bold text-slate-500">{row.matches}</td>
                            <td className="py-4 text-center font-black text-[#0A5FC4] dark:text-blue-300">{row.kills}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-8">
              {/* Career history — every tenure with periods & durations */}
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                <div className="mb-6 flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
                  <h2 className="text-lg font-black">Career history</h2>
                </div>
                {historyList.length ? (
                  <ol className="space-y-5">
                    {historyList.map(({ team, roles, spans }) => (
                      <li key={team.id} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0 dark:border-white/10">
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={`/teams/${team.slug}`}
                            className="truncate text-sm font-extrabold transition-colors hover:text-[#0A5FC4]"
                          >
                            {team.name}
                          </Link>
                          {roles.length > 0 && (
                            <span className="shrink-0 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                              {roles.join(' / ')}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {spans.map((span, i) => {
                            let text: string;
                            if (span.start && span.end) {
                              text = `${fmtMonthYear(span.start)} – ${fmtMonthYear(span.end)} · ${fmtTenure(monthsBetween(span.start, span.end))}`;
                            } else if (span.start && !span.end) {
                              text = `${fmtMonthYear(span.start)} – Present · ${fmtTenure(monthsBetween(span.start, new Date()))}`;
                            } else if (!span.start && span.end) {
                              text = `Left ${fmtMonthYear(span.end)}`;
                            } else {
                              text = '—';
                            }
                            return (
                              <p key={i} className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {text}
                              </p>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-white/10">
                    {player.currentTeam ? 'No previous teams on record.' : 'Team history will appear here once transfers are recorded.'}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
                <div className="mb-6 flex items-center gap-3">
                  <Users className="h-5 w-5 text-[#0A5FC4] dark:text-blue-300" />
                  <h2 className="text-lg font-black">Player details</h2>
                </div>
                <dl className="space-y-4 text-sm">
                  {[
                    ['Nationality', player.nationality || 'Not listed'],
                    ['Role', player.role || (player.staffRole ? player.staffRole : 'Not listed')],
                    ...(player.staffRole ? ([['Staff role', player.staffRole]] as [string, string][]) : []),
                    [
                      'Date of birth',
                      player.birthDate ? `${formatDate(player.birthDate)}${age ? ` · ${age} years` : ''}` : 'Not listed',
                    ],
                    ['Status', player.status === 'ACTIVE' ? 'Active competitor' : player.status],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-white/10"
                    >
                      <dt className="text-slate-400">{label}</dt>
                      <dd className="text-right font-bold">{value}</dd>
                    </div>
                  ))}
                </dl>

                {Object.keys(socials).length > 0 && (
                  <div className="mt-6 flex gap-2 border-t border-slate-100 pt-5 dark:border-white/10">
                    {Object.entries(socials).map(([key, value]) => {
                      const Icon = socialIcons[key] || Globe;
                      return (
                        <a
                          key={key}
                          href={socialHref(key, String(value))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:border-[#0A5FC4] hover:text-[#0A5FC4] dark:border-white/10"
                          aria-label={key}
                        >
                          <Icon className="h-4 w-4" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* KRAFTON rating card */}
              <section className="overflow-hidden rounded-3xl bg-[#0A5FC4] p-6 text-white shadow-xl shadow-blue-900/15">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-200">KRAFTON ranking</p>
                    <p className="mt-3 text-5xl font-black tracking-tight">{standing ? `#${standing.rank}` : '—'}</p>
                  </div>
                  <Trophy className="h-6 w-6 text-amber-300" />
                </div>
                {standing ? (
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white/10 px-2 py-2.5">
                      <p className="text-base font-black">{standing.points.toFixed(1)}</p>
                      <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200">Points</p>
                    </div>
                    <div className="rounded-xl bg-white/10 px-2 py-2.5">
                      <p className="text-base font-black">{standing.events}</p>
                      <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200">Events</p>
                    </div>
                    <div className="rounded-xl bg-white/10 px-2 py-2.5">
                      <p className="text-base font-black">{standing.totalFinishes}</p>
                      <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200">Finishes</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-6 text-blue-100">
                    Ranking data will appear once this player has an official rating snapshot.
                  </p>
                )}
                <Link
                  href="/rankings"
                  className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white hover:text-amber-200"
                >
                  View full rankings <ArrowRight className="h-4 w-4" />
                </Link>
              </section>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
