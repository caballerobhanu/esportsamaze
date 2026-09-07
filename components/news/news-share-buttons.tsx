'use client';

import { useState } from 'react';
import { Share2, Check, Copy, MessageCircle, Send } from 'lucide-react';

interface NewsShareButtonsProps {
  title: string;
  slug: string;
}

export function NewsShareButtons({ title, slug }: NewsShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const getUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/news/${slug}`;
    }
    return `https://esportsamaze.com/news/${slug}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — nothing sensible to fall back to.
    }
  };

  const open = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');

  const handleTwitterShare = () => {
    const url = encodeURIComponent(getUrl());
    const text = encodeURIComponent(`Read "${title}" on eSportsAmaze:`);
    open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`);
  };

  const handleWhatsAppShare = () => {
    const url = encodeURIComponent(getUrl());
    const text = encodeURIComponent(`*${title}*\n${url}`);
    open(`https://api.whatsapp.com/send?text=${text}`);
  };

  const handleTelegramShare = () => {
    const url = encodeURIComponent(getUrl());
    const text = encodeURIComponent(title);
    open(`https://t.me/share/url?url=${url}&text=${text}`);
  };

  const handleLinkedInShare = () => {
    open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getUrl())}`);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: getUrl() });
        return;
      } catch {
        /* user cancelled */
      }
    }
    handleCopy();
  };

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const btn =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--ed-hair)] bg-[var(--ed-surface)] hover:bg-[var(--ed-sand)] text-xs font-semibold text-[var(--ed-ink)] transition-all duration-200';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="ed-label mr-1 flex items-center gap-1.5">
        <Share2 className="h-3.5 w-3.5 text-[var(--ed-blue)]" /> Share
      </span>

      <button onClick={handleCopy} title="Copy article link" className={btn}>
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-semibold text-emerald-500">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 text-[var(--ed-stone)]" />
            <span className="hidden sm:inline">Copy</span>
          </>
        )}
      </button>

      <button onClick={handleTwitterShare} title="Share on X (Twitter)" className={btn}>
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span className="hidden sm:inline">Post</span>
      </button>

      <button onClick={handleWhatsAppShare} title="Share on WhatsApp" className={btn}>
        <MessageCircle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">WhatsApp</span>
      </button>

      <button onClick={handleTelegramShare} title="Share on Telegram" className={btn}>
        <Send className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Telegram</span>
      </button>

      <button onClick={handleLinkedInShare} title="Share on LinkedIn" className={btn}>
        <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden>
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
        </svg>
        <span className="hidden sm:inline">LinkedIn</span>
      </button>

      {canNativeShare && (
        <button onClick={handleNativeShare} title="More options…" className={`${btn} sm:hidden`}>
          <Share2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
