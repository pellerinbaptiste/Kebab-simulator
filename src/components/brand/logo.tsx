import { cn } from "@/lib/utils";

/**
 * Logo PronoLeague, charte « Clair » : trois barres montantes (une cote qui
 * grimpe) dans un carré bleu. Même dessin que src/app/icon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect width="28" height="28" rx="7" className="fill-primary" />
      <rect x="7" y="15" width="3.5" height="6" rx="1" className="fill-primary-foreground" />
      <rect x="12.25" y="11" width="3.5" height="10" rx="1" className="fill-primary-foreground" />
      <rect x="17.5" y="7" width="3.5" height="14" rx="1" className="fill-primary-foreground" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-lg font-extrabold tracking-tight", className)}>
      <LogoMark className={markClassName} />
      <span>PronoLeague</span>
    </span>
  );
}
