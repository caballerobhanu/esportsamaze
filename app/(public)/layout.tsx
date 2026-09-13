import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { CookieConsent } from '@/components/cookie-consent';
import { isAdmin } from '@/lib/admin-auth';
import { getMaintenanceSettings } from '@/lib/site-settings';
import { MaintenanceView } from '@/components/maintenance/maintenance-view';
import { AdminMaintenanceBanner } from '@/components/maintenance/admin-banner';

export const dynamic = 'force-dynamic';

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
  // Public visitors see the maintenance screen without site chrome.
  if (maintenance.enabled && !isAdministrator) {
    return <MaintenanceView settings={maintenance} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      {isAdministrator && maintenance.enabled && (
        <AdminMaintenanceBanner settings={maintenance} />
      )}
      <Navbar />
      {children}
      <Footer />
      <CookieConsent />
    </div>
  );
}
