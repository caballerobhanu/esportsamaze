/**
 * The lead paragraph on an entity tab.
 *
 * Renders nothing when the builder had no real numbers to work from, so a thin
 * tab is left bare rather than padded with a sentence that says nothing.
 */
export function TabIntro({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="mb-6 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
      {text}
    </p>
  );
}
