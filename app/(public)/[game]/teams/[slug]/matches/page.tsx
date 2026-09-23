import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TeamMatchesPanel } from '@/components/teams/team-matches-panel';
import type { TeamMatchFilterState } from '@/components/teams/team-match-filters';
import { TeamTabShell } from '@/components/teams/team-tab-shell';
import {
  loadTeamContext,
  loadTeamMatchFilterOptions,
  loadTeamMatchPage,
  teamMetadata,
} from '@/lib/team-data';

export const dynamic = 'force-dynamic';

interface TeamMatchesPageProps {
  params: Promise<{ game: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Filters and pagination live entirely in the URL, matching the directories. */
function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export async function generateMetadata({ params }: TeamMatchesPageProps): Promise<Metadata> {
  const { game, slug } = await params;
  return teamMetadata(slug, 'matches', game);
}

export default async function TeamMatchesPage({ params, searchParams }: TeamMatchesPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const team = await loadTeamContext(slug);
  if (!team) notFound();

  const options = await loadTeamMatchFilterOptions(team.id);

  const tournamentSlug = first(query.tournament);
  // The URL carries the slug; the query needs the id.
  const tournamentId =
    options.tournaments.find((tournament) => tournament.slug === tournamentSlug)?.id ?? null;
  const mapName = first(query.map);
  const winsOnly = first(query.wins) === '1';
  const sort = first(query.sort) === 'points' ? 'points' : 'date';
  const page = Math.max(1, Number(first(query.page)) || 1);

  const data = await loadTeamMatchPage(team.id, {
    page,
    tournamentId,
    mapName: mapName || null,
    winsOnly,
    sort,
  });

  const filters: TeamMatchFilterState = {
    tournament: tournamentId ? tournamentSlug : '',
    map: mapName,
    wins: winsOnly ? '1' : '',
    sort,
  };

  return (
    <TeamTabShell team={team} activeTab="matches">
      <TeamMatchesPanel team={team} data={data} filters={filters} options={options} />
    </TeamTabShell>
  );
}
