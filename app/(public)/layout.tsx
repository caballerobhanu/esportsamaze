import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

// Shared chrome for every public page. Admin routes live outside this group
// and keep their own panel layout.
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--ed-canvas)] text-[var(--ed-ink)] transition-colors">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
