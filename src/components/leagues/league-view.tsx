"use client";

import Link from "next/link";
import { ArrowLeft, SearchX, Users } from "lucide-react";

import { InviteCard } from "@/components/leagues/invite-card";
import { Leaderboard } from "@/components/leagues/leaderboard";
import { Button } from "@/components/ui/button";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { useI18n } from "@/lib/i18n/provider";
import { useStore } from "@/lib/store";
import { formatCredits } from "@/lib/utils";

export function LeagueView({ leagueId }: { leagueId: string }) {
  const { leagues, user } = useStore();
  const { t } = useI18n();
  const league = leagues.find((l) => l.id === leagueId);
  const members = useLeaderboard(leagueId);

  if (!league) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <SearchX aria-hidden className="size-12 text-muted-foreground" />
        <p className="font-semibold">{t("league.notFoundTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("league.notFoundBody")}</p>
        <Button asChild variant="outline">
          <Link href="/leagues">{t("league.seeMine")}</Link>
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
          <Link href="/leagues" aria-label={t("league.back")}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-3xl">
            {league.emoji} {league.name}
          </h1>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users aria-hidden className="size-3.5" /> {t("league.players", { n: members.length })}
            {league.admin_id === user.id && t("league.youAreAdmin")}
          </p>
        </div>
      </div>

      {me && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border bg-card p-3">
            <div className="text-[11px] text-muted-foreground">{t("league.position")}</div>
            <div className="font-display text-3xl uppercase tabular-nums">
              {me.rank}
              <span className="text-sm font-semibold text-muted-foreground">/{members.length}</span>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-3">
            <div className="text-[11px] text-muted-foreground">
              {gapToLeader > 0 ? t("league.gap") : t("league.status")}
            </div>
            <div className="font-display text-3xl uppercase tabular-nums">
              {gapToLeader > 0 ? `−${formatCredits(gapToLeader)}` : t("league.leader")}
            </div>
          </div>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t("league.ranking")}</h2>
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
        <h2 className="font-bold">{t("league.invite")}</h2>
        <InviteCard code={league.invite_code} leagueName={league.name} />
      </section>
    </div>
  );
}
