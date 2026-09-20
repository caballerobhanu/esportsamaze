import { indexNowKey } from '@/lib/indexnow';

export const dynamic = 'force-static';

/** Hosts the IndexNow key so api.indexnow.org can verify domain ownership. */
export function GET() {
  return new Response(`${indexNowKey()}\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
