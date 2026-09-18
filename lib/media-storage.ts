import { writeFile, readFile, mkdir, access, unlink } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { proxyUrlForFilename, publicUrlForFilename } from '@/lib/media-url';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Optional Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;
// Optional custom domain that would serve R2 objects directly. Deliberately LEFT UNSET
// in production: with no public URL, publicUrlForFilename() returns the root-relative
// /api/media/<filename> and this app serves the bytes itself (local disk first, then R2).
// Consequently our media URLs are same-origin — do not reason about a media CDN host.
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client;
  if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
    return s3Client;
  }
  return null;
}

export function isR2Configured(): boolean {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
}

/**
 * Stores a media buffer in Cloudflare R2 when configured, otherwise local disk
 * /uploads. Returns the public URL string.
 */
export async function storeMedia(
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const client = getS3Client();
  let storedInR2 = false;

  if (client && R2_BUCKET_NAME) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: filename,
          Body: buffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      storedInR2 = true;
    } catch (err) {
      console.error('Failed to upload to Cloudflare R2, falling back to local disk:', err);
    }
  }

  // A configured public domain means R2 serves the object directly, so no local copy.
  if (storedInR2 && R2_PUBLIC_URL) {
    return publicUrlForFilename(filename);
  }

  // Otherwise keep a local copy. This is deliberate, not a fall-through: with no public
  // R2 domain the serving path is /api/media/[filename], which checks local disk before
  // R2 — so this both covers a failed put and avoids an R2 round trip per image request.
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  // The proxy URL specifically, not publicUrlForFilename: R2_PUBLIC_URL can be set while
  // this particular object never made it into the bucket.
  return proxyUrlForFilename(filename);
}

/** Removes a media object from local disk and Cloudflare R2. Never throws. */
export async function deleteMediaObject(filename: string): Promise<void> {
  const safeFilename = path.basename(filename);

  try {
    await unlink(path.join(UPLOAD_DIR, safeFilename));
  } catch {
    // Not on disk — nothing to remove.
  }

  const client = getS3Client();
  if (client && R2_BUCKET_NAME) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: safeFilename }));
    } catch (err) {
      console.error('Failed to delete from Cloudflare R2:', err);
    }
  }
}

/**
 * Reads media buffer from local disk or Cloudflare R2.
 */
export async function retrieveMedia(filename: string): Promise<Buffer | null> {
  // 1. Check local disk first
  const localPath = path.join(UPLOAD_DIR, filename);
  try {
    await access(localPath);
    return await readFile(localPath);
  } catch {
    // Not found locally, continue to check R2
  }

  // 2. Check Cloudflare R2 if configured
  const client = getS3Client();
  if (client && R2_BUCKET_NAME) {
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: filename,
        })
      );
      if (response.Body) {
        const bytes = await response.Body.transformToByteArray();
        return Buffer.from(bytes);
      }
    } catch {
      // Not found in R2
    }
  }

  return null;
}
