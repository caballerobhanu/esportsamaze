import { redirect } from 'next/navigation';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

interface PreviewPageProps {
  params: Promise<{ game: string; slug: string }>;
  searchParams: Promise<{ tab?: string; matchId?: string }>;
}

export const dynamic = 'force-dynamic';

/** Legacy URL shim: /tournaments/<slug>/preview?tab=x → /tournaments/<slug>/<x> */
export default async function TournamentPreviewRedirect({ params, searchParams }: PreviewPageProps) {
  const { game, slug } = await params;
  const { tab, matchId } = await searchParams;

  const alias = tab === 'fraggers' ? 'statistics' : tab;
  const knownTabs = ['overview', 'standings', 'matches', 'progression', 'format', 'teams', 'prizepool', 'statistics'];
  const segment = alias && knownTabs.includes(alias) && alias !== 'overview' ? `/${alias}` : '';
  const query = matchId ? `?matchId=${encodeURIComponent(matchId)}` : '';
  redirect(gameHref(game || DEFAULT_GAME_SLUG, `tournaments/${slug}${segment}${query}`));
}
