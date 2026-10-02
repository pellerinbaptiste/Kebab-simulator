// Ouvre un paiement Stripe Checkout pour un objet de la boutique.
// Appelée par le site avec le jeton du joueur connecté (verify_jwt = true).
// Le prix vient toujours de la table shop_items, jamais du navigateur.
//
// Secret à définir dans Supabase (Edge Functions → Secrets) : STRIPE_SECRET_KEY.
// Tant qu'il manque, la fonction répond « shop.notConfigured ».
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

  let body: { itemId?: string; consent?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "error.generic" }, 400);
  }
  // Contenu numérique livré tout de suite : renonciation expresse au droit de rétractation
  if (body.consent !== true) return json({ error: "shop.consentRequired" }, 400);

  const { data: item } = await admin
    .from("shop_items")
    .select("id, name, price_cents, currency")
    .eq("id", body.itemId ?? "")
    .eq("active", true)
    .maybeSingle();
  if (!item) return json({ error: "shop.unknownItem" }, 404);

  const { data: owned } = await admin
    .from("user_items")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("item_id", item.id)
    .maybeSingle();
  if (owned) return json({ error: "shop.alreadyOwned" }, 409);

  const site = origin && SITE_ORIGINS.includes(origin) ? origin : SITE_ORIGINS[0];
  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": item.currency,
    "line_items[0][price_data][unit_amount]": String(item.price_cents),
    "line_items[0][price_data][product_data][name]": `PronoLeague · ${item.name}`,
    success_url: `${site}/shop/?paid=1`,
    cancel_url: `${site}/shop/?cancelled=1`,
    client_reference_id: user.id,
    "metadata[user_id]": user.id,
    "metadata[item_id]": item.id,
    "payment_intent_data[metadata][user_id]": user.id,
    "payment_intent_data[metadata][item_id]": item.id,
    locale: "auto",
  });
  if (user.email) form.set("customer_email", user.email);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const session = await res.json();
  if (!res.ok || !session.url) {
    console.error("Stripe", res.status, session?.error?.message);
    return json({ error: "shop.paymentFailed" }, 502);
  }

  // Trace de l'achat en attente (le webhook le passera à « paid »)
  const { error } = await admin.from("purchases").insert({
    user_id: user.id,
    item_id: item.id,
    stripe_session_id: session.id,
    amount_cents: item.price_cents,
    currency: item.currency,
  });
  if (error) console.error("purchases", error.message);

  return json({ url: session.url });
});
