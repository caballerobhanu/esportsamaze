import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import crypto from 'crypto';
import prisma from '../lib/prisma';
import { retrieveMedia } from '../lib/media-storage';

/**
 * Backfills MediaAsset.contentHash for rows created before uploads were content-addressed.
 *
 * Without a hash an asset cannot be recognised as a duplicate, so the media library will
 * happily store a second copy of a file it already holds. Safe to re-run: it only looks
 * at rows that have no hash yet.
 */
async function main() {
  console.log('🔑 Media Content Hash Backfill');
  console.log('==============================');

  const pending = await prisma.mediaAsset.findMany({
    where: { contentHash: null },
    select: { id: true, filename: true },
    orderBy: { createdAt: 'asc' },
  });

  if (pending.length === 0) {
    console.log('✅ Every asset already has a content hash. Nothing to do.');
    return;
  }

  console.log(`📦 ${pending.length} asset(s) without a content hash`);
  console.log('------------------------------');

  let hashed = 0;
  let missing = 0;

  for (let i = 0; i < pending.length; i++) {
    const { id, filename } = pending[i];
    const prefix = `[${i + 1}/${pending.length}]`;

    // Reads local disk first, then R2, so this works for an R2-only deployment.
    const buffer = await retrieveMedia(filename);
    if (!buffer) {
      console.log(`${prefix} ⚠️  Not found on disk or in R2, skipped: ${filename}`);
      missing += 1;
      continue;
    }

    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    await prisma.mediaAsset.update({ where: { id }, data: { contentHash } });
    hashed += 1;
    console.log(`${prefix} ✅ ${filename}`);
  }

  console.log('==============================');
  console.log(`🎉 Done. Hashed ${hashed}, missing files ${missing}.`);
  console.log('👉 Review identical files on /admin/media/duplicates before deleting anything.');
}

main().catch((e) => {
  console.error('Fatal error during backfill:', e);
  process.exit(1);
});
