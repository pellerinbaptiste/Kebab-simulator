import { BadgeCheck, Crown, Eye, Gem, Star, type LucideIcon } from "lucide-react";

/**
 * Rendu des objets cosmétiques de la boutique (valeurs de shop_items.value).
 * Une valeur inconnue est simplement ignorée à l'affichage.
 */

/** Couleurs de pseudo (classes CSS, voir aussi .pl-rainbow dans globals.css). */
export const NAME_COLOR_CLASSES: Record<string, string> = {
  gold: "font-black text-amber-500 dark:text-amber-400",
  neon: "font-black bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 bg-clip-text text-transparent",
  ruby: "font-black text-rose-600 dark:text-rose-400",
  ocean: "font-black bg-gradient-to-r from-sky-400 to-blue-700 bg-clip-text text-transparent dark:to-blue-400",
  emerald: "font-black text-emerald-600 dark:text-emerald-400",
  rainbow: "font-black pl-rainbow",
};

/** Cadres d'avatar (voir .pl-frame-* dans globals.css). */
export const AVATAR_FRAME_CLASSES: Record<string, string> = {
  gold: "ring-2 ring-amber-400 ring-offset-2 ring-offset-background",
  flame: "pl-frame-flame",
  galaxy: "pl-frame-galaxy",
};

/** Badges affichés à côté du pseudo. */
export const BADGES: Record<string, { icon: LucideIcon; className: string; label: string }> = {
  supporter: { icon: BadgeCheck, className: "fill-rose-500/15 text-rose-500", label: "Supporter" },
  crown: { icon: Crown, className: "fill-amber-400/30 text-amber-500", label: "Couronne" },
  seer: { icon: Eye, className: "text-violet-500", label: "Voyant" },
  founder: { icon: Gem, className: "fill-cyan-400/20 text-cyan-500", label: "Fondateur" },
  club: { icon: Star, className: "fill-amber-400 text-amber-500", label: "Club" },
};

export function isClubActive(clubUntil: string | null | undefined, now = Date.now()) {
  return Boolean(clubUntil && Date.parse(clubUntil) > now);
}
