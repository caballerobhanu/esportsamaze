import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import { saveUploadedFile } from '@/lib/upload';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fd = await req.formData();
  const url = await saveUploadedFile(fd.get('file'), 'news');
  if (!url) {
    return NextResponse.json(
      { error: 'Invalid or missing image (png/jpg/webp/gif/svg, max 5MB).' },
      { status: 400 }
    );
  }
  return NextResponse.json({ url });
}
