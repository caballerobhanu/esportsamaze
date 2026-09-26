import type { NextConfig } from "next";

/**
 * AdSense-safe Content Security Policy.
 *
 * Google only *supports* nonce-based strict CSP for the ad code, and warns that an
 * allowlist "may break without notice" as its hosts change — which is how ads got
 * blocked here once before: the browser refused `adsbygoogle.js` and every unit
 * stayed empty. Rather than chase host lists (and risk blocking the consent CMP
 * Google serves from `fundingchoicesmessages.google.com`), this policy allows any
 * HTTPS origin for the resource types ads use — scripts, frames, styles, fonts,
 * images, media and connections — and keeps only the directives that cannot affect
 * ad serving. Net effect: nothing on this site can block AdSense or its creatives.
 */
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https:;
  style-src 'self' 'unsafe-inline' https:;
  font-src 'self' data: https:;
  img-src 'self' data: blob: https:;
  media-src 'self' data: blob: https:;
  frame-src 'self' https:;
  connect-src 'self' https:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    // No `browsing-topics`: denying the Topics API opts this site out of
    // interest-based advertising, which is a self-inflicted block on revenue.
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Dev-only: allow phones/other devices on the LAN to load dev assets when
  // browsing this machine by IP (http://192.168.1.39:3000). Without this,
  // Next blocks cross-origin /_next/ requests — pages render but no client
  // component hydrates (dropdowns, theme toggle, filters all appear dead).
  // Update the IP if the machine's DHCP address changes. Production
  // (`next start`) is unaffected by this setting.
  allowedDevOrigins: ["192.168.1.39"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "commons.wikimedia.org" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  /**
   * Game-scoped routes replaced the flat ones. Every section moved under the
   * default game (`/bgmi/...`), so the old URL for each is a permanent redirect.
   * Targets are hardcoded — dynamic prefixes are not supported here.
   */
  async redirects() {
    const game = (process.env.NEXT_PUBLIC_DEFAULT_GAME_SLUG || "bgmi").trim();
    const sections = ["tournaments", "teams", "players", "rankings"];
    return sections.map((section) => ({
      source: `/${section}`,
      destination: `/${game}/${section}`,
      permanent: true,
    })).concat(
      sections.map((section) => ({
        source: `/${section}/:path*`,
        destination: `/${game}/${section}/:path*`,
        permanent: true,
      })),
      // Compare moved under the game too.
      { source: `/compare`, destination: `/${game}/compare`, permanent: true }
    );
  },
};

export default nextConfig;
// Server config updated: 2026-09-11
