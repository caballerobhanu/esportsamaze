/**
 * The slice of history a public view count covers.
 *
 * Lives on its own (no Prisma, no React) because both the settings layer that
 * stores the choice and the view layer that reads it need the same words, and
 * having settings import from page-views would close a cycle.
 */

export type ViewWindow = 'LIFETIME' | '7D' | '30D' | '90D';

export const VIEW_WINDOWS: ViewWindow[] = ['LIFETIME', '7D', '30D', '90D'];

export const VIEW_WINDOW_LABELS: Record<ViewWindow, string> = {
  LIFETIME: 'Lifetime',
  '7D': 'Last 7 days',
  '30D': 'Last 30 days',
  '90D': 'Last 90 days',
};

/** What prints after the number: "318 views this month". */
export const VIEW_WINDOW_SUFFIX: Record<ViewWindow, string> = {
  LIFETIME: '',
  '7D': ' this week',
  '30D': ' this month',
  '90D': ' in 90 days',
};

/** Days in a window, or null for lifetime. */
export function windowDays(window: ViewWindow): number | null {
  if (window === 'LIFETIME') return null;
  return Number(window.replace('D', ''));
}

export function isViewWindow(value: string | null | undefined): value is ViewWindow {
  return VIEW_WINDOWS.includes(value as ViewWindow);
}
