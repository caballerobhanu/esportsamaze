import Link from 'next/link';

/** Windowed page numbers: 1 … 4 5 6 … 12 (or all pages when few). */
function windowedPages(page: number, totalPages: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) out.push(i);
    return out;
  }
  out.push(1);
  if (page > 3) out.push('…');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) out.push(i);
  if (page < totalPages - 2) out.push('…');
  out.push(totalPages);
  return out;
}

/**
 * Pagination for the directory pages. Carries the active facet params
 * (q/status/game/…) through page changes. Two placements per directory:
 * a compact pager above the grid (no scrolling to switch pages) and the
 * full numbered footer below it.
 */
export function DirectoryPagination({
  basePath,
  page,
  totalPages,
  total,
  pageSize,
  entityPlural,
  params = {},
}: {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  entityPlural: string;
  params?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const href = (p: number) => {
    const query = new URLSearchParams(params);
    if (p > 1) query.set('page', String(p));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const idleCls =
    'px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border border-[var(--ed-hair)] text-[var(--ed-stone)] opacity-40 select-none';
  const btnCls =
    'px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border border-[var(--ed-hair)] text-[var(--ed-ink)] hover:border-[var(--ed-blue)] hover:text-[var(--ed-blue)] transition-colors cursor-pointer';
  const activeCls = 'bg-[var(--ed-blue)] border-[var(--ed-blue)] text-white cursor-default';

  const prev =
    page > 1 ? (
      <Link href={href(page - 1)} prefetch className={btnCls} aria-label="Previous page">
        ← Prev
      </Link>
    ) : (
      <span className={idleCls} aria-disabled>
        ← Prev
      </span>
    );
  const next =
    page < totalPages ? (
      <Link href={href(page + 1)} prefetch className={btnCls} aria-label="Next page">
        Next →
      </Link>
    ) : (
      <span className={idleCls} aria-disabled>
        Next →
      </span>
    );

  return (
    <nav
      aria-label="Directory pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] px-5 py-4"
    >
      <p className="text-xs font-semibold text-[var(--ed-stone)] text-center sm:text-left">
        Showing <span className="num font-extrabold text-[var(--ed-ink)]">{from}–{to}</span> of{' '}
        <span className="num font-extrabold text-[var(--ed-ink)]">{total}</span> {entityPlural} (filtered).
        Use the search bar above to find anything instantly.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5 shrink-0">
        {prev}
        {windowedPages(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1 text-xs font-bold text-[var(--ed-stone)]">
              …
            </span>
          ) : p === page ? (
            <span
              key={p}
              aria-current="page"
              className={`num px-3 py-1.5 rounded-lg text-xs font-extrabold border ${activeCls}`}
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={href(p)}
              prefetch
              className="num px-3 py-1.5 rounded-lg text-xs font-extrabold border border-[var(--ed-hair)] text-[var(--ed-ink)] hover:border-[var(--ed-blue)] hover:text-[var(--ed-blue)] transition-colors cursor-pointer"
            >
              {p}
            </Link>
          )
        )}
        {next}
      </div>
    </nav>
  );
}
