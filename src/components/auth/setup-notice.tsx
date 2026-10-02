"use client";

import { useI18n } from "@/lib/i18n/provider";

/** Affiché tant que les variables Supabase ne sont pas renseignées sur l'hébergeur. */
export function SetupNotice() {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <span className="text-5xl" aria-hidden>
        🛠️
      </span>
      <h1 className="text-xl font-black">{t("setup.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("setup.body")}</p>
    </main>
  );
}
