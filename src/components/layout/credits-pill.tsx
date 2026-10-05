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
        "inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm font-bold tabular-nums transition-all duration-300",
        flash === "down" && "bg-no-soft text-no",
        flash === "up" && "bg-yes-soft text-yes",
        className,
      )}
      aria-label={t("header.creditsLabel", { n: formatCredits(value) })}
    >
      <Coins className="size-4 text-primary" />
      {formatCredits(value)}
    </div>
  );
}
