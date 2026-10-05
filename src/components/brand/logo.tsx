import { cn } from "@/lib/utils";

/**
 * Logo PronoLeague : une jauge de probabilité (aiguille sur un demi-cercle)
 * dans un carré bleu. Même dessin que src/app/icon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M8 21 A8 8 0 0 1 24 21" fill="none" stroke="white" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      <path d="M8 21 A8 8 0 0 1 21.66 15.34" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="16" y1="21" x2="20.5" y2="14.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="21" r="2.2" fill="white" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight", className)}>
      <LogoMark className={markClassName} />
      <span>PronoLeague</span>
    </span>
  );
}
