import type { Metadata } from 'next';
import { NotFoundPoster } from '@/components/not-found-poster';

export const metadata: Metadata = {
  title: 'Page Not Found — eSportsAmaze',
  // notFound() currently renders with HTTP 200 (a loading.tsx boundary streams
  // the shell first), so keep a 200 soft-404 out of the index too.
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundPoster />;
}
