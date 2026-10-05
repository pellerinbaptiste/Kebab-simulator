"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { useI18n } from "@/lib/i18n/provider";
import { cn, formatTimeLeft } from "@/lib/utils";

export function TimeLeft({ deadline, className }: { deadline: string; className?: string }) {
  const { t } = useI18n();
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const hoursLeft = (new Date(deadline).getTime() - now) / 3_600_000;
  const urgent = hoursLeft > 0 && hoursLeft < 12;

  return (
    <span
      suppressHydrationWarning
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        urgent && "font-semibold text-red",
        className,
      )}
    >
      <Clock className="size-3.5" />
      {formatTimeLeft(deadline, t, now)}
    </span>
  );
}
