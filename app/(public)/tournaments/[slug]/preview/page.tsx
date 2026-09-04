import { redirect } from 'next/navigation';

interface PreviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function TournamentPreviewRedirect({ params, searchParams }: PreviewPageProps) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const query = tab ? `?tab=${encodeURIComponent(tab)}` : '';
  redirect(`/tournaments/${slug}${query}`);
}
