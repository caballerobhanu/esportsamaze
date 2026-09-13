import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// MIME map for media files
const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;

async function main() {
  console.log('🚀 Cloudflare R2 Media Synchronizer');
  console.log('====================================');

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.error('❌ Missing Cloudflare R2 credentials in environment.');
    console.error('Please make sure the following variables are set in your .env:');
    console.error('  CLOUDFLARE_R2_ACCOUNT_ID');
    console.error('  CLOUDFLARE_R2_ACCESS_KEY_ID');
    console.error('  CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    console.error('  CLOUDFLARE_R2_BUCKET_NAME');
    process.exit(1);
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  const uploadsDir = path.join(process.cwd(), 'uploads');
  const files = readdirSync(uploadsDir).filter((f) => {
    return statSync(path.join(uploadsDir, f)).isFile();
  });

  console.log(`📦 Found ${files.length} local media files in /uploads`);
  console.log(`☁️ Target Cloudflare R2 Bucket: "${R2_BUCKET_NAME}"`);
  console.log('------------------------------------');

  let uploadedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.split('.').pop()?.toLowerCase() || '';
    const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
    const filePath = path.join(uploadsDir, file);
    const buffer = readFileSync(filePath);

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: file,
          Body: buffer,
          ContentType: mime,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      uploadedCount++;
      const sizeKb = (buffer.length / 1024).toFixed(1);
      console.log(`[${i + 1}/${files.length}] ✅ Uploaded: ${file} (${sizeKb} KB, ${mime})`);
    } catch (err) {
      console.error(`[${i + 1}/${files.length}] ❌ Failed: ${file}`, err);
      skippedCount++;
    }
  }

  console.log('====================================');
  console.log(`🎉 Sync Complete! Successfully uploaded ${uploadedCount} files to Cloudflare R2.`);
  if (skippedCount > 0) {
    console.log(`⚠️ ${skippedCount} files failed.`);
  }
}

main().catch((e) => {
  console.error('Fatal error during sync:', e);
  process.exit(1);
});
