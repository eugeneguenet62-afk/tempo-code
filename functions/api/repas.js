/* Tempo : analyse d'une assiette en photo (fonction Cloudflare Pages, adresse /api/repas).
   - Réservée aux personnes connectées : on vérifie le jeton Firebase (signature RS256 de Google, projet, expiration).
   - Au moins 2 photos sous des angles différents (sinon des aliments peuvent être cachés), 4 au plus.
   - Les photos sont envoyées à Claude Haiku (Anthropic) pour l'analyse, puis oubliées : rien n'est stocké ici.
   - La clé de l'API reste secrète côté serveur : variable d'environnement ANTHROPIC_API_KEY (Cloudflare → Settings → Variables and Secrets). */

const PROJECT = "tempo-ee0c0";
const MODEL = "claude-haiku-5-5";
const MAX_IMG = 4, MIN_IMG = 2, MAX_B64 = 1_600_000;   // ~1,2 Mo par photo une fois décodée

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

/* ---------- Vérification du jeton Firebase ---------- */
let JWKS = null, JWKS_AT = 0;
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
async function keys() {
  if (JWKS && Date.now() - JWKS_AT < 3600e3) return JWKS;
  const r = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  if (!r.ok) throw new Error("jwks");
  JWKS = (await r.json()).keys; JWKS_AT = Date.now();
  return JWKS;
}
export async function verifyFirebase(token, now = Date.now() / 1000, getKeys = keys) {
  const [h, p, sig] = String(token || "").split(".");
  if (!h || !p || !sig) return null;
  let head, pay;
  try { head = JSON.parse(new TextDecoder().decode(b64u(h))); pay = JSON.parse(new TextDecoder().decode(b64u(p))); } catch (_) { return null; }
  if (head.alg !== "RS256") return null;
  const jwk = (await getKeys()).find((k) => k.kid === head.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(sig), new TextEncoder().encode(h + "." + p));
  if (!ok) return null;
  if (pay.aud !== PROJECT || pay.iss !== "https://securetoken.google.com/" + PROJECT) return null;
  if (!(pay.exp > now) || !(pay.iat <= now + 300) || !pay.sub) return null;
  return pay.sub;
}

/* ---------- Consigne donnée à l'IA ---------- */
const SYSTEM = `Tu es un assistant de nutrition qui estime le contenu d'une assiette à partir de photos.
Tu reçois plusieurs photos du MÊME repas prises sous des angles différents (dessus, côté, autre angle).
Méthode :
1. Croise les angles : un aliment caché sur une photo (sous une sauce, derrière un autre, dans le fond d'un bol) peut apparaître sur une autre. Liste chaque aliment une seule fois.
2. Estime le poids de chaque aliment en grammes, tel qu'il est servi (cuit si cuit), en t'aidant des repères visibles : taille de l'assiette (souvent 26-28 cm), couverts, main, verre. Pense aux matières grasses et sauces qui se voient peu (huile, beurre, vinaigrette) : ajoute-les si leur présence est probable, avec une confiance basse.
3. Donne les valeurs nutritionnelles POUR 100 g de chaque aliment (kcal, protéines, glucides, lipides en grammes), en t'appuyant sur des valeurs de référence type table Ciqual.
4. Si les photos ne permettent pas de juger (floues, trop sombres, ce n'est pas un repas), dis-le dans "remarques" et renvoie une liste vide.
Noms d'aliments en français simple, comme on les écrirait dans un carnet (« Riz blanc cuit », « Blanc de poulet rôti »).`;

const TOOL = {
  name: "enregistrer_analyse",
  description: "Enregistre les aliments reconnus dans l'assiette avec leur poids estimé.",
  input_schema: {
    type: "object",
    properties: {
      aliments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nom: { type: "string" },
            grammes: { type: "number", description: "Poids estimé de la portion servie, en grammes" },
            kcal_100g: { type: "number" }, proteines_100g: { type: "number" }, glucides_100g: { type: "number" }, lipides_100g: { type: "number" },
            confiance: { type: "string", enum: ["haute", "moyenne", "basse"] },
          },
          required: ["nom", "grammes", "kcal_100g", "proteines_100g", "glucides_100g", "lipides_100g", "confiance"],
        },
      },
      remarques: { type: "string", description: "Une ou deux phrases utiles : aliment douteux, ce qui manque pour être plus précis." },
    },
    required: ["aliments", "remarques"],
  },
};

const num = (x, lo, hi) => { const v = Number(x); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0; };

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return json(503, { error: "not_configured" });
  const len = +request.headers.get("content-length") || 0;
  if (len > 7_000_000) return json(413, { error: "too_large" });

  const uid = await verifyFirebase((request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")).catch(() => null);
  if (!uid) return json(401, { error: "not_signed_in" });

  let body;
  try { body = await request.json(); } catch (_) { return json(400, { error: "bad_request" }); }
  const imgs = Array.isArray(body.images) ? body.images : [];
  if (imgs.length < MIN_IMG) return json(400, { error: "need_angles" });
  if (imgs.length > MAX_IMG) return json(400, { error: "too_many" });
  for (const b of imgs) if (typeof b !== "string" || b.length > MAX_B64 || !/^[A-Za-z0-9+/=]+$/.test(b)) return json(400, { error: "bad_image" });
  const note = String(body.note || "").slice(0, 300);
  const labels = ["Vue de dessus", "Vue de côté", "Autre angle", "Autre angle"];

  const content = [];
  imgs.forEach((b, i) => { content.push({ type: "text", text: `Photo ${i + 1} : ${labels[i]}` }); content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b } }); });
  content.push({ type: "text", text: "Analyse ce repas." + (note ? ` Précision de la personne : « ${note} »` : "") });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: env.ANTHROPIC_MODEL || MODEL, max_tokens: 1200, system: SYSTEM, tools: [TOOL], tool_choice: { type: "tool", name: TOOL.name }, messages: [{ role: "user", content }] }),
  });
  if (!r.ok) return json(r.status === 429 ? 429 : 502, { error: r.status === 429 ? "busy" : "ai_error" });
  const out = await r.json();
  const call = (out.content || []).find((c) => c.type === "tool_use");
  if (!call) return json(502, { error: "ai_error" });
  const items = (call.input.aliments || []).slice(0, 25).map((a) => ({
    nom: String(a.nom || "Aliment").slice(0, 80),
    g: Math.round(num(a.grammes, 1, 2000)),
    kcal: num(a.kcal_100g, 0, 950), p: num(a.proteines_100g, 0, 100), c: num(a.glucides_100g, 0, 100), f: num(a.lipides_100g, 0, 100),
    conf: ["haute", "moyenne", "basse"].includes(a.confiance) ? a.confiance : "moyenne",
  }));
  return json(200, { items, remarques: String(call.input.remarques || "").slice(0, 400) });
}

