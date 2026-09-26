'use client';

import * as React from 'react';
import { useGdprApplies } from '@/lib/use-gdpr';

/**
 * Reopens Google's consent message so a visitor can change or withdraw the choice
 * they made. Rendered only where the CMP actually applies (the EEA, the UK and
 * Switzerland), since `showRevocationMessage` is a no-op everywhere else.
 */
export function CookieSettingsLink({ className }: { className?: string }) {
  const gdprApplies = useGdprApplies();

  if (gdprApplies !== true) return null;

  return (
    <button
      type="button"
      onClick={() => window.googlefc?.showRevocationMessage?.()}
      className={className}
    >
      Cookie settings
    </button>
  );
}
