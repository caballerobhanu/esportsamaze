import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { CookieConsent } from '@/components/cookie-consent';
import { BackToTop } from '@/components/ui/back-to-top';
import { isAdmin } from '@/lib/admin-auth';
import { getMaintenanceSettings } from '@/lib/site-settings';
import { MaintenanceView } from '@/components/maintenance/maintenance-view';
import { AdminMaintenanceBanner } from '@/components/maintenance/admin-banner';

export const dynamic = 'force-dynamic';

/*
 * While the gate is up, every public route serves the placeholder — so none of
 * them may be indexed. This lives in the layout because the layout is what
 * applies the gate: one directive covers the whole subtree, and the root
 * layout's index/follow stands whenever the gate is down.
 *
 * Without this, a maintenance window silently replaces the content of every
 * indexed URL with a "coming soon" page that then gets indexed in its place.
 */
export async function generateMetadata(): Promise<Metadata> {
  const maintenance = await getMaintenanceSettings();
  if (!maintenance.enabled) return {};
  return { robots: { index: false, follow: false } };
}

// Shared chrome for every public page. Admin routes live outside this group
// and keep their own panel layout.
export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAdministrator = await isAdmin();
  const maintenance = await getMaintenanceSettings();

  // When maintenance / coming soon mode is enabled:
  if (maintenance.enabled) {
    // 1. Regular public visitors see the maintenance screen without site chrome
    if (!isAdministrator) {
      return <MaintenanceView settings={maintenance} />;
    }

    // 2. Administrators: check if they explicitly toggled live preview mode
    const cookieStore = await cookies();
    const previewLive = cookieStore.get('ea_preview_live')?.value === '1';

    // If admin is previewing live site, show live site with top warning banner
    if (previewLive) {
      return (
        <div className="min-h-screen flex flex-col bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
          <AdminMaintenanceBanner settings={maintenance} onMaintenancePage={false} />
          <Navbar />
          {children}
          <Footer />
          <CookieConsent />
          <BackToTop />
        </div>
      );
    }

    // Otherwise by default, admin sees the exact maintenance screen with an admin control bar
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <AdminMaintenanceBanner settings={maintenance} onMaintenancePage={true} />
        <MaintenanceView settings={maintenance} />
      </div>
    );
  }

  // Normal live site when maintenance is disabled
  return (
    <div className="min-h-screen flex flex-col bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      <Navbar />
      {children}
      <Footer />
      <CookieConsent />
      <BackToTop />
    </div>
  );
}
