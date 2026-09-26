import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { isAdmin } from '@/lib/admin-auth';
import { getMaintenanceSettings } from '@/lib/site-settings';
import { MaintenanceView } from '@/components/maintenance/maintenance-view';
import { AdminMaintenanceBanner } from '@/components/maintenance/admin-banner';
import { NotFoundPoster } from '@/components/not-found-poster';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Page Not Found — eSportsAmaze',
  // notFound() currently renders with HTTP 200: a loading.tsx boundary streams
  // the shell before the page resolves, so the status is already committed. A
  // 200 soft-404 must therefore not be indexable either.
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const isAdministrator = await isAdmin();
  const maintenance = await getMaintenanceSettings();

  // If maintenance mode is active:
  if (maintenance.enabled) {
    if (!isAdministrator) {
      return <MaintenanceView settings={maintenance} />;
    }

    return (
      <div className="min-h-screen flex flex-col bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
        <AdminMaintenanceBanner settings={maintenance} onMaintenancePage={false} />
        <Navbar />
        <NotFoundPoster />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      <Navbar />
      <NotFoundPoster />
      <Footer />
    </div>
  );
}
