"use client";

import { ChevronDown, ChevronUp, Crown } from "lucide-react";

import { PlayerAvatar, PlayerName } from "@/components/player-name";
import type { RankedMember } from "@/hooks/use-leaderboard";
import { useI18n } from "@/lib/i18n/provider";
import { cn, formatCredits } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({ members, currentUserId }: { members: RankedMember[]; currentUserId: string }) {
  const podium = members.slice(0, 3);
  const rest = members.slice(3);

  return (
    <div className="flex flex-col gap-4">
      {/* Podium : 2e – 1er – 3e */}
      {podium.length === 3 && (
        <div className="grid grid-cols-3 items-end gap-2">
          {[podium[1], podium[0], podium[2]].map((m) => (
            <PodiumSpot key={m.user_id} member={m} isMe={m.user_id === currentUserId} />
          ))}
        </div>
      )}

      <ol className="flex flex-col gap-1.5">
        {(podium.length === 3 ? rest : members).map((m) => (
          <Row key={m.user_id} member={m} isMe={m.user_id === currentUserId} />
        ))}
      </ol>
    </div>
  );
}

function PodiumSpot({ member, isMe }: { member: RankedMember; isMe: boolean }) {
  const { t } = useI18n();
  const heights = ["h-28", "h-20", "h-16"];
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      {member.rank === 1 && <Crown className="size-5 fill-gold text-gold" />}
      <PlayerAvatar name={member.username} frame={member.avatar_frame} highlight={isMe} size={member.rank === 1 ? "lg" : "md"} />
      <span className={cn("flex w-full justify-center text-xs font-semibold", isMe && "text-primary")}>
        {isMe ? (
          t("common.you")
        ) : (
          <PlayerName name={member.username} color={member.name_color} badge={member.badge} />
        )}
      </span>
      <div
        className={cn(
          "flex w-full flex-col items-center justify-start rounded-t-xl pt-2 transition-all duration-500",
          heights[member.rank - 1],
          member.rank === 1 ? "bg-gradient-to-b from-gold/50 to-gold/10" : "bg-muted",
        )}
      >
        <span className="text-xl">{MEDALS[member.rank - 1]}</span>
        <span className="text-sm font-black tabular-nums">{formatCredits(member.current_credits)}</span>
        <Delta member={member} />
      </div>
    </div>
  );
}

function Row({ member, isMe }: { member: RankedMember; isMe: boolean }) {
  const { t } = useI18n();
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-all duration-500",
        isMe && "border-primary/40 bg-accent ring-1 ring-primary/30",
      )}
    >
      <span className="w-6 text-center text-sm font-black text-muted-foreground tabular-nums">{member.rank}</span>
      <PlayerAvatar name={member.username} frame={member.avatar_frame} highlight={isMe} />
      <span className="flex min-w-0 flex-1 items-center text-sm font-semibold">
        <PlayerName name={member.username} color={member.name_color} badge={member.badge} />
        {isMe && <span className="ml-1.5 shrink-0 text-xs font-bold text-primary">({t("common.youShort")})</span>}
      </span>
      <Movement value={member.movement} />
      <div className="flex flex-col items-end">
        <span className="text-sm font-black tabular-nums">{formatCredits(member.current_credits)}</span>
        <Delta member={member} />
      </div>
    </li>
  );
}

function Movement({ value }: { value: number }) {
  if (!value) return null;
  const up = value > 0;
  return (
    <span className={cn("flex items-center text-xs font-bold animate-in fade-in", up ? "text-yes" : "text-no")}>
      {up ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      {Math.abs(value)}
    </span>
  );
}

function Delta({ member }: { member: RankedMember }) {
  if (!member.lastDelta) return <span className="h-4" />;
  const up = member.lastDelta > 0;
  return (
    <span
      key={`${member.current_credits}`}
      className={cn("h-4 text-[11px] font-bold tabular-nums animate-in fade-in slide-in-from-bottom-1", up ? "text-yes" : "text-no")}
    >
      {up ? "+" : "−"}
      {formatCredits(Math.abs(member.lastDelta))}
    </span>
  );
}
