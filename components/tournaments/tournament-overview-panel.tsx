import Link from 'next/link';
import { Banknote, CalendarDays, MapPin, Swords, Clock, Users, Trophy, ChevronRight, Flame } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PrizePoolBadge } from '@/components/ui/prize-pool-badge';
import type { AggregatedTeamStanding } from '@/lib/tournament-math';
import type { MatchLite } from './tournament-matches-panel';

interface OverviewMatchLite extends MatchLite {
  stageType?: string | null;
  stage?: { name?: string | null } | null;
}

export function TournamentOverviewPanel({
  tournament,
  featuredStageName,
  featuredStandings,
  overallFraggers,
  matches,
  teamsCount,
  resolvedWinner,
  resolvedRunnerUp,
}: {
  tournament: {
    name: string;
    prizePool?: number | null;
    currency?: string | null;
    usdRate?: number | null;
    startDate: Date;
    endDate: Date;
    gameMode?: string | null;
    eventType?: string | null;
    device?: string | null;
    winner?: string | null;
    runnerUp?: string | null;
    venues?: { venue: { name: string; city?: string | null; country?: string | null }; stageName?: string | null }[];
  };
  featuredStageName: string;
  featuredStandings: AggregatedTeamStanding[];
  overallFraggers: { playerId: string; ign: string; teamName: string; teamTag: string; elims: number; damage: number }[];
  matches: OverviewMatchLite[];
  teamsCount: number;
  resolvedWinner?: string | null;
  resolvedRunnerUp?: string | null;
}) {
  const completed = matches
    .filter((m) => m.status === 'COMPLETED' && m.teamResults.length > 0)
    .sort((a, b) => (b.overallMatchNumber ?? b.matchNumber ?? 0) - (a.overallMatchNumber ?? a.matchNumber ?? 0));
  const upcoming = matches
    .filter((m) => m.status !== 'COMPLETED')
    .sort((a, b) => (a.overallMatchNumber ?? a.matchNumber ?? 0) - (b.overallMatchNumber ?? b.matchNumber ?? 0));
  const latest = completed[0];
  const fraggers = overallFraggers.slice(0, 5);
  const maxElims = Math.max(...fraggers.map((f) => f.elims), 1);

  const facts = [
    { icon: Banknote, label: 'Total Prize', value: <PrizePoolBadge amount={tournament.prizePool} currency={tournament.currency} usdRate={tournament.usdRate} inline /> },
    { icon: CalendarDays, label: 'Schedule', value: <span className="num">{formatDate(tournament.startDate)} — {formatDate(tournament.endDate)}</span> },
    {
      icon: MapPin,
      label: 'Venues',
      value:
        tournament.venues && tournament.venues.length > 0 ? (
          <span className="block leading-snug">
            {tournament.venues.map((v, i) => (
              <span key={i} className="block">
                {[v.venue.name, v.venue.city].filter(Boolean).join(', ')}
                {v.stageName && <span className="text-(--ed-stone)"> · {v.stageName}</span>}
              </span>
            ))}
          </span>
        ) : (
          <span>{tournament.eventType || 'TBA'}</span>
        ),
    },
    { icon: Users, label: 'Format & Teams', value: <span className="truncate">{tournament.gameMode || 'Squad'} · {teamsCount} Teams</span> },
  ];

  return (
    <div className="space-y-12">
      {/* Fact ribbon — one hairline-divided card */}
      <div className="ed-card grid grid-cols-1 gap-px bg-(--ed-hair) sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="bg-(--ed-surface) px-6 py-5">
            <p className="ed-label mb-2 flex items-center gap-1.5">
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
            </p>
            <div className="text-[15px] font-medium">{f.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Left column */}
        <div className="space-y-12 lg:col-span-8">
          {/* Latest result */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2.5 text-xl font-medium tracking-tight">
                <Swords className="h-4.5 w-4.5 text-(--ed-blue)" />
                Latest Match Result
              </h2>
              {latest && (
                <Link href="?tab=matches" className="flex items-center gap-1 text-sm font-medium text-(--ed-blue) hover:underline">
                  All matches <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            <div className="ed-card">
              {latest ? (
                <>
                  <div className="flex items-center justify-between gap-3 border-b border-(--ed-hair) px-6 py-3.5">
                    <p className="text-sm text-(--ed-stone)">
                      {latest.format} {latest.mapName ? <span aria-hidden>·</span> : ''} {latest.mapName}
                    </p>
                    <span className="num text-sm font-medium text-(--ed-stone)">
                      Match #{latest.overallMatchNumber ?? latest.matchNumber ?? '–'}
                    </span>
                  </div>
                  <div className="ed-rows">
                    {latest.teamResults
                      .slice()
                      .sort((a, b) => a.rank - b.rank)
                      .slice(0, 3)
                      .map((r) => (
                        <div key={r.id} className="flex items-center gap-4 px-6 py-3.5">
                          <span className={`num w-6 text-sm font-medium ${r.rank === 1 ? 'text-amber-600 dark:text-amber-400' : 'text-(--ed-stone)'}`}>
                            {String(r.rank).padStart(2, '0')}
                          </span>
                          {r.team.logoUrl || r.team.imageDarkUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.team.imageDarkUrl || r.team.logoUrl || ''} alt="" className="h-8 w-8 shrink-0 object-contain" />
                          ) : (
                            <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-(--ed-hair) bg-(--ed-canvas) text-[11px] font-medium text-(--ed-stone)">
                              {r.team.tag?.slice(0, 2) || '??'}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{r.team.name}</p>
                            <p className="num text-xs text-(--ed-stone)">#{r.rank} · {r.placePoints} place + {r.elimsPoints} elim pts</p>
                          </div>
                          <span className={`num text-lg font-medium ${r.rank === 1 ? 'text-amber-600 dark:text-amber-400' : 'text-(--ed-blue)'}`}>
                            {r.totalPoints}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <p className="px-6 py-12 text-center text-sm text-(--ed-stone)">No completed matches recorded yet.</p>
              )}
            </div>
          </section>

          {/* Upcoming schedule */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2.5 text-xl font-medium tracking-tight">
                <Clock className="h-4.5 w-4.5 text-(--ed-blue)" />
                Upcoming Schedule
              </h2>
              <span className="num text-sm text-(--ed-stone)">{upcoming.length} scheduled</span>
            </div>

            <div className="ed-card">
              {upcoming.length > 0 ? (
                <div className="ed-rows">
                  {upcoming.slice(0, 5).map((m) => (
                    <div key={m.id} className="flex items-center gap-4 px-6 py-3.5">
                      <span className="num flex h-7 w-9 shrink-0 items-center justify-center rounded-lg border border-(--ed-hair) bg-(--ed-canvas) text-xs font-medium text-(--ed-stone)">
                        {m.matchNumber ?? '–'}
                      </span>
                      <span className="flex-1 truncate text-sm font-medium">{m.format}</span>
                      {m.mapName && (
                        <span className="num hidden rounded-lg border border-(--ed-hair) px-2 py-0.5 text-[11px] uppercase text-(--ed-stone) sm:inline">
                          {m.mapName}
                        </span>
                      )}
                      <span className="num text-sm text-(--ed-stone)">{m.matchTime || 'Scheduled'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-6 py-12 text-center text-sm text-(--ed-stone)">All scheduled matches have concluded.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-12 lg:col-span-4">
          {(resolvedWinner || resolvedRunnerUp) && (
            <section>
              <h2 className="font-display mb-4 flex items-center gap-2.5 text-xl font-medium tracking-tight">
                <Trophy className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                Podium
              </h2>
              <div className="ed-card ed-rows">
                {resolvedWinner && (
                  <div className="flex items-center justify-between px-6 py-3.5">
                    <span className="ed-label">Champion</span>
                    <span className="text-sm font-medium">{resolvedWinner}</span>
                  </div>
                )}
                {resolvedRunnerUp && (
                  <div className="flex items-center justify-between px-6 py-3.5">
                    <span className="ed-label">Runner-up</span>
                    <span className="text-sm font-medium">{resolvedRunnerUp}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display flex items-center gap-2.5 text-xl font-medium tracking-tight">
                <Flame className="h-4.5 w-4.5 text-(--ed-magenta)" />
                Top Eliminators
              </h2>
              <Link href="?tab=fraggers" className="text-sm font-medium text-(--ed-blue) hover:underline">
                Full list
              </Link>
            </div>

            <div className="ed-card">
              {fraggers.length > 0 ? (
                <div className="space-y-4 px-6 py-5">
                  {fraggers.map((f, i) => (
                    <div key={f.playerId} className="flex items-center gap-3">
                      <span className={`num w-5 shrink-0 text-sm ${i === 0 ? 'font-medium text-(--ed-magenta)' : 'text-(--ed-stone)'}`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">{f.ign}</span>
                          <span className="num shrink-0 text-sm text-(--ed-magenta)">{f.elims} elims</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2.5">
                          <span className="h-px flex-1 bg-(--ed-sand)">
                            <span className="block h-px bg-(--ed-magenta)" style={{ width: `${Math.round((f.elims / maxElims) * 100)}%` }} />
                          </span>
                          <span className="num w-14 truncate text-[11px] text-(--ed-stone)">{f.teamTag || f.teamName}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-6 py-12 text-center text-sm text-(--ed-stone)">Player elimination stats not yet recorded.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Featured stage standings preview */}
      {featuredStandings.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2.5 text-xl font-medium tracking-tight">
              <Trophy className="h-4.5 w-4.5 text-(--ed-blue)" />
              {featuredStageName} Standings
            </h2>
            <Link href="?tab=standings" className="flex items-center gap-1 text-sm font-medium text-(--ed-blue) hover:underline">
              Full standings <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <MiniStandings rows={featuredStandings.slice(0, 8)} />
        </section>
      )}
    </div>
  );
}

function MiniStandings({ rows }: { rows: AggregatedTeamStanding[] }) {
  return (
    <div className="ed-card ed-rows">
      {rows.map((r) => (
        <div key={r.teamId} className="flex items-center gap-4 px-6 py-3">
          <span className={`num w-6 text-sm ${r.rank <= 3 ? 'font-medium text-(--ed-ink)' : 'text-(--ed-stone)'}`}>
            {String(r.rank).padStart(2, '0')}
          </span>
          {r.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.logoUrl} alt="" className="h-6 w-6 object-contain" />
          ) : (
            <span className="num flex h-6 w-6 items-center justify-center rounded-lg border border-(--ed-hair) bg-(--ed-canvas) text-[10px] text-(--ed-stone)">
              {r.tag?.slice(0, 2) || '??'}
            </span>
          )}
          <span className="flex-1 truncate text-sm font-medium">{r.teamName}</span>
          {r.wwcd > 0 && (
            <span className="num rounded-lg border border-amber-600/25 px-2 py-0.5 text-[11px] text-amber-700 dark:border-amber-400/25 dark:text-amber-400">
              {r.wwcd} WWCD
            </span>
          )}
          <span className="num w-12 text-right text-[15px] font-medium text-(--ed-blue)">{r.totalPoints}</span>
        </div>
      ))}
    </div>
  );
}
