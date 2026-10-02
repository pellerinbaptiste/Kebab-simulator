import type { Question } from "@/lib/types";

export interface Tone {
  /** Fond plein (barres, bouton sélectionné) */
  solid: string;
  /** Fond doux (bouton au repos) */
  soft: string;
  /** Texte coloré */
  text: string;
  ring: string;
}

const YES: Tone = { solid: "bg-yes text-white", soft: "bg-yes-soft", text: "text-yes", ring: "ring-yes" };
const NO: Tone = { solid: "bg-no text-white", soft: "bg-no-soft", text: "text-no", ring: "ring-no" };
const MULTI: Tone[] = [
  { solid: "bg-primary text-primary-foreground", soft: "bg-accent", text: "text-primary", ring: "ring-primary" },
  { solid: "bg-sky-500 text-white", soft: "bg-sky-500/12", text: "text-sky-600 dark:text-sky-300", ring: "ring-sky-500" },
  { solid: "bg-amber-500 text-white", soft: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-300", ring: "ring-amber-500" },
  { solid: "bg-pink-500 text-white", soft: "bg-pink-500/12", text: "text-pink-600 dark:text-pink-300", ring: "ring-pink-500" },
];

export function isBinary(q: Pick<Question, "options">) {
  return q.options.length === 2 && q.options[0] === "Oui" && q.options[1] === "Non";
}

export function optionTone(q: Pick<Question, "options">, option: string): Tone {
  if (isBinary(q)) return option === "Oui" ? YES : NO;
  return MULTI[Math.max(0, q.options.indexOf(option)) % MULTI.length];
}
