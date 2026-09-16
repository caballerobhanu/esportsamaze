import { Eye } from 'lucide-react';

import { PageViewPinger } from '@/components/ui/page-view-pinger';
import { getPageViewCount, resolveViewDisplay, type PageViewType } from '@/lib/page-views';
import { VIEW_WINDOW_SUFFIX } from '@/lib/view-window';
import { cn } from '@/lib/utils';

/**
 * View counting for one entity page: always counts, prints the total only when
 * it has been switched on for that page.
 *
 * Which window it prints is a setting too — lifetime, or the last 7 / 30 / 90
 * days — decided per page, falling back to the switch for its type. The count
 * stays hidden unless asked for, and a page with nothing recorded yet prints
 * nothing: a "0 views" line is worse than no line.
 */
export async function PageViews({
  type,
  id,
  override,
  windowOverride,
  className,
}: {
  type: PageViewType;
  id: string;
  /** The entity's own switch; null/undefined follows the site-wide setting. */
  override?: boolean | null;
  /** The entity's own window; null/undefined follows the site-wide window. */
  windowOverride?: string | null;
  className?: string;
}) {
  const { show, window } = await resolveViewDisplay(type, override, windowOverride);

  if (!show) {
    return <PageViewPinger type={type} id={id} />;
  }

  const total = await getPageViewCount(type, id, window);
  if (total === 0) {
    return <PageViewPinger type={type} id={id} />;
  }

  return (
    <>
      <PageViewPinger type={type} id={id} />
      <p
        className={cn(
          'flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500',
          className,
        )}
      >
        <Eye className="h-3.5 w-3.5" />
        {total.toLocaleString('en-IN')} view{total === 1 ? '' : 's'}
        {VIEW_WINDOW_SUFFIX[window]}
      </p>
    </>
  );
}
