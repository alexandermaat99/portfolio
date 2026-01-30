import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Run as standalone app; don't use parent's middleware (Supabase)
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
