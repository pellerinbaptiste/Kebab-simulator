import type { Lang } from "@/lib/i18n/dictionaries";
import type { Question } from "@/lib/types";

/** Titre et description d'une question dans la langue choisie. */
export function localizeQuestion(q: Question, lang: Lang) {
  const en = lang === "en" ? q.translations?.en : undefined;
  return en ? { title: en.title, description: en.description } : { title: q.title, description: q.description };
}

/** Libellé affiché d'une option (la valeur stockée, elle, ne change pas). */
export function optionLabel(q: Pick<Question, "optionLabels">, option: string, lang: Lang) {
  const custom = q.optionLabels?.[lang]?.[option];
  if (custom) return custom;
  if (lang === "en" && option === "Oui") return "Yes";
  if (lang === "en" && option === "Non") return "No";
  return option;
}
