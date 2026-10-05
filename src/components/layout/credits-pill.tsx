"use client";

import * as React from "react";
import { Coins } from "lucide-react";

import { useI18n } from "@/lib/i18n/provider";
import { cn, formatCredits } from "@/lib/utils";

/** Pastille de solde qui « pulse » à chaque variation. */
export function CreditsPill({ value, className }: { value: number; className?: string }) {
  const { t } = useI18n();
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
        "inline-flex items-center gap-1.5 border-2 border-foreground bg-card px-2.5 py-1 font-mono text-sm font-semibold tabular-nums transition-all duration-300",
        flash === "down" && "border-no bg-no text-white",
        flash === "up" && "border-yes bg-yes text-white",
        className,
      )}
      aria-label={t("header.creditsLabel", { n: formatCredits(value) })}
    >
      <Coins className="size-4" />
      {formatCredits(value)}
    </div>
  );
}
