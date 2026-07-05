import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdfkit"],
  eslint: {
    // le lint tourne en commande dédiée (npm run lint) — pas pendant le build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // le typecheck tourne en commande dédiée (npm run typecheck)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
