import { Clapperboard, Cpu, Landmark, Medal, Scale, Squirrel, TrendingUp, type LucideIcon } from "lucide-react";

import type { Category } from "@/lib/types";

export const CATEGORY_STYLES: Record<Category, { icon: LucideIcon; className: string }> = {
  "Monde & politique": { icon: Landmark, className: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300" },
  "Macroéconomie": { icon: TrendingUp, className: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  "Droit public": { icon: Scale, className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  Sport: { icon: Medal, className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  "Pop culture": { icon: Clapperboard, className: "bg-pink-500/12 text-pink-700 dark:text-pink-300" },
  "Tech & crypto": { icon: Cpu, className: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300" },
  Absurde: { icon: Squirrel, className: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
};
