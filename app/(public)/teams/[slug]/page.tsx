import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TeamOverviewPanel, type KraftonSummary } from '@/components/teams/team-overview-panel';
import { TeamTabShell } from '@/components/teams/team-tab-shell';
import { fetchEntityStanding } from '@/lib/krafton-data';
import {
  loadTeamContext,
  loadTeamMatchSummary,
  loadTeamRecentForm,
  teamMetadata,
} from '@/lib/team-data';

export const dynamic = 'force-dynamic';

interface TeamPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { slug } = await params;
  return teamMetadata(slug);
}

export default async function TeamOverviewPage({ params }: TeamPageProps) {
  const { slug } = await params;

  const team = await loadTeamContext(slug);
  if (!team) notFound();

  const [matchSummary, form, kraftonFull] = await Promise.all([
    loadTeamMatchSummary(team.id),
    loadTeamRecentForm(team.id, 20),
    fetchEntityStanding('TEAM', team.id).catch(() => null),
  ]);

  const krafton: KraftonSummary | null = kraftonFull
    ? { rank: kraftonFull.rank, points: kraftonFull.points, events: kraftonFull.events }
    : null;

  // Last-20 average total points, computed from the same recent-form rows.
  const recentFormPoints = form.map((point) => point.totalPoints);
  const last20Avg =
    recentFormPoints.length > 0
      ? recentFormPoints.reduce((sum, value) => sum + value, 0) / recentFormPoints.length
      : null;

  return (
    <TeamTabShell team={team} activeTab="overview" kraftonRank={krafton?.rank ?? null}>
      <TeamOverviewPanel
        team={team}
        matchSummary={matchSummary}
        form={form}
        krafton={krafton}
        last20Avg={last20Avg}
      />
    </TeamTabShell>
  );
}
