import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://lh3.googleusercontent.com",
      "font-src 'self'",
      "connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.mistral.ai https://generativelanguage.googleapis.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// The former built-in sections now live as unified seed templates at
// /sections/<slug> (nav links point there directly via SECTION_META). These
// redirects catch any old /work-style links/bookmarks. Unconditional — nav no
// longer depends on an env flag being set (the old UNIFIED_SECTIONS gate made
// every legacy link 404 in any environment that didn't set it).
const BUILTIN_SLUGS = [
  "work", "gym", "finances", "habits", "study", "hobbies", "housework",
  "health", "goals", "reading", "journal", "shopping", "mealprep",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async redirects() {
    return BUILTIN_SLUGS.map((slug) => ({
      source: `/${slug}`,
      destination: `/sections/${slug}`,
      permanent: false,
    }));
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
