import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/** Broadcast section opener: short electric blue rule + kicker, bold title, optional link. */
export function SectionHeading({
  id,
  kicker,
  title,
  href,
  linkLabel = 'See all',
}: {
  id: string;
  kicker: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-3.5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#0A5FC4] dark:text-blue-400">
          <span className="inline-block h-0.5 w-6 rounded-full bg-[#0A5FC4] dark:bg-blue-400" aria-hidden />
          {kicker}
        </p>
        <h2 id={id} className="mt-1.5 text-2xl font-black uppercase tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1.5 pb-1 text-xs font-black uppercase tracking-wider text-[#0A5FC4] hover:underline dark:text-blue-400"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

