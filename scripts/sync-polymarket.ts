/**
 * Synchronise les questions Polymarket avec Supabase (mode « vraie base »).
 *  1. ajoute de nouveaux marchés d'actualité dans `questions`, pour que chaque
 *     catégorie ait environ OPEN_TARGET questions ouvertes ;
 *  2. résout les questions dont le marché Polymarket est terminé et paie les gagnants.
 *
 * Lancé toutes les heures par .github/workflows/sync-markets.yml, ou à la main :
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run sync:polymarket
 *
 * La clé service_role contourne la RLS : elle ne doit JAMAIS être exposée au
 * navigateur (pas de préfixe NEXT_PUBLIC_).
 */
import { createClient } from "@supabase/supabase-js";

import {
  GAMMA_API,
  fetchPolymarketFeeds,
  eventsToQuestions,
  resolvedAnswer,
  selectBalanced,
  translateQuestionsToFrench,
  type GammaEvent,
} from "../src/lib/polymarket.ts";

/** Nombre visé de questions ouvertes par catégorie (onglet). */
const OPEN_TARGET = 40;
/** Plafond de nouvelles questions par catégorie et par passage (pour étaler les arrivées). */
const MAX_NEW_PER_RUN = 15;

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.log("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents : synchronisation ignorée (mode démo).");
  process.exit(0);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const externalId = (questionId: string) => `polymarket:${questionId.replace(/^pm-/, "")}`;

async function importNewQuestions() {
  const now = Date.now();
  const candidates = eventsToQuestions(await fetchPolymarketFeeds({ now }), { max: Infinity, now });

  // Déjà importées (ouvertes ou non) : on ne les reprend pas
  const ids = candidates.map((q) => externalId(q.id));
  const known = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase.from("questions").select("external_id").in("external_id", ids.slice(i, i + 200));
    if (error) throw error;
    for (const row of data ?? []) known.add(row.external_id as string);
  }

  // Questions encore ouvertes par catégorie
  const { data: open, error } = await supabase
    .from("questions")
    .select("category")
    .eq("status", "open")
    .gt("deadline", new Date(now).toISOString());
  if (error) throw error;
  const openCount = new Map<string, number>();
  for (const row of open ?? []) openCount.set(row.category, (openCount.get(row.category) ?? 0) + 1);

  const fresh = candidates.filter((q) => !known.has(externalId(q.id)));
  const selected = selectBalanced(fresh, {
    now,
    quota: (c) => Math.min(MAX_NEW_PER_RUN, Math.max(0, OPEN_TARGET - (openCount.get(c) ?? 0))),
  });
  const questions = await translateQuestionsToFrench(selected);

  const rows = questions.map((q) => ({
    external_id: externalId(q.id),
    title: q.title,
    description: q.description ?? null,
    category: q.category,
    options: q.options,
    deadline: q.deadline,
    source: q.source?.name ?? "Polymarket",
    source_url: q.source?.url ?? null,
    image_url: q.image ?? null,
    title_en: q.translations?.en?.title ?? null,
    description_en: q.translations?.en?.description ?? null,
    option_labels: q.optionLabels ?? null,
    seed_pools: q.pools,
  }));
  // Insertion seule : on ne modifie jamais une question sur laquelle on a peut-être déjà parié.
  if (rows.length) {
    const { error: insertError } = await supabase
      .from("questions")
      .upsert(rows, { onConflict: "external_id", ignoreDuplicates: true });
    if (insertError) throw insertError;
  }

  const perCategory = new Map<string, number>();
  for (const q of questions) perCategory.set(q.category, (perCategory.get(q.category) ?? 0) + 1);
  console.log(`Import : ${candidates.length} marchés utilisables, ${fresh.length} nouveaux, ${rows.length} ajoutés.`);
  for (const [category, n] of perCategory) console.log(`  ${category} : +${n} (déjà ouvertes : ${openCount.get(category) ?? 0})`);
}

async function resolveFinishedQuestions() {
  const { data, error } = await supabase
    .from("questions")
    .select("id, external_id, options")
    .eq("status", "open")
    .like("external_id", "polymarket:%")
    .lte("deadline", new Date().toISOString());
  if (error) throw error;

  for (const q of data ?? []) {
    const eventId = String(q.external_id).slice("polymarket:".length);
    const res = await fetch(`${GAMMA_API}/events/${encodeURIComponent(eventId)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`Événement ${eventId} : HTTP ${res.status}, on réessaiera.`);
      continue;
    }
    const answer = resolvedAnswer((await res.json()) as GammaEvent, q.options as string[]);
    if (answer === undefined) continue; // pas encore tranché

    const { error: rpcError } = await supabase.rpc("resolve_question_internal", {
      p_question: q.id,
      p_answer: answer,
    });
    if (rpcError) console.error(`Résolution de ${q.id} impossible :`, rpcError.message);
    else console.log(`Question ${q.id} ${answer === null ? "annulée (remboursée)" : `résolue : ${answer}`}.`);
  }
}

await importNewQuestions();
await resolveFinishedQuestions();
