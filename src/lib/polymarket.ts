import type { Category, Question } from "@/lib/types";

import { translateTexts } from "./translate.ts";

/**
 * Questions d'actualité tirées des marchés publics de Polymarket
 * (API Gamma, lecture seule, sans clé). Les probabilités Polymarket servent
 * de cotes de départ : on les convertit en cagnottes virtuelles (`pools`),
 * que les paris des joueurs font ensuite bouger.
 *
 * Les textes Polymarket sont en anglais : ils sont gardés dans
 * `translations.en` et traduits en français par `translateQuestionsToFrench`.
 *
 * Ce fichier n'importe que des types et ./translate.ts : il est aussi exécuté
 * tel quel par Node dans scripts/sync-polymarket.ts.
 */

export const GAMMA_API = "https://gamma-api.polymarket.com";

/** Mise virtuelle totale injectée pour refléter les cotes Polymarket. */
export const SEED_LIQUIDITY = 5000;

const MAX_OPTIONS = 4;
const MIN_HOURS_LEFT = 2;
const MAX_DAYS_LEFT = 120;

// --- Forme (partielle) des réponses de l'API Gamma -------------------------

export interface GammaTag {
  label?: string;
  slug?: string;
}

export interface GammaMarket {
  id?: string;
  question?: string;
  groupItemTitle?: string;
  outcomes?: string | string[];
  outcomePrices?: string | string[];
  endDate?: string;
  active?: boolean;
  closed?: boolean;
}

export interface GammaEvent {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  endDate?: string;
  image?: string;
  icon?: string;
  active?: boolean;
  closed?: boolean;
  volume24hr?: number | string;
  tags?: GammaTag[];
  markets?: GammaMarket[];
}

// --- Récupération -------------------------------------------------------------

export function eventsUrl(limit = 60, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    active: "true",
    closed: "false",
    archived: "false",
    order: "volume24hr",
    ascending: "false",
    limit: String(limit),
    ...extra,
  });
  return `${GAMMA_API}/events?${params}`;
}

export async function fetchPolymarketEvents(
  { limit = 60, timeoutMs = 8000, extra }: { limit?: number; timeoutMs?: number; extra?: Record<string, string> } = {},
): Promise<GammaEvent[]> {
  const res = await fetch(eventsUrl(limit, extra), {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Polymarket a répondu ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("Réponse Polymarket inattendue");
  return data as GammaEvent[];
}

/**
 * Thèmes Polymarket interrogés en plus des marchés les plus actifs, pour que
 * chaque onglet ait des questions (sinon le sport et la crypto prennent tout).
 */
export const TOPIC_TAGS = [
  "pop-culture",
  "movies",
  "music",
  "celebrities",
  "awards",
  "courts",
  "supreme-court",
  "legal-cases",
  "weather",
  "science",
  "tech",
  "crypto",
  "economy",
  "sports",
  "politics",
  "world",
];

/**
 * Récupère un large éventail d'événements : les plus actifs (3 pages), ceux qui
 * se terminent dans les 3 jours (questions à court terme) et ceux de chaque thème.
 * Les doublons sont retirés ; un flux en échec est simplement ignoré.
 */
export async function fetchPolymarketFeeds({ now = Date.now() }: { now?: number } = {}): Promise<GammaEvent[]> {
  const iso = (ms: number) => new Date(ms).toISOString();
  const soon = { end_date_min: iso(now + MIN_HOURS_LEFT * 3_600_000), end_date_max: iso(now + 3 * 86_400_000) };
  const feeds: Record<string, string>[] = [
    {},
    { offset: "100" },
    { offset: "200" },
    soon,
    { ...soon, offset: "100" },
    ...TOPIC_TAGS.map((tag) => ({ tag_slug: tag })),
  ];
  const results = await Promise.allSettled(feeds.map((extra) => fetchPolymarketEvents({ limit: 100, extra })));
  const byId = new Map<string, GammaEvent>();
  for (const r of results) {
    if (r.status === "rejected") {
      console.warn("[polymarket] flux ignoré :", (r.reason as Error).message);
      continue;
    }
    for (const e of r.value) if (e.id && !byId.has(e.id)) byId.set(e.id, e);
  }
  return [...byId.values()];
}

/**
 * Récupère et convertit les questions (traduites en français si `translate`).
 * Ne lève jamais : renvoie [] en cas d'échec.
 */
export async function fetchPolymarketQuestions(
  options: { limit?: number; max?: number; timeoutMs?: number; now?: number; translate?: boolean } = {},
): Promise<Question[]> {
  try {
    const events = await fetchPolymarketEvents(options);
    const questions = eventsToQuestions(events, { max: options.max, now: options.now });
    return options.translate ? await translateQuestionsToFrench(questions) : questions;
  } catch (error) {
    console.warn("[polymarket] récupération impossible :", (error as Error).message);
    return [];
  }
}

// --- Conversion -----------------------------------------------------------------

/** Les champs outcomes / outcomePrices sont des tableaux encodés en JSON. */
function parseList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const CATEGORY_RULES: [Category, RegExp][] = [
  ["Droit public", /\b(court|courts|scotus|supreme court|legal|legal cases|law|trial|lawsuit|indictment|sentenced|convicted|charged|prison)\b/],
  // Petites questions du quotidien : météo du jour, compteurs de tweets, vues YouTube, ovnis…
  ["Absurde", /\b(weather|temperature|tweets?|mrbeast|views|aliens?|ufos?|jesus|mention|mentions|say)\b/],
  ["Sport", /\b(sports?|soccer|football|nba|nfl|mlb|nhl|tennis|f1|formula 1|ufc|boxing|golf|olympics|champions league|world cup|premier league|ligue 1|cricket|chess|esports)\b/],
  ["Macroéconomie", /\b(economy|economics|fed|fed rates|ecb|interest rates?|inflation|recession|gdp|jobs|stocks?|finance|business|earnings|tariffs?|commodities|ipos?)\b/],
  ["Pop culture", /\b(pop culture|culture|movies?|box office|music|album|entertainment|celebrities|awards|oscars|grammys|emmys|tv|netflix|gaming|youtube|tiktok|james bond|eurovision)\b/],
  ["Tech & crypto", /\b(crypto|bitcoin|ethereum|solana|tech|ai|openai|science|space|spacex|elon musk)\b/],
  ["Monde & politique", /\b(politics|elections?|geopolitics|world|global|ukraine|russia|israel|china|middle east|europe|france|trump|president|parliament)\b/],
];

export function categorize(tags: GammaTag[] | undefined, title = ""): Category {
  const haystack = [...(tags ?? []).flatMap((t) => [t.label, t.slug]), title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/-/g, " ");
  for (const [category, re] of CATEGORY_RULES) if (re.test(haystack)) return category;
  return "Monde & politique";
}

const YES_NO: Record<string, string> = { yes: "Oui", no: "Non" };

function toPools(options: string[], probabilities: number[]) {
  const total = probabilities.reduce((a, b) => a + b, 0);
  const pools: Record<string, number> = {};
  options.forEach((opt, i) => {
    const p = total > 0 ? probabilities[i] / total : 1 / options.length;
    // Plancher de 1 % pour qu'aucune option n'ait une cote infinie
    pools[opt] = Math.round(Math.max(p, 0.01) * SEED_LIQUIDITY);
  });
  return pools;
}

function isOpenMarket(m: GammaMarket) {
  return m.active !== false && m.closed !== true;
}

/** Paris de spécialistes (écarts de points, totaux, mi-temps…) : peu parlants pour des amis. */
const NICHE_BET =
  /\b(spread|handicap|o\/u|over\/under|exact margin|more markets|both teams to score|correct score|total (?:games|sets|points|goals|corners|kills|maps|rounds)|1st half|2nd half|first half|second half|1st quarter|player props?)\b/i;

function isNiche(text: string | undefined) {
  return Boolean(text && NICHE_BET.test(text));
}

/** Convertit un événement Polymarket en question, ou null s'il ne convient pas. */
export function eventToQuestion(event: GammaEvent, now = Date.now()): Question | null {
  if (!event.id || !event.title || event.closed || isNiche(event.title)) return null;

  const markets = (event.markets ?? []).filter(
    (m) => isOpenMarket(m) && !isNiche(m.groupItemTitle) && !isNiche(m.question),
  );
  if (markets.length === 0) return null;

  const deadline = event.endDate ?? markets[0].endDate;
  const end = deadline ? Date.parse(deadline) : NaN;
  if (!Number.isFinite(end)) return null;
  const hoursLeft = (end - now) / 3_600_000;
  if (hoursLeft < MIN_HOURS_LEFT || hoursLeft > MAX_DAYS_LEFT * 24) return null;

  let options: string[];
  let probabilities: number[];
  let title = event.title;

  if (markets.length === 1) {
    // Marché simple : Oui/Non ou deux issues nommées (ex. deux équipes)
    const m = markets[0];
    const outcomes = parseList(m.outcomes);
    const prices = parseList(m.outcomePrices).map(Number);
    if (outcomes.length < 2 || prices.length !== outcomes.length || prices.some((p) => !Number.isFinite(p)))
      return null;
    options = outcomes.map((o) => YES_NO[o.trim().toLowerCase()] ?? o.trim());
    probabilities = prices;
    title = m.question?.trim() || title;
  } else {
    // Événement à plusieurs marchés Oui/Non (ex. « Qui va gagner ? ») → QCM
    const candidates = markets
      .map((m) => {
        const outcomes = parseList(m.outcomes).map((o) => o.toLowerCase());
        const prices = parseList(m.outcomePrices).map(Number);
        const yes = prices[outcomes.indexOf("yes")];
        const label = (m.groupItemTitle || m.question || "").trim();
        return { label, yes };
      })
      .filter((c) => c.label && Number.isFinite(c.yes))
      .sort((a, b) => b.yes - a.yes)
      .slice(0, MAX_OPTIONS);
    if (candidates.length < 2) return null;
    options = candidates.map((c) => c.label);
    probabilities = candidates.map((c) => c.yes);
  }

  if (new Set(options).size !== options.length) return null;

  const description = shorten(event.description);
  const namedOptions = options.filter((o) => o !== "Oui" && o !== "Non");

  return {
    id: `pm-${event.id}`,
    title,
    description,
    category: categorize(event.tags, event.title),
    options,
    deadline: new Date(end).toISOString(),
    status: "open",
    correct_answer: null,
    pools: toPools(options, probabilities),
    bettors: 0,
    source: {
      name: "Polymarket",
      url: event.slug ? `https://polymarket.com/event/${event.slug}` : "https://polymarket.com",
    },
    image: event.icon || event.image || undefined,
    translations: { en: { title, description } },
    optionLabels: namedOptions.length ? { en: Object.fromEntries(namedOptions.map((o) => [o, o])) } : undefined,
  };
}

/** Les descriptions Polymarket (règles de résolution) sont longues : on garde le début. */
function shorten(text: string | undefined, max = 360) {
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40))}…`;
}

/**
 * Traduit titres, descriptions et options en français. Les textes anglais
 * restent dans `translations.en` / `optionLabels.en` pour le réglage « English ».
 * Si la traduction échoue, le texte anglais est affiché tel quel.
 */
export async function translateQuestionsToFrench(questions: Question[]): Promise<Question[]> {
  const texts = questions.flatMap((q) => [
    q.title,
    ...(q.description ? [q.description] : []),
    ...Object.keys(q.optionLabels?.en ?? {}),
  ]);
  const fr = await translateTexts(texts);
  const tr = (text: string) => fr.get(text.trim()) ?? text;

  return questions.map((q) => {
    const enOptions = Object.keys(q.optionLabels?.en ?? {});
    return {
      ...q,
      title: tr(q.title),
      description: q.description ? tr(q.description) : undefined,
      optionLabels: enOptions.length
        ? { ...q.optionLabels, fr: Object.fromEntries(enOptions.map((o) => [o, tr(o)])) }
        : q.optionLabels,
    };
  });
}

export function eventsToQuestions(
  events: GammaEvent[],
  { max = 24, now = Date.now() }: { max?: number; now?: number } = {},
): Question[] {
  const out: Question[] = [];
  for (const event of events) {
    const q = eventToQuestion(event, now);
    if (q) out.push(q);
    if (out.length >= max) break;
  }
  return out;
}

/** Famille de questions répétitives (« Highest temperature in … », « Elon Musk # tweets … »). */
export function seriesKey(title: string) {
  return title.toLowerCase().replace(/[^a-z ]+/g, " ").trim().split(/\s+/).slice(0, 3).join(" ");
}

/**
 * Choisit les questions à ajouter, catégorie par catégorie, jusqu'à `quota(catégorie)`.
 * Les questions qui se terminent dans la semaine passent en premier (on veut
 * des résultats qui tombent souvent), puis l'ordre d'origine (volume Polymarket).
 * Au plus `maxPerSeries` questions d'une même famille par catégorie.
 */
export function selectBalanced(
  questions: Question[],
  { quota, maxPerSeries = 4, now = Date.now() }: { quota: (c: Category) => number; maxPerSeries?: number; now?: number },
): Question[] {
  const weekEnd = now + 7 * 86_400_000;
  const ranked = questions
    .map((q, i) => ({ q, i, soon: Date.parse(q.deadline) <= weekEnd ? 0 : 1 }))
    .sort((a, b) => a.soon - b.soon || a.i - b.i)
    .map((x) => x.q);

  const taken = new Map<Category, number>();
  const series = new Map<string, number>();
  const out: Question[] = [];
  for (const q of ranked) {
    const n = taken.get(q.category) ?? 0;
    if (n >= quota(q.category)) continue;
    const key = `${q.category}|${seriesKey(q.translations?.en?.title ?? q.title)}`;
    const s = series.get(key) ?? 0;
    if (s >= maxPerSeries) continue;
    taken.set(q.category, n + 1);
    series.set(key, s + 1);
    out.push(q);
  }
  return out;
}

// --- Résolution -----------------------------------------------------------------

const WIN_THRESHOLD = 0.99;

/**
 * Réponse gagnante d'un événement Polymarket terminé, parmi `options`.
 * - `undefined` : pas encore tranché, on attend ;
 * - `null` : tranché, mais l'issue gagnante ne fait pas partie de nos options
 *   (ou marché annulé) → la question est annulée et les mises remboursées.
 */
export function resolvedAnswer(event: GammaEvent, options: string[]): string | null | undefined {
  const markets = event.markets ?? [];
  const finished = event.closed === true || (markets.length > 0 && markets.every((m) => m.closed === true));
  if (!finished) return undefined;

  if (markets.length === 1) {
    const outcomes = parseList(markets[0].outcomes);
    const prices = parseList(markets[0].outcomePrices).map(Number);
    const i = prices.findIndex((p) => p >= WIN_THRESHOLD);
    if (i < 0 || !outcomes[i]) return null;
    const answer = YES_NO[outcomes[i].trim().toLowerCase()] ?? outcomes[i].trim();
    return options.includes(answer) ? answer : null;
  }

  for (const m of markets) {
    const outcomes = parseList(m.outcomes).map((o) => o.toLowerCase());
    const yes = parseList(m.outcomePrices).map(Number)[outcomes.indexOf("yes")];
    const label = (m.groupItemTitle || m.question || "").trim();
    if (yes >= WIN_THRESHOLD) return options.includes(label) ? label : null;
  }
  return null;
}
