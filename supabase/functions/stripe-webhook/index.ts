// Reçoit les événements Stripe : débloque les achats payés et suit l'état
// de l'abonnement Club (création, renouvellement, résiliation).
// Appelée par Stripe, pas par un joueur : verify_jwt = false, l'authenticité
// est vérifiée par la signature Stripe (en-tête Stripe-Signature).
//
// Secret à définir dans Supabase (Edge Functions → Secrets) :
// STRIPE_WEBHOOK_SECRET (whsec_…), donné par Stripe à la création du webhook,
// et STRIPE_SECRET_KEY (pour relire l'abonnement).
//
// Événements à cocher dans Stripe : checkout.session.completed,
// checkout.session.async_payment_succeeded, customer.subscription.updated,
// customer.subscription.deleted, invoice.paid.
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

type Admin = ReturnType<typeof createClient>;

/** Fin de la période payée (champ déplacé sur les lignes dans les API Stripe récentes). */
function periodEnd(sub: Record<string, any>): string | null {
  const ts = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return typeof ts === "number" ? new Date(ts * 1000).toISOString() : null;
}

/** Relit l'abonnement chez Stripe et recopie son état dans la base. */
async function syncSubscription(admin: Admin, subscriptionId: string) {
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}` },
  });
  if (!res.ok) throw new Error(`Stripe ${res.status}`);
  const sub = await res.json();
  const userId = sub.metadata?.user_id;
  if (!userId) return;
  const { error } = await admin.rpc("apply_subscription", {
    p_user: userId,
    p_customer: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
    p_subscription: sub.id,
    p_status: sub.status,
    p_period_end: periodEnd(sub),
  });
  if (error) throw new Error(error.message);
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
  const object = event.data?.object ?? {};
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = object;
        const userId = session.metadata?.user_id ?? session.client_reference_id;
        const itemId = session.metadata?.item_id;
        if (!userId || !itemId) break;
        if (session.mode === "subscription") {
          if (session.status !== "complete") break;
        } else if (session.payment_status !== "paid") break;

        const { error } = await admin.rpc("grant_purchase", {
          p_session: session.id,
          p_user: userId,
          p_item: itemId,
          p_amount: session.amount_total ?? 0,
          p_currency: session.currency ?? "eur",
        });
        if (error) throw new Error(error.message);
        if (session.mode === "subscription" && session.subscription) {
          await syncSubscription(admin, typeof session.subscription === "string" ? session.subscription : session.subscription.id);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(admin, object.id);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const subId = object.subscription ?? object.parent?.subscription_details?.subscription;
        if (subId) await syncSubscription(admin, typeof subId === "string" ? subId : subId.id);
        break;
      }
    }
  } catch (e) {
    console.error(event.type, (e as Error).message);
    // 500 → Stripe réessaiera plus tard
    return new Response("sync failed", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
