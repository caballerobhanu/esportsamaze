'use client';

import * as React from 'react';

/**
 * A sponsor's mark, falling back to its name.
 *
 * A `logoUrl` being present does not mean the file resolves — a deleted upload, an object
 * removed from R2, or a stale URL all leave a plain `<img>` showing the browser's broken-image
 * glyph, and the server cannot know: the URL looks valid until the browser fetches it. `alt`
 * text does not save it either, since a broken image still renders as a broken icon.
 *
 * So a load failure is tracked here and the name is shown instead. This is the one part of the
 * sponsor block that has to be a Client Component; everything around it stays on the server.
 */
export function SponsorMark({
  name,
  logoUrl,
  className = 'h-7 w-auto max-w-[130px] object-contain',
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);

  // `failed` is reset by the key on the parent when the URL changes, so a new URL gets a
  // fresh attempt rather than inheriting the previous failure.
  if (!logoUrl || failed) {
    return <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{name}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- same-origin /api/media mark at a fixed small size; next/image gains nothing here
    <img
      src={logoUrl}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
