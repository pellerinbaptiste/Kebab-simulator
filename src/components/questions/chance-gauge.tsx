import { cn } from "@/lib/utils";

/**
 * Probabilité de la réponse principale, affichée comme sur un tableau
 * d'affichage de stade : chiffres jaunes en mono dans un caisson sombre.
 */
export function ChanceGauge({ pct, label, className }: { pct: number; label: string; className?: string }) {
  const value = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn("flex shrink-0 flex-col items-center gap-1", className)} role="img" aria-label={`${value} % ${label}`}>
      <span className="rounded-lg bg-background px-2 py-1 font-mono text-2xl leading-none font-bold text-primary tabular-nums">
        {value}
        <span className="text-base">%</span>
      </span>
      <span className="text-[10px] leading-tight font-semibold tracking-wider text-muted-foreground uppercase">{label}</span>
    </div>
  );
}
