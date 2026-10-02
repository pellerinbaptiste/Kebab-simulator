/**
 * Traduction automatique anglais → français des questions Polymarket.
 * Utilisée au moment du build (et par le script de synchronisation), jamais
 * dans le navigateur. En cas d'échec, le texte d'origine est conservé.
 *
 * Service : point d'accès public de Google Traduction (sans clé).
 * Ce fichier n'importe rien : il est aussi exécuté tel quel par Node.
 */

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const CONCURRENCY = 6;

async function translateOne(text: string, to: string, from: string, timeoutMs: number): Promise<string | null> {
  const params = new URLSearchParams({ client: "gtx", sl: from, tl: to, dt: "t", q: text });
  const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) return null;
  return parseGoogleResponse(await res.json());
}

/** Réponse : [[["Bonjour", "Hello", …], [segment suivant…]], …] */
export function parseGoogleResponse(data: unknown): string | null {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const parts = (data[0] as unknown[]).map((seg) => (Array.isArray(seg) && typeof seg[0] === "string" ? seg[0] : ""));
  const out = parts.join("").trim();
  return out || null;
}

/**
 * Traduit une liste de textes. Renvoie une Map texte d'origine → traduction,
 * qui ne contient que les traductions réussies.
 */
export async function translateTexts(
  texts: string[],
  { to = "fr", from = "en", timeoutMs = 6000, maxFailures = 5 } = {},
): Promise<Map<string, string>> {
  const unique = [...new Set(texts.map((t) => t.trim()).filter(Boolean))];
  const result = new Map<string, string>();
  let failures = 0;
  let index = 0;

  async function worker() {
    while (index < unique.length && failures < maxFailures) {
      const text = unique[index++];
      try {
        const translated = await translateOne(text, to, from, timeoutMs);
        if (translated) result.set(text, translated);
        else failures++;
      } catch {
        failures++;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker));
  if (failures >= maxFailures) console.warn(`[traduction] service indisponible, ${result.size}/${unique.length} textes traduits.`);
  return result;
}
