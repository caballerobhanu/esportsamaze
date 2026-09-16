import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { organizationJsonLd, websiteJsonLd, serializeJsonLd, baseUrl, SITE_NAME, SITE_SLOGAN } from '@/lib/seo';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

// AdSense only loads when a publisher client is configured.
const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

import { getBrandingSettings } from '@/lib/site-settings';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  const siteUrl = baseUrl();
  const favicon = branding.faviconUrl || '/favicon.ico';

  return {
    metadataBase: new URL(siteUrl),
    title: `${SITE_NAME} | BGMI Points Table, Live Standings & Stats`,
    description: `${SITE_SLOGAN} BGMI points tables, live standings, match results and player stats — updated minutes after every match.`,
    icons: {
      icon: [{ url: favicon }],
      shortcut: [favicon],
      apple: [{ url: favicon }],
    },
    alternates: {
      types: { 'application/rss+xml': '/rss.xml' },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      ...(branding.ogImageUrl
        ? {
            images: [
              {
                url: branding.ogImageUrl,
                width: 1200,
                height: 630,
                alt: `eSportsAmaze — ${SITE_SLOGAN}`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      ...(branding.ogImageUrl ? { images: [branding.ogImageUrl] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: '#2452c2',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
  const siteJsonLd = serializeJsonLd([organizationJsonLd(), websiteJsonLd()]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${jakarta.variable} font-sans antialiased min-h-screen transition-colors`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLd }} />
        {adsenseClient && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      </body>
    </html>
  );
}
