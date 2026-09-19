'use client';

import * as React from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/** How far down the page has to be before the button appears. */
const SHOW_AFTER = 500;

/**
 * Floating back-to-top control for the public chrome. Hidden until the reader is
 * past the first screen, so it never competes with the cookie card (bottom-left on
 * desktop, full width 80px up on a phone) or the mobile drawer.
 */
export function BackToTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      className={cn(
        'fixed right-4 bottom-4 z-30 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#0A5FC4] text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A5FC4] sm:right-6 sm:bottom-6',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
      )}
    >
      <ArrowUp className="h-4 w-4" aria-hidden />
    </button>
  );
}
