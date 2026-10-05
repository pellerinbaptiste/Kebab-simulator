import { cn } from "@/lib/utils";

/** Jauge en demi-cercle : probabilité de la réponse principale (« 62 % de chance »). */
export function ChanceGauge({ pct, label, className }: { pct: number; label: string; className?: string }) {
  const value = Math.max(0, Math.min(100, pct));
  const tone = value >= 50 ? "stroke-yes" : "stroke-no";
  return (
    <div className={cn("relative flex w-[72px] shrink-0 flex-col items-center", className)} role="img" aria-label={`${value} % ${label}`}>
      <svg viewBox="0 0 64 36" className="w-[72px]" aria-hidden>
        <path d="M6 32 A26 26 0 0 1 58 32" fill="none" className="stroke-muted" strokeWidth="6" strokeLinecap="round" />
        <path
          d="M6 32 A26 26 0 0 1 58 32"
          fill="none"
          className={cn(tone, "transition-[stroke-dasharray] duration-500")}
          strokeWidth="6"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${value} 100`}
        />
      </svg>
      <span className="-mt-3.5 text-sm leading-none font-extrabold tabular-nums">{value}%</span>
      <span className="mt-0.5 text-[10px] leading-tight font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
