import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, Images } from 'lucide-react';
import type { MediaAsset } from '@prisma/client';
import prisma from '@/lib/prisma';
import { isAdmin } from '@/lib/admin-auth';
import { countReferences } from '@/lib/media-usage';
import { publicUrlForFilename } from '@/lib/media-url';
import { deleteMedia } from '../actions';
import { ConfirmSubmitButton } from '@/components/admin/media-actions';

export const dynamic = 'force-dynamic';

const MAX_GROUPS = 50;
const MISSING_HASH_HINT = 'npm run media:backfill-hashes';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface DuplicateGroup {
  key: string;
  /** Confirmed means the files are byte-identical; otherwise it is only a size/type hint. */
  confirmed: boolean;
  assets: MediaAsset[];
}

export default async function MediaDuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; inuse?: string }>;
}) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { deleted, inuse } = await searchParams;

  const duplicateHashes = (
    await prisma.mediaAsset.groupBy({
      by: ['contentHash'],
      where: { contentHash: { not: null } },
      _count: { _all: true },
      having: { contentHash: { _count: { gt: 1 } } },
    })
  )
    .map((group) => group.contentHash)
    .filter((hash): hash is string => Boolean(hash));

  const confirmedRows = duplicateHashes.length
    ? await prisma.mediaAsset.findMany({
        where: { contentHash: { in: duplicateHashes } },
        orderBy: [{ contentHash: 'asc' }, { createdAt: 'asc' }],
      })
    : [];

  const confirmedGroups: DuplicateGroup[] = [];
  for (const hash of duplicateHashes) {
    const assets = confirmedRows.filter((asset) => asset.contentHash === hash);
    if (assets.length > 1) confirmedGroups.push({ key: hash, confirmed: true, assets });
  }

  // Rows with no hash cannot be compared byte-for-byte, so identical size + type is only a
  // hint — they may be the same image re-encoded, or two unrelated files that happen to
  // match. The backfill settles it.
  const unhashed = await prisma.mediaAsset.findMany({
    where: { contentHash: null },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });

  const bySizeAndType = new Map<string, MediaAsset[]>();
  for (const asset of unhashed) {
    const key = `${asset.size}:${asset.mimeType ?? 'unknown'}`;
    const bucket = bySizeAndType.get(key);
    if (bucket) bucket.push(asset);
    else bySizeAndType.set(key, [asset]);
  }

  const suspectedGroups: DuplicateGroup[] = [...bySizeAndType.entries()]
    .filter(([, assets]) => assets.length > 1)
    .map(([key, assets]) => ({ key, confirmed: false, assets }));

  const groups = [...confirmedGroups, ...suspectedGroups];
  const shownGroups = groups.slice(0, MAX_GROUPS);
  const wastedBytes = groups.reduce(
    (total, group) => total + group.assets.slice(1).reduce((sum, asset) => sum + asset.size, 0),
    0
  );

  // How many places each candidate is used — needed per asset, not per group.
  const usage = new Map<string, number>();
  await Promise.all(
    shownGroups.flatMap((group) =>
      group.assets.map(async (asset) => {
        usage.set(asset.id, await countReferences(asset.filename));
      })
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-white/10">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            <Images className="h-6 w-6 text-(--ed-blue)" />
            Duplicate Media
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {groups.length} group{groups.length === 1 ? '' : 's'} found ·{' '}
            {formatBytes(wastedBytes)} held in extra copies. Report only — nothing is deleted
            automatically.
          </p>
        </div>
        <Link
          href="/admin/media"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" /> Back to library
        </Link>
      </div>

      {deleted === '1' && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> File deleted.
        </div>
      )}
      {inuse && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-bold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" /> Can&apos;t delete — this file is still referenced
          in {inuse} place{inuse === '1' ? '' : 's'}. Point that content at the copy you are
          keeping first.
        </div>
      )}

      {unhashed.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          <AlertTriangle className="h-4 w-4" /> {unhashed.length} asset
          {unhashed.length === 1 ? '' : 's'} predate content hashing. Run{' '}
          <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono dark:bg-white/10">
            {MISSING_HASH_HINT}
          </code>{' '}
          to confirm which of them are genuinely identical.
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-[#0b1220]">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-slate-500">
            No duplicates found
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            Every stored image is unique. New uploads are matched against the library by
            content hash, so identical files resolve to the existing asset.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {shownGroups.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1220]"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-white/10">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    group.confirmed
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {group.confirmed ? 'Identical files' : 'Same size — unconfirmed'}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {group.assets.length} copies
                </span>
                <span className="ml-auto font-mono text-[10px] text-slate-400">
                  {group.confirmed ? `${group.key.slice(0, 16)}…` : group.key}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.assets.map((asset, index) => {
                  const url = publicUrlForFilename(asset.filename);
                  const usedBy = usage.get(asset.id) ?? 0;
                  const isKeepSuggestion = index === 0;
                  return (
                    <div
                      key={asset.id}
                      className={`rounded-xl border p-3 ${
                        isKeepSuggestion
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <div className="mb-2 flex h-24 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={asset.alt || asset.filename}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <div
                        className="truncate text-[11px] font-black text-slate-800 dark:text-slate-200"
                        title={asset.filename}
                      >
                        {asset.filename}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-slate-400">
                        <span>{formatBytes(asset.size)}</span>
                        <span>•</span>
                        <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                        <span
                          className={
                            usedBy > 0
                              ? 'text-(--ed-blue)'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }
                        >
                          {usedBy > 0 ? `used in ${usedBy}` : 'not referenced'}
                        </span>
                      </div>

                      <div className="mt-2">
                        {isKeepSuggestion ? (
                          <p className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Suggested keep — oldest copy
                          </p>
                        ) : (
                          <form action={deleteMedia}>
                            <input type="hidden" name="id" value={asset.id} />
                            <input type="hidden" name="returnTo" value="/admin/media/duplicates" />
                            <ConfirmSubmitButton
                              message={`Delete ${asset.filename} permanently? It is worth ${formatBytes(asset.size)}${
                                usedBy > 0 ? ` and is still referenced in ${usedBy} place(s)` : ''
                              }. This cannot be undone.`}
                              className="w-full cursor-pointer rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600 hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            >
                              Delete this copy
                            </ConfirmSubmitButton>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {groups.length > shownGroups.length && (
            <p className="text-center text-xs font-bold text-slate-400">
              Showing the first {shownGroups.length} of {groups.length} groups.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
