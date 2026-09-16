import { cn, getTournamentShortName } from '@/lib/utils';

interface TournamentNameProps {
  name: string;
  shortName?: string | null;
  series?: string | null;
  season?: string | null;
  className?: string;
}

/**
 * Renders a tournament name at full width on desktop and short on mobile.
 *
 * The site-wide rule: desktop always gets the full official name, mobile gets
 * `Tournament.shortName` (or a derived acronym, via getTournamentShortName).
 * When both resolve to the same string only one span is emitted, so the text is
 * never duplicated in the DOM for accessibility tools or text selection.
 */
export function TournamentName({ name, shortName, series, season, className }: TournamentNameProps) {
  const short = getTournamentShortName({ name, shortName, series, season });

  if (!short || short === name) {
    return <span className={className}>{name}</span>;
  }

  return (
    <>
      <span className={cn('hidden sm:inline', className)}>{name}</span>
      <span className={cn('sm:hidden', className)} title={name}>
        {short}
      </span>
    </>
  );
}

/**
 * Always the short label, at every width — a deliberate carve-out from the
 * full-on-desktop rule for navigation and compact contexts (breadcrumbs, the
 * team Matches/Stats tabs). The full name moves to `title` so it stays
 * discoverable on hover rather than being lost.
 */
export function TournamentShortName({ name, shortName, series, season, className }: TournamentNameProps) {
  const short = getTournamentShortName({ name, shortName, series, season });

  return (
    <span className={className} title={short !== name ? name : undefined}>
      {short}
    </span>
  );
}
