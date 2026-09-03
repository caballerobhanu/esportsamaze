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
  // Runs before first paint: resolves stored/system theme and sets the class
  // on <html> so dark-mode users never see a white flash. Keep the storage key
  // and default in sync with components/theme-provider.tsx.
  const themeInitScript = `(function(){try{var t=localStorage.getItem('theme')||'light';if(t==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t;}catch(e){}})();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${jakarta.variable} font-sans antialiased min-h-screen transition-colors`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      </body>
    </html>
  );
}
