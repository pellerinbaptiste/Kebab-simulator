import { cn } from "@/lib/utils";

/**
 * Logo PronoLeague, charte « Nuit » : une cote qui monte, tracée en creux
 * dans un disque bleu. Même dessin que src/app/icon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn("size-7 shrink-0", className)}>
      <circle cx="14" cy="14" r="14" className="fill-primary" />
      <path
        d="M7 18l5-5 3 3 6-6"
        fill="none"
        className="stroke-background"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
