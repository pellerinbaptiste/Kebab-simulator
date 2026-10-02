/**
 * Synchronise les questions Polymarket avec Supabase (mode « vraie base »).
 *  1. ajoute les nouveaux marchés d'actualité dans `questions` ;
 *  2. résout les questions dont le marché Polymarket est terminé et paie les gagnants.
 *
 * Lancé toutes les 3 h par .github/workflows/sync-markets.yml, ou à la main :
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run sync:polymarket
 *
 * La clé service_role contourne la RLS : elle ne doit JAMAIS être exposée au
 * navigateur (pas de préfixe NEXT_PUBLIC_).
 */
import { createClient } from "@supabase/supabase-js";

import {
  GAMMA_API,
  fetchPolymarketEvents,
  eventsToQuestions,
  resolvedAnswer,
  type GammaEvent,
} from "../src/lib/polymarket.ts";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.log("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents : synchronisation ignorée (mode démo).");
  process.exit(0);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const externalId = (questionId: string) => `polymarket:${questionId.replace(/^pm-/, "")}`;

async function importNewQuestions() {
  const events = await fetchPolymarketEvents({ limit: 80 });
  const questions = eventsToQuestions(events, { max: 30 });
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
    seed_pools: q.pools,
  }));
  // Insertion seule : on ne modifie jamais une question sur laquelle on a peut-être déjà parié.
  const { error, count } = await supabase
    .from("questions")
    .upsert(rows, { onConflict: "external_id", ignoreDuplicates: true, count: "exact" });
  if (error) throw error;
  console.log(`Import : ${rows.length} marchés lus, ${count ?? "?"} nouvelles questions.`);
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
