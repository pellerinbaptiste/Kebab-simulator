import { AVATAR_FRAME_CLASSES, BADGES, NAME_COLOR_CLASSES } from "@/lib/cosmetics";
import { cn } from "@/lib/utils";

/** Pseudo avec la couleur et le badge équipés (objets de la boutique). */
export function PlayerName({
  name,
  color,
  badge,
  className,
}: {
  name: string;
  color?: string | null;
  badge?: string | null;
  className?: string;
}) {
  const b = badge ? BADGES[badge] : undefined;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span className={cn("truncate", color && NAME_COLOR_CLASSES[color])}>{name}</span>
      {b && <b.icon aria-label={b.label} className={cn("size-4 shrink-0", b.className)} />}
    </span>
  );
}

/** Avatar (initiales sur une couleur stable dérivée du pseudo) avec le cadre équipé. */
export function PlayerAvatar({
  name,
  frame,
  size = "md",
  highlight,
  className,
}: {
  name: string;
  frame?: string | null;
  size?: "sm" | "md" | "lg";
  /** Anneau « c'est moi » (ignoré si un cadre est équipé) */
  highlight?: boolean;
  className?: string;
}) {
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const frameClass = frame ? AVATAR_FRAME_CLASSES[frame] : undefined;
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full font-bold text-white uppercase",
        size === "lg" ? "size-14 text-lg" : size === "sm" ? "size-8 text-xs" : "size-9 text-xs",
        frameClass ?? (highlight && "ring-2 ring-primary ring-offset-2 ring-offset-background"),
        className,
      )}
    >
      <span
        className="relative z-10 grid size-full place-items-center rounded-full"
        style={{ background: `oklch(0.62 0.16 ${hue})` }}
      >
        {name.slice(0, 2)}
      </span>
    </span>
  );
}
