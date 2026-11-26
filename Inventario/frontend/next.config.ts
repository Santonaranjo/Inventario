import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera .next/standalone (servidor mínimo) para la imagen de Docker. No afecta `npm run dev`.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Las pantallas son Client Components que cargan datos en el navegador (TanStack Query):
    // solo se valida "instant navigation" en segmentos que lo declaren explícitamente.
    instantInsights: { validationLevel: "manual-warning" },
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
