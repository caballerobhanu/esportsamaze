import type { Metadata } from 'next';
import Link from 'next/link';
import { Bookmark, ChevronLeft } from 'lucide-react';
import { SavedStories } from '@/components/news/saved-stories';

export const metadata: Metadata = {
  title: 'Saved Stories — eSportsAmaze',
  description: 'Articles you saved for later reading on eSportsAmaze.',
  robots: { index: false, follow: true },
};

export default function SavedStoriesPage() {
  return (
    <div className="min-h-screen bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      {/* Breadcrumb bar */}
      <div className="border-b border-[var(--ed-hair)] bg-[var(--ed-surface)]">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <nav className="ed-label flex min-w-0 items-center gap-2">
            <Link href="/" className="shrink-0 hover:text-[var(--ed-blue)]">Home</Link>
            <span>/</span>
            <Link href="/news" className="shrink-0 hover:text-[var(--ed-blue)]">News</Link>
            <span>/</span>
            <span className="truncate text-[var(--ed-blue)]">Saved</span>
          </nav>
          <Link
            href="/news"
            className="ed-label inline-flex shrink-0 items-center gap-1 hover:text-[var(--ed-blue)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to News
          </Link>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="kicker inline-flex items-center gap-2 text-[var(--ed-blue)]">
          <Bookmark className="h-3 w-3" aria-hidden />
          Your reading list
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Saved Stories</h1>
        <p className="mt-2 max-w-xl text-sm font-medium text-[var(--ed-stone)]">
          Stored on this device — no account needed. Unpublished or removed stories drop off automatically.
        </p>
        <SavedStories />
      </main>
    </div>
  );
}
