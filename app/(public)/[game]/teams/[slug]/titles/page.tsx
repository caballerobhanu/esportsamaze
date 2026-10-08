import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TeamTabShell } from '@/components/teams/team-tab-shell';
import { TeamTitlesPanel } from '@/components/teams/team-titles-panel';
import { TabIntro } from '@/components/seo/tab-intro';
import { teamTitlesIntro } from '@/lib/entity-intros';
import { collectTeamAwards } from '@/lib/team-awards';
import { buildPlayerSlugMaps, collectLineupPlayerIds } from '@/lib/team-roster';
import { loadLineupPlayers, loadTeamContext, teamMetadata } from '@/lib/team-data';
import { eventUsdRates } from '@/lib/currency';
import { nativeTotalFor } from '@/lib/geo-currency';

export const dynamic = 'force-static';
export const revalidate = 180;

interface TeamTitlesPageProps {
  params: Promise<{ game: string; slug: string }>;
}

export async function generateMetadata({ params }: TeamTitlesPageProps): Promise<Metadata> {
  const { game, slug } = await params;
  return teamMetadata(slug, 'titles', game);
}

export default async function TeamTitlesPage({ params }: TeamTitlesPageProps) {
  const { slug } = await params;

  const team = await loadTeamContext(slug);
  if (!team) notFound();

  // Awards (individual MVPs, Best IGL, item prizes…) live in each event's
  // prizeDistribution JSON. Resolving a player award needs the event roster and,
  // for players who have since left, the transfer ledger.
  const lineupPlayerIds = collectLineupPlayerIds(team.tournaments.map((event) => event.rosterJson));
  const lineupPlayers = await loadLineupPlayers(lineupPlayerIds);
  const { playerIdToSlug } = buildPlayerSlugMaps(
    team.players,
    team.transfers.map((transfer) => transfer.player),
    lineupPlayers,
  );

  const { awards } = collectTeamAwards({
    teamId: team.id,
    tournaments: team.tournaments.map((event) => ({
      tournamentId: event.tournamentId,
      name: event.name,
      shortName: event.shortName,
      slug: event.slug,
      currency: event.currency,
      startedAtMs: event.startedAtMs,
      prizeDistribution: event.prizeDistribution,
      rosterJson: event.rosterJson,
    })),
    roster: team.players,
    transfers: team.transfers.map((transfer) => transfer.player),
    playerIdToSlug,
  });

  // Total prize money, each event converted to USD at its own closing-day rate so
  // a cross-currency career (USD + INR + JPY) sums honestly rather than adding
  // unlike units. The panel renders this one total in the visitor's currency with
  // a USD reference line; the per-event rows below keep their own currency.
  const ladder = team.tournaments.filter((event) => (event.prizeWon ?? 0) > 0);
  const rates = await eventUsdRates(
    ladder.map((event) => ({
      endDate: event.endedAtMs ? new Date(event.endedAtMs) : null,
      currency: event.currency,
    })),
  );
  const totalWonUsd = ladder.reduce(
    (sum, event, i) => sum + (event.prizeWon ?? 0) * (rates[i] ?? 1),
    0,
  );
  // The headline figure: the exact native sum when every event shares a currency,
  // else the USD total. Never a round-tripped conversion — that drifts from the rows.
  const totalWonNative = nativeTotalFor(
    ladder.map((event) => ({ amount: event.prizeWon ?? 0, currency: event.currency })),
    totalWonUsd,
  );

  const intro = teamTitlesIntro({
    name: team.name,
    titles: team.won.length,
    runnerUps: team.runnerUp.length,
    awards: awards.length,
  });

  return (
    <TeamTabShell team={team} activeTab="titles">
      <TabIntro text={intro} />
      <TeamTitlesPanel
        team={team}
        awards={awards}
        totalWonUsd={totalWonUsd}
        totalWonNative={totalWonNative}
      />
    </TeamTabShell>
  );
}
