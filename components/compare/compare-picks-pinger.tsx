'use client';

import { useEffect, useRef } from 'react';

/**
 * Fire-and-forget "most compared" counter, once per browser session per pair.
 *
 * Deliberately client-side: the compare page is dynamic, and a counter bumped
 * while rendering fired for every GET — including crawler hits, since the page
 * can't be cached (it reads searchParams). Only a JS-running visitor counts,
 * and the session key stops a reload loop from inflating a pair.
 */
export function ComparePicksPinger({
  type,
  ids,
}: {
  type: 'TEAM' | 'PLAYER';
  ids: string[];
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (ids.length !== 2 || ids[0] === ids[1]) return;

    const key = `ea-compared-${type}-${ids[0]}-${ids[1]}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* storage unavailable — still count the comparison */
    }

    fired.current = true;
    fetch('/api/compare/picks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, ids }),
    }).catch(() => {});
  }, [type, ids]);

  return null;
}
