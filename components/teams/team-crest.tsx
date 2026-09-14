import { ThemeLogo } from '@/components/ui/theme-logo';

/** Two-letter fallback for teams with no crest on file. */
export function crestInitials(name: string): string {
  const letters = name
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return letters || '?';
}

/**
 * Small square crest used by the head-to-head board and the related-teams band.
 * Falls back to initials, matching the directory's `CrestGrid`.
 */
export function TeamCrest({
  name,
  lightSrc,
  darkSrc,
  className = 'h-9 w-9',
}: {
  name: string;
  lightSrc?: string | null;
  darkSrc?: string | null;
  className?: string;
}) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      {lightSrc || darkSrc ? (
        <ThemeLogo
          lightSrc={lightSrc}
          darkSrc={darkSrc}
          alt={name}
          className="object-contain p-1"
        />
      ) : (
        <span className="text-[11px] font-black text-slate-400">{crestInitials(name)}</span>
      )}
    </span>
  );
}
