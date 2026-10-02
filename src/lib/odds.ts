import type { Question } from "@/lib/types";

/**
 * Marché parimutuel : la cagnotte totale est partagée entre les gagnants
 * au prorata de leur mise (voir resolve_question en SQL).
 */

export function totalPool(q: Pick<Question, "pools">) {
  return Object.values(q.pools).reduce((a, b) => a + b, 0);
}

/** Probabilité implicite (0–1) de chaque option, d'après les mises. */
export function impliedProbability(q: Pick<Question, "pools" | "options">, option: string) {
  const total = totalPool(q);
  if (total === 0) return 1 / q.options.length;
  return (q.pools[option] ?? 0) / total;
}

/** Gain estimé si l'on mise `stake` sur `option` maintenant. */
export function estimatePayout(q: Pick<Question, "pools">, option: string, stake: number) {
  if (stake <= 0) return 0;
  const total = totalPool(q) + stake;
  const onOption = (q.pools[option] ?? 0) + stake;
  return Math.floor((stake * total) / onOption);
}

/** Cote décimale équivalente (gain / mise). */
export function estimateMultiplier(q: Pick<Question, "pools">, option: string, stake: number) {
  if (stake <= 0) return 0;
  return estimatePayout(q, option, stake) / stake;
}
