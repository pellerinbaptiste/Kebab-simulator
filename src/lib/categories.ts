import type { Category } from "@/lib/types";

export const CATEGORY_STYLES: Record<Category, { emoji: string; className: string }> = {
  "Macroéconomie": { emoji: "📈", className: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  "Droit public": { emoji: "⚖️", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  Sport: { emoji: "⚽", className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  "Pop culture": { emoji: "🎬", className: "bg-pink-500/12 text-pink-700 dark:text-pink-300" },
  Absurde: { emoji: "🐕", className: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
};
