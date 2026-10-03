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
  /** Objets de la boutique équipés (cosmétiques, voir src/lib/cosmetics.ts) */
  name_color?: string | null;
  avatar_frame?: string | null;
  badge?: string | null;
  /** Abonnement Club actif jusqu'à cette date */
  club_until?: string | null;
}

export type CosmeticKind = "name_color" | "avatar_frame" | "badge";

export interface ShopItem {
  id: string;
  kind: CosmeticKind | "bundle" | "subscription";
  value: string;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
  price_cents: number;
  currency: string;
  bundle_items: string[];
  club_included: boolean;
  available_until: string | null;
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
  name_color?: string | null;
  avatar_frame?: string | null;
  badge?: string | null;
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
  /** Texte anglais (title/description sont en français, langue principale) */
  translations?: { en?: { title: string; description?: string } };
  /** Libellés affichés des options, par langue (la clé reste l'option) */
  optionLabels?: { fr?: Record<string, string>; en?: Record<string, string> };
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
