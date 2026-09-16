'use client';

import { useEffect, useRef } from 'react';

/**
 * Fire-and-forget view counter, once per browser session per page.
 *
 * Deliberately client-side: the tournament routes are ISR-cached, so a counter
 * bumped while rendering would fire once per revalidation window instead of once
 * per visit. The session key also stops a refresh loop from inflating a count.
 */
export function PageViewPinger({
  type,
  id,
}: {
  type: 'TOURNAMENT' | 'TEAM' | 'PLAYER';
  id: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    const key = `ea-viewed-${type}-${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* storage unavailable — still count the view */
    }

    fired.current = true;
    fetch(`/api/views/${type.toLowerCase()}/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }).catch(() => {});
  }, [type, id]);

  return null;
}
