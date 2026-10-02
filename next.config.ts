import type { NextConfig } from "next";

// Site 100 % statique (`next build` → dossier `out/`), hébergeable sur
// GitHub Pages comme sur Vercel. Sur GitHub Pages, le site vit dans un
// sous-dossier : NEXT_PUBLIC_BASE_PATH=/Kebab-simulator (voir le workflow).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
