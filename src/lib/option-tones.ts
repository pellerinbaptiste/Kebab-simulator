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
  // Palette d'imprimerie : encre, rouge, vert, gris
  { solid: "bg-primary text-primary-foreground", soft: "bg-muted", text: "text-foreground", ring: "ring-foreground" },
  { solid: "bg-red text-white", soft: "bg-no-soft", text: "text-red", ring: "ring-red" },
  { solid: "bg-yes text-white", soft: "bg-yes-soft", text: "text-yes", ring: "ring-yes" },
  { solid: "bg-muted-foreground text-background", soft: "bg-secondary", text: "text-muted-foreground", ring: "ring-muted-foreground" },
];

export function isBinary(q: Pick<Question, "options">) {
  return q.options.length === 2 && q.options[0] === "Oui" && q.options[1] === "Non";
}

export function optionTone(q: Pick<Question, "options">, option: string): Tone {
  if (isBinary(q)) return option === "Oui" ? YES : NO;
  return MULTI[Math.max(0, q.options.indexOf(option)) % MULTI.length];
}
