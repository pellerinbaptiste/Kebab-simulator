"use client";

import * as React from "react";

import {
  buildMockPredictions,
  buildMockQuestions,
  mockJoinableLeagues,
  mockLeagues,
  mockMembers,
  mockUser,
} from "@/lib/mock-data";
import type { League, LeagueMember, Prediction, Question, User } from "@/lib/types";

/**
 * Store client en mémoire qui reproduit la logique des RPC Supabase
 * (place_prediction, create_league, join_league). Pour brancher Supabase,
 * remplacer le corps de chaque action par l'appel correspondant de
 * src/lib/supabase/queries.ts — l'interface reste identique.
 */

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

interface StoreValue {
  user: User;
  questions: Question[];
  predictions: Prediction[];
  leagues: League[];
  placeBet: (questionId: string, answer: string, amount: number) => Result<Prediction>;
  createLeague: (name: string) => Result<League>;
  joinLeague: (code: string) => Result<League>;
  getMembers: (leagueId: string) => LeagueMember[];
}

const StoreContext = React.createContext<StoreValue | null>(null);

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User>(mockUser);
  const [questions, setQuestions] = React.useState<Question[]>(buildMockQuestions);
  const [predictions, setPredictions] = React.useState<Prediction[]>(buildMockPredictions);
  const [leagues, setLeagues] = React.useState<League[]>(mockLeagues);
  const [members] = React.useState<LeagueMember[]>(mockMembers);

  const placeBet = React.useCallback<StoreValue["placeBet"]>(
    (questionId, answer, amount) => {
      const q = questions.find((x) => x.id === questionId);
      if (!q) return { ok: false, error: "Question introuvable" };
      if (q.status !== "open" || new Date(q.deadline).getTime() <= Date.now())
        return { ok: false, error: "Les paris sont fermés" };
      if (!q.options.includes(answer)) return { ok: false, error: "Réponse invalide" };
      if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "Mise invalide" };
      if (amount > user.total_credits) return { ok: false, error: "Crédits insuffisants" };
      if (predictions.some((p) => p.question_id === questionId && p.user_id === user.id))
        return { ok: false, error: "Tu as déjà parié sur cette question" };

      const prediction: Prediction = {
        id: `p-${crypto.randomUUID()}`,
        user_id: user.id,
        question_id: questionId,
        chosen_answer: answer,
        wagered_amount: amount,
        payout: null,
        created_at: new Date().toISOString(),
      };
      setPredictions((prev) => [prediction, ...prev]);
      setUser((u) => ({ ...u, total_credits: u.total_credits - amount }));
      setQuestions((prev) =>
        prev.map((x) =>
          x.id === questionId
            ? { ...x, bettors: x.bettors + 1, pools: { ...x.pools, [answer]: (x.pools[answer] ?? 0) + amount } }
            : x,
        ),
      );
      return { ok: true, data: prediction };
    },
    [questions, predictions, user],
  );

  const createLeague = React.useCallback<StoreValue["createLeague"]>(
    (name) => {
      const clean = name.trim();
      if (clean.length < 2 || clean.length > 40)
        return { ok: false, error: "Le nom doit faire entre 2 et 40 caractères" };
      const league: League = {
        id: `l-${crypto.randomUUID()}`,
        name: clean,
        invite_code: randomCode(),
        admin_id: user.id,
        emoji: "🏆",
      };
      setLeagues((prev) => [...prev, league]);
      return { ok: true, data: league };
    },
    [user.id],
  );

  const joinLeague = React.useCallback<StoreValue["joinLeague"]>(
    (code) => {
      const normalized = code.trim().toUpperCase();
      const already = leagues.find((l) => l.invite_code === normalized);
      if (already) return { ok: true, data: already };
      const league = mockJoinableLeagues.find((l) => l.invite_code === normalized);
      if (!league) return { ok: false, error: "Code d'invitation invalide" };
      setLeagues((prev) => [...prev, league]);
      return { ok: true, data: league };
    },
    [leagues],
  );

  const getMembers = React.useCallback<StoreValue["getMembers"]>(
    (leagueId) => [
      ...members.filter((m) => m.league_id === leagueId),
      // Le solde de ligue = solde global (voir trigger sync_league_credits)
      { league_id: leagueId, user_id: user.id, username: user.username, current_credits: user.total_credits },
    ],
    [members, user],
  );

  const value = React.useMemo<StoreValue>(
    () => ({ user, questions, predictions, leagues, placeBet, createLeague, joinLeague, getMembers }),
    [user, questions, predictions, leagues, placeBet, createLeague, joinLeague, getMembers],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}
