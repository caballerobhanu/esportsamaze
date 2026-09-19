'use client';

import { useEffect, useState } from 'react';

/** Slim scroll-progress bar pinned under the site navbar. */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      setProgress(scrollable > 0 ? Math.min(100, (doc.scrollTop / scrollable) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed left-0 top-14 lg:top-[52px] z-50 h-0.5 w-full bg-transparent">
      <div
        className="h-full bg-(--ed-blue) transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
