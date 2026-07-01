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

// The 13 former built-in sections now exist as unified seed templates at
// /sections/<slug>. When UNIFIED_SECTIONS=1 (set only after the data migration
// has run and the unified renderer is at parity), the legacy routes redirect to
// the unified ones. Off by default so existing users keep their rich pages.
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
    if (process.env.UNIFIED_SECTIONS !== "1") return [];
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
