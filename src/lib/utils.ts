import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const credits = new Intl.NumberFormat("fr-FR");

export function formatCredits(value: number) {
  return credits.format(Math.round(value));
}

type TimeKey = "time.ended" | "time.minutes" | "time.hours" | "time.days";

/** "dans 2 j", "dans 5 h", "dans 12 min", "terminé" (selon la langue de `t`) */
export function formatTimeLeft(
  deadline: string,
  t: (key: TimeKey, vars?: Record<string, number>) => string,
  now = Date.now(),
) {
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return t("time.ended");
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return t("time.minutes", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return t("time.hours", { n: hours });
  return t("time.days", { n: Math.floor(hours / 24) });
}
