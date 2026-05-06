import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
  async redirects() {
    return [
      {
        source: "/about",
        destination: "/hackathons",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/:path*",
        destination: "/api/well-known/:path*",
      },
    ];
  },
};

export default nextConfig;
