import { cn } from "@/lib/utils";

/**
 * Logo PronoLeague, charte « Terrain » : un terrain vu du dessus (ligne
 * médiane et rond central à la craie) et le ballon jaune du tableau
 * d'affichage. Même dessin que src/app/icon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect x="1.5" y="1.5" width="29" height="29" rx="7" className="fill-card stroke-foreground" strokeWidth="2" />
      <line x1="16" y1="1.5" x2="16" y2="30.5" className="stroke-foreground" strokeWidth="2" />
      <circle cx="16" cy="16" r="5.5" fill="none" className="stroke-foreground" strokeWidth="2" />
      <circle cx="22.5" cy="11" r="3.2" className="fill-primary" />
    </svg>
  );
}

/** Logo complet : terrain + nom en capitales condensées, « League » en jaune. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl leading-none tracking-[0.03em] uppercase", className)}>
      <LogoMark className={markClassName} />
      <span>
        Prono<span className="text-primary">League</span>
      </span>
    </span>
  );
}
