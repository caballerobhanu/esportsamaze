'use client';

import * as React from 'react';
import { AdSlot } from '@/components/ads/ad-slot';
import { AD_PLACEMENTS } from '@/lib/ads';

/** The width at which a sidebar column is wide enough for the fixed 300px creative. */
const WIDE_QUERY = '(min-width: 1280px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const isWide = () => window.matchMedia(WIDE_QUERY).matches;

/** SSR and the first client render agree — no rail — so hydration cannot mismatch. */
const neverWide = () => false;

/**
 * The sidebar unit, mounted only while the sidebar is actually on screen.
 *
 * Rendering nothing below the breakpoint, rather than hiding the unit with CSS, keeps
 * a `display:none` ad from sitting in the page at all: AdSense's policy permits hiding
 * ad units only for *responsive* units, and this is a fixed-size one. It also means
 * smaller screens never make the request.
 */
export function RailSlot() {
  const wide = React.useSyncExternalStore(subscribe, isWide, neverWide);
  if (!wide) return null;
  return <AdSlot placement={AD_PLACEMENTS.pageRail} />;
}
