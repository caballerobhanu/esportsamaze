import Link from 'next/link';
import type { Metadata } from 'next';
import { DEFAULT_GAME_SLUG, gameHref } from '@/lib/games';

export const metadata: Metadata = {
  title: 'Page Not Found — eSportsAmaze',
  // notFound() currently renders with HTTP 200 (a loading.tsx boundary streams
  // the shell first), so keep a 200 soft-404 out of the index too.
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="ed-card w-full max-w-xl p-8 sm:p-12 text-center space-y-4">
        <span className="ed-chip text-[var(--ed-blue)] font-semibold">Error 404</span>
        <h1 className="font-display text-4xl sm:text-5xl font-medium tracking-tight">
          Page not found
        </h1>
        <p className="text-sm text-[var(--ed-stone)] max-w-md mx-auto leading-relaxed">
          The page you are looking for doesn&apos;t exist, may have been renamed, or is
          temporarily unavailable.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <Link href="/" className="ed-btn">
            Back to Home
          </Link>
          <Link
            href={gameHref(DEFAULT_GAME_SLUG, 'tournaments')}
            className="text-sm font-semibold text-[var(--ed-blue)] hover:underline"
          >
            Browse Tournaments
          </Link>
        </div>
      </div>
    </main>
  );
}
