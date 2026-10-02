"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { leagueHref } from "@/lib/paths";
import { useStore } from "@/lib/store";

/** Page d'atterrissage d'un lien d'invitation /join?code=CODE */
export function JoinLeague({ code }: { code: string }) {
  const { joinLeague } = useStore();
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  function join() {
    const res = joinLeague(code);
    if (!res.ok) return setError(res.error);
    router.replace(leagueHref(res.data.id));
  }

  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <span className="text-6xl">🎟️</span>
      <h1 className="text-2xl font-black">Tu es invité !</h1>
      <p className="text-muted-foreground">
        Rejoins la ligue avec le code <span className="font-mono font-bold text-foreground">{code.toUpperCase()}</span>
      </p>
      {error && <p className="rounded-lg bg-no-soft px-3 py-2 text-sm font-medium text-no">{error}</p>}
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button size="lg" onClick={join}>
          Rejoindre la ligue
        </Button>
        <Button asChild variant="ghost">
          <Link href="/leagues">Plus tard</Link>
        </Button>
      </div>
    </div>
  );
}
