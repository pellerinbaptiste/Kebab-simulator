// Ouvre le portail client Stripe : le joueur y gère et résilie son abonnement
// Club en quelques clics (obligation légale de résiliation en ligne).
// Appelée par la boutique avec le jeton du joueur connecté (verify_jwt = true).
//
// Le portail doit être activé une fois dans Stripe :
// Paramètres → Billing → Portail client → Enregistrer.
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

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "shop.notConfigured" }, 503);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: "error.notAuthenticated" }, 401);

  const { data: customer } = await admin.rpc("billing_customer_of", { p_user: user.id });
  if (!customer) return json({ error: "shop.noSubscription" }, 404);

  const site = origin && SITE_ORIGINS.includes(origin) ? origin : SITE_ORIGINS[0];
  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ customer: customer as string, return_url: `${site}/shop/`, locale: "auto" }),
  });
  const portal = await res.json();
  if (!res.ok || !portal.url) {
    console.error("Stripe portal", res.status, portal?.error?.message);
    return json({ error: "shop.portalFailed" }, 502);
  }
  return json({ url: portal.url });
});
