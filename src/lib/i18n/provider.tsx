"use client";

import * as React from "react";

import { CATEGORY_LABELS, dictionaries, LANGUAGES, type Lang, type MessageKey } from "@/lib/i18n/dictionaries";
import type { Category } from "@/lib/types";

const STORAGE_KEY = "prono-lang";
const listeners = new Set<() => void>();

function readLang(): Lang {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.includes(v as Lang) ? (v as Lang) : "fr";
  } catch {
    return "fr";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function writeLang(lang: Lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* stockage indisponible (navigation privée…) */
  }
  listeners.forEach((l) => l());
}

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
  categoryLabel: (c: Category) => string;
}

const I18nContext = React.createContext<I18nValue | null>(null);

/** Le français est la langue par défaut ; le choix est mémorisé sur l'appareil. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang = React.useSyncExternalStore(subscribe, readLang, () => "fr" as Lang);

  React.useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = React.useMemo<I18nValue>(() => {
    const dict = dictionaries[lang];
    const t: Translate = (key, vars) =>
      (dict[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) => String(vars?.[name] ?? `{${name}}`));
    return { lang, setLang: writeLang, t, categoryLabel: (c) => CATEGORY_LABELS[lang][c] ?? c };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé dans <I18nProvider>");
  return ctx;
}
