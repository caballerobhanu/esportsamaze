import type { Metadata } from 'next';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { CookieConsent } from '@/components/cookie-consent';
import { BackToTop } from '@/components/ui/back-to-top';
import { getMaintenanceSettings } from '@/lib/site-settings';
import { MaintenanceView } from '@/components/maintenance/maintenance-view';

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
//
// This layout reads NO cookies on purpose. It used to call isAdmin() and read
// the `ea_preview_live` cookie to give an admin a live-preview toggle — but a
// cookies() read anywhere in the tree opts the whole route out of the route
// cache, so every public URL was a full server render on each request. Under a
// crawler flood that is exactly what saturates the workers. The maintenance
// value below is cached (unstable_cache, tag SITE_SETTINGS_TAG) and toggling it
// calls revalidatePath('/', 'layout'), so the gate still flips on the next
// request without reading a cookie. The admin toggle lives in the admin panel,
// which is outside this layout.
export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const maintenance = await getMaintenanceSettings();

  // When maintenance / coming soon mode is enabled, every visitor sees the
  // placeholder without site chrome.
  if (maintenance.enabled) {
    return <MaintenanceView settings={maintenance} />;
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
