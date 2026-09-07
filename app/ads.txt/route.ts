/**
 * ads.txt must live at the domain root for Google AdSense verification.
 * The record is generated from NEXT_PUBLIC_ADSENSE_CLIENT so deployments
 * without a publisher ID serve only a comment.
 */
export const dynamic = 'force-static';

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const body = client
    ? `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`
    : '# Add NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-XXXXXXXXXXXXXXXX) to the environment\n# to publish the google.com ads.txt record.\n';

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
