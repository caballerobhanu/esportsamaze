'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ed-canvas)] text-[var(--ed-ink)] px-4 transition-colors">
      <div className="ed-card w-full max-w-xl p-8 sm:p-12 text-center space-y-4">
        <span className="ed-chip text-rose-600 dark:text-rose-400 font-semibold">
          Something went wrong
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight">
          This page hit an unexpected error
        </h1>
        <p className="text-sm text-[var(--ed-stone)] max-w-md mx-auto leading-relaxed">
          Try again — if the problem persists, it&apos;s on our side and we&apos;re likely
          already on it.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <button onClick={retry} className="ed-btn">
            Try again
          </button>
          <Link href="/" className="text-sm font-semibold text-[var(--ed-blue)] hover:underline">
            Back to Home
          </Link>
        </div>
        {error.digest && (
          <p className="num text-[10px] text-[var(--ed-stone)] pt-2">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
