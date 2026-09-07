import Image from 'next/image';
import { Newspaper } from 'lucide-react';

/**
 * Cover art for article cards. Local paths (/api/media/…) go through the
 * next/image optimizer; remote admin-pasted URLs render as a plain img since
 * they are not covered by next.config remotePatterns. The parent supplies a
 * relative, sized container (aspect box or fixed thumb).
 */
export function CoverImage({
  src,
  alt,
  sizes,
  priority = false,
  className = 'object-cover',
}: {
  src: string | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--ed-sand)] text-[var(--ed-stone)]">
        <Newspaper className="h-7 w-7" aria-hidden />
      </div>
    );
  }
  if (src.startsWith('/')) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} className={`h-full w-full ${className}`} />;
}
