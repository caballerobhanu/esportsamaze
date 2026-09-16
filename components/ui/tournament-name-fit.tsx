'use client';

import * as React from 'react';
import { cn, getTournamentShortName } from '@/lib/utils';

interface TournamentNameFitProps {
  name: string;
  shortName?: string | null;
  series?: string | null;
  season?: string | null;
  className?: string;
}

/**
 * Full tournament name until it would wrap, then the short one.
 *
 * The site-wide rule is full-on-desktop / short-on-mobile, but inside a table
 * cell a viewport breakpoint is the wrong signal: what actually matters is
 * whether *this* name fits *this* column. So the full label is measured against
 * the cell's own width and swapped for the short label the moment it would wrap
 * — driven by the layout rather than the screen size.
 *
 * The container spans the full cell, which is what makes measuring honest: the
 * swap cannot change the space the cell has, so it can never oscillate between
 * the two labels. The measurement span is a hidden, nowrap copy of the full
 * name, so the full label keeps being measured while the short one is shown.
 */
export function TournamentNameFit({ name, shortName, series, season, className }: TournamentNameFitProps) {
  const short = getTournamentShortName({ name, shortName, series, season });
  const containerRef = React.useRef<HTMLSpanElement>(null);
  const measureRef = React.useRef<HTMLSpanElement>(null);
  const [fits, setFits] = React.useState(true);

  // Runs before paint, so the swap from the full to the short label is never
  // visible as a wrapped first render.
  React.useLayoutEffect(() => {
    if (!short || short === name) return;

    const container = containerRef.current;
    const full = measureRef.current;
    if (!container || !full) return;

    let active = true;
    const measure = () => {
      if (active) setFits(full.offsetWidth <= container.clientWidth);
    };

    measure();
    // Web fonts change the width of the same string, so re-measure once they land.
    if ('fonts' in document) {
      document.fonts.ready.then(measure).catch(() => {});
    }

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(container);
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [name, short]);

  if (!short || short === name) {
    return <span className={className}>{name}</span>;
  }

  return (
    <span ref={containerRef} className={cn('relative block w-full max-w-full', className)}>
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
      >
        {name}
      </span>
      {fits ? (
        <span>{name}</span>
      ) : (
        <span title={name}>{short}</span>
      )}
    </span>
  );
}
