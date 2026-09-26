import { notFound, permanentRedirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  AtSign,
  CalendarDays,
  Camera,
  Gamepad2,
  Globe,
  MessageCircle,
  PlaySquare,
  Trophy,
  Users,
} from 'lucide-react';
import { PlayerTabShell } from '@/components/players/player-tab-shell';
import { JsonLd } from '@/components/seo/json-ld';
import { personJsonLd } from '@/lib/seo';
import { PageViews } from '@/components/ui/page-views';
import prisma from '@/lib/prisma';
import { RecentFormChart } from '@/components/players/recent-form-chart';
import { RailSlot } from '@/components/ads/rail-slot';
import { buildCareerHistory, type CareerAppearance } from '@/lib/player-career';
import { eliminations } from '@/lib/player-stats';
import { formatDate } from '@/lib/utils';
import { resolveSlugRedirect } from '@/lib/slug-history';
import { DEFAULT_GAME_SLUG, gameHref, gameSlugOf } from '@/lib/games';
import {
  loadPlayerCareer,
  loadPlayerContext,
  loadPlayerMatches,
  loadPlayerStanding,
  playerMetadata,
} from './player-data';

interface PlayerPageProps {
  params: Promise<{ game: string; slug: string }>;
}
type SocialMap = Record<string, string>;

export const revalidate = 180;

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

function monthsBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (30.44 * 86_400_000)));
}

function fmtTenure(months: number) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (!years) return `${rest} mo`;
  return rest ? `${years} yr ${rest} mo` : `${years} yr${years > 1 ? 's' : ''}`;
}

function fmtMonthYear(date: Date) {
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { game, slug } = await params;
  return playerMetadata(slug, 'overview', game);
}

export default async function PlayerOverviewPage({ params }: PlayerPageProps) {
  const { slug } = await params;
  const context = await loadPlayerContext(slug);
  if (!context) {
    const target = await resolveSlugRedirect('player', slug);
    if (target) permanentRedirect(gameHref(target.gameSlug, `players/${target.slug}`));
    notFound();
  }
  const { player } = context;

  const [matches, career, standing] = await Promise.all([
    loadPlayerMatches(player.id),
    loadPlayerCareer(player.id),
    loadPlayerStanding(player.id),
  ]);

  const recentStats = matches.slice(0, 20);
  const chartPoints = recentStats.map((row) => ({
    elims: eliminations(row),
    dateLabel: new Date(row.matchGame.match.scheduledAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    }),
    tournament: row.matchGame.match.tournament?.name ?? 'Match',
    map: row.matchGame.mapName ?? '',
  }));

  // ── Career history: tenures derived from event appearances, not transfers ──
  const { squadParticipations, reportedRows } = career;
  const careerAppearances: CareerAppearance[] = [];
  for (const tt of squadParticipations) {
    const entry = (Array.isArray(tt.rosterJson) ? tt.rosterJson : []).find(
      (e) => e && typeof e === 'object' && (e as { playerId?: string | null }).playerId === player.id,
    ) as { staffRole?: string | null; role?: string | null } | undefined;
    if (!entry) continue;
    careerAppearances.push({
      teamId: tt.teamId,
      date: tt.tournament.startDate,
      role: entry.staffRole ?? entry.role ?? null,
    });
  }

  // A reported row counts as event participation only where the event's roster
  // does not already list this player — entered rosters always win. One entry per
  // event, so day slices don't produce duplicate tenures.
  const rosterEventIds = new Set(squadParticipations.map((tt) => tt.tournamentId));
  const reportedParticipation = new Map<string, { teamId: string; date: Date }>();
  for (const row of reportedRows) {
    if (!row.teamId || !row.tournament.startDate) continue;
    if (rosterEventIds.has(row.tournamentId)) continue;
    if (reportedParticipation.has(row.tournamentId)) continue;
    reportedParticipation.set(row.tournamentId, { teamId: row.teamId, date: row.tournament.startDate });
  }
  for (const entry of reportedParticipation.values()) {
    careerAppearances.push({ teamId: entry.teamId, date: entry.date, role: null });
  }

  const teamById = new Map<string, (typeof squadParticipations)[number]['team']>();
  for (const tt of squadParticipations) teamById.set(tt.team.id, tt.team);

  const historyList = buildCareerHistory(careerAppearances, player.currentTeamId).map((entry) => ({
    team: teamById.get(entry.teamId) ?? { id: entry.teamId, name: 'Unknown team', tag: null, slug: null },
    roles: entry.roles,
    spans: entry.spans,
  }));

  // A player on a team with no event on record still shows that tenure.
  if (player.currentTeam && !historyList.some((entry) => entry.team.id === player.currentTeamId)) {
    historyList.unshift({
      team: player.currentTeam,
      roles: player.staffRole ? [player.staffRole] : [],
      spans: [{ start: null, end: null }],
    });
  }

  // ── Played-with matrix: teammates from shared match games on the same team ──
  const gameTeam = new Map<string, string | null>();
  const gameTournament = new Map<string, { id: string; name: string; slug: string | null }>();
  for (const row of matches) {
    gameTeam.set(row.matchGameId, row.teamId);
    if (row.matchGame.match.tournament) gameTournament.set(row.matchGameId, row.matchGame.match.tournament);
  }
  const gameIds = [...gameTeam.keys()];
  const teammates: {
    player: { id: string; ign: string; slug: string | null; avatarUrl: string | null };
    matches: number;
    events: number;
  }[] = [];
  if (gameIds.length) {
    const mateRows = await prisma.matchPlayerStat.findMany({
      where: { matchGameId: { in: gameIds }, playerId: { not: player.id } },
      select: {
        matchGameId: true,
        teamId: true,
        player: { select: { id: true, ign: true, slug: true, avatarUrl: true } },
      },
    });
    const grouped = new Map<
      string,
      { player: (typeof mateRows)[number]['player']; gameSet: Set<string>; eventSet: Set<string> }
    >();
    for (const row of mateRows) {
      const myTeam = gameTeam.get(row.matchGameId);
      if (!myTeam || row.teamId !== myTeam) continue;
      let entry = grouped.get(row.player.id);
      if (!entry) {
        entry = { player: row.player, gameSet: new Set(), eventSet: new Set() };
        grouped.set(row.player.id, entry);
      }
      entry.gameSet.add(row.matchGameId);
      const tournament = gameTournament.get(row.matchGameId);
      if (tournament) entry.eventSet.add(tournament.id);
    }
    teammates.push(
      ...[...grouped.values()]
        .map((entry) => ({ player: entry.player, matches: entry.gameSet.size, events: entry.eventSet.size }))
        .sort((a, b) => b.matches - a.matches)
        .slice(0, 12),
    );
  }

  const socials = (player.socialLinks ?? {}) as SocialMap;
  const age = calcAge(player.birthDate);

  const playerJsonLd = personJsonLd({
    ign: player.ign,
    slug: player.slug,
    firstName: player.firstName,
    lastName: player.lastName,
    avatarUrl: player.avatarUrl,
    nationality: player.nationality,
    role: player.role,
    birthDate: player.birthDate,
    teamName: player.currentTeam?.name ?? null,
    teamSlug: player.currentTeam?.slug ?? null,
    sameAs: Object.values(socials).filter((value) => value.length > 0),
  });

  return (
    <PlayerTabShell slug={slug} activeTab="overview">
      <JsonLd data={playerJsonLd} />
      <PageViews
        type="PLAYER"
        id={player.id}
        override={player.showViewCount}
        windowOverride={player.viewCountWindow}
        className="mb-4"
      />

      <div className="grid min-w-0 gap-5 lg:grid-cols-[1.4fr_.8fr]">
        <div className="min-w-0 space-y-8">
          {/* Recent form — line chart of the last 20 matches */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
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
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220] sm:p-8">
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
              <div className="w-full overflow-x-auto">
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
                            href={gameHref(DEFAULT_GAME_SLUG, `players/${mate.player.slug || mate.player.ign.toLowerCase()}`)}
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
                        <td className="py-3 text-center font-black text-[#0A5FC4] dark:text-blue-300">
                          {mate.matches}
                        </td>
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
        </div>

        {/* Sidebar */}
        <aside className="min-w-0 space-y-8">

          {/* Career history — every tenure with periods & durations */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
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
                        href={gameHref(DEFAULT_GAME_SLUG, `teams/${team.slug}`)}
                        className="min-w-0 truncate text-sm font-extrabold transition-colors hover:text-[#0A5FC4]"
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
                {player.currentTeam
                  ? 'No previous teams on record.'
                  : 'Team history appears once the player is on an event roster.'}
              </div>
            )}
          </section>

          {/* One box down: under the career history, above the player details card. */}
          <RailSlot />

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
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
                  <dt className="shrink-0 text-slate-400">{label}</dt>
                  <dd className="text-right font-bold break-words">{value}</dd>
                </div>
              ))}
            </dl>

            {Object.keys(socials).length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-white/10">
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
                  <p className="text-base font-black">{standing.finishes}</p>
                  <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200">Elims</p>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-blue-100">
                Ranking data will appear once this player has an official rating snapshot.
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {standing && (
                <Link
                  href={gameHref(gameSlugOf(player), `rankings/player/${player.id}`)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-black uppercase tracking-wider text-[#0A5FC4] shadow-sm transition hover:bg-blue-50"
                >
                  Points breakdown <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              <Link
                href={`${gameHref(gameSlugOf(player), 'rankings')}?board=players`}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-white/20 hover:text-amber-200"
              >
                Leaderboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </PlayerTabShell>
  );
}
