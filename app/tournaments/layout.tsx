import { Inter_Tight } from 'next/font/google';

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-display',
});

export default function TournamentsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`${interTight.variable} min-h-screen bg-(--ed-canvas) text-(--ed-ink) antialiased`}
    >
      {children}
    </div>
  );
}
