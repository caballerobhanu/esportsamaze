/**
 * The route segment after `/<family>/<slug>` names the active tab; the base
 * route is the overview. Used by the profile tab docks and the tournament
 * edition switcher, which all live in a layout and therefore cannot receive the
 * active tab as a prop.
 */
export function activeTabFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  return segments[2] ?? 'overview';
}
