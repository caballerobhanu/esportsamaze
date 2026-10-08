'use client';

import * as React from 'react';
import { getVisitorLocalCurrency } from '@/lib/geo-currency';

const emptySubscribe = () => () => {};
/** Server snapshot is a US visitor; the client re-renders with the real locale. */
const getServerCurrency = () => 'USD';

/**
 * The visitor's local currency, read from the browser timezone.
 *
 * `useSyncExternalStore` keeps the server render (always USD) and the client
 * render (the real locale) from disagreeing, so no hydration warning is raised
 * when the value differs. Shared by the prize badge and the prize-pool tab.
 */
export function useVisitorCurrency(): string {
  return React.useSyncExternalStore(emptySubscribe, getVisitorLocalCurrency, getServerCurrency);
}
