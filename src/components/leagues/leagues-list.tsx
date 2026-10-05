"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Crown, LogIn, Plus, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { leagueHref } from "@/lib/paths";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function LeaguesList() {
  const { leagues, getMembers, user, createLeague, joinLeague } = useStore();
  const router = useRouter();
  const [mode, setMode] = React.useState<"join" | "create" | null>(null);
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<MessageKey | null>(null);
  const { t } = useI18n();

  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = mode === "create" ? await createLeague(value) : await joinLeague(value);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    router.push(leagueHref(res.data.id));
  }

  function toggle(next: "join" | "create") {
    setMode((m) => (m === next ? null : next));
    setValue("");
    setError(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl uppercase">{t("leagues.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("leagues.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant={mode === "create" ? "default" : "outline"} size="lg" onClick={() => toggle("create")}>
          <Plus aria-hidden /> {t("leagues.create")}
        </Button>
        <Button variant={mode === "join" ? "default" : "outline"} size="lg" onClick={() => toggle("join")}>
          <LogIn aria-hidden /> {t("leagues.join")}
        </Button>
      </div>

      {mode && (
        <form
          onSubmit={submit}
          className="flex flex-col gap-3 rounded-2xl border bg-card p-4 animate-in fade-in slide-in-from-top-2"
        >
          <Label htmlFor="league-input">
            {mode === "create" ? t("leagues.nameLabel") : t("leagues.codeLabel")}
          </Label>
          <Input
            id="league-input"
            autoFocus
            value={value}
            maxLength={mode === "create" ? 40 : 6}
            onChange={(e) => {
              setError(null);
              setValue(mode === "join" ? e.target.value.toUpperCase() : e.target.value);
            }}
            placeholder={mode === "create" ? t("leagues.namePlaceholder") : t("leagues.codePlaceholder")}
            className={cn(mode === "join" && "font-mono text-lg tracking-[0.3em] uppercase")}
            aria-invalid={Boolean(error)}
          />
          {error && (
            <p className="text-sm font-medium text-no" role="alert">
              {t(error)}
            </p>
          )}
          <Button type="submit" disabled={!value.trim() || loading}>
            {mode === "create" ? t("leagues.submitCreate") : t("leagues.submitJoin")}
          </Button>
        </form>
      )}

      <ul className="flex flex-col gap-2">
        {leagues.map((l) => {
          const members = getMembers(l.id).sort((a, b) => b.current_credits - a.current_credits);
          const rank = members.findIndex((m) => m.user_id === user.id) + 1;
          return (
            <li key={l.id}>
              <Link
                href={leagueHref(l.id)}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-all active:scale-[0.99]"
              >
                <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground" aria-hidden>
                  <Trophy className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("leagues.meta", { n: members.length })} <span className="font-mono">{l.invite_code}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-mono font-semibold tabular-nums">
                    {rank === 1 ? <Crown aria-label="1" className="ml-auto size-5 fill-gold text-gold" /> : `#${rank}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{t("leagues.yourRank")}</p>
                </div>
                <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
