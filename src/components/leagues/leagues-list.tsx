"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogIn, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { leagueHref } from "@/lib/paths";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function LeaguesList() {
  const { leagues, getMembers, user, createLeague, joinLeague } = useStore();
  const router = useRouter();
  const [mode, setMode] = React.useState<"join" | "create" | null>(null);
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = mode === "create" ? createLeague(value) : joinLeague(value);
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
        <h1 className="text-2xl font-black tracking-tight">Mes ligues</h1>
        <p className="text-sm text-muted-foreground">Affronte tes potes sur les mêmes pronos.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant={mode === "create" ? "default" : "outline"} size="lg" onClick={() => toggle("create")}>
          <Plus /> Créer
        </Button>
        <Button variant={mode === "join" ? "default" : "outline"} size="lg" onClick={() => toggle("join")}>
          <LogIn /> Rejoindre
        </Button>
      </div>

      {mode && (
        <form
          onSubmit={submit}
          className="flex flex-col gap-3 rounded-2xl border bg-card p-4 animate-in fade-in slide-in-from-top-2"
        >
          <Label htmlFor="league-input">
            {mode === "create" ? "Nom de la ligue" : "Code d'invitation"}
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
            placeholder={mode === "create" ? "Ex : Les Rois du Kebab" : "Ex : KEBAB1"}
            className={cn(mode === "join" && "font-mono text-lg tracking-[0.3em] uppercase")}
            aria-invalid={Boolean(error)}
          />
          {mode === "join" && (
            <p className="text-xs text-muted-foreground">
              Démo : essaie le code <button type="button" className="font-mono font-bold text-primary" onClick={() => setValue("KEBAB1")}>KEBAB1</button>
            </p>
          )}
          {error && <p className="text-sm font-medium text-no">{error}</p>}
          <Button type="submit" disabled={!value.trim()}>
            {mode === "create" ? "Créer la ligue" : "Rejoindre"}
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
                className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
              >
                <span className="grid size-12 place-items-center rounded-xl bg-accent text-2xl">{l.emoji ?? "🏆"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {members.length} joueurs · code <span className="font-mono">{l.invite_code}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black tabular-nums">
                    {rank === 1 ? "👑" : `#${rank}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">ta place</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
