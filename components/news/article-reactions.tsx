'use client';

import React, { useEffect, useState } from 'react';
import { Brain, Flame, Loader2, ThumbsUp } from 'lucide-react';

const ANON_KEY = 'ea-anon-id';

const KINDS = [
  { kind: 'LIKE', label: 'Insightful', icon: ThumbsUp },
  { kind: 'HYPE', label: 'Hype', icon: Flame },
  { kind: 'INSIGHT', label: 'Deep dive', icon: Brain },
] as const;

type Kind = (typeof KINDS)[number]['kind'];

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

/** One-tap reactions under the article body, toggled per anonymous browser session. */
export function ArticleReactions({ slug }: { slug: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({ LIKE: 0, HYPE: 0, INSIGHT: 0 });
  const [mine, setMine] = useState<Kind[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sessionId = getAnonId();
    const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
    fetch(`/api/news/${encodeURIComponent(slug)}/react${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { counts?: Record<string, number>; mine?: Kind[] } | null) => {
        if (json?.counts) setCounts(json.counts);
        if (json?.mine) setMine(json.mine);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [slug]);

  const toggle = async (kind: Kind) => {
    if (busy) return;
    setBusy(true);
    // Optimistic update
    const active = mine.includes(kind);
    setMine(active ? mine.filter((k) => k !== kind) : [...mine, kind]);
    setCounts((c) => ({ ...c, [kind]: Math.max(0, (c[kind] ?? 0) + (active ? -1 : 1)) }));
    try {
      const res = await fetch(`/api/news/${encodeURIComponent(slug)}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, sessionId: getAnonId() }),
      });
      if (res.ok) {
        const json = (await res.json()) as { counts?: Record<string, number>; mine?: Kind[] };
        if (json.counts) setCounts(json.counts);
        if (json.mine) setMine(json.mine);
      }
    } catch {
      /* keep optimistic state; next load reconciles */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 border-t border-[var(--ed-hair)] pt-6">
      <p className="ed-label mb-3">How did this story land?</p>
      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map(({ kind, label, icon: Icon }) => {
          const active = mine.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggle(kind)}
              disabled={!ready || busy}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
                active
                  ? 'border-[var(--ed-blue)] bg-[var(--ed-blue)] text-white'
                  : 'border-[var(--ed-hair)] bg-[var(--ed-surface)] text-[var(--ed-stone)] hover:border-[var(--ed-blue)] hover:text-[var(--ed-blue)]'
              }`}
              title={active ? `Remove your ${label.toLowerCase()} reaction` : label}
            >
              {!ready ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className={`h-3.5 w-3.5 ${active ? 'fill-current' : ''}`} />
              )}
              {label}
              <span className="tabular-nums">{counts[kind] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
