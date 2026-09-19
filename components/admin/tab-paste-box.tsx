'use client';

import * as React from 'react';
import { ClipboardPaste, Copy, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface TabPastePreview {
  /** Lines describing what was understood, e.g. "4 stages". */
  summary: string[];
  /** Header tokens the parser did not recognise — named back rather than dropped. */
  unrecognised: string[];
  error: string | null;
}

/**
 * The paste half of a tournament tab: paste a sheet, see what was understood, apply it.
 *
 * Deliberately mounted inside each tab's own editor rather than on the tournament form, so
 * "Apply" writes into that editor's state and nothing reaches the database until the admin
 * saves the tournament. Same path as typing the values by hand — this only saves keystrokes.
 */
export function TabPasteBox({
  label,
  hint,
  sampleHeader,
  parse,
  onApply,
}: {
  label: string;
  hint: string;
  /** The canonical header row, offered so a sheet can be built to match. */
  sampleHeader: string;
  parse: (text: string) => TabPastePreview;
  onApply: (text: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  const preview = React.useMemo<TabPastePreview | null>(() => {
    if (!text.trim()) return null;
    try {
      return parse(text);
    } catch (error) {
      return {
        summary: [],
        unrecognised: [],
        error: error instanceof Error ? error.message : 'The paste could not be read.',
      };
    }
  }, [text, parse]);

  const canApply = Boolean(preview && !preview.error && preview.summary.length > 0);

  const copyHeader = () => {
    void navigator.clipboard?.writeText(sampleHeader);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer"
      >
        <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
          <ClipboardPaste className="w-3.5 h-3.5 text-(--ed-blue) dark:text-blue-400" />
          {label}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {open ? 'Hide' : 'Paste from sheet'}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyHeader}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              {copied ? 'Copied' : 'Copy column names'}
            </button>
            <span className="text-[10px] font-mono text-slate-400 truncate max-w-full">{sampleHeader}</span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={`Paste the rows from your sheet, including the header row.\n\n${sampleHeader}`}
            className="w-full font-mono text-[11px] p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-(--ed-blue)"
          />

          {preview && (
            <div className="space-y-1.5">
              {preview.error ? (
                <p className="inline-flex items-start gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  {preview.error}
                </p>
              ) : (
                preview.summary.map((line) => (
                  <p
                    key={line}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {line}
                  </p>
                ))
              )}

              {preview.unrecognised.length > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Ignored columns: {preview.unrecognised.join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canApply}
              onClick={() => {
                onApply(text);
                setText('');
                setOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-(--ed-blue) text-white text-xs font-bold hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              Apply to form
            </button>
            <button
              type="button"
              onClick={() => setText('')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Clear
            </button>
            <span className="text-[11px] text-slate-400">
              Nothing is saved until you save the tournament.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
