import prisma from '@/lib/prisma';
import { CoveragePackView } from '@/components/admin/coverage-pack-view';
import {
  buildCoveragePack,
  type CoverageCompletedMatch,
  type CoverageFixture,
  type CoveragePlayerElims,
  type CoveragePlayerEntity,
  type CoveragePodiumRow,
  type CoverageTeamEntity,
} from '@/lib/coverage-pack';
import { calculateTournamentFraggers, calculateTournamentStandings } from '@/lib/tournament-math';
import { matchDayKey, matchRelativeDayKey, matchStageLabel } from '@/lib/standings-config';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

type Selection = { kind: 'EVENT' } | { kind: 'DAY'; dateKey: string } | { kind: 'STAGE'; stageId: string };

function parseSlice(raw: string | undefined): Selection {
  if (raw?.startsWith('DAY:')) return { kind: 'DAY', dateKey: raw.slice(4) };
  if (raw?.startsWith('STAGE:')) return { kind: 'STAGE', stageId: raw.slice(6) };
  return { kind: 'EVENT' };
}

/** Reads a slice of live tournament data into the source material the editorial prompt writes from. */
export default async function AdminCoveragePackPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string; slice?: string }>;
}) {
  const { tournament: selectedId, slice: rawSlice } = await searchParams;

  const tournaments = await prisma.tournament.findMany({
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, startDate: true, series: true },
  });

  const tournament = selectedId
    ? await prisma.tournament.findUnique({
        where: { id: selectedId },
        select: {
          id: true,
          name: true,
          slug: true,
          region: true,
          tier: true,
          startDate: true,
          endDate: true,
          prizePool: true,
          currency: true,
          formatDetails: true,
          game: { select: { name: true, slug: true } },
          venues: { take: 1, select: { venue: { select: { name: true, city: true, country: true } } } },
          stages: { orderBy: { sequence: 'asc' }, select: { id: true, name: true, sequence: true } },
          matches: {
            orderBy: [{ overallMatchNumber: 'asc' }, { matchNumber: 'asc' }],
            select: {
              id: true,
              matchNumber: true,
              overallMatchNumber: true,
              mapName: true,
              groupName: true,
              matchTime: true,
              scheduledAt: true,
              status: true,
              streamUrl: true,
              format: true,
              stage: { select: { id: true, name: true } },
              group: { select: { name: true } },
              games: {
                orderBy: { sequence: 'asc' },
                select: {
                  id: true,
                  mapName: true,
                  teamResults: {
                    select: {
                      teamId: true,
                      rank: true,
                      wwcd: true,
                      placePoints: true,
                      elimsPoints: true,
                      bonusPoints: true,
                      totalPoints: true,
                      damage: true,
                      headshots: true,
                      team: { select: { id: true, name: true, slug: true, tag: true } },
                    },
                  },
                  playerStats: {
                    select: {
                      playerId: true,
                      playerElims: true,
                      damage: true,
                      headshots: true,
                      role: true,
                      isMvp: true,
                      player: { select: { id: true, ign: true, slug: true } },
                      team: { select: { id: true, name: true, tag: true } },
                    },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  let pack: string | null = null;
  let filename = 'coverage-pack.md';
  let dayOptions: Array<{ key: string; rel: string }> = [];
  const selection = parseSlice(rawSlice);

  if (tournament) {
    const matches = tournament.matches;

    // Day options — labelled the way the tournament pages label them.
    const dayKeys = Array.from(new Set(matches.map((m) => matchDayKey(m.scheduledAt)))).sort();
    const firstDayKey = dayKeys[0] ?? '';
    dayOptions = dayKeys.map((key) => ({
      key,
      rel: matchRelativeDayKey(new Date(`${key}T00:00:00Z`), firstDayKey),
    }));

    // Resolve the slice.
    const sliceMatches =
      selection.kind === 'DAY'
        ? matches.filter((m) => matchDayKey(m.scheduledAt) === selection.dateKey)
        : selection.kind === 'STAGE'
          ? matches.filter((m) => m.stage?.id === selection.stageId)
          : matches;

    const stageName = selection.kind === 'STAGE' ? tournament.stages.find((s) => s.id === selection.stageId)?.name ?? null : null;
    const sliceLabel =
      selection.kind === 'DAY'
        ? `Day ${dayOptions.find((d) => d.key === selection.dateKey)?.rel ?? '?'} — ${selection.dateKey}`
        : selection.kind === 'STAGE'
          ? stageName ?? 'Stage'
          : 'Full event to date';

    const completedMatches = sliceMatches.filter((m) => m.status === 'COMPLETED');

    // Fixtures: every match in the slice, any status.
    const fixtures: CoverageFixture[] = sliceMatches.map((m) => ({
      matchNumber: m.matchNumber,
      overallMatchNumber: m.overallMatchNumber,
      stageName: matchStageLabel({ stage: m.stage, format: m.format }),
      groupName: m.group?.name ?? m.groupName,
      mapName: m.mapName,
      scheduledAt: m.scheduledAt,
      matchTime: m.matchTime,
      status: m.status,
      streamUrl: m.streamUrl,
      games: m.games.length,
    }));

    // Results: one entry per game (map), so a multi-map match keeps its maps distinct.
    const completedResults: CoverageCompletedMatch[] = [];
    const missing: string[] = [];

    // Per-player eliminations for the slice: total, best in a match, per-match average.
    const elimsByPlayer = new Map<
      string,
      { ign: string; teamName: string | null; games: number; perMatch: Map<string, number> }
    >();

    for (const match of completedMatches) {
      const tagNumber = match.overallMatchNumber ?? match.matchNumber ?? null;
      let recordedGames = 0;

      for (const game of match.games) {
        // Accumulate eliminations for every game, whether or not it carries a scorecard.
        for (const stat of game.playerStats) {
          const entry =
            elimsByPlayer.get(stat.playerId) ??
            { ign: stat.player?.ign ?? 'Unknown player', teamName: stat.team?.name ?? null, games: 0, perMatch: new Map<string, number>() };
          entry.games += 1;
          entry.perMatch.set(match.id, (entry.perMatch.get(match.id) ?? 0) + stat.playerElims);
          elimsByPlayer.set(stat.playerId, entry);
        }

        if (game.teamResults.length === 0) continue;
        recordedGames += 1;

        // The pack prints the top five; the full ranked list is handed over so it can.
        const podium: CoveragePodiumRow[] = [...game.teamResults]
          .sort((a, b) => a.rank - b.rank)
          .map((r) => ({
            rank: r.rank,
            teamName: r.team?.name ?? 'Unknown team',
            wwcd: r.wwcd || r.rank === 1,
            placePoints: r.placePoints,
            elimsPoints: r.elimsPoints,
            bonusPoints: r.bonusPoints,
            totalPoints: r.totalPoints,
          }));

        const topPlayers = [...game.playerStats]
          .sort((a, b) => b.playerElims - a.playerElims)
          .map((stat) => ({
            ign: stat.player?.ign ?? 'Unknown player',
            teamName: stat.team?.name ?? null,
            elims: stat.playerElims,
          }));

        completedResults.push({
          matchNumber: match.matchNumber,
          overallMatchNumber: match.overallMatchNumber,
          stageName: matchStageLabel({ stage: match.stage, format: match.format }),
          mapName: game.mapName ?? match.mapName,
          date: match.scheduledAt,
          podium,
          topPlayers,
        });
      }

      if (recordedGames === 0) {
        missing.push(`no scorecard recorded for Match ${tagNumber ?? '—'}`);
      } else if (match.games.every((g) => g.playerStats.length === 0)) {
        missing.push(`no player statistics recorded for Match ${tagNumber ?? '—'}`);
      }
    }

    const playerElims: CoveragePlayerElims[] = Array.from(elimsByPlayer.entries()).map(([playerId, entry]) => {
      const perMatch = Array.from(entry.perMatch.values());
      const elims = perMatch.reduce((sum, value) => sum + value, 0);
      const matches = perMatch.length;
      return {
        playerId,
        matches,
        games: entry.games,
        elims,
        highestInMatch: perMatch.length > 0 ? Math.max(...perMatch) : 0,
        averagePerMatch: matches > 0 ? elims / matches : 0,
      };
    });

    // Aggregate the slice's completed results.
    const resultRows = completedMatches.flatMap((m) => m.games.flatMap((g) => g.teamResults));
    const statRows = completedMatches.flatMap((m) => m.games.flatMap((g) => g.playerStats));

    const standings = calculateTournamentStandings(
      resultRows.map((r) => ({
        teamId: r.teamId,
        team: { id: r.teamId, name: r.team?.name ?? 'Unknown Team', tag: r.team?.tag ?? null },
        rank: r.rank,
        wwcd: r.wwcd,
        placePoints: r.placePoints ?? undefined,
        elimsPoints: r.elimsPoints ?? undefined,
        bonusPoints: r.bonusPoints ?? undefined,
        totalPoints: r.totalPoints ?? undefined,
        damage: r.damage ?? undefined,
        headshots: r.headshots ?? undefined,
      }))
    );

    const fraggers = calculateTournamentFraggers(
      statRows.map((s) => ({
        playerId: s.playerId,
        player: { id: s.player?.id ?? s.playerId, ign: s.player?.ign ?? 'Unknown Player' },
        team: s.team ? { id: s.team.id, name: s.team.name, tag: s.team.tag } : null,
        role: s.role,
        playerElims: s.playerElims,
        damage: s.damage ?? undefined,
        headshots: s.headshots ?? undefined,
        isMvp: s.isMvp ?? undefined,
      }))
    );

    const teams: CoverageTeamEntity[] = Array.from(
      new Map(
        resultRows
          .filter((r) => r.team)
          .map((r) => [r.teamId, { name: r.team!.name, slug: r.team!.slug }])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    const players: CoveragePlayerEntity[] = Array.from(
      new Map(
        statRows
          .filter((s) => s.player)
          .map((s) => [
            s.playerId,
            { ign: s.player!.ign, slug: s.player!.slug, teamName: s.team?.name ?? null },
          ])
      ).values()
    ).sort((a, b) => a.ign.localeCompare(b.ign));

    // Category spellings already in use, so a draft reuses them instead of minting duplicates.
    const articles = await prisma.article.findMany({
      where: { deletedAt: null },
      select: { category: true, categories: true, tags: true },
    });
    const existingCategories = Array.from(
      new Set(articles.flatMap((a) => [a.category, ...a.categories]).filter((c) => c && c !== 'GENERAL'))
    ).sort((a, b) => a.localeCompare(b));
    const existingTags = Array.from(new Set(articles.flatMap((a) => a.tags)))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 80);

    const fd = (tournament.formatDetails ?? {}) as {
      pointsMatrix?: Record<string, number>;
      killPointsPerElim?: number;
    };
    const venue = tournament.venues[0]?.venue;
    const location = venue ? [venue.name, venue.city, venue.country].filter(Boolean).join(', ') : null;

    pack = buildCoveragePack({
      generatedAt: new Date(),
      tournament: {
        name: tournament.name,
        slug: tournament.slug,
        gameName: tournament.game?.name ?? null,
        gameSlug: tournament.game?.slug ?? 'bgmi',
        region: tournament.region,
        tier: tournament.tier,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        prizePool: tournament.prizePool,
        currency: tournament.currency,
        location,
        pointsMatrix: fd.pointsMatrix ?? null,
        killPointsPerElim: typeof fd.killPointsPerElim === 'number' ? fd.killPointsPerElim : null,
      },
      slice:
        selection.kind === 'DAY'
          ? { kind: 'DAY', dateKey: selection.dateKey }
          : selection.kind === 'STAGE'
            ? { kind: 'STAGE', stageId: selection.stageId }
            : { kind: 'EVENT' },
      sliceLabel,
      fixtures,
      completedMatches: completedResults,
      standings,
      fraggers,
      playerElims,
      teams,
      players,
      existingCategories,
      existingTags,
      missing,
    });

    const sliceSlug =
      selection.kind === 'DAY'
        ? `day-${dayOptions.find((d) => d.key === selection.dateKey)?.rel ?? 'x'}`
        : selection.kind === 'STAGE'
          ? slugify(stageName ?? 'stage')
          : 'event-to-date';
    filename = `${tournament.slug}-${sliceSlug}-coverage-pack.md`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black uppercase tracking-tight">Coverage Pack</h1>
        <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Turns a slice of live match data — a day, a stage or the whole event — into the source material
          the editorial prompt writes an article from: fixtures, results, standings, top fraggers, the exact
          entity names and slugs, and the categories already in use. Nothing is invented and nothing is
          written to the database: copy the pack into your prompt, then paste the article back into the editor.
        </p>
      </div>

      <form
        action="/admin/coverage-pack"
        method="get"
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b101c]"
      >
        <label className={labelCls}>Event</label>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <select name="tournament" defaultValue={selectedId ?? ''} className={inputCls}>
              <option value="">— Select an event —</option>
              {tournaments.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.startDate.toISOString().slice(0, 10)} · {event.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110"
          >
            Load event
          </button>
        </div>
      </form>

      {tournament && pack ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b101c]">
          <form action="/admin/coverage-pack" method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tournament" value={tournament.id} />
            <div className="min-w-[320px] flex-1">
              <label className={labelCls}>Slice</label>
              <select name="slice" defaultValue={rawSlice ?? 'EVENT'} className={inputCls}>
                <option value="EVENT">Full event to date</option>
                {dayOptions.map((day) => (
                  <option key={day.key} value={`DAY:${day.key}`}>
                    Day {day.rel} — {day.key}
                  </option>
                ))}
                {tournament.stages.map((stage) => (
                  <option key={stage.id} value={`STAGE:${stage.id}`}>
                    Stage · {stage.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110"
            >
              Generate pack
            </button>
          </form>

          <CoveragePackView pack={pack} filename={filename} />
        </div>
      ) : (
        !tournament && (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-slate-800">
            Select an event to build its coverage pack.
          </div>
        )
      )}
    </div>
  );
}
