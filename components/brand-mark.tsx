'use client';

import * as React from 'react';

/**
 * The stacked ("up-down") brand lockup, for the footer's cobalt card.
 *
 * The white lockup lives at `public/esportsamaze_white_ud.png`,
 * served as `/esportsamaze_white_ud.png`. If it is ever missing, the fallback swaps
 * in the horizontal wordmark so the card never shows a broken image — the caller
 * tints either one white, the same way the navbar does.
 *
 * A real `<img>` is right here rather than `next/image`: the file is same-origin and
 * small, and `next/image` has no way to react to a missing source.
 */
const VERTICAL_LOGO = '/esportsamaze_white_ud.png';
const FALLBACK_LOGO = '/logo.svg';

export function VerticalBrandMark({ className }: { className?: string }) {
  const [src, setSrc] = React.useState(VERTICAL_LOGO);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="eSportsAmaze"
      className={className}
      onError={() => setSrc((current) => (current === FALLBACK_LOGO ? current : FALLBACK_LOGO))}
    />
  );
}
