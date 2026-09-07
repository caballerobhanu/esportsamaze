'use client';

import React, { useState } from 'react';
import { Loader2, MessageSquare, Send, ShieldCheck } from 'lucide-react';

export interface PublicComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || 'G';
}

/**
 * Public comment list + submission form. New comments enter the admin
 * moderation queue (status PENDING) and appear here once approved.
 */
export function CommentsSection({
  slug,
  initialComments,
  approvedCount,
}: {
  slug: string;
  initialComments: PublicComment[];
  approvedCount: number;
}) {
  const [comments] = useState(initialComments);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — hidden from real users
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/news/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), body: body.trim(), website }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (res.ok) {
        setFeedback({ ok: true, message: json.message ?? 'Thanks! Your comment is awaiting moderation.' });
        setBody('');
      } else {
        setFeedback({ ok: false, message: json.error ?? 'Failed to post your comment. Try again.' });
      }
    } catch {
      setFeedback({ ok: false, message: 'Network error — please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-14 border-t border-[var(--ed-hair)] pt-10">
      <h3 className="font-display mb-6 flex items-center gap-2 text-xl font-extrabold tracking-tight">
        <MessageSquare className="h-5 w-5 text-[var(--ed-blue)]" />
        Discussion
        <span className="rounded-full bg-[var(--ed-sand)] px-2 py-0.5 text-xs font-black text-[var(--ed-stone)]">
          {approvedCount}
        </span>
      </h3>

      {/* Submission form */}
      <form onSubmit={submit} className="ed-card space-y-3 p-5">
        {/* Honeypot field — hidden from real users, bots fill it */}
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Your name (optional)"
          className="ed-input py-2 text-xs"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={1500}
          required
          minLength={3}
          placeholder="Share your take on this story…"
          className="ed-input w-full py-2 text-xs"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="ed-label inline-flex items-center gap-1 text-[10px]">
            <ShieldCheck className="h-3 w-3" /> Hand-moderated — no spam, no flame wars.
          </span>
          <button
            type="submit"
            disabled={submitting || body.trim().length < 3}
            className="ed-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Post comment
          </button>
        </div>
        {feedback && (
          <p
            className={`text-xs font-bold ${
              feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {feedback.message}
          </p>
        )}
      </form>

      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="mt-6 text-center text-xs font-semibold text-[var(--ed-stone)]">
          No comments yet — be the first to weigh in.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="ed-card flex items-start gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ed-sand)] text-xs font-extrabold text-[var(--ed-ink)]">
                {initials(c.authorName)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xs font-extrabold">{c.authorName}</span>
                  <time suppressHydrationWarning className="ed-label text-[10px]">
                    {new Date(c.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-line text-xs font-medium leading-relaxed text-[var(--ed-stone)]">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
