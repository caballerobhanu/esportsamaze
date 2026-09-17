import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { saveUploadedFile } from '@/lib/upload';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fd = await req.formData();
  const rawPrefix = fd.get('prefix');
  const rawAlt = fd.get('alt');

  // The prefix selects the sharp resize, so the caller must supply the one matching the
  // field being filled (e.g. 'team-logo' -> 512², 'news' -> 1920x1080).
  const url = await saveUploadedFile(
    fd.get('file'),
    typeof rawPrefix === 'string' && rawPrefix ? rawPrefix : 'library',
    typeof rawAlt === 'string' ? rawAlt : null
  );

  if (!url) {
    return NextResponse.json(
      { error: 'Invalid or missing image (png/jpg/webp/gif/svg, max 5MB).' },
      { status: 400 }
    );
  }
  return NextResponse.json({ url });
}
