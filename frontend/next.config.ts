import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add this rewrites block to map clean URLs to the SPA homepage
  async rewrites() {
    return [
      { source: "/platform", destination: "/" },
      { source: "/feature", destination: "/" },
      { source: "/platform/how-it-work", destination: "/" },
      { source: "/faq", destination: "/" },
    ];
  },
};

export default nextConfig;