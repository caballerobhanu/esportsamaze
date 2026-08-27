import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { fetchWikiHtml, WIKI_PAGES } from '@/lib/wiki';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export const revalidate = 86_400;

export const metadata = {
  title: 'About — Esports Amaze',
  description: 'How Esports Amaze handles data and privacy.',
};

export default async function PrivacyPolicyPage() {
  const html = await fetchWikiHtml(WIKI_PAGES.privacy);

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] dark:bg-[#07090e] text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#0A5FC4] dark:hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        {html ? (
          <article
            className="wiki-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This content is temporarily unavailable.
            </p>
            <a
              href={`https://esportsamaze.in/${WIKI_PAGES.privacy}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A5FC4] dark:text-amber-400 hover:underline"
            >
              Read it on the wiki <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

