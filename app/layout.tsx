import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'Esports Amaze | High-Performance Esports Statistics Platform',
  description:
    'Comprehensive multi-game esports tournament engine and statistics database for BGMI, Valorant, CS2, MLBB, PUBG Mobile, Free Fire, and more.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${jakarta.variable} font-sans antialiased min-h-screen bg-white dark:bg-[#060813] text-slate-900 dark:text-slate-100 transition-colors`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
