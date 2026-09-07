import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { MobileTabBar } from '@/components/mobile-tab-bar';
import { CookieConsent } from '@/components/cookie-consent';

// Shared chrome for every public page. Admin routes live outside this group
// and keep their own panel layout. Bottom padding keeps the footer clear of
// the fixed mobile tab bar (app-style shell below tablet width).
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors pb-14 md:pb-0">
      <Navbar />
      {children}
      <Footer />
      <MobileTabBar />
      <CookieConsent />
    </div>
  );
}
