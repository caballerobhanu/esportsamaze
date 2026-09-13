import { writeFile, readFile, mkdir, access } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Optional Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL; // e.g. https://media.kraftonindiaesports.io

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
 * Stores media buffer either in Cloudflare R2 (if configured) or local disk /uploads.
 * Returns the public URL string.
 */
export async function storeMedia(
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const client = getS3Client();

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

      // If a public domain or R2 public dev URL is set, link directly to it
      if (R2_PUBLIC_URL) {
        const baseUrl = R2_PUBLIC_URL.replace(/\/+$/, '');
        return `${baseUrl}/${filename}`;
      }
    } catch (err) {
      console.error('Failed to upload to Cloudflare R2, falling back to local disk:', err);
    }
  }

  // Local disk fallback
  await mkdir(UPLOAD_DIR, { recursive: true });
  const localPath = path.join(UPLOAD_DIR, filename);
  await writeFile(localPath, buffer);

  return `/api/media/${filename}`;
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
