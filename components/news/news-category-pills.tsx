import Link from 'next/link';
import type { CategoryPill } from '@/lib/news';

/**
 * The category rail shared by /news and every /news/category/<slug> page.
 *
 * "All News" always leads it. The category page used to render only the
 * predefined six with no All News pill, so clicking into a category left no pill
 * to click back out with — and a custom category highlighted nothing at all.
 *
 * `activeHref` is the href of the pill to mark, or null when nothing should be
 * (a search or tag filter on /news has no single active category).
 */
export function NewsCategoryPills({
  pills,
  activeHref,
  totalAll,
  className = '',
}: {
  pills: CategoryPill[];
  activeHref: string | null;
  totalAll: number;
  className?: string;
}) {
  const chip = (active: boolean) =>
    `ed-chip whitespace-nowrap px-3.5 py-1.5 transition-colors ${
      active ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white' : 'hover:border-[var(--ed-blue)]'
    }`;
  const badge = (active: boolean) =>
    `rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-[var(--ed-sand)]'}`;

  const allActive = activeHref === '/news';

  return (
    <div className={`no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 ${className}`}>
      <Link href="/news" className={chip(allActive)}>
        All News
        <span className={badge(allActive)}>{totalAll}</span>
      </Link>

      {pills.map((pill) => {
        const href = `/news/category/${pill.slug}`;
        const active = activeHref === href;
        return (
          <Link key={pill.slug} href={href} className={chip(active)}>
            <span>{pill.label}</span>
            {pill.count > 0 && <span className={badge(active)}>{pill.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
