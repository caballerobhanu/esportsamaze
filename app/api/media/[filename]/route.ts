import path from 'path';
import { NextResponse } from 'next/server';
import { isForeignReferer } from '@/lib/anti-scrape';
import { retrieveMedia } from '@/lib/media-storage';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  // Hotlink protection: allow direct access & same-origin; block cross-site embeds
  if (isForeignReferer(request)) {
    return new NextResponse('Forbidden: Cross-site hotlinking is forbidden', { status: 403 });
  }

  const { filename } = await params;

  // Prevent path traversal
  const resolvedUploadDir = path.resolve(UPLOAD_DIR);
  const safeFilename = path.basename(filename);
  if (
    safeFilename !== filename ||
    filename.includes('..') ||
    filename.startsWith('.') ||
    !/^[a-zA-Z0-9._-]+$/.test(filename)
  ) {
    return NextResponse.json({ success: false, error: 'Invalid file name' }, { status: 400 });
  }

  const filePath = path.resolve(resolvedUploadDir, safeFilename);
  if (!filePath.startsWith(resolvedUploadDir + path.sep)) {
    return NextResponse.json({ success: false, error: 'Invalid file path' }, { status: 400 });
  }

  const ext = safeFilename.split('.').pop()?.toLowerCase() ?? '';
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    return NextResponse.json({ success: false, error: 'Unsupported type' }, { status: 400 });
  }

  try {
    const file = await retrieveMedia(safeFilename);
    if (!file) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const headers: Record<string, string> = {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    };
    if (ext === 'svg') {
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
      headers['Content-Security-Policy'] = "sandbox; default-src 'none'; style-src 'unsafe-inline'";
    }
    return new NextResponse(new Uint8Array(file), { headers });
  } catch {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
}
