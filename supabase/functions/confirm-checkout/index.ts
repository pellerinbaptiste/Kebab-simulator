// Filet de sécurité du webhook : appelée par la boutique (joueur connecté,
// verify_jwt = true), elle demande à Stripe l'état des achats en attente du
// joueur et débloque ceux qui sont payés. Ainsi un objet arrive même si le
// webhook Stripe n'est pas configuré ou a été retardé. Elle resynchronise aussi
// l'abonnement Club (renouvellement ou résiliation manqués).
//
// Secret utilisé : STRIPE_SECRET_KEY (le même que create-checkout).
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_ORIGINS = ["https://mvppronos.vercel.app", "http://localhost:3000"];
/** On ne revérifie que les achats récents (une session Stripe expire après 24 h). */
const LOOKBACK_HOURS = 48;

function periodEnd(sub: Record<string, any>): string | null {
  const ts = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return typeof ts === "number" ? new Date(ts * 1000).toISOString() : null;
}

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

  const stripe = (path: string) =>
    fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${stripeKey}` } });

  /** Recopie l'état d'un abonnement Stripe ; renvoie vrai s'il a changé quelque chose. */
  async function syncSubscription(subscriptionId: string) {
    const res = await stripe(`subscriptions/${encodeURIComponent(subscriptionId)}`);
    if (!res.ok) return false;
    const sub = await res.json();
    if (sub.metadata?.user_id !== user!.id) return false;
    const { error: subError } = await admin.rpc("apply_subscription", {
      p_user: user!.id,
      p_customer: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
      p_subscription: sub.id,
      p_status: sub.status,
      p_period_end: periodEnd(sub),
    });
    if (subError) console.error("apply_subscription", subError.message);
    return !subError;
  }

  let granted = 0;
  for (const p of pending ?? []) {
    const res = await stripe(`checkout/sessions/${encodeURIComponent(p.stripe_session_id)}`);
    if (!res.ok) continue;
    const session = await res.json();
    // Payé (ou abonnement démarré), et bien pour ce joueur et cet objet
    const done = session.mode === "subscription" ? session.status === "complete" : session.payment_status === "paid";
    if (!done) continue;
    if ((session.metadata?.user_id ?? session.client_reference_id) !== user.id) continue;
    if (session.metadata?.item_id !== p.item_id) continue;

    const { error: grantError } = await admin.rpc("grant_purchase", {
      p_session: session.id,
      p_user: user.id,
      p_item: p.item_id,
      p_amount: session.amount_total ?? 0,
      p_currency: session.currency ?? "eur",
    });
    if (grantError) {
      console.error("grant_purchase", grantError.message);
      continue;
    }
    granted++;
    if (session.mode === "subscription" && session.subscription) {
      await syncSubscription(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
    }
  }

  // Abonnement existant : on recopie son état (renouvelé, résilié…)
  const { data: billing } = await admin
    .from("billing_customers")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (billing?.stripe_subscription_id) {
    const { data: before } = await admin.from("users").select("club_until").eq("id", user.id).single();
    await syncSubscription(billing.stripe_subscription_id);
    const { data: after } = await admin.from("users").select("club_until").eq("id", user.id).single();
    if (before?.club_until !== after?.club_until) granted++;
  }
  return json({ granted });
});
