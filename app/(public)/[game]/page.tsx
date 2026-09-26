import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGameBySlug, gamesInFamily, getFamilyBySlug } from '@/lib/game-queries';
import { gameHref } from '@/lib/games';
import { baseUrl, canonical, notFoundMetadata } from '@/lib/seo';

const SECTIONS: { segment: string; label: string; blurb: string }[] = [
  { segment: 'tournaments', label: 'Tournaments', blurb: 'Standings, results and formats' },
  { segment: 'teams', label: 'Teams', blurb: 'Squads, rosters and records' },
  { segment: 'players', label: 'Players', blurb: 'Fraggers, careers and honours' },
  { segment: 'rankings', label: 'Rankings', blurb: 'Season-long points table' },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game } = await params;
  const found = await getGameBySlug(game);
  if (!found) return notFoundMetadata('Game');
  const label = found.shortName?.trim() || found.name;
  const path = gameHref(found.slug);
  return {
    title: `${label} — Tournaments, Teams, Players & Rankings`,
    description: `Everything ${found.name}: tournaments, standings, teams, players and rankings on eSportsAmaze.`,
    ...canonical(path),
    openGraph: { url: `${baseUrl()}${path}` },
  };
}

export default async function GameHubPage({
  params,
}: {
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const found = await getGameBySlug(game);
  if (!found) notFound();

  const label = found.shortName?.trim() || found.name;
  const siblings = found.familyId
    ? (await gamesInFamily(found.familyId)).filter((g) => g.slug !== found.slug)
    : [];
  const family = found.familySlug ? await getFamilyBySlug(found.familySlug) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Game</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
          {found.name}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.segment}
            href={gameHref(found.slug, section.segment)}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-[#0A5FC4] dark:border-white/10 dark:bg-[#0b1220]"
          >
            <span className="block text-base font-black text-slate-900 dark:text-white">
              {section.label}
            </span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              {section.blurb}
            </span>
          </Link>
        ))}
      </div>

      {siblings.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">
            Also in {family?.name ?? 'this family'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {siblings.map((sibling) => (
              <Link
                key={sibling.slug}
                href={gameHref(sibling.slug)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-[#0A5FC4] dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                {sibling.shortName?.trim() || sibling.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="sr-only">
        Browse {label} tournaments, teams, players and rankings on eSportsAmaze.
      </p>
    </div>
  );
}
