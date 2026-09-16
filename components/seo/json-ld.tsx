import { serializeJsonLd } from '@/lib/seo';

/**
 * Emits one JSON-LD block. Pass several payloads to emit them as a single
 * `@graph`-style array; nullish entries (builders that decline to describe a
 * page they have no data for) are dropped rather than rendered as `null`.
 */
export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const payload = (Array.isArray(data) ? data : [data]).filter(
    (entry) => entry !== null && entry !== undefined
  );
  if (payload.length === 0) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(payload) }}
    />
  );
}
