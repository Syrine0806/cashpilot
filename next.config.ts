import type { NextConfig } from "next";

/**
 * CashPilot shows per-user, always-fresh financial data behind authentication,
 * so every page is rendered on demand. Cache Components are deliberately
 * disabled (see README › Choix techniques).
 */
const nextConfig: NextConfig = {
  cacheComponents: false,
  experimental: {
    serverActions: {
      // Receipts (justificatifs) are limited to 5 MB; leave room for multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
