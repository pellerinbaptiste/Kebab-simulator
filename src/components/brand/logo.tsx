import { cn } from "@/lib/utils";

/**
 * Logo PronoLeague, charte « La Une » : un « P » de manchette en réserve dans
 * un pavé d'encre, avec le carré rouge du point final. Même dessin que
 * src/app/icon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" className="fill-ink" />
      <path
        d="M9 25V7h8.2c4 0 6.6 2.3 6.6 5.9s-2.6 5.9-6.6 5.9h-3.6V25z M13.6 14.9h3.2c1.5 0 2.4-.8 2.4-2s-.9-2-2.4-2h-3.2z"
        className="fill-background"
        fillRule="evenodd"
      />
      <rect x="21" y="21" width="5" height="5" className="fill-red" />
    </svg>
  );
}

/** Logo complet : pavé + nom en capitales condensées, « League » en rouge. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-xl leading-none tracking-[0.02em] uppercase", className)}>
      <LogoMark className={markClassName} />
      <span>
        Prono<span className="text-red">League</span>
      </span>
    </span>
  );
}
