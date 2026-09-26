'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    googlefc?: {
      callbackQueue?: { push: (entry: Record<string, () => void>) => number };
      showRevocationMessage?: () => void;
    };
    __tcfapi?: (
      command: string,
      version: number,
      callback: (tcData: { gdprApplies?: boolean } | null, success: boolean) => void,
      parameter?: unknown
    ) => void;
  }
}

/**
 * Whether the EU/UK/Swiss consent rules (IAB TCF) apply to this visitor, as decided
 * by Google's certified CMP — the one AdSense deploys from Privacy & messaging.
 *
 * `true` means the CMP is handling consent here, so our own banner must keep out of
 * the way and the only consent UI is the CMP's message. `false` means no CMP rules
 * apply and our informational banner may show. `null` means we do not know yet —
 * callers should hold off rather than risk two consent dialogs at once.
 *
 * The CMP attaches `__tcfapi` to the window when it loads; we poll briefly for it,
 * then read `gdprApplies`. If it never appears (message not published, blocked by an
 * extension, or a region with no consent rules) we settle on `false`.
 */
export function useGdprApplies(): boolean | null {
  const [applies, setApplies] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    // A definitive `true` always wins, so a slow CMP cannot be overwritten by the
    // fallback timer once it has spoken.
    const settle = (value: boolean) => {
      if (!cancelled) setApplies((prev) => (prev === true ? true : value));
    };

    let attempts = 0;
    let stopPolling = false;

    const poll = () => {
      if (cancelled || stopPolling) return;

      const tcf = window.__tcfapi;
      if (typeof tcf === 'function') {
        stopPolling = true;
        try {
          tcf('addEventListener', 2.2, (tcData, success) => {
            if (!success || !tcData) return;
            if (typeof tcData.gdprApplies === 'boolean') settle(tcData.gdprApplies);
          });
        } catch {
          settle(false);
        }
        // API present but silent — assume no EU rules apply.
        window.setTimeout(() => settle(false), 1500);
        return;
      }

      if (attempts >= 10) {
        settle(false);
        return;
      }
      attempts += 1;
      window.setTimeout(poll, 150);
    };

    poll();

    return () => {
      cancelled = true;
      stopPolling = true;
    };
  }, []);

  return applies;
}
