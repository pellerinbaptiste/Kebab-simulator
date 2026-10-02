"use client";

import * as React from "react";
import { Coins } from "lucide-react";

import { cn, formatCredits } from "@/lib/utils";

/** Pastille de solde qui « pulse » à chaque variation. */
export function CreditsPill({ value, className }: { value: number; className?: string }) {
  const [prev, setPrev] = React.useState(value);
  const [flash, setFlash] = React.useState<"up" | "down" | null>(null);

  if (value !== prev) {
    setFlash(value > prev ? "up" : "down");
    setPrev(value);
  }

  React.useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-bold tabular-nums shadow-xs transition-all duration-300",
        flash === "down" && "scale-105 border-no/40 text-no",
        flash === "up" && "scale-105 border-yes/40 text-yes",
        className,
      )}
      aria-label={`${formatCredits(value)} crédits`}
    >
      <Coins className="size-4 text-gold" />
      {formatCredits(value)}
    </div>
  );
}
