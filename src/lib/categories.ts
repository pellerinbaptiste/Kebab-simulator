import { Clapperboard, Cpu, Landmark, Medal, Scale, Squirrel, TrendingUp, type LucideIcon } from "lucide-react";

import type { Category } from "@/lib/types";

// Puces de catégorie neutres : l'icône suffit à les distinguer.

export const CATEGORY_STYLES: Record<Category, { icon: LucideIcon; className: string }> = {
  "Monde & politique": { icon: Landmark, className: "bg-muted text-muted-foreground" },
  "Macroéconomie": { icon: TrendingUp, className: "bg-muted text-muted-foreground" },
  "Droit public": { icon: Scale, className: "bg-muted text-muted-foreground" },
  Sport: { icon: Medal, className: "bg-muted text-muted-foreground" },
  "Pop culture": { icon: Clapperboard, className: "bg-muted text-muted-foreground" },
  "Tech & crypto": { icon: Cpu, className: "bg-muted text-muted-foreground" },
  Absurde: { icon: Squirrel, className: "bg-muted text-muted-foreground" },
};
