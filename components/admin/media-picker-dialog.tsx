'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, Search, X } from 'lucide-react';

export interface MediaAssetItem {
  id: string;
  filename: string;
  url: string;
  alt: string | null;
  mimeType: string | null;
  size: number;
  createdAt: string;
}

interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPick: (url: string, alt: string) => void;
  title?: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Admin dialog for picking an image from the media library (with inline upload).
 * Resolves via onPick(url, alt) — the caller decides where the URL goes.
 */
export function MediaPickerDialog({ open, onClose, onPick, title = 'Media library' }: MediaPickerDialogProps) {
  const [assets, setAssets] = useState<MediaAssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MediaAssetItem | null>(null);
  const [alt, setAlt] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/media');
      if (res.ok) {
        const json = (await res.json()) as { assets: MediaAssetItem[] };
        setAssets(json.assets ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the picker each time it opens is a one-shot, post-open reset
      setSelected(null);
      setAlt('');
      setQuery('');
      void load();
    }
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const json = (await res.json()) as { url?: string };
        await load();
        if (json.url) {
          setSelected({
            id: '',
            filename: json.url.split('/').pop() ?? '',
            url: json.url,
            alt: null,
            mimeType: file.type,
            size: file.size,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const filtered = assets.filter((a) =>
    query ? `${a.filename} ${a.alt ?? ''}`.toLowerCase().includes(query.toLowerCase()) : true
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0b1220]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by filename or alt text…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs font-medium dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </div>

        <div className="min-h-[200px] flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
              <ImagePlus className="h-8 w-8" />
              <p className="text-xs font-bold uppercase tracking-wider">No media yet — upload your first image</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {filtered.map((a) => {
                const isSel = selected?.url === a.url;
                return (
                  <button
                    key={a.id || a.url}
                    type="button"
                    onClick={() => setSelected(a)}
                    className={`group relative overflow-hidden rounded-xl border-2 bg-slate-100 text-left transition-colors dark:bg-white/5 ${
                      isSel
                        ? 'border-(--ed-blue)'
                        : 'border-transparent hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt={a.alt || a.filename} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    {isSel && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-(--ed-blue) text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <div className="truncate px-2 py-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {a.alt || a.filename}
                      <span className="block text-[9px] font-semibold text-slate-400">{formatBytes(a.size)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-white/10">
          <input
            type="text"
            value={selected ? alt : ''}
            onChange={(e) => setAlt(e.target.value)}
            disabled={!selected}
            placeholder={selected ? 'Alt text (accessibility & SEO)…' : 'Select an image first'}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
          />
          <button
            type="button"
            disabled={!selected}
            onClick={() => selected && onPick(selected.url, alt.trim())}
            className="rounded-lg bg-(--ed-blue) px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-white disabled:opacity-40"
          >
            Use image
          </button>
        </div>
      </div>
    </div>
  );
}
