"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";

import { InviteCard } from "@/components/leagues/invite-card";
import { Leaderboard } from "@/components/leagues/leaderboard";
import { Button } from "@/components/ui/button";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { useStore } from "@/lib/store";
import { formatCredits } from "@/lib/utils";

export function LeagueView({ leagueId }: { leagueId: string }) {
  const { leagues, user } = useStore();
  const league = leagues.find((l) => l.id === leagueId);
  const members = useLeaderboard(leagueId, { simulate: Boolean(league) });

  if (!league) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-5xl">🕵️</span>
        <p className="font-semibold">Ligue introuvable</p>
        <p className="text-sm text-muted-foreground">Tu n&apos;en fais peut-être pas (encore) partie.</p>
        <Button asChild variant="outline">
          <Link href="/leagues">Voir mes ligues</Link>
        </Button>
      </div>
    );
  }

  const me = members.find((m) => m.user_id === user.id);
  const leader = members[0];
  const gapToLeader = me && leader && me.user_id !== leader.user_id ? leader.current_credits - me.current_credits : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0">
          <Link href="/leagues" aria-label="Retour aux ligues">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight">
            {league.emoji} {league.name}
          </h1>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" /> {members.length} joueurs
            {league.admin_id === user.id && " · tu es admin"}
          </p>
        </div>
      </div>

      {me && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border bg-card p-3">
            <div className="text-[11px] text-muted-foreground">Ta position</div>
            <div className="text-2xl font-black tabular-nums">
              {me.rank}
              <span className="text-sm font-semibold text-muted-foreground">/{members.length}</span>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <div className="text-[11px] text-muted-foreground">
              {gapToLeader > 0 ? "Retard sur le 1er" : "Statut"}
            </div>
            <div className="text-2xl font-black tabular-nums">
              {gapToLeader > 0 ? `−${formatCredits(gapToLeader)}` : "👑 Leader"}
            </div>
          </div>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Classement</h2>
          <span className="flex items-center gap-1.5 rounded-full bg-no-soft px-2 py-0.5 text-[11px] font-bold text-no">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-no opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-no" />
            </span>
            LIVE
          </span>
        </div>
        <Leaderboard members={members} currentUserId={user.id} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">Inviter des potes</h2>
        <InviteCard code={league.invite_code} leagueName={league.name} />
      </section>
    </div>
  );
}
