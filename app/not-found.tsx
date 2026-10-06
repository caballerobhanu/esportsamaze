import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { getMaintenanceSettings } from '@/lib/site-settings';
import { MaintenanceView } from '@/components/maintenance/maintenance-view';
import { NotFoundPoster } from '@/components/not-found-poster';

/*
 * This file is the root segment's not-found boundary, so it is part of EVERY
 * route's render tree — not just the 404 route. It therefore must not read
 * cookies (via isAdmin() or AdminMaintenanceBanner), because a cookies() call
 * reachable from the root segment opts every route in the app out of static/ISR
 * rendering. The gate below is driven only by the cached settings value; the
 * admin toggle lives in the admin panel.
 */
export const metadata: Metadata = {
  title: 'Page Not Found — eSportsAmaze',
  // notFound() currently renders with HTTP 200: a loading.tsx boundary streams
  // the shell before the page resolves, so the status is already committed. A
  // 200 soft-404 must therefore not be indexable either.
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const maintenance = await getMaintenanceSettings();

  // If maintenance mode is active, the placeholder replaces the 404 for everyone.
  if (maintenance.enabled) {
    return <MaintenanceView settings={maintenance} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      <Navbar />
      <NotFoundPoster />
      <Footer />
    </div>
  );
}
