// Types alignés sur supabase/migrations/0001_init.sql

export const CATEGORIES = [
  "Monde & politique",
  "Macroéconomie",
  "Droit public",
  "Sport",
  "Pop culture",
  "Tech & crypto",
  "Absurde",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type QuestionStatus = "open" | "resolved" | "cancelled";

export interface User {
  id: string;
  username: string;
  total_credits: number;
  is_admin?: boolean;
}

export interface League {
  id: string;
  name: string;
  invite_code: string;
  admin_id: string;
  emoji?: string; // purement cosmétique (mock)
}

export interface LeagueMember {
  league_id: string;
  user_id: string;
  username: string; // jointure avec users
  current_credits: number;
}

export interface Question {
  id: string;
  title: string;
  description?: string;
  category: Category;
  options: string[];
  deadline: string; // ISO
  status: QuestionStatus;
  correct_answer: string | null;
  /** Cagnotte par option (vue question_pools) */
  pools: Record<string, number>;
  bettors: number;
  /** Origine de la question quand elle vient d'un marché réel (Polymarket) */
  source?: { name: string; url: string };
  image?: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  question_id: string;
  chosen_answer: string;
  wagered_amount: number;
  payout: number | null;
  created_at: string;
}
