import { BadgeCheck } from "lucide-react";

import type { NameColor } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Styles des couleurs de pseudo vendues dans la boutique. */
export const NAME_COLOR_CLASSES: Record<NameColor, string> = {
  gold: "font-black text-amber-500 dark:text-amber-400",
  neon: "font-black bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 bg-clip-text text-transparent",
};

/** Pseudo avec la couleur équipée et le badge Supporter (objets de la boutique). */
export function PlayerName({
  name,
  color,
  supporter,
  className,
}: {
  name: string;
  color?: NameColor | null;
  supporter?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span className={cn("truncate", color && NAME_COLOR_CLASSES[color])}>{name}</span>
      {supporter && (
        <BadgeCheck aria-label="Supporter" className="size-4 shrink-0 fill-rose-500/15 text-rose-500" />
      )}
    </span>
  );
}
