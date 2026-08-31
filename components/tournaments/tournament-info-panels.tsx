import { Users, Banknote, ScrollText, Crosshair, Zap, Trophy, Star, CheckCircle2 } from 'lucide-react';
import type { AggregatedPlayerStat } from '@/lib/tournament-math';
import { countryCodeFor, flagUrlFor } from '@/lib/countries';
import type { StandingsLogoMode } from '@/lib/standings-config';

/* ═══════════ TEAMS ═══════════ */

export function TournamentTeamsPanel({
  teams,
  logoMode = 'BOTH',
}: {
  logoMode?: StandingsLogoMode;
  teams: {
    id: string;
    seed?: number | null;
    finalRank?: number | null;
    rosterJson: unknown;
    logoUrl?: string | null;
    logoDarkUrl?: string | null;
    team: {
      id: string;
      name: string;
      displayName?: string | null;
      tag?: string | null;
      slug?: string | null;
      logoUrl?: string | null;
      imageDarkUrl?: string | null;
      region?: string | null;
    };
  }[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display flex items-center gap-2.5 text-xl font-medium tracking-tight">
          <Users className="h-4.5 w-4.5 text-(--ed-blue)" />
          Participating Squads
        </h2>
        <span className="num text-sm text-(--ed-stone)">{teams.length} confirmed teams</span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {teams.map((tt) => {
          const roster = Array.isArray(tt.rosterJson)
            ? (tt.rosterJson as Array<{ ign: string; role?: string; captain?: boolean } | string>)
            : [];
          const lightLogo = tt.logoUrl ?? tt.team.logoUrl;
          const darkLogo = tt.logoDarkUrl ?? tt.team.imageDarkUrl;
          const countryCode = countryCodeFor(tt.team.region);
          const showFlag = (logoMode === 'BOTH' || logoMode === 'COUNTRY') && !!countryCode;
          const showLogo = (logoMode === 'BOTH' || logoMode === 'TEAM') && !!(lightLogo || darkLogo);
          return (
            <div key={tt.id} className="ed-card">
              <div className="flex items-center gap-3 border-b border-(--ed-hair) bg-(--ed-canvas) px-5 py-4">
                {showFlag && countryCode && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={flagUrlFor(countryCode)}
                    alt={countryCode}
                    loading="lazy"
                    className="h-[15px] w-5 shrink-0 rounded-[2px] object-cover"
                  />
                )}
                {showLogo ? (
                  <>
                    {lightLogo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={lightLogo} alt="" className="h-9 w-9 shrink-0 object-contain dark:hidden" />
                    )}
                    {darkLogo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={darkLogo}
                        alt=""
                        className={`h-9 w-9 shrink-0 object-contain ${lightLogo ? 'hidden dark:block' : 'dark:block'}`}
                      />
                    )}
                  </>
                ) : (
                  !showFlag && (
                    <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--ed-hair) bg-(--ed-surface) text-xs font-medium text-(--ed-stone)">
                      {(tt.team.tag || tt.team.name).slice(0, 3)}
                    </span>
                  )
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tt.team.displayName || tt.team.name}</p>
                  <p className="num text-[11px] text-(--ed-stone)">
                    {tt.team.tag && `[${tt.team.tag}]`}
                    {tt.team.region && ` · ${tt.team.region}`}
                    {tt.seed != null && ` · Seed ${tt.seed}`}
                  </p>
                </div>
                {tt.finalRank != null && <span className="ed-chip num font-medium">#{tt.finalRank}</span>}
              </div>
              <div className="ed-rows">
                {roster.length > 0 ? (
                  roster.map((p, i) => {
                    const ign = typeof p === 'string' ? p : p.ign;
                    const role = typeof p === 'string' ? '' : p.role;
                    const captain = typeof p === 'string' ? false : p.captain;
                    return (
                      <div key={i} className="flex items-center justify-between px-5 py-2.5">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {ign}
                          {captain && (
                            <span className="rounded-md border border-amber-600/25 px-1 text-[9px] uppercase text-amber-700 dark:border-amber-400/25 dark:text-amber-400">
                              C
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-(--ed-stone)">{role || 'Player'}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="px-5 py-6 text-center text-sm text-(--ed-stone)">Roster to be finalised.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════ PRIZE ═══════════ */

export function TournamentPrizePanel({
  prizeStages,
  currency,
  qualifications,
}: {
  prizeStages: {
    stageName: string;
    allocatedPrize?: number;
    ranks: {
      rank: string;
      percentage?: number;
      prize: number;
      rewardType?: string;
      customReward?: string;
      teamName?: string;
      playerName?: string;
    }[];
  }[];
  currency: string;
  qualifications: { place: string; events: Array<string | { name: string }>; description?: string }[];
}) {
  return (
    <div className="space-y-12">
      {/* Qualification slots */}
      {qualifications.length > 0 && (
        <section>
          <h2 className="font-display mb-4 flex items-center gap-2.5 text-xl font-medium tracking-tight">
            <Zap className="h-4.5 w-4.5 text-(--ed-blue)" />
            Official Qualification Direct Slots
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {qualifications.map((q, i) => (
              <div key={i} className="rounded-xl border border-(--ed-hair) bg-(--ed-surface) px-6 py-5">
                <p className="mb-3 inline-block rounded-lg border border-amber-600/25 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-400/25 dark:text-amber-400">
                  {q.place}
                </p>
                <div className="space-y-2">
                  {q.events.map((ev, j) => {
                    const name = typeof ev === 'string' ? ev : ev.name;
                    return (
                      <p key={j} className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-(--ed-blue)" /> {name}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Prize distribution tables */}
      {prizeStages.map((stage) => (
        <section key={stage.stageName}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display flex items-center gap-2.5 text-xl font-medium tracking-tight">
              <Banknote className="h-4.5 w-4.5 text-(--ed-blue)" />
              {stage.stageName} Prize Distribution
            </h2>
            {stage.allocatedPrize != null && stage.allocatedPrize > 0 && (
              <span className="ed-chip num font-medium text-(--ed-blue)">
                {currency} {stage.allocatedPrize.toLocaleString()}
              </span>
            )}
          </div>
          <div className="ed-card overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-(--ed-hair)">
                  <th className="ed-th px-6 text-left">Rank / Honour</th>
                  <th className="ed-th text-left">Recipient</th>
                  <th className="ed-th text-center">Share</th>
                  <th className="ed-th px-6 text-right">Prize</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--ed-hair)">
                {stage.ranks.map((p, i) => (
                  <tr key={i} className="transition-colors hover:bg-(--ed-canvas)">
                    <td className="px-6 py-3 font-medium">{p.rank}</td>
                    <td className="py-3 text-(--ed-stone)">{p.playerName || p.teamName || '—'}</td>
                    <td className="num px-3 py-3 text-center text-(--ed-stone)">{p.percentage ? `${p.percentage}%` : '—'}</td>
                    <td className="num px-6 py-3 text-right font-medium">
                      {p.rewardType === 'TITLE' ? (
                        <span className="text-amber-700 dark:text-amber-400">Title</span>
                      ) : p.customReward ? (
                        p.customReward
                      ) : (
                        `${currency} ${Number(p.prize || 0).toLocaleString()}`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

/* ═══════════ FORMAT ═══════════ */

export function TournamentFormatPanel({
  stages,
  pointsMatrix,
  killPoints,
  gameMode,
  eventType,
  device,
}: {
  stages: { id: string; name: string; formatType?: string | null; stageType?: string | null }[];
  pointsMatrix?: Record<string, number>;
  killPoints?: number;
  gameMode?: string | null;
  eventType?: string | null;
  device?: string | null;
}) {
  const matrix = pointsMatrix ?? { 1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1 };
  const ranks = Array.from({ length: 16 }, (_, i) => i + 1).filter((r) => Number(matrix[r] ?? matrix[String(r)] ?? 0) > 0 || r <= 8);

  const stats = [
    { label: 'Battle Mode', value: gameMode || 'Squad' },
    { label: 'Environment', value: eventType || 'Official Stage' },
    { label: 'Elimination Value', value: `${killPoints ?? 1} pt per kill` },
    { label: 'Tournament Device', value: device || 'Standard Mobile' },
  ];

  return (
    <div className="space-y-12">
      {/* Format facts */}
      <div className="ed-card grid grid-cols-1 gap-px bg-(--ed-hair) sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-(--ed-surface) px-6 py-5">
            <p className="ed-label mb-2">{s.label}</p>
            <p className="truncate text-[15px] font-medium">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Points matrix */}
        <section>
          <h2 className="font-display mb-4 flex items-center gap-2.5 text-xl font-medium tracking-tight">
            <ScrollText className="h-4.5 w-4.5 text-(--ed-blue)" />
            Placement Points Breakdown
          </h2>
          <div className="ed-card">
            <div className="grid grid-cols-4 gap-px bg-(--ed-hair)">
              {ranks.map((r) => {
                const pts = Number(matrix[r] ?? matrix[String(r)] ?? 0);
                return (
                  <div key={r} className="bg-(--ed-surface) px-4 py-4 text-center">
                    <p className="ed-label mb-1.5">{r === 1 ? 'WWCD #1' : `#${r}`}</p>
                    <p className={`num text-xl font-medium ${r === 1 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{pts}</p>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-(--ed-hair) bg-(--ed-canvas) px-6 py-3">
              <p className="text-xs text-(--ed-stone)">
                Total score = placement points + <span className="num font-medium text-(--ed-ink)">{killPoints ?? 1}</span> point × total team eliminations.
              </p>
            </div>
          </div>
        </section>

        {/* Stage roadmap */}
        <section>
          <h2 className="font-display mb-4 flex items-center gap-2.5 text-xl font-medium tracking-tight">
            <Trophy className="h-4.5 w-4.5 text-(--ed-blue)" />
            Stage Progression Structure
          </h2>
          <div className="ed-card">
            {stages.length > 0 ? (
              <div className="ed-rows">
                {stages.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-4 px-6 py-3.5">
                    <span className="num flex h-7 w-7 items-center justify-center rounded-lg border border-(--ed-hair) bg-(--ed-canvas) text-xs font-medium text-(--ed-stone)">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      {s.formatType && <p className="text-xs text-(--ed-stone)">{s.formatType}</p>}
                    </div>
                    {s.stageType && <span className="ed-chip text-[11px] text-(--ed-stone)">{s.stageType}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-6 py-12 text-center text-sm text-(--ed-stone)">Tournament stage roadmap not configured yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ═══════════ FRAGGERS ═══════════ */

export function TournamentFraggersPanel({ fraggers }: { fraggers: AggregatedPlayerStat[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display flex items-center gap-2.5 text-xl font-medium tracking-tight">
          <Crosshair className="h-4.5 w-4.5 text-(--ed-magenta)" />
          Overall Top Fraggers
        </h2>
        <span className="num text-sm text-(--ed-stone)">{fraggers.length} tracked players</span>
      </div>

      <div className="ed-card">
        {fraggers.length === 0 ? (
          <p className="px-6 py-20 text-center text-sm text-(--ed-stone)">No individual player statistics recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-(--ed-hair)">
                  <th className="ed-th w-14 px-6 text-left">#</th>
                  <th className="ed-th text-left">Player IGN</th>
                  <th className="ed-th text-left">Team</th>
                  <th className="ed-th text-center">Matches</th>
                  <th className="ed-th text-center">Elims</th>
                  <th className="ed-th text-center">Damage</th>
                  <th className="ed-th text-center">Headshots</th>
                  <th className="ed-th text-center">Knocks</th>
                  <th className="ed-th px-6 text-right">MVPs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--ed-hair)">
                {fraggers.map((f) => (
                  <tr key={f.playerId} className="transition-colors hover:bg-(--ed-canvas)">
                    <td className="num px-6 py-3 text-(--ed-stone)">{String(f.rank).padStart(2, '0')}</td>
                    <td className="py-3">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium">{f.ign}</span>
                        {f.mvps > 0 && (
                          <span className="flex items-center gap-0.5 rounded-md border border-amber-600/25 px-1 text-[10px] text-amber-700 dark:border-amber-400/25 dark:text-amber-400">
                            <Star className="h-2.5 w-2.5" /> {f.mvps}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 text-(--ed-stone)">{f.teamName || '—'}</td>
                    <td className="num px-3 py-3 text-center text-(--ed-stone)">{f.matchesPlayed}</td>
                    <td className="num px-3 py-3 text-center font-medium text-(--ed-magenta)">{f.elims}</td>
                    <td className="num px-3 py-3 text-center text-(--ed-stone)">{f.damage.toLocaleString()}</td>
                    <td className="num px-3 py-3 text-center text-(--ed-stone)">{f.headshots}</td>
                    <td className="num px-3 py-3 text-center text-(--ed-stone)">{f.knockouts}</td>
                    <td className="num px-6 py-3 text-right text-amber-700 dark:text-amber-400">{f.mvps > 0 ? f.mvps : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
