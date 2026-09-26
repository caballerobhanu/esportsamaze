import Link from 'next/link';

/**
 * A 404 as a broadcast slate: the status code, one line of type at full bleed,
 * one action, nothing else.
 *
 * The rest of the site is a dense data surface, so the loudest type we own belongs
 * on the page that has nothing to protect — the address that failed to resolve.
 * There is no explanatory paragraph and no second link to dilute either.
 *
 * The field is the same token the navbar uses, in both themes, so the chrome and the
 * page meet without a seam rather than two near-blues sitting edge to edge.
 *
 * The field is a full viewport tall, less the sticky header, so it owns the screen
 * outright: the footer that follows is deliberately below the fold and only arrives
 * on scroll, on phone and desktop alike. The wordmark block is the flex child, so it
 * centres itself in that field; its size is clamped against the smaller of the
 * viewport's width and height, and the height left over is the blank space around it.
 *
 * The action is the last row, never a floating element: full-bleed on a phone, and a
 * right-aligned slab once there is room. Sitting in the bottom-right also keeps it
 * clear of the consent card that appears over the bottom-left on a first visit.
 */
export function NotFoundPoster() {
  return (
    <main className="flex min-h-[calc(100svh-3.5rem-var(--ed-safe-top))] flex-1 flex-col bg-(--ed-blue) px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8 lg:py-20 dark:bg-[#041129]">
      <div className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-[var(--page-max-width)]">
          <p className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-white/55 tabular-nums sm:mb-6">
            Error 404
          </p>
          <h1 className="font-display text-[clamp(3rem,min(20vw,26vh),15rem)] font-black uppercase leading-[0.82] tracking-[-0.045em]">
            Page not
            <br />
            found
          </h1>
        </div>
      </div>

      <div className="mx-auto mt-12 flex w-full max-w-[var(--page-max-width)] justify-end sm:mt-16">
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-6 py-4 text-sm font-black uppercase tracking-wider text-(--ed-blue) transition-colors hover:bg-blue-50 sm:w-auto sm:min-w-[13rem] dark:text-[#041129]"
        >
          Go to home page
        </Link>
      </div>
    </main>
  );
}
