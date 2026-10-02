import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { dictionaries, type MessageKey } from "@/lib/i18n/dictionaries";
import type { League, LeagueMember, Prediction, Question, User } from "@/lib/types";

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
    .select("id, username, total_credits, is_admin")
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
      .limit(200),
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
    .select("league_id, user_id, current_credits, users(username)")
    .order("current_credits", { ascending: false });
  if (error) fail(error);
  return (data ?? []).map((row) => {
    const u = row.users as unknown as { username: string } | null;
    return {
      league_id: row.league_id,
      user_id: row.user_id,
      current_credits: row.current_credits,
      username: u?.username ?? "?",
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
