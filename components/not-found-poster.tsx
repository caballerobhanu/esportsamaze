import Link from 'next/link';

/**
 * A 404 as a poster: one line of type at full bleed, one action, nothing else.
 *
 * The rest of the site is a dense data surface, so the loudest type we own belongs
 * on the page that has nothing to protect — the address that failed to resolve.
 * There is no chip, no explanatory paragraph and no second link to dilute either.
 *
 * The field is the same token the navbar uses, in both themes, so the chrome and the
 * page meet without a seam rather than two near-blues sitting edge to edge.
 *
 * The type is sized against the smaller of the viewport's width and height: on a
 * wide-but-short window the width alone pushes the button off the fold. The button
 * sits in the bottom-right corner rather than under the headline, which keeps it
 * clear of the consent card that appears over the bottom-left on a first visit.
 */
export function NotFoundPoster() {
  return (
    <main className="flex flex-1 flex-col justify-between gap-10 bg-(--ed-blue) px-4 py-12 text-white sm:px-6 sm:py-16 lg:px-8 dark:bg-[#041129]">
      <div className="mx-auto w-full max-w-[var(--page-max-width)]">
        <h1 className="font-display text-[clamp(3rem,min(13vw,22vh),11rem)] font-black uppercase leading-[0.84] tracking-[-0.045em]">
          Page not
          <br />
          found
        </h1>
      </div>

      <div className="mx-auto flex w-full max-w-[var(--page-max-width)] justify-end">
        <Link
          href="/"
          className="inline-flex items-center rounded-lg bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-(--ed-blue) transition-colors hover:bg-blue-50 sm:text-sm dark:text-[#041129]"
        >
          Go to home page
        </Link>
      </div>
    </main>
  );
}
