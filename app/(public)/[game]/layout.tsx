import { notFound } from 'next/navigation';
import { getGameBySlug, listGames } from '@/lib/game-queries';

/**
 * The game shell. Every game-scoped section (tournaments, teams, players,
 * rankings) lives under this segment, so resolving and validating the game here
 * means an unknown first segment is a 404 rather than a guessed page.
 */
export async function generateStaticParams() {
  const games = await listGames();
  return games.map((game) => ({ game: game.slug }));
}

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  const found = await getGameBySlug(game);
  if (!found) notFound();

  return <>{children}</>;
}
