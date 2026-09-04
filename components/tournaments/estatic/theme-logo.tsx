import Image from 'next/image';

/**
 * Renders a logo that adapts to the active color scheme: `lightSrc` shows in
 * light mode, `darkSrc` in dark mode (same swap pattern the editorial panels
 * use with `dark:hidden` / `hidden dark:block`). When only one variant exists
 * it is shown in both themes. Must sit inside a `relative` container
 * (images are rendered with `fill`).
 */
export function ThemeLogo({
  lightSrc,
  darkSrc,
  alt,
  className = '',
  priority = false,
}: {
  lightSrc?: string | null;
  darkSrc?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  if (!lightSrc && !darkSrc) return null;
  return (
    <>
      {lightSrc && (
        <Image
          src={lightSrc}
          alt={darkSrc ? '' : alt}
          fill
          priority={priority}
          className={`${className} ${darkSrc ? 'dark:hidden' : ''}`}
        />
      )}
      {darkSrc && (
        <Image
          src={darkSrc}
          alt={alt}
          fill
          priority={priority}
          className={`${className} ${lightSrc ? 'hidden dark:block' : ''}`}
        />
      )}
    </>
  );
}
