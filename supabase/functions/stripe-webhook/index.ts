// Reçoit les événements Stripe et débloque l'objet payé.
// Appelée par Stripe, pas par un joueur : verify_jwt = false, l'authenticité
// est vérifiée par la signature Stripe (en-tête Stripe-Signature).
//
// Secret à définir dans Supabase (Edge Functions → Secrets) :
// STRIPE_WEBHOOK_SECRET (whsec_…), donné par Stripe à la création du webhook.
import { createClient } from "npm:@supabase/supabase-js@2";

const TOLERANCE_SECONDS = 300;

async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Vérifie l'en-tête « t=…,v1=… » de Stripe (HMAC-SHA256 de « t.corps »). */
async function verifySignature(header: string | null, body: string, secret: string) {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > TOLERANCE_SECONDS) return false;
  const expected = await hmacHex(secret, `${t}.${body}`);
  return signatures.some((s) => safeEqual(s, expected));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return new Response("Not configured", { status: 503 });

  const body = await req.text();
  if (!(await verifySignature(req.headers.get("Stripe-Signature"), body, secret))) {
    return new Response("Bad signature", { status: 400 });
  }

  const event = JSON.parse(body);
  const paidEvent =
    event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded";
  const session = event.data?.object;
  if (!paidEvent || session?.payment_status !== "paid") return new Response("ignored", { status: 200 });

  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const itemId = session.metadata?.item_id;
  if (!userId || !itemId) return new Response("missing metadata", { status: 200 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { error } = await admin.rpc("grant_purchase", {
    p_session: session.id,
    p_user: userId,
    p_item: itemId,
    p_amount: session.amount_total ?? 0,
    p_currency: session.currency ?? "eur",
  });
  if (error) {
    console.error("grant_purchase", error.message);
    // 500 → Stripe réessaiera plus tard
    return new Response("grant failed", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
