import { cn } from "@/lib/utils";

/**
 * Probabilité de la réponse principale, composée comme un chiffre de une :
 * gros nombre en capitales condensées, légende en mono, filet coloré dessous.
 */
export function ChanceGauge({ pct, label, className }: { pct: number; label: string; className?: string }) {
  const value = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn("flex w-16 shrink-0 flex-col items-end text-right", className)} role="img" aria-label={`${value} % ${label}`}>
      <span className={cn("font-display text-[34px] leading-[0.9] tabular-nums", value >= 50 ? "text-yes" : "text-red")}>
        {value}
        <span className="text-xl">%</span>
      </span>
      <span className="mt-1 h-1 w-full bg-border" aria-hidden>
        <span className={cn("block h-full", value >= 50 ? "bg-yes" : "bg-red")} style={{ width: `${value}%` }} />
      </span>
      <span className="mt-1 font-mono text-[10px] leading-tight tracking-wider text-muted-foreground uppercase">{label}</span>
    </div>
  );
}
