// Suppression définitive du compte du joueur connecté (droit à l'effacement, RGPD).
// Appelée depuis les Réglages avec le jeton du joueur (verify_jwt = true).
//  1. résilie l'abonnement Club chez Stripe s'il y en a un ;
//  2. confie ses ligues à un autre membre (prepare_account_deletion) ;
//  3. supprime l'utilisateur : le profil, les paris, les objets… suivent (cascade).
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_ORIGINS = ["https://mvppronos.vercel.app", "http://localhost:3000"];

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

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: "error.notAuthenticated" }, 401);

  let body: { confirm?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (body.confirm !== "SUPPRIMER") return json({ error: "settings.deleteConfirmRequired" }, 400);

  // 1. Abonnement Club : résiliation immédiate
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const { data: billing } = await admin
    .from("billing_customers")
    .select("stripe_subscription_id, subscription_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (stripeKey && billing?.stripe_subscription_id && billing.subscription_status !== "canceled") {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(billing.stripe_subscription_id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (!res.ok && res.status !== 404) {
      console.error("Stripe cancel", res.status);
      return json({ error: "settings.deleteFailed" }, 502);
    }
  }

  // 2. Ligues
  const { error: prepError } = await admin.rpc("prepare_account_deletion", { p_user: user.id });
  if (prepError) {
    console.error("prepare_account_deletion", prepError.message);
    return json({ error: "settings.deleteFailed" }, 500);
  }

  // 3. Compte
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("deleteUser", error.message);
    return json({ error: "settings.deleteFailed" }, 500);
  }
  return json({ ok: true });
});
