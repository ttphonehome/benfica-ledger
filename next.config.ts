import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      // The site opens in Portuguese (Portugal).
      { source: "/", destination: "/pt", permanent: false },
      // Links from before the language prefix existed.
      { source: "/:season(\\d{4}-\\d{2})/:rest*", destination: "/pt/:season/:rest*", permanent: true },
    ];
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
