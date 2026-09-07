import Link from 'next/link';
import { redirect } from 'next/navigation';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import {
  HardDrive,
  ImagePlus,
  Images,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { deleteMedia, updateMediaAlt } from './actions';
import { CopyButton, ConfirmSubmitButton } from '@/components/admin/media-actions';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Sync the uploads directory with the MediaAsset table: register new files, drop rows for deleted files. */
async function syncMediaAssets(): Promise<void> {
  let files: string[] = [];
  try {
    files = (await readdir(UPLOAD_DIR)).filter((f) => !f.startsWith('.'));
  } catch {
    return;
  }
  const known = new Set((await prisma.mediaAsset.findMany({ select: { filename: true } })).map((a) => a.filename));

  const missingOnDisk: string[] = [];
  for (const file of known) {
    if (!files.includes(file)) missingOnDisk.push(file);
  }
  if (missingOnDisk.length > 0) {
    await prisma.mediaAsset.deleteMany({ where: { filename: { in: missingOnDisk } } });
  }

  const toAdd = files.filter((f) => !known.has(f));
  for (const file of toAdd) {
    try {
      const info = await stat(path.join(UPLOAD_DIR, file));
      const ext = file.split('.').pop()?.toLowerCase() ?? '';
      await prisma.mediaAsset.create({
        data: {
          filename: file,
          mimeType: MIME_BY_EXT[ext] ?? null,
          size: info.size,
          createdAt: info.birthtime ?? new Date(),
        },
      });
    } catch {
      /* unreadable file — skip */
    }
  }
}

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; deleted?: string; inuse?: string; altUpdated?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { q, deleted, inuse, altUpdated } = await searchParams;

  await syncMediaAssets();

  const assets = await prisma.mediaAsset.findMany({
    where: q ? { OR: [{ filename: { contains: q, mode: 'insensitive' } }, { alt: { contains: q, mode: 'insensitive' } }] } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const totalBytes = assets.reduce((acc, a) => acc + a.size, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            <Images className="h-6 w-6 text-(--ed-blue)" />
            Media Library
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {assets.length} files · {formatBytes(totalBytes)} — reusable across articles and sections.
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-(--ed-blue) px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:opacity-95"
        >
          <ImagePlus className="h-4 w-4" /> New Article
        </Link>
      </div>

      {deleted === '1' && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> File deleted.
        </div>
      )}
      {inuse && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-bold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" /> Can&apos;t delete — this file is still referenced in {inuse} place{inuse === '1' ? '' : 's'}. Remove it from that content first.
        </div>
      )}
      {altUpdated === '1' && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> Alt text updated.
        </div>
      )}

      {/* Search */}
      <form method="GET" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0b1220]">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="q"
            defaultValue={q || ''}
            placeholder="Search by filename or alt text…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-(--ed-blue) focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        <button type="submit" className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20">
          Search
        </button>
      </form>

      {/* Grid */}
      {assets.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-[#0b1220]">
          <Images className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-slate-500">No media found</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            Upload images from the article editor or the picker — they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => {
            const url = `/api/media/${asset.filename}`;
            const isRaster = asset.mimeType !== 'image/svg+xml';
            return (
              <div
                key={asset.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]"
              >
                <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-white/5">
                  {isRaster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={asset.alt || asset.filename} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <object data={url} type="image/svg+xml" className="h-full w-full p-4" aria-label={asset.filename} />
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <div className="truncate text-[11px] font-black text-slate-800 dark:text-slate-200" title={asset.filename}>
                    {asset.filename}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <span>{formatBytes(asset.size)}</span>
                    <span>•</span>
                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-(--ed-blue)">
                      <HardDrive className="h-3 w-3" /> local
                    </span>
                  </div>
                  <form action={updateMediaAlt} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={asset.id} />
                    <input
                      type="text"
                      name="alt"
                      defaultValue={asset.alt ?? ''}
                      placeholder="Alt text…"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium dark:border-white/10 dark:bg-white/5"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                    >
                      Save
                    </button>
                  </form>
                  <div className="flex items-center gap-1.5">
                    <CopyButton value={url} />
                    <form action={deleteMedia} className="flex-1">
                      <input type="hidden" name="id" value={asset.id} />
                      <ConfirmSubmitButton
                        message={`Delete ${asset.filename} permanently? This cannot be undone.`}
                        title="Delete file"
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600 hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
