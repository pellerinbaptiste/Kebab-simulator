import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { dictionaries, type MessageKey } from "@/lib/i18n/dictionaries";
import type { CosmeticKind, League, LeagueMember, Prediction, Question, ShopItem, User } from "@/lib/types";

/** Requêtes Supabase de l'app. La sécurité est assurée côté base (RLS + RPC). */

/**
 * Convertit une erreur Supabase en clé de traduction. Les RPC lèvent
 * directement des clés (`error.insufficient`…), voir supabase/migrations.
 */
export function toMessageKey(error: Pick<PostgrestError, "message" | "code"> | null | undefined): MessageKey {
  if (!error) return "error.generic";
  if (error.message in dictionaries.fr) return error.message as MessageKey;
  if (error.code === "23505") return "error.usernameTaken"; // contrainte unique (pseudo)
  if (error.code === "23514") return "error.username"; // contrainte de longueur
  return "error.generic";
}

export class QueryError extends Error {
  constructor(public readonly key: MessageKey) {
    super(key);
  }
}

function fail(error: PostgrestError): never {
  console.error("[supabase]", error);
  throw new QueryError(toMessageKey(error));
}

export async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, total_credits, is_admin, name_color, avatar_frame, badge, club_until")
    .eq("id", userId)
    .single();
  if (error) fail(error);
  return data as User;
}

export async function updateUsername(supabase: SupabaseClient, userId: string, username: string) {
  const { error } = await supabase.from("users").update({ username }).eq("id", userId);
  if (error) fail(error);
}

/** Questions ouvertes + celles des 30 derniers jours (pour l'historique des paris). */
export async function fetchQuestions(supabase: SupabaseClient): Promise<Question[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: questions, error }, { data: pools, error: poolsError }] = await Promise.all([
    supabase
      .from("questions")
      .select("*")
      .or(`status.eq.open,deadline.gte.${since}`)
      .order("deadline", { ascending: true })
      .limit(600),
    supabase.from("question_pools").select("question_id, chosen_answer, pool, bettors"),
  ]);
  if (error) fail(error);
  if (poolsError) fail(poolsError);

  return (questions ?? []).map((q) => {
    const rows = (pools ?? []).filter((p) => p.question_id === q.id);
    // Cagnottes = cotes de départ Polymarket (seed_pools) + vraies mises des joueurs
    const merged: Record<string, number> = { ...(q.seed_pools ?? {}) };
    for (const r of rows) merged[r.chosen_answer] = (merged[r.chosen_answer] ?? 0) + r.pool;
    return {
      id: q.id,
      title: q.title,
      description: q.description ?? undefined,
      category: q.category,
      options: q.options,
      deadline: q.deadline,
      status: q.status,
      correct_answer: q.correct_answer,
      pools: merged,
      bettors: rows.reduce((n, r) => n + r.bettors, 0),
      source: q.source && q.source_url ? { name: q.source, url: q.source_url } : undefined,
      image: q.image_url ?? undefined,
      translations: q.title_en ? { en: { title: q.title_en, description: q.description_en ?? undefined } } : undefined,
      optionLabels: q.option_labels ?? undefined,
    } as Question;
  });
}

export async function fetchMyPredictions(supabase: SupabaseClient, userId: string): Promise<Prediction[]> {
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) fail(error);
  return data as Prediction[];
}

export async function placePrediction(
  supabase: SupabaseClient,
  questionId: string,
  answer: string,
  amount: number,
): Promise<Prediction> {
  const { data, error } = await supabase.rpc("place_prediction", {
    p_question: questionId,
    p_answer: answer,
    p_amount: amount,
  });
  if (error) fail(error);
  return data as Prediction;
}

export interface NewQuestion {
  title: string;
  description?: string;
  category: Question["category"];
  options: string[];
  deadline: string; // ISO
}

/** Question « maison » créée par un admin (la RLS refuse les autres joueurs). */
export async function createQuestion(supabase: SupabaseClient, input: NewQuestion) {
  const { error } = await supabase.from("questions").insert({
    title: input.title,
    description: input.description || null,
    category: input.category,
    options: input.options,
    deadline: input.deadline,
  });
  if (error) fail(error);
}

/** Résolution par un admin : paie les gagnants. */
export async function resolveQuestion(supabase: SupabaseClient, questionId: string, answer: string) {
  const { error } = await supabase.rpc("resolve_question", { p_question: questionId, p_answer: answer });
  if (error) fail(error);
}

/** Annulation par un admin : toutes les mises sont remboursées. */
export async function cancelQuestion(supabase: SupabaseClient, questionId: string) {
  const { error } = await supabase.rpc("cancel_question", { p_question: questionId });
  if (error) fail(error);
}

export async function fetchMyLeagues(supabase: SupabaseClient): Promise<League[]> {
  // La RLS ne renvoie que les ligues dont on est membre
  const { data, error } = await supabase.from("leagues").select("*").order("created_at");
  if (error) fail(error);
  return data as League[];
}

/** Membres de toutes mes ligues (la RLS filtre), avec leur pseudo. */
export async function fetchMembers(supabase: SupabaseClient): Promise<LeagueMember[]> {
  const { data, error } = await supabase
    .from("league_members")
    .select("league_id, user_id, current_credits, users(username, name_color, avatar_frame, badge)")
    .order("current_credits", { ascending: false });
  if (error) fail(error);
  return (data ?? []).map((row) => {
    const u = row.users as unknown as Pick<User, "username" | "name_color" | "avatar_frame" | "badge"> | null;
    return {
      league_id: row.league_id,
      user_id: row.user_id,
      current_credits: row.current_credits,
      username: u?.username ?? "?",
      name_color: u?.name_color ?? null,
      avatar_frame: u?.avatar_frame ?? null,
      badge: u?.badge ?? null,
    };
  });
}

export async function createLeague(supabase: SupabaseClient, name: string): Promise<League> {
  const { data, error } = await supabase.rpc("create_league", { p_name: name });
  if (error) fail(error);
  return data as League;
}

export async function joinLeague(supabase: SupabaseClient, code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_league", { p_code: code });
  if (error) fail(error);
  return data as string;
}

/** Catalogue de la boutique et objets déjà achetés (la RLS ne renvoie que les miens). */
export async function fetchShop(supabase: SupabaseClient): Promise<{ items: ShopItem[]; owned: string[] }> {
  const [{ data: items, error }, { data: owned, error: ownedError }] = await Promise.all([
    supabase
      .from("shop_items")
      .select(
        "id, kind, value, name, name_en, description, description_en, price_cents, currency, bundle_items, club_included, available_until",
      )
      .order("sort"),
    supabase.from("user_items").select("item_id"),
  ]);
  if (error) fail(error);
  if (ownedError) fail(ownedError);
  return { items: (items ?? []) as ShopItem[], owned: (owned ?? []).map((r) => r.item_id as string) };
}

/** Appelle une fonction Edge qui renvoie { url } (paiement ou portail Stripe). */
async function invokeForUrl(supabase: SupabaseClient, name: string, body: object): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(name, { body });
  if (error) {
    // La fonction répond une clé de traduction dans { error }
    let key: string | undefined;
    try {
      key = (await (error as { context?: Response }).context?.json())?.error;
    } catch {
      key = undefined;
    }
    throw new QueryError(key && key in dictionaries.fr ? (key as MessageKey) : "shop.paymentFailed");
  }
  if (!data?.url) throw new QueryError("shop.paymentFailed");
  return data.url;
}

/** Ouvre un paiement Stripe (fonction Edge create-checkout) et renvoie son adresse. */
export function startCheckout(supabase: SupabaseClient, itemId: string): Promise<string> {
  return invokeForUrl(supabase, "create-checkout", { itemId, consent: true });
}

/** Portail Stripe pour gérer ou résilier l'abonnement Club. */
export function openBillingPortal(supabase: SupabaseClient): Promise<string> {
  return invokeForUrl(supabase, "billing-portal", {});
}

/**
 * Demande au serveur de vérifier auprès de Stripe mes achats en attente
 * (fonction Edge confirm-checkout). Renvoie le nombre d'objets débloqués.
 */
export async function confirmPurchases(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.functions.invoke<{ granted?: number }>("confirm-checkout", { body: {} });
  if (error) return 0; // simple filet de sécurité : le webhook reste la voie principale
  return data?.granted ?? 0;
}

/** Équipe (ou retire avec null) une couleur de pseudo, un cadre ou un badge. */
export async function equipItem(supabase: SupabaseClient, kind: CosmeticKind, value: string | null) {
  const { error } = await supabase.rpc("equip_item", { p_kind: kind, p_value: value });
  if (error) fail(error);
}

/** Abonnement temps réel aux crédits des membres de mes ligues (filtré par la RLS). */
export function subscribeToMembers(
  supabase: SupabaseClient,
  onChange: (row: { league_id: string; user_id: string; current_credits: number }, event: string) => void,
) {
  const channel = supabase
    .channel("league-members")
    .on("postgres_changes", { event: "*", schema: "public", table: "league_members" }, (payload) => {
      const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as {
        league_id: string;
        user_id: string;
        current_credits: number;
      };
      onChange(row, payload.eventType);
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
