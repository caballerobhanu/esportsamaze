'use client';

import React, { useState } from 'react';
import { Images } from 'lucide-react';
import { MediaPickerDialog } from '@/components/admin/media-picker-dialog';

const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

const defaultInputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-(--ed-blue)';

const fileCls =
  'w-full text-xs text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-xs file:font-bold file:cursor-pointer hover:file:bg-slate-200 dark:hover:file:bg-slate-700';

const triggerCls =
  'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-black uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';

/**
 * A "Library" button that opens the media picker and hands the chosen URL back to the
 * caller. Use this where the value lives in React state rather than a form field —
 * `MediaField` is the form-field counterpart.
 */
export function MediaPickButton({
  onPick,
  prefix = 'library',
  label = 'Library',
  title = 'Pick an existing image from the media library',
}: {
  onPick: (url: string, alt: string) => void;
  prefix?: string;
  label?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={title} className={triggerCls}>
        <Images className="h-3.5 w-3.5" />
        {label}
      </button>

      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onPick={(url, alt) => {
          onPick(url, alt);
          setOpen(false);
        }}
        prefix={prefix}
      />
    </>
  );
}

interface MediaFieldProps {
  /** Form field name holding the URL, e.g. 'logoUrl'. Read by the existing server action. */
  name: string;
  /** Form field name for a fresh upload, e.g. 'logoFile'. The upload takes precedence. */
  fileField?: string;
  label?: string;
  defaultValue?: string;
  /** Controls the sharp resize for uploads from this field, e.g. 'team-logo'. */
  prefix: string;
  inputClassName?: string;
  accept?: string;
  hint?: string;
}

/**
 * An image URL field with three ways in: type/paste a URL, pick from the media library,
 * or upload a new file. Submits the URL under `name` and the optional upload under
 * `fileField`, so it drops into the existing `<form action={serverAction}>` markup —
 * those actions already resolve `upload ?? typed URL ?? existing`.
 */
export function MediaField({
  name,
  fileField,
  label,
  defaultValue,
  prefix,
  inputClassName,
  accept = DEFAULT_ACCEPT,
  hint,
}: MediaFieldProps) {
  const [value, setValue] = useState(defaultValue ?? '');

  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}

      <div className="flex items-center gap-2">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="URL, or pick from the library…"
          className={inputClassName ?? defaultInputCls}
        />

        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-9 w-9 shrink-0 rounded-md border border-slate-200 bg-slate-50 object-contain p-0.5 dark:border-slate-700 dark:bg-slate-900"
          />
        )}

        <MediaPickButton prefix={prefix} onPick={(url) => setValue(url)} />
      </div>

      {fileField && (
        <>
          <label className={labelCls + ' mt-2'}>…or Upload Image</label>
          <input type="file" name={fileField} accept={accept} className={fileCls} />
        </>
      )}

      {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}
