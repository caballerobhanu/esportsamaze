'use client';

import * as React from 'react';
import { Check, Copy, Download } from 'lucide-react';

/**
 * Shows a generated Coverage Pack with a copy button and a .md download.
 *
 * Read-only on purpose: the pack is source material for the editorial prompt, so the
 * only actions are "take it away". Nothing here writes to the database.
 */
export function CoveragePackView({ pack, filename }: { pack: string; filename: string }) {
  const [copied, setCopied] = React.useState(false);
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(pack);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or denied) — the textarea is still selectable.
      setCopied(false);
    }
  };

  const onDownload = () => {
    const blob = new Blob([pack], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy pack'}
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" />
          Download .md
        </button>
        <span className="text-[11px] text-slate-400">
          Paste this into the editorial prompt as the source material.
        </span>
      </div>

      <textarea
        readOnly
        value={pack}
        spellCheck={false}
        onFocus={(event) => event.currentTarget.select()}
        className="h-[70vh] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-[11.5px] leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-(--ed-blue) dark:border-slate-800 dark:bg-[#0b101c] dark:text-slate-200"
      />
    </div>
  );
}
