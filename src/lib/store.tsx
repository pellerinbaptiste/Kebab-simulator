"use client";

import * as React from "react";

import {
  buildCommunityQuestions,
  buildFallbackNewsQuestions,
  buildMockPredictions,
  mockJoinableLeagues,
  mockLeagues,
  mockMembers,
  mockUser,
} from "@/lib/mock-data";
import { fetchPolymarketQuestions } from "@/lib/polymarket";
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
  /** "live" : questions Polymarket ; "fallback" : exemples (Polymarket injoignable) */
  newsSource: "live" | "fallback";
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

const COMMUNITY_IDS = new Set(buildCommunityQuestions().map((q) => q.id));

function initialQuestions(news: Question[]) {
  return [...(news.length ? news : buildFallbackNewsQuestions()), ...buildCommunityQuestions()];
}

/** Remplace les questions Polymarket par une version plus récente, sans toucher à celles déjà pariées. */
function mergeNews(prev: Question[], fresh: Question[], betOn: Set<string>) {
  const isNews = (q: Question) => !COMMUNITY_IDS.has(q.id);
  const kept = new Map(prev.filter((q) => betOn.has(q.id)).map((q) => [q.id, q]));
  const merged = fresh.map((q) => kept.get(q.id) ?? q);
  const stillBet = [...kept.values()].filter((q) => isNews(q) && !fresh.some((f) => f.id === q.id));
  return [...merged, ...stillBet, ...prev.filter((q) => !isNews(q))];
}

export function StoreProvider({
  children,
  initialNews = [],
}: {
  children: React.ReactNode;
  /** Questions Polymarket récupérées au moment de la construction du site */
  initialNews?: Question[];
}) {
  const [user, setUser] = React.useState<User>(mockUser);
  const [questions, setQuestions] = React.useState<Question[]>(() => initialQuestions(initialNews));
  const [newsSource, setNewsSource] = React.useState<"live" | "fallback">(initialNews.length ? "live" : "fallback");
  const [predictions, setPredictions] = React.useState<Prediction[]>(buildMockPredictions);
  const [leagues, setLeagues] = React.useState<League[]>(mockLeagues);
  const [members] = React.useState<LeagueMember[]>(mockMembers);
  const predictionsRef = React.useRef(predictions);

  React.useEffect(() => {
    predictionsRef.current = predictions;
  }, [predictions]);

  // Rafraîchit les cotes depuis le navigateur (le site statique peut dater de quelques heures).
  React.useEffect(() => {
    let cancelled = false;
    fetchPolymarketQuestions({ timeoutMs: 6000 }).then((fresh) => {
      if (cancelled || fresh.length === 0) return;
      const betOn = new Set(predictionsRef.current.map((p) => p.question_id));
      setQuestions((prev) => mergeNews(prev, fresh, betOn));
      setNewsSource("live");
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    () => ({ user, questions, predictions, leagues, newsSource, placeBet, createLeague, joinLeague, getMembers }),
    [user, questions, predictions, leagues, newsSource, placeBet, createLeague, joinLeague, getMembers],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}
