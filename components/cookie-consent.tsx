'use client';

import * as React from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { useGdprApplies } from '@/lib/use-gdpr';

const CONSENT_KEY = 'ea-cookie-consent';

// localStorage is an external store: subscribing lets every mounted banner —
// and future consent-aware components — update when the choice changes.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    return 'unavailable'; // storage blocked — treat as decided to avoid nagging
  }
}

function getServerSnapshot(): string | null {
  return 'pending'; // banner stays hidden during SSR and hydration
}

function writeConsent(value: 'accepted' | 'declined') {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // storage unavailable — just close the banner for this visit
  }
  for (const listener of listeners) listener();
}

/**
 * Bottom card for site preferences and third-party ad cookies.
 *
 * This is a courtesy notice, not a consent platform. In the EEA, the UK and
 * Switzerland, Google's certified CMP (deployed from AdSense → Privacy & messaging)
 * owns consent and produces the TC string AdSense requires — so this card stands
 * down there to avoid showing two consent dialogs at once. The choice it records
 * lives in localStorage (`ea-cookie-consent`).
 */
export function CookieConsent() {
  const gdprApplies = useGdprApplies();
  const consent = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // `null` means we are still waiting on the CMP; only a definite `false` shows this.
  if (gdprApplies !== false) return null;
  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="ed-card fixed inset-x-3 bottom-20 z-40 p-4 sm:p-5 md:inset-x-auto md:bottom-5 md:left-5 md:max-w-sm"
    >
      <p className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
        <Cookie className="h-4 w-4 text-[var(--ed-blue)]" aria-hidden />
        Cookies &amp; ads
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--ed-stone)]">
        We use local storage for site preferences and serve ads through Google AdSense, whose
        partners may use cookies to personalize ads. See our{' '}
        <Link href="/privacy-policy" className="font-semibold text-[var(--ed-blue)] underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-3.5 flex gap-2">
        <button onClick={() => writeConsent('accepted')} className="ed-btn flex-1 px-4 py-2 text-xs">
          Accept all
        </button>
        <button
          onClick={() => writeConsent('declined')}
          className="ed-chip px-4 py-2 text-xs font-bold transition-colors hover:border-[var(--ed-blue)]"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
