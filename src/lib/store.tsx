"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MessageKey } from "@/lib/i18n/dictionaries";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import * as api from "@/lib/supabase/queries";
import type { CosmeticKind, League, LeagueMember, Prediction, Question, ShopItem, User } from "@/lib/types";

/**
 * Données du joueur connecté, lues et écrites dans Supabase.
 * Toute la logique sensible (solde, paris, ligues) est vérifiée côté base
 * par les RPC et la RLS (supabase/migrations) ; ici on ne fait qu'afficher
 * et appeler ces fonctions.
 */

/** Les erreurs sont des clés de traduction (voir src/lib/i18n/dictionaries.ts). */
export type Result<T = void> = { ok: true; data: T } | { ok: false; error: MessageKey };

interface StoreValue {
  user: User;
  email: string | null;
  questions: Question[];
  predictions: Prediction[];
  leagues: League[];
  /** Boutique : catalogue et identifiants des objets achetés */
  shopItems: ShopItem[];
  ownedItems: string[];
  /** "live" : au moins une question Polymarket ; "pending" : synchronisation pas encore faite */
  newsSource: "live" | "pending";
  placeBet: (questionId: string, answer: string, amount: number) => Promise<Result<Prediction>>;
  createLeague: (name: string) => Promise<Result<League>>;
  joinLeague: (code: string) => Promise<Result<League>>;
  getMembers: (leagueId: string) => LeagueMember[];
  updateUsername: (username: string) => Promise<Result>;
  /** Admin uniquement (vérifié côté base) */
  createQuestion: (input: api.NewQuestion) => Promise<Result>;
  resolveQuestion: (questionId: string, answer: string) => Promise<Result>;
  cancelQuestion: (questionId: string) => Promise<Result>;
  /** Redirige vers la page de paiement Stripe si tout va bien */
  buyItem: (itemId: string) => Promise<Result>;
  equipItem: (kind: CosmeticKind, value: string | null) => Promise<Result>;
  /** Redirige vers le portail Stripe (gérer / résilier l'abonnement Club) */
  manageSubscription: () => Promise<Result>;
  /** Vérifie auprès de Stripe les achats en attente, puis relit les données si un objet est débloqué */
  confirmPurchases: () => Promise<number>;
  signOut: () => Promise<void>;
}

const StoreContext = React.createContext<StoreValue | null>(null);

interface Data {
  user: User;
  email: string | null;
  questions: Question[];
  predictions: Prediction[];
  leagues: League[];
  members: LeagueMember[];
  shopItems: ShopItem[];
  ownedItems: string[];
}

async function loadAll(supabase: ReturnType<typeof createClient>): Promise<Data> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new api.QueryError("error.notAuthenticated");
  const userId = data.user.id;
  const [user, questions, predictions, leagues, members, shop] = await Promise.all([
    api.fetchProfile(supabase, userId),
    api.fetchQuestions(supabase),
    api.fetchMyPredictions(supabase, userId),
    api.fetchMyLeagues(supabase),
    api.fetchMembers(supabase),
    api.fetchShop(supabase),
  ]);
  return {
    user,
    email: data.user.email ?? null,
    questions,
    predictions,
    leagues,
    members,
    shopItems: shop.items,
    ownedItems: shop.owned,
  };
}

async function attempt<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof api.QueryError ? e.key : "error.generic" };
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [data, setData] = React.useState<Data | null>(null);
  const [failed, setFailed] = React.useState(false);

  const dataRef = React.useRef(data);

  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const reload = React.useCallback(async (): Promise<Data | null> => {
    try {
      const fresh = await loadAll(supabase);
      setData(fresh);
      setFailed(false);
      return fresh;
    } catch (e) {
      console.error(e);
      setFailed(true);
      return null;
    }
  }, [supabase]);

  React.useEffect(() => {
    let cancelled = false;
    loadAll(supabase)
      .then((d) => !cancelled && setData(d))
      .catch((e) => {
        console.error(e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Recharge en revenant sur l'onglet (questions résolues, gains reçus…)
  React.useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  // Classements en temps réel
  React.useEffect(
    () =>
      api.subscribeToMembers(supabase, (row, event) => {
        const current = dataRef.current;
        if (!current) return;
        const known = current.members.some((m) => m.league_id === row.league_id && m.user_id === row.user_id);
        if (event === "INSERT" && !known) {
          // Nouveau membre : on recharge pour récupérer son pseudo
          void reload();
          return;
        }
        setData((d) => {
          if (!d) return d;
          const members =
            event === "DELETE"
              ? d.members.filter((m) => !(m.league_id === row.league_id && m.user_id === row.user_id))
              : d.members.map((m) =>
                  m.league_id === row.league_id && m.user_id === row.user_id
                    ? { ...m, current_credits: row.current_credits }
                    : m,
                );
          const user = row.user_id === d.user.id && event !== "DELETE" ? { ...d.user, total_credits: row.current_credits } : d.user;
          return { ...d, members, user };
        });
      }),
    [supabase, reload],
  );

  const placeBet = React.useCallback<StoreValue["placeBet"]>(
    (questionId, answer, amount) =>
      attempt(async () => {
        const prediction = await api.placePrediction(supabase, questionId, answer, amount);
        setData((d) =>
          d && {
            ...d,
            user: { ...d.user, total_credits: d.user.total_credits - amount },
            predictions: [prediction, ...d.predictions],
            questions: d.questions.map((q) =>
              q.id === questionId
                ? { ...q, bettors: q.bettors + 1, pools: { ...q.pools, [answer]: (q.pools[answer] ?? 0) + amount } }
                : q,
            ),
          },
        );
        return prediction;
      }),
    [supabase],
  );

  const createLeague = React.useCallback<StoreValue["createLeague"]>(
    (name) =>
      attempt(async () => {
        const league = await api.createLeague(supabase, name.trim());
        await reload();
        return league;
      }),
    [supabase, reload],
  );

  const joinLeague = React.useCallback<StoreValue["joinLeague"]>(
    (code) =>
      attempt(async () => {
        const id = await api.joinLeague(supabase, code.trim().toUpperCase());
        const fresh = await reload();
        const league = fresh?.leagues.find((l) => l.id === id);
        if (!league) throw new api.QueryError("error.inviteCode");
        return league;
      }),
    [supabase, reload],
  );

  const updateUsername = React.useCallback<StoreValue["updateUsername"]>(
    (username) =>
      attempt(async () => {
        const clean = username.trim();
        if (clean.length < 3 || clean.length > 24) throw new api.QueryError("error.username");
        if (!data) throw new api.QueryError("error.notAuthenticated");
        await api.updateUsername(supabase, data.user.id, clean);
        setData((d) => d && { ...d, user: { ...d.user, username: clean } });
        await reload();
      }),
    [supabase, data, reload],
  );

  const createQuestion = React.useCallback<StoreValue["createQuestion"]>(
    (input) =>
      attempt(async () => {
        await api.createQuestion(supabase, input);
        await reload();
      }),
    [supabase, reload],
  );

  const resolveQuestion = React.useCallback<StoreValue["resolveQuestion"]>(
    (questionId, answer) =>
      attempt(async () => {
        await api.resolveQuestion(supabase, questionId, answer);
        await reload();
      }),
    [supabase, reload],
  );

  const cancelQuestion = React.useCallback<StoreValue["cancelQuestion"]>(
    (questionId) =>
      attempt(async () => {
        await api.cancelQuestion(supabase, questionId);
        await reload();
      }),
    [supabase, reload],
  );

  const buyItem = React.useCallback<StoreValue["buyItem"]>(
    (itemId) =>
      attempt(async () => {
        const url = await api.startCheckout(supabase, itemId);
        window.location.assign(url);
      }),
    [supabase],
  );

  const equipItem = React.useCallback<StoreValue["equipItem"]>(
    (kind, value) =>
      attempt(async () => {
        await api.equipItem(supabase, kind, value);
        setData((d) => d && { ...d, user: { ...d.user, [kind]: value } });
        await reload();
      }),
    [supabase, reload],
  );

  const manageSubscription = React.useCallback<StoreValue["manageSubscription"]>(
    () =>
      attempt(async () => {
        const url = await api.openBillingPortal(supabase);
        window.location.assign(url);
      }),
    [supabase],
  );

  const confirmPurchases = React.useCallback(async () => {
    const granted = await api.confirmPurchases(supabase);
    if (granted > 0) await reload();
    return granted;
  }, [supabase, reload]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const getMembers = React.useCallback<StoreValue["getMembers"]>(
    (leagueId) => (data?.members ?? []).filter((m) => m.league_id === leagueId),
    [data],
  );

  const value = React.useMemo<StoreValue | null>(
    () =>
      data && {
        user: data.user,
        email: data.email,
        questions: data.questions,
        predictions: data.predictions,
        leagues: data.leagues,
        shopItems: data.shopItems,
        ownedItems: data.ownedItems,
        newsSource: data.questions.some((q) => q.source?.name === "Polymarket") ? "live" : "pending",
        placeBet,
        createLeague,
        joinLeague,
        getMembers,
        updateUsername,
        createQuestion,
        resolveQuestion,
        cancelQuestion,
        buyItem,
        equipItem,
        manageSubscription,
        confirmPurchases,
        signOut,
      },
    [
      data,
      placeBet,
      createLeague,
      joinLeague,
      getMembers,
      updateUsername,
      createQuestion,
      resolveQuestion,
      cancelQuestion,
      buyItem,
      equipItem,
      manageSubscription,
      confirmPurchases,
      signOut,
    ],
  );

  if (!value) return <LoadingScreen failed={failed} onRetry={() => void reload()} />;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function LoadingScreen({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center" role="status">
      {failed ? (
        <>
          <p className="font-semibold">{t("app.loadError")}</p>
          <Button variant="outline" onClick={onRetry}>
            {t("app.retry")}
          </Button>
        </>
      ) : (
        <>
          <Loader2 aria-hidden className="size-6 animate-spin text-muted-foreground" />
          <span className="sr-only">{t("app.loading")}</span>
        </>
      )}
    </div>
  );
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return ctx;
}
