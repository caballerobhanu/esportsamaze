'use client';

import { useEffect, useRef } from 'react';

/** Fire-and-forget view counter ping — once per browser session per article. */
export function ViewPinger({ slug }: { slug: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const key = `ea-viewed-${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* storage unavailable — still count the view */
    }
    fired.current = true;
    fetch(`/api/news/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {});
  }, [slug]);

  return null;
}
