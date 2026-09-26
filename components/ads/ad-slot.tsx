'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AdPlacement } from '@/lib/ads';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Google AdSense display unit.
 *
 * Renders nothing until BOTH the publisher client and this placement's slot id
 * are configured, so a placement can be wired up and deployed before approval
 * without leaving empty boxes on the page. Fill the slot ids in lib/ads.ts.
 *
 * The attributes are derived from the placement, because they differ per unit
 * type: fixed units carry an explicit size and no format, responsive ones carry
 * data-ad-format (and data-full-width-responsive), in-article adds a layout.
 */
export function AdSlot({ placement, className }: { placement: AdPlacement; className?: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const { slot, format = 'auto', layout, layoutKey, width, height, minHeight } = placement;
  const insRef = React.useRef<HTMLModElement>(null);
  const pushed = React.useRef(false);

  const isFixed = width != null && height != null;

  React.useEffect(() => {
    if (!client || !slot || !insRef.current || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (err) {
      console.error('AdSense push failed:', err);
    }
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <div className={cn('my-6 overflow-hidden', className)} aria-label="Advertisements">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Advertisements</div>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={
          isFixed
            ? { display: 'inline-block', width, height }
            : { display: 'block', textAlign: format === 'fluid' ? 'center' : undefined, minHeight }
        }
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={isFixed ? undefined : format}
        data-ad-layout={layout}
        data-ad-layout-key={layoutKey}
        data-full-width-responsive={!isFixed && format === 'auto' ? 'true' : undefined}
      />
    </div>
  );
}
