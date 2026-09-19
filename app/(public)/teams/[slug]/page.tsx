import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { TeamOverviewPanel, type KraftonSummary } from '@/components/teams/team-overview-panel';
import { resolveSlugRedirect } from '@/lib/slug-history';
import { TeamTabShell } from '@/components/teams/team-tab-shell';
import { PageViews } from '@/components/ui/page-views';
import { JsonLd } from '@/components/seo/json-ld';
import { sportsTeamJsonLd } from '@/lib/seo';
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
  if (!team) {
    const target = await resolveSlugRedirect('team', slug);
    if (target) permanentRedirect(`/teams/${target}`);
    notFound();
  }

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

  const teamJsonLd = sportsTeamJsonLd({
    name: team.name,
    slug: team.slug,
    tag: team.tag,
    displayName: team.displayName,
    logoUrl: team.logoUrl,
    region: team.region,
    foundedYear: team.foundedYear,
    members: team.players.map((player) => ({
      name: player.ign,
      slug: player.slug,
      role: player.role,
    })),
    sameAs: Object.values(team.socials),
  });

  return (
    <TeamTabShell team={team} activeTab="overview">
      <JsonLd data={teamJsonLd} />
      <PageViews
        type="TEAM"
        id={team.id}
        override={team.showViewCount}
        windowOverride={team.viewCountWindow}
        className="mb-4"
      />

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
