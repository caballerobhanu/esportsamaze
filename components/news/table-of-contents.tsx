'use client';

import { useEffect, useState } from 'react';
import { ListTree } from 'lucide-react';

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

/**
 * Sticky table of contents built from the rendered article headings.
 * `containerSelector` is scanned on mount (after the article HTML renders).
 */
export function TableOfContents({ containerSelector }: { containerSelector: string }) {
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const nodes = Array.from(container.querySelectorAll('h2, h3'));
    const items: TocHeading[] = nodes.map((node, i) => {
      if (!node.id) node.id = `section-${i + 1}`;
      return { id: node.id, text: node.textContent ?? '', level: node.tagName === 'H2' ? 2 : 3 };
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- headings can only be read after the article HTML has rendered
    setHeadings(items.filter((h) => h.text.length > 0));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [containerSelector]);

  if (headings.length < 2) return null;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="rounded-xl border border-[var(--ed-hair)] bg-[var(--ed-surface)] p-4">
      <div className="ed-label mb-2.5 flex items-center gap-1.5">
        <ListTree className="h-3.5 w-3.5" />
        In this article
      </div>
      <ul className="space-y-1.5">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? 'pl-3.5' : ''}>
            <button
              type="button"
              onClick={() => scrollTo(h.id)}
              className={`block w-full cursor-pointer truncate text-left text-[12px] font-semibold transition-colors ${
                activeId === h.id
                  ? 'text-[var(--ed-blue)]'
                  : 'text-[var(--ed-stone)] hover:text-[var(--ed-ink)]'
              }`}
              title={h.text}
            >
              {h.level === 3 ? '· ' : ''}
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
