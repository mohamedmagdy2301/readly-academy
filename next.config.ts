import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `npm run build` produces a plain static site in /out
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
