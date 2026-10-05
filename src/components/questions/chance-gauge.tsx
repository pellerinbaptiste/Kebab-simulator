import { cn } from "@/lib/utils";

/** Probabilité de la réponse principale : gros pourcentage + « de chance ». */
export function ChanceGauge({ pct, label, className }: { pct: number; label: string; className?: string }) {
  const value = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn("flex shrink-0 flex-col items-end text-right", className)} role="img" aria-label={`${value} % ${label}`}>
      <span className="text-[22px] leading-none font-extrabold tabular-nums">{value} %</span>
      <span className="mt-1 text-[11px] leading-none text-muted-foreground">{label}</span>
    </div>
  );
}
