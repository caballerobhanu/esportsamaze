'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Copy-to-clipboard button with transient "Copied" feedback. */
export function CopyButton({ value, label = 'Copy URL' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

/**
 * Submit button with a native confirm dialog. Must live inside a <form> —
 * submission is cancelled when the user declines. Optional formAction routes
 * the submission to a specific server action; optional name/value is
 * submitted along with the form, so a single button can carry an id.
 */
export function ConfirmSubmitButton({
  message,
  className,
  title,
  formAction,
  name,
  value,
  children,
}: {
  message: string;
  className?: string;
  title?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      name={name}
      value={value}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
}
