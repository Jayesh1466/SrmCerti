import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF generation reads the embedded .ttf fonts from public/fonts at runtime; public/ isn't
  // bundled into serverless functions by default, so trace the fonts in explicitly.
  outputFileTracingIncludes: {
    "/api/**": ["./public/fonts/**/*"],
  },
};

export default nextConfig;
