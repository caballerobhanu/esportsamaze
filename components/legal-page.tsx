import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Shared chrome for the self-hosted legal/editorial pages
 * (about, privacy-policy, disclaimer, terms, contact).
 */
export function LegalPage({
  kicker,
  title,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ed-stone)] transition-colors hover:text-[var(--ed-blue)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to Home
        </Link>

        <header className="mt-6 border-b border-[var(--ed-hair)] pb-6">
          <p className="kicker text-[var(--ed-blue)]">{kicker}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          {updated && (
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--ed-stone)]">
              Last updated · {updated}
            </p>
          )}
        </header>

        <div className="legal-body mt-2">{children}</div>
      </main>
    </div>
  );
}
