"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { leagueHref } from "@/lib/paths";
import { useStore } from "@/lib/store";

/** Page d'atterrissage d'un lien d'invitation /join?code=CODE */
export function JoinLeague({ code }: { code: string }) {
  const { joinLeague } = useStore();
  const router = useRouter();
  const [error, setError] = React.useState<MessageKey | null>(null);
  const { t } = useI18n();

  const [loading, setLoading] = React.useState(false);

  async function join() {
    setLoading(true);
    const res = await joinLeague(code);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    router.replace(leagueHref(res.data.id));
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <span className="text-6xl" aria-hidden>
        🎟️
      </span>
      <h1 className="text-2xl font-black">{t("join.title")}</h1>
      <p className="text-muted-foreground">
        {t("join.body")} <span className="font-mono font-bold text-foreground">{code.toUpperCase()}</span>
      </p>
      {error && (
        <p className="rounded-lg bg-no-soft px-3 py-2 text-sm font-medium text-no" role="alert">
          {t(error)}
        </p>
      )}
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button size="lg" onClick={join} disabled={loading || !code}>
          {t("join.cta")}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/leagues">{t("join.later")}</Link>
        </Button>
      </div>
    </div>
  );
}
