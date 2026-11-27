import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.1.15", "172.26.160.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.join(__dirname), // جديد: جذر المشروع = مجلد livedz
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;