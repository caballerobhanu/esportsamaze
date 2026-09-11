import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.instagram.com https://platform.twitter.com https://*.twimg.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https:;
  media-src 'self' https: data:;
  frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://www.instagram.com https://instagram.com https://platform.twitter.com https://twitter.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  connect-src 'self' https:;
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
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
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
};

export default nextConfig;
// Server config updated: 2026-09-11
