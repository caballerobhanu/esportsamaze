import { notFound } from 'next/navigation';
import { TeamHero } from '@/components/teams/team-hero';
import { TeamTabNav } from '@/components/teams/team-tab-nav';
import { fetchEntityStanding } from '@/lib/krafton-data';
import { loadTeamContext } from '@/lib/team-data';

/**
 * Team chrome for every profile tab route.
 *
 * The masthead and the tab dock are rendered here rather than by each page, so
 * a tab switch replaces only the panel below them instead of tearing the whole
 * masthead and tab bar down. `loadTeamContext` is `unstable_cache`d, so the
 * page asking for the same team costs a cache read, not a second fetch.
 *
 * The page keeps the tab-level breadcrumb, which a layout cannot know.
 */
export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const team = await loadTeamContext(slug);
  if (!team) notFound();

  const teamSlug = team.slug || team.id;
  const rank = await fetchEntityStanding('TEAM', team.id)
    .then((standing) => standing?.rank ?? null)
    .catch(() => null);

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950 selection:bg-[#0A5FC4] selection:text-white dark:bg-[#070b14] dark:text-white">
      <TeamHero team={team} kraftonRank={rank} />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <TeamTabNav slug={teamSlug} />
        <main className="pb-24 pt-4 lg:pb-14">{children}</main>
      </section>
    </div>
  );
}
