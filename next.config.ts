import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Use portfolio as workspace root so parent's middleware.ts isn't loaded
    root: process.cwd(),
  },
};

export default nextConfig;
