import type { SupabaseClient } from "@supabase/supabase-js";

import type { League, LeagueMember, Prediction, Question } from "@/lib/types";

/**
 * Requêtes Supabase prêtes à l'emploi. Elles renvoient exactement les
 * mêmes types que les données mock (src/lib/mock-data.ts), il suffit
 * donc de les appeler à la place du store pour passer en « vrai ».
 */

export async function fetchOpenQuestions(supabase: SupabaseClient): Promise<Question[]> {
  const [{ data: questions, error }, { data: pools, error: poolsError }] = await Promise.all([
    supabase.from("questions").select("*").order("deadline", { ascending: true }),
    supabase.from("question_pools").select("question_id, chosen_answer, pool, bettors"),
  ]);
  if (error) throw error;
  if (poolsError) throw poolsError;

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

export async function fetchMyPredictions(supabase: SupabaseClient): Promise<Prediction[]> {
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
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
  if (error) throw new Error(error.message);
  return data as Prediction;
}

export async function fetchMyLeagues(supabase: SupabaseClient): Promise<League[]> {
  const { data, error } = await supabase.from("leagues").select("*").order("created_at");
  if (error) throw error;
  return data as League[];
}

export async function createLeague(supabase: SupabaseClient, name: string): Promise<League> {
  const { data, error } = await supabase.rpc("create_league", { p_name: name });
  if (error) throw new Error(error.message);
  return data as League;
}

export async function joinLeague(supabase: SupabaseClient, code: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_league", { p_code: code });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function fetchLeaderboard(
  supabase: SupabaseClient,
  leagueId: string,
): Promise<LeagueMember[]> {
  const { data, error } = await supabase
    .from("league_members")
    .select("league_id, user_id, current_credits, users(username)")
    .eq("league_id", leagueId)
    .order("current_credits", { ascending: false });
  if (error) throw error;
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

/** Abonnement temps réel aux changements de crédits d'une ligue. */
export function subscribeToLeaderboard(
  supabase: SupabaseClient,
  leagueId: string,
  onChange: (row: { user_id: string; current_credits: number }) => void,
) {
  const channel = supabase
    .channel(`league:${leagueId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "league_members", filter: `league_id=eq.${leagueId}` },
      (payload) => onChange(payload.new as { user_id: string; current_credits: number }),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
