import Link from 'next/link';
import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { isAdmin } from '@/lib/admin-auth';
import { getMaintenanceSettings } from '@/lib/site-settings';
import { MaintenanceView } from '@/components/maintenance/maintenance-view';
import { AdminMaintenanceBanner } from '@/components/maintenance/admin-banner';

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
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="ed-card w-full max-w-xl p-8 sm:p-12 text-center space-y-4">
            <span className="ed-chip text-[var(--ed-blue)] font-semibold">Error 404</span>
            <h1 className="font-display text-4xl sm:text-5xl font-medium tracking-tight">
              Page not found
            </h1>
            <p className="text-sm text-[var(--ed-stone)] max-w-md mx-auto leading-relaxed">
              The page you are looking for doesn&apos;t exist, may have been renamed, or is
              temporarily unavailable.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
              <Link href="/" className="ed-btn">
                Back to Home
              </Link>
              <Link
                href="/tournaments"
                className="text-sm font-semibold text-[var(--ed-blue)] hover:underline"
              >
                Browse Tournaments
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="ed-card w-full max-w-xl p-8 sm:p-12 text-center space-y-4">
          <span className="ed-chip text-[var(--ed-blue)] font-semibold">Error 404</span>
          <h1 className="font-display text-4xl sm:text-5xl font-medium tracking-tight">
            Page not found
          </h1>
          <p className="text-sm text-[var(--ed-stone)] max-w-md mx-auto leading-relaxed">
            The page you are looking for doesn&apos;t exist, may have been renamed, or is
            temporarily unavailable.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <Link href="/" className="ed-btn">
              Back to Home
            </Link>
            <Link
              href="/tournaments"
              className="text-sm font-semibold text-[var(--ed-blue)] hover:underline"
            >
              Browse Tournaments
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

