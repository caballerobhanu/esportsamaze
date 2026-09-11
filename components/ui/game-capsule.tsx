export interface GameCapsuleData {
  name: string;
  slug: string;
  shortName?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
}

/** Label to show for a game: short name when set, otherwise full name. */
export function gameLabel(game: Pick<GameCapsuleData, 'name' | 'shortName'>): string {
  return game.shortName?.trim() || game.name;
}

/**
 * Game logo glyph with light/dark switching — mirrors the Team/Tournament
 * convention: light logo in light mode, `logoDarkUrl` in dark mode when set,
 * otherwise the light logo is reused on dark backgrounds.
 */
export function GameLogo({
  game,
  className = 'h-3.5 w-3.5',
}: {
  game: GameCapsuleData;
  className?: string;
}) {
  const light = game.logoUrl;
  const dark = game.logoDarkUrl;
  if (!light && !dark) return null;
  return (
    <>
      {light && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={light} alt="" aria-hidden="true" className={`${className} shrink-0 object-contain dark:hidden`} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dark || light || ''}
        alt=""
        aria-hidden="true"
        // Without a dedicated dark asset, render the light logo as a white
        // silhouette in dark mode so black wordmarks stay visible.
        className={`${className} hidden shrink-0 object-contain dark:block ${!dark ? 'dark:brightness-0 dark:invert' : ''}`}
      />
    </>
  );
}

/**
 * Compact game badge — logo glyph (if available) + short name, with the full
 * name on hover. Use this anywhere a big game name used to print.
 */
export function GameCapsule({ game }: { game: GameCapsuleData }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={game.name}>
      <GameLogo game={game} />
      <span className="truncate">{gameLabel(game)}</span>
    </span>
  );
}