import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

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
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Prevent path traversal
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return NextResponse.json({ success: false, error: 'Invalid file name' }, { status: 400 });
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    return NextResponse.json({ success: false, error: 'Unsupported type' }, { status: 400 });
  }

  try {
    const file = await readFile(path.join(UPLOAD_DIR, filename));
    const headers: Record<string, string> = {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    };
    if (ext === 'svg') {
      // SVG can carry scripts: force download on direct navigation (embedded
      // <img> usage is unaffected) and sandbox the document if ever rendered.
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
      headers['Content-Security-Policy'] = "sandbox; default-src 'none'; style-src 'unsafe-inline'";
    }
    return new NextResponse(new Uint8Array(file), { headers });
  } catch {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
}
