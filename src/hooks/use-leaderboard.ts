"use client";

import * as React from "react";

import { useStore } from "@/lib/store";
import type { LeagueMember } from "@/lib/types";

export interface RankedMember extends LeagueMember {
  rank: number;
  /** >0 : a gagné des places depuis la dernière mise à jour */
  movement: number;
  /** Variation de crédits la plus récente (pour l'animation) */
  lastDelta: number;
}

/**
 * Classement d'une ligue, mis à jour en temps réel : le store reçoit les
 * changements de crédits via Supabase Realtime (table league_members).
 */
export function useLeaderboard(leagueId: string) {
  const { getMembers } = useStore();
  const members = getMembers(leagueId);

  const ranked = [...members]
    .sort((a, b) => b.current_credits - a.current_credits || a.username.localeCompare(b.username))
    .map((m, i) => ({ ...m, rank: i + 1 }));

  // Mémorise le classement précédent pour afficher montées / descentes et gains
  const [previous, setPrevious] = React.useState<{ key: string; ranks: Record<string, number>; credits: Record<string, number> }>(
    () => ({ key: "", ranks: {}, credits: {} }),
  );
  const [changes, setChanges] = React.useState<{ moves: Record<string, number>; deltas: Record<string, number> }>({
    moves: {},
    deltas: {},
  });

  const key = ranked.map((m) => `${m.user_id}:${m.current_credits}`).join(",");
  if (key !== previous.key) {
    const moves: Record<string, number> = {};
    const deltas: Record<string, number> = {};
    if (previous.key) {
      for (const m of ranked) {
        const before = previous.ranks[m.user_id];
        if (before && before !== m.rank) moves[m.user_id] = before - m.rank;
        const credits = previous.credits[m.user_id];
        if (credits !== undefined && credits !== m.current_credits) deltas[m.user_id] = m.current_credits - credits;
      }
    }
    setPrevious({
      key,
      ranks: Object.fromEntries(ranked.map((m) => [m.user_id, m.rank])),
      credits: Object.fromEntries(ranked.map((m) => [m.user_id, m.current_credits])),
    });
    setChanges({ moves, deltas });
  }

  return ranked.map(
    (m): RankedMember => ({ ...m, movement: changes.moves[m.user_id] ?? 0, lastDelta: changes.deltas[m.user_id] ?? 0 }),
  );
}
