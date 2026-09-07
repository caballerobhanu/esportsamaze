import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/** Magazine section opener: short magenta rule + kicker, serif title, optional "See all". */
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
    <div className="flex items-end justify-between gap-4 border-b border-[var(--ed-hair)] pb-3.5">
      <div className="min-w-0">
        <p className="kicker flex items-center gap-2">
          <span className="inline-block h-px w-6 bg-[var(--ed-magenta)]" aria-hidden />
          {kicker}
        </p>
        <h2 id={id} className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1.5 pb-1 text-xs font-bold text-[var(--ed-blue)] hover:underline"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
