import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const credits = new Intl.NumberFormat("fr-FR");

export function formatCredits(value: number) {
  return credits.format(Math.round(value));
}

/** "dans 2 j", "dans 5 h", "dans 12 min", "terminé" */
export function formatTimeLeft(deadline: string, now = Date.now()) {
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return "terminé";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `dans ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `dans ${hours} h`;
  return `dans ${Math.floor(hours / 24)} j`;
}
