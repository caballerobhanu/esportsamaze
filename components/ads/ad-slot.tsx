'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Google AdSense display unit. Renders nothing until NEXT_PUBLIC_ADSENSE_CLIENT
 * is set — drop it into a layout after approval, e.g.:
 *   <AdSlot slot="1234567890" className="my-6" />
 */
export function AdSlot({
  slot,
  className,
  format = 'auto',
}: {
  slot: string;
  className?: string;
  format?: string;
}) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const insRef = React.useRef<HTMLModElement>(null);
  const pushed = React.useRef(false);

  React.useEffect(() => {
    if (!client || !insRef.current || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (err) {
      console.error('AdSense push failed:', err);
    }
  }, [client]);

  if (!client) return null;

  return (
    <div className={cn('my-6 overflow-hidden', className)} aria-label="Advertisement">
      <ins
        ref={insRef}
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
