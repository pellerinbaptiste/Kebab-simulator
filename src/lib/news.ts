import { fetchPolymarketQuestions } from "@/lib/polymarket";
import type { Question } from "@/lib/types";

// Au build, chaque page appelle le layout : on ne récupère et ne traduit
// les questions qu'une fois par processus.
let pending: Promise<Question[]> | null = null;

/** Questions d'actualité Polymarket traduites en français ([] si indisponible). */
export function getNewsQuestions() {
  pending ??= fetchPolymarketQuestions({ translate: true });
  return pending;
}
