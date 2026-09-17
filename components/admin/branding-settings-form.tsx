'use client';

import { useState, useTransition } from 'react';
import { Image as ImageIcon, Sparkles, Trash2, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import type { BrandingSettings } from '@/lib/site-settings';
import { MediaPickButton } from '@/components/admin/media-field';

interface BrandingSettingsFormProps {
  initialSettings: BrandingSettings;
  onSaveAction: (updates: Partial<BrandingSettings>) => Promise<void>;
  onUploadFileAction: (formData: FormData, target: 'favicon' | 'ogImage') => Promise<{ success: boolean; url?: string; error?: string }>;
}

export function BrandingSettingsForm({
  initialSettings,
  onSaveAction,
  onUploadFileAction,
}: BrandingSettingsFormProps) {
  const [settings, setSettings] = useState<BrandingSettings>(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);

  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingOgImage, setUploadingOgImage] = useState(false);

  async function handleFaviconUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!faviconFile) return;

    setUploadingFavicon(true);
    setStatusMessage(null);

    const fd = new FormData();
    fd.set('file', faviconFile);

    try {
      const res = await onUploadFileAction(fd, 'favicon');
      if (res.success && res.url) {
        setSettings((prev) => ({ ...prev, faviconUrl: res.url! }));
        setFaviconFile(null);
        setStatusMessage({ type: 'success', text: 'Favicon updated successfully!' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to upload favicon.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Error uploading favicon.' });
    } finally {
      setUploadingFavicon(false);
    }
  }

  async function handleRemoveFavicon() {
    if (!confirm('Reset favicon to site default (/favicon.ico)?')) return;
    setStatusMessage(null);
    startTransition(async () => {
      try {
        await onSaveAction({ faviconUrl: null });
        setSettings((prev) => ({ ...prev, faviconUrl: null }));
        setStatusMessage({ type: 'success', text: 'Favicon reset to default (/favicon.ico).' });
      } catch {
        setStatusMessage({ type: 'error', text: 'Failed to reset favicon.' });
      }
    });
  }

  async function handleOgImageUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!ogImageFile) return;

    setUploadingOgImage(true);
    setStatusMessage(null);

    const fd = new FormData();
    fd.set('file', ogImageFile);

    try {
      const res = await onUploadFileAction(fd, 'ogImage');
      if (res.success && res.url) {
        setSettings((prev) => ({ ...prev, ogImageUrl: res.url! }));
        setOgImageFile(null);
        setStatusMessage({ type: 'success', text: 'Fallback OpenGraph image updated successfully!' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to upload social share image.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Error uploading social share image.' });
    } finally {
      setUploadingOgImage(false);
    }
  }

  async function handleRemoveOgImage() {
    if (!confirm('Remove fallback OpenGraph image? Pages without article covers will use standard text metadata.')) return;
    setStatusMessage(null);
    startTransition(async () => {
      try {
        await onSaveAction({ ogImageUrl: null });
        setSettings((prev) => ({ ...prev, ogImageUrl: null }));
        setStatusMessage({ type: 'success', text: 'Fallback OpenGraph image removed.' });
      } catch {
        setStatusMessage({ type: 'error', text: 'Failed to remove fallback image.' });
      }
    });
  }

  /** Reuse an image already in the media library rather than storing another copy. */
  async function handlePickFromLibrary(target: 'favicon' | 'ogImage', url: string) {
    setStatusMessage(null);
    try {
      await onSaveAction(target === 'favicon' ? { faviconUrl: url } : { ogImageUrl: url });
      setSettings((prev) =>
        target === 'favicon' ? { ...prev, faviconUrl: url } : { ...prev, ogImageUrl: url }
      );
      setStatusMessage({
        type: 'success',
        text:
          target === 'favicon'
            ? 'Favicon updated from the media library!'
            : 'Fallback OpenGraph image updated from the media library!',
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to save the selected image.' });
    }
  }

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── 1. FAVICON CARD ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[var(--ed-blue)]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Site Favicon
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Appears in browser tabs, bookmarks, and mobile home screen shortcuts.
            </p>

            {/* Current Favicon Preview */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 mb-5">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shadow-xs shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.faviconUrl || '/favicon.ico'}
                  alt="Site Favicon"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {settings.faviconUrl ? 'Custom Favicon Active' : 'Default (/favicon.ico)'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  {settings.faviconUrl ? settings.faviconUrl : 'Standard brand icon'}
                </p>
              </div>
            </div>

            {/* Upload form */}
            <form onSubmit={handleFaviconUpload} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Upload New Favicon (.ico, .png, .svg, .webp)
              </label>
              <input
                type="file"
                accept=".ico,.png,.svg,.webp,image/x-icon,image/png,image/svg+xml,image/webp"
                onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--ed-blue)] file:text-white hover:file:opacity-90 cursor-pointer"
              />
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!faviconFile || uploadingFavicon}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--ed-blue)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingFavicon ? 'Uploading...' : 'Upload Favicon'}
                </button>

                <MediaPickButton
                  prefix="favicon"
                  label="From library"
                  onPick={(url) => handlePickFromLibrary('favicon', url)}
                />

                {settings.faviconUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveFavicon}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold disabled:opacity-50 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset to Default
                  </button>
                )}
              </div>
            </form>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            Recommended: 64×64 PNG, ICO, or SVG for crisp display on high-DPI displays.
          </p>
        </div>

        {/* ── 2. FALLBACK OPENGRAPH CARD ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Fallback OpenGraph Image
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Shown when sharing the Home, Tournaments, Teams, or Rankings pages on WhatsApp, Discord, X, or Telegram.
            </p>

            {/* Current OG Image Preview */}
            <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 mb-5">
              <div className="relative aspect-[1200/630] bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                {settings.ogImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.ogImageUrl}
                    alt="OpenGraph Social Share Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400 dark:text-slate-600 space-y-1.5">
                    <ImageIcon className="w-8 h-8 mx-auto opacity-50" />
                    <p className="text-xs font-semibold">No custom fallback banner set</p>
                    <p className="text-[10px]">Links will share with standard text cards</p>
                  </div>
                )}
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {settings.ogImageUrl ? 'Active Fallback Banner (1200×630)' : 'Default (None)'}
                </span>
                {settings.ogImageUrl && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded">
                    Enabled
                  </span>
                )}
              </div>
            </div>

            {/* Upload form */}
            <form onSubmit={handleOgImageUpload} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Upload New Social Share Card (.png, .jpg, .webp)
              </label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                onChange={(e) => setOgImageFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:opacity-90 cursor-pointer"
              />
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!ogImageFile || uploadingOgImage}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingOgImage ? 'Uploading...' : 'Upload Share Card'}
                </button>

                <MediaPickButton
                  prefix="social-share"
                  label="From library"
                  onPick={(url) => handlePickFromLibrary('ogImage', url)}
                />

                {settings.ogImageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveOgImage}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold disabled:opacity-50 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Fallback
                  </button>
                )}
              </div>
            </form>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            Recommended: 1200×630 pixels in 1.91:1 aspect ratio under 5MB for crisp Discord and WhatsApp unfurling.
          </p>
        </div>
      </div>
    </div>
  );
}
