import Link from 'next/link';
import { flagUrlFor, hasFlagFor } from '@/lib/countries';
import type { StandingsLogoMode } from '@/lib/standings-config';
import { ThemeLogo } from './theme-logo';

/**
 * The square chip every team mark is drawn in — crest or flag.
 *
 * Shared rather than restated per surface: the flag and the crest tile have to be the same box
 * (size, corner radius, hairline border, shadow) or the pair reads as two unrelated things sat
 * side by side. A surface supplying its own `tileClassName` should build it from this constant
 * instead of retyping the geometry, so the two cannot drift apart.
 */
export const TEAM_CHIP_BOX =
  'h-6 w-6 sm:h-8 sm:w-8 shrink-0 rounded-md sm:rounded-xl border border-slate-200 shadow-2xs dark:border-white/10';

/** The chip's fill, shared so a flag and a crest show the same placeholder while their art loads. */
export const TEAM_CHIP_FILL = 'bg-slate-50 dark:bg-black/40';

/**
 * A country flag, drawn as a square chip the same size as a team crest.
 *
 * The art is a self-hosted Flag Icons 1x1 SVG, square by design, so it fills the chip edge to
 * edge without being cropped. Rendered as a plain `<img>` rather than `next/image`: these are
 * already-optimal static SVGs served from our own origin, which `next/image` cannot improve on.
 *
 * Decorative by default: the flag sits beside the team name, so describing it again would only
 * make a screen reader repeat itself. Pass `alt` where a flag stands alone.
 */
export function TeamFlag({
  code,
  alt = '',
  chipClassName = `${TEAM_CHIP_BOX} ${TEAM_CHIP_FILL}`,
  className = '',
}: {
  code?: string | null;
  alt?: string;
  /**
   * The square the flag is drawn in. A surface passes the exact classes it gives its crest, so a
   * flag replacing a 48px crest on the Teams card is 48px too rather than the chip default.
   */
  chipClassName?: string;
  className?: string;
}) {
  if (!hasFlagFor(code)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- self-hosted static SVG, not an optimisable photo
    <img
      src={flagUrlFor(code)}
      alt={alt}
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
      className={`${chipClassName} object-cover ${className}`}
    />
  );
}

/**
 * How a team is drawn on one surface: crest tile, flag, crest plus a flag, or nothing.
 *
 * The tile classes stay with the caller, so every surface keeps the exact sizing, rounding,
 * border and hover it already had for `TEAM` — which is the default, so an untouched
 * tournament renders precisely as it did before this setting existed.
 *
 * `COUNTRY` replaces the tile rather than filling it, so the flag takes the same square a crest
 * would and the row keeps its rhythm. In `BOTH` its flag is a sibling of the tile, so the
 * caller's flex row spaces the pair out.
 */
export function TeamMark({
  mode,
  name,
  lightSrc,
  darkSrc,
  countryCode,
  href,
  tileClassName,
  logoClassName,
  fallbackClassName,
}: {
  mode: StandingsLogoMode;
  name: string;
  lightSrc?: string | null;
  darkSrc?: string | null;
  countryCode?: string | null;
  href?: string;
  tileClassName: string;
  logoClassName?: string;
  fallbackClassName?: string;
}) {
  if (mode === 'NONE') return null;

  // Only a team with a flag actually drawn can stand in for the tile; without one, fall through
  // and keep the crest rather than leave the row with no mark at all. The flag takes the caller's
  // tile classes so it occupies exactly the square the crest would.
  if (mode === 'COUNTRY' && hasFlagFor(countryCode)) {
    return <TeamFlag code={countryCode} chipClassName={tileClassName} />;
  }

  const initials = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
  const inner =
    lightSrc || darkSrc ? (
      <ThemeLogo lightSrc={lightSrc} darkSrc={darkSrc} alt={name} className={logoClassName} />
    ) : (
      <span className={fallbackClassName}>{initials}</span>
    );

  const tile = href ? (
    <Link href={href} className={tileClassName}>
      {inner}
    </Link>
  ) : (
    <div className={tileClassName}>{inner}</div>
  );

  return (
    <>
      {tile}
      {mode === 'BOTH' ? <TeamFlag code={countryCode} chipClassName={tileClassName} /> : null}
    </>
  );
}
