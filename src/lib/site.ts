import { BASE_PATH } from "@/lib/paths";

/**
 * Adresse publique du site (liens de partage, sitemap, aperçus sur les réseaux).
 * Sur Vercel, l'adresse de production est fournie automatiquement ; sinon on
 * peut la fixer avec NEXT_PUBLIC_SITE_URL.
 */
const origin =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://mvppronos.vercel.app");

export const SITE_URL = `${origin.replace(/\/$/, "")}${BASE_PATH}`;
