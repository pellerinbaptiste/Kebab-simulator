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
 * Classement « temps réel ».
 * En mode démo, on simule l'activité des autres joueurs toutes les quelques
 * secondes. Avec Supabase, remplacer la simulation par
 * subscribeToLeaderboard() (src/lib/supabase/queries.ts).
 */
export function useLeaderboard(leagueId: string, { simulate = true } = {}) {
  const { getMembers, user } = useStore();
  const base = getMembers(leagueId);

  // Variations simulées par joueur (hors utilisateur courant)
  const [offsets, setOffsets] = React.useState<Record<string, number>>({});
  const [lastDeltas, setLastDeltas] = React.useState<Record<string, number>>({});
  const prevRanks = React.useRef<Record<string, number>>({});
  const [movements, setMovements] = React.useState<Record<string, number>>({});

  const others = base.filter((m) => m.user_id !== user.id).map((m) => m.user_id).join(",");

  React.useEffect(() => {
    if (!simulate || !others) return;
    const ids = others.split(",");
    const t = setInterval(() => {
      const id = ids[Math.floor(Math.random() * ids.length)];
      const delta = Math.round((Math.random() * 220 - 90) / 10) * 10 || 30;
      setOffsets((o) => ({ ...o, [id]: (o[id] ?? 0) + delta }));
      setLastDeltas({ [id]: delta });
    }, 4500);
    return () => clearInterval(t);
  }, [others, simulate]);

  const ranked: RankedMember[] = base
    .map((m) => ({ ...m, current_credits: Math.max(0, m.current_credits + (offsets[m.user_id] ?? 0)) }))
    .sort((a, b) => b.current_credits - a.current_credits || a.username.localeCompare(b.username))
    .map((m, i) => ({
      ...m,
      rank: i + 1,
      movement: movements[m.user_id] ?? 0,
      lastDelta: lastDeltas[m.user_id] ?? 0,
    }));

  const rankKey = ranked.map((m) => m.user_id).join(",");

  // Calcule les montées / descentes quand l'ordre change
  React.useEffect(() => {
    const ids = rankKey.split(",");
    const next: Record<string, number> = {};
    const moves: Record<string, number> = {};
    ids.forEach((id, i) => {
      next[id] = i + 1;
      const before = prevRanks.current[id];
      if (before && before !== i + 1) moves[id] = before - (i + 1);
    });
    prevRanks.current = next;
    if (Object.keys(moves).length) setMovements(moves);
  }, [rankKey]);

  return ranked;
}
