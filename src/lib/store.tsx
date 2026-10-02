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
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { fetchPolymarketQuestions } from "@/lib/polymarket";
import type { League, LeagueMember, Prediction, Question, User } from "@/lib/types";

/**
 * Store client qui reproduit la logique des RPC Supabase
 * (place_prediction, create_league, join_league). En mode démo, l'état est
 * enregistré dans le navigateur (localStorage) pour survivre aux rechargements.
 * Pour brancher Supabase, remplacer le corps de chaque action par l'appel
 * correspondant de src/lib/supabase/queries.ts — l'interface reste identique.
 */

/** Les erreurs sont des clés de traduction (voir src/lib/i18n/dictionaries.ts). */
type Result<T = void> = { ok: true; data: T } | { ok: false; error: MessageKey };

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
  updateUsername: (username: string) => Result;
  resetAccount: () => void;
}

const StoreContext = React.createContext<StoreValue | null>(null);

const STORAGE_KEY = "prono-store-v1";

interface SavedState {
  user: User;
  predictions: Prediction[];
  leagues: League[];
  /** Questions pariées, gardées même si elles ont disparu du flux */
  betQuestions: Question[];
}

function loadSaved(): SavedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedState) : null;
  } catch {
    return null;
  }
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function initialQuestions(news: Question[]) {
  return [...(news.length ? news : buildFallbackNewsQuestions()), ...buildCommunityQuestions()];
}

/** Met à jour les cotes et dates des questions affichées, sans toucher à leurs textes traduits. */
function refreshOdds(prev: Question[], fresh: Question[], betOn: Set<string>) {
  const byId = new Map(fresh.map((q) => [q.id, q]));
  return prev.map((q) => {
    const f = byId.get(q.id);
    return f && !betOn.has(q.id) ? { ...q, pools: f.pools, deadline: f.deadline } : q;
  });
}

export function StoreProvider({
  children,
  initialNews = [],
}: {
  children: React.ReactNode;
  /** Questions Polymarket (traduites) récupérées au moment de la construction du site */
  initialNews?: Question[];
}) {
  const [user, setUser] = React.useState<User>(mockUser);
  const [questions, setQuestions] = React.useState<Question[]>(() => initialQuestions(initialNews));
  const [predictions, setPredictions] = React.useState<Prediction[]>(buildMockPredictions);
  const [leagues, setLeagues] = React.useState<League[]>(mockLeagues);
  const [members] = React.useState<LeagueMember[]>(mockMembers);
  const [hydrated, setHydrated] = React.useState(false);
  const newsSource = initialNews.length ? "live" : "fallback";
  const predictionsRef = React.useRef(predictions);

  React.useEffect(() => {
    predictionsRef.current = predictions;
  }, [predictions]);

  // Restaure la partie enregistrée sur cet appareil (après le premier rendu,
  // pour que le HTML statique et le navigateur affichent la même chose).
  React.useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const saved = loadSaved();
      if (saved) {
        setUser(saved.user);
        setPredictions(saved.predictions);
        setLeagues(saved.leagues);
        setQuestions((prev) => {
          const known = new Set(prev.map((q) => q.id));
          const savedById = new Map(saved.betQuestions.map((q) => [q.id, q]));
          // Les questions pariées gardent la cagnotte au moment du pari
          const merged = prev.map((q) => savedById.get(q.id) ?? q);
          return [...merged, ...saved.betQuestions.filter((q) => !known.has(q.id))];
        });
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Enregistre la partie à chaque changement
  React.useEffect(() => {
    if (!hydrated) return;
    const betOn = new Set(predictions.map((p) => p.question_id));
    const state: SavedState = { user, predictions, leagues, betQuestions: questions.filter((q) => betOn.has(q.id)) };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* stockage plein ou indisponible : la partie reste en mémoire */
    }
  }, [hydrated, user, predictions, leagues, questions]);

  // Rafraîchit les cotes depuis le navigateur (le site statique peut dater de quelques heures).
  React.useEffect(() => {
    if (!initialNews.length) return;
    let cancelled = false;
    fetchPolymarketQuestions({ timeoutMs: 6000 }).then((fresh) => {
      if (cancelled || fresh.length === 0) return;
      const betOn = new Set(predictionsRef.current.map((p) => p.question_id));
      setQuestions((prev) => refreshOdds(prev, fresh, betOn));
    });
    return () => {
      cancelled = true;
    };
  }, [initialNews.length]);

  const placeBet = React.useCallback<StoreValue["placeBet"]>(
    (questionId, answer, amount) => {
      const q = questions.find((x) => x.id === questionId);
      if (!q) return { ok: false, error: "error.notFound" };
      if (q.status !== "open" || new Date(q.deadline).getTime() <= Date.now())
        return { ok: false, error: "error.closed" };
      if (!q.options.includes(answer)) return { ok: false, error: "error.invalidAnswer" };
      if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "error.invalidStake" };
      if (amount > user.total_credits) return { ok: false, error: "error.insufficient" };
      if (predictions.some((p) => p.question_id === questionId && p.user_id === user.id))
        return { ok: false, error: "error.alreadyBet" };

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
      if (clean.length < 2 || clean.length > 40) return { ok: false, error: "error.leagueName" };
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
      if (!league) return { ok: false, error: "error.inviteCode" };
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

  const updateUsername = React.useCallback<StoreValue["updateUsername"]>((username) => {
    const clean = username.trim();
    if (clean.length < 3 || clean.length > 24) return { ok: false, error: "error.username" };
    setUser((u) => ({ ...u, username: clean }));
    return { ok: true, data: undefined };
  }, []);

  const resetAccount = React.useCallback(() => {
    setUser(mockUser);
    setPredictions(buildMockPredictions());
    setLeagues(mockLeagues);
    setQuestions(initialQuestions(initialNews));
  }, [initialNews]);

  const value = React.useMemo<StoreValue>(
    () => ({
      user,
      questions,
      predictions,
      leagues,
      newsSource,
      placeBet,
      createLeague,
      joinLeague,
      getMembers,
      updateUsername,
      resetAccount,
    }),
    [user, questions, predictions, leagues, newsSource, placeBet, createLeague, joinLeague, getMembers, updateUsername, resetAccount],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}
