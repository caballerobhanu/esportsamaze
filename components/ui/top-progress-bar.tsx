'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [, startTransition] = useTransition();

  // Mirrors `isNavigating` for the completion effect, which must key off the
  // route change alone — adding `isNavigating` to its deps would finish the bar
  // the moment navigation starts instead of when it lands.
  const navigatingRef = useRef(false);
  useEffect(() => {
    navigatingRef.current = isNavigating;
  }, [isNavigating]);

  // Navigation landed: finish the bar, then clear it.
  useEffect(() => {
    if (!navigatingRef.current) return;
    const finish = setTimeout(() => setProgress(100), 0);
    const reset = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 250);
    return () => {
      clearTimeout(finish);
      clearTimeout(reset);
    };
  }, [pathname, searchParams]);

  // Trickle animation while navigating
  useEffect(() => {
    if (!isNavigating) return;

    const t1 = setTimeout(() => setProgress((p) => (p < 50 ? 50 : p)), 120);
    const t2 = setTimeout(() => setProgress((p) => (p < 75 ? 75 : p)), 350);
    const t3 = setTimeout(() => setProgress((p) => (p < 88 ? 88 : p)), 800);
    const safety = setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
    }, 8000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(safety);
    };
  }, [isNavigating]);

  // Intercept internal link clicks to start the progress bar immediately (<5ms)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Ignore modified clicks (new tab / window)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;

      const target = (e.target as HTMLElement)?.closest('a');
      if (!target || !(target instanceof HTMLAnchorElement)) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Ignore hash links, external links, downloads, mailto, tel, target="_blank"
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.target === '_blank' ||
        target.hasAttribute('download')
      ) {
        return;
      }

      // Check if same origin
      try {
        const url = new URL(target.href, window.location.href);
        if (url.origin !== window.location.origin) return;

        const currentUrl = new URL(window.location.href);
        // Ignore clicking current exact page without search change
        if (url.pathname === currentUrl.pathname && url.search === currentUrl.search) {
          return;
        }

        // Start progress bar immediately!
        startTransition(() => {
          setProgress(25);
          setIsNavigating(true);
        });
      } catch {
        // invalid URL, ignore
      }
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[2.5px] overflow-hidden bg-transparent"
    >
      <div
        className="h-full bg-[#0A5FC4] shadow-[0_0_10px_#0A5FC4,0_0_5px_#0A5FC4] transition-all duration-200 ease-out dark:bg-[#3b82f6] dark:shadow-[0_0_10px_#3b82f6,0_0_5px_#3b82f6]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: 'width, opacity',
        }}
      />
    </div>
  );
}
