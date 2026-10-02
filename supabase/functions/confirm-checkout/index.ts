// Filet de sécurité du webhook : appelée par la boutique (joueur connecté,
// verify_jwt = true), elle demande à Stripe l'état des achats en attente du
// joueur et débloque ceux qui sont payés. Ainsi un objet arrive même si le
// webhook Stripe n'est pas configuré ou a été retardé.
//
// Secret utilisé : STRIPE_SECRET_KEY (le même que create-checkout).
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_ORIGINS = ["https://mvppronos.vercel.app", "http://localhost:3000"];
/** On ne revérifie que les achats récents (une session Stripe expire après 24 h). */
const LOOKBACK_HOURS = 48;

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && SITE_ORIGINS.includes(origin) ? origin : SITE_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "error.generic" }, 405);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ granted: 0 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: "error.notAuthenticated" }, 401);

  const since = new Date(Date.now() - LOOKBACK_HOURS * 3_600_000).toISOString();
  const { data: pending, error } = await admin
    .from("purchases")
    .select("stripe_session_id, item_id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .gte("created_at", since)
    .limit(10);
  if (error) return json({ error: "error.generic" }, 500);

  let granted = 0;
  for (const p of pending ?? []) {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(p.stripe_session_id)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (!res.ok) continue;
    const session = await res.json();
    // Payé, et bien pour ce joueur et cet objet
    if (session.payment_status !== "paid") continue;
    if ((session.metadata?.user_id ?? session.client_reference_id) !== user.id) continue;
    if (session.metadata?.item_id !== p.item_id) continue;

    const { error: grantError } = await admin.rpc("grant_purchase", {
      p_session: session.id,
      p_user: user.id,
      p_item: p.item_id,
      p_amount: session.amount_total ?? 0,
      p_currency: session.currency ?? "eur",
    });
    if (grantError) console.error("grant_purchase", grantError.message);
    else granted++;
  }
  return json({ granted });
});
