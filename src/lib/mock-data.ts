import type { League, LeagueMember, Prediction, Question, User } from "@/lib/types";

// Données factices pour tester l'UI sans Supabase.
// Les dates sont relatives à « maintenant » pour que le feed reste vivant.

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

export const CURRENT_USER_ID = "u-me";

export const mockUser: User = {
  id: CURRENT_USER_ID,
  username: "toi",
  // 1000 de départ + 80 de gain net sur la question « inflation » résolue
  total_credits: 1080,
};

export function buildMockQuestions(): Question[] {
  return [
    {
      id: "q-bce",
      title: "La BCE va-t-elle baisser ses taux directeurs ce jeudi ?",
      description:
        "Résolu selon le communiqué officiel publié à l'issue de la réunion de politique monétaire.",
      category: "Macroéconomie",
      options: ["Oui", "Non"],
      deadline: inHours(46),
      status: "open",
      correct_answer: null,
      pools: { Oui: 4200, Non: 2650 },
      bettors: 31,
    },
    {
      id: "q-chien",
      title: "Un chien va-t-il courir sur le terrain pendant le match de foot universitaire ?",
      description: "Une vidéo ou deux témoins fiables suffisent. Les chats ne comptent pas.",
      category: "Absurde",
      options: ["Oui", "Non"],
      deadline: inHours(5),
      status: "open",
      correct_answer: null,
      pools: { Oui: 1250, Non: 3900 },
      bettors: 24,
    },
    {
      id: "q-reforme",
      title: "La réforme de droit public sera-t-elle adoptée ?",
      description: "Vote définitif au Parlement avant la date limite.",
      category: "Droit public",
      options: ["Oui", "Non"],
      deadline: inHours(24 * 9),
      status: "open",
      correct_answer: null,
      pools: { Oui: 1800, Non: 2100 },
      bettors: 17,
    },
    {
      id: "q-marvel",
      title: "Le nouveau Marvel va-t-il dépasser 1 milliard $ au box-office ?",
      description: "Box-office mondial selon Box Office Mojo, 60 jours après la sortie.",
      category: "Pop culture",
      options: ["Oui", "Non"],
      deadline: inHours(24 * 20),
      status: "open",
      correct_answer: null,
      pools: { Oui: 2900, Non: 3300 },
      bettors: 28,
    },
    {
      id: "q-derby",
      title: "Qui va gagner le derby de ce week-end ?",
      description: "Score à la fin du temps réglementaire.",
      category: "Sport",
      options: ["Domicile", "Nul", "Extérieur"],
      deadline: inHours(70),
      status: "open",
      correct_answer: null,
      pools: { Domicile: 3100, Nul: 1400, Extérieur: 2200 },
      bettors: 35,
    },
    {
      id: "q-prof",
      title: "Combien de fois le prof va-t-il dire « en fait » en amphi lundi ?",
      description: "Compté par le délégué. Sa parole fait foi.",
      category: "Absurde",
      options: ["Moins de 10", "10 à 25", "Plus de 25"],
      deadline: inHours(90),
      status: "open",
      correct_answer: null,
      pools: { "Moins de 10": 600, "10 à 25": 1900, "Plus de 25": 1500 },
      bettors: 22,
    },
    {
      id: "q-inflation",
      title: "L'inflation en zone euro passera-t-elle sous 2 % ce mois-ci ?",
      category: "Macroéconomie",
      options: ["Oui", "Non"],
      deadline: inHours(-30),
      status: "resolved",
      correct_answer: "Oui",
      pools: { Oui: 2600, Non: 1400 },
      bettors: 19,
    },
  ];
}

export function buildMockPredictions(): Prediction[] {
  return [
    {
      id: "p-1",
      user_id: CURRENT_USER_ID,
      question_id: "q-inflation",
      chosen_answer: "Oui",
      wagered_amount: 150,
      payout: 230,
      created_at: inHours(-60),
    },
  ];
}

export const mockLeagues: League[] = [
  { id: "l-amphi", name: "Les Squatteurs de l'Amphi B", invite_code: "AMPHI7", admin_id: CURRENT_USER_ID, emoji: "🎓" },
  { id: "l-coloc", name: "Coloc du 3e", invite_code: "COLOC3", admin_id: "u-ines", emoji: "🏠" },
];

/** Ligues existantes que l'on peut rejoindre avec un code (démo). */
export const mockJoinableLeagues: League[] = [
  { id: "l-kebab", name: "Kebab Simulator FC", invite_code: "KEBAB1", admin_id: "u-hugo", emoji: "🥙" },
];

export const mockMembers: LeagueMember[] = [
  // L'utilisateur courant est ajouté dynamiquement avec son solde réel.
  { league_id: "l-amphi", user_id: "u-ines", username: "inès_la_bourse", current_credits: 1540 },
  { league_id: "l-amphi", user_id: "u-hugo", username: "hugo_all_in", current_credits: 1210 },
  { league_id: "l-amphi", user_id: "u-sarah", username: "sarah.law", current_credits: 1095 },
  { league_id: "l-amphi", user_id: "u-tom", username: "tom_le_chien", current_credits: 870 },
  { league_id: "l-amphi", user_id: "u-lea", username: "léa_macro", current_credits: 760 },
  { league_id: "l-amphi", user_id: "u-max", username: "maxou", current_credits: 415 },
  { league_id: "l-coloc", user_id: "u-ines", username: "inès_la_bourse", current_credits: 1540 },
  { league_id: "l-coloc", user_id: "u-nico", username: "nico_fait_la_vaisselle", current_credits: 990 },
  { league_id: "l-coloc", user_id: "u-jade", username: "jade", current_credits: 1325 },
  { league_id: "l-kebab", user_id: "u-hugo", username: "hugo_all_in", current_credits: 1210 },
  { league_id: "l-kebab", user_id: "u-samir", username: "samir_sauce_blanche", current_credits: 1650 },
  { league_id: "l-kebab", user_id: "u-chloe", username: "chloé_frites", current_credits: 940 },
];
