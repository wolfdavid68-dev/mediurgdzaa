// Fonction serverless Vercel — proxy d'analyse ECG (bi-fournisseur).
//
// POURQUOI un proxy : MediURG est un PWA 100 % client. Mettre une clé API
// dans le bundle l'exposerait à tout utilisateur (lisible dans le JS).
// Cette fonction tourne côté serveur Vercel : les clés restent secrètes
// dans process.env (jamais préfixées VITE_ → jamais bundlées).
//
// STRATÉGIE : Gemini 3.5 Flash-Lite en principal (quota gratuit élevé),
// repli automatique sur Ministral 3 14B si Gemini échoue ou si son quota
// gratuit est atteint (429). Au moins une des deux clés doit être configurée.
//
// Variables d'env (Vercel dashboard + .env.local pour `vercel dev`) :
//   GEMINI_API_KEY=...    (Google AI Studio — offre gratuite)
//   MISTRAL_API_KEY=...   (Mistral La Plateforme — offre « Experiment »)
//   Aucune n'a de préfixe VITE_ (sinon elle serait bundlée côté client).
//
// ⚠️ Contenu non-diagnostique : le prompt impose des disclaimers ; la
// validation médicale obligatoire reste affichée côté UI (EcgReader.tsx).
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const Severite = z.enum(["info", "attention", "critique"]);

const EcgAnalysisSchema = z.object({
  lisible: z.literal(true),
  rythme: z
    .object({
      type: z.string().optional(),
      regulier: z.boolean().nullable().optional(),
      frequence_estimee_bpm: z.number().nullable().optional(),
    })
    .optional(),
  axe: z.string().nullable().optional(),
  intervalles: z
    .object({
      PR_ms: z.number().nullable().optional(),
      QRS_ms: z.number().nullable().optional(),
      QT_ms: z.number().nullable().optional(),
    })
    .optional(),
  verdict: z
    .object({
      kicker: z.string().optional(),
      titre: z.string().optional(),
      sous_titre: z.string().optional(),
      severite: Severite.optional(),
    })
    .optional(),
  anomalies_visibles: z
    .array(
      z.object({
        libelle: z.string(),
        derivations: z.array(z.string()).optional(),
        severite: Severite.optional(),
      })
    )
    .optional(),
  orientations_therapeutiques: z
    .array(z.object({ label: z.string(), query: z.string() }))
    .optional(),
  limites_lecture: z.string().optional(),
});

// Le chemin Gemini → repli Mistral peut enchaîner deux appels réseau :
// on relève le plafond (défaut Hobby = 10 s) pour éviter un timeout.
export const config = { maxDuration: 30 };

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "ministral-14b-2512";
const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;

// Schéma exact attendu par EcgReader.tsx (résultats data-driven).
const SYSTEM_PROMPT = `Tu es un outil d'AIDE À LA LECTURE d'ECG 12 dérivations pour des soignants d'urgence francophones. Tu n'es PAS un dispositif de diagnostic : tu décris ce qui est visible sur le tracé et tu restes prudent.

À partir de la photo d'ECG fournie, réponds UNIQUEMENT par un objet JSON valide (aucun texte autour), STRICTEMENT dans ce format :

{
  "lisible": true,
  "rythme": { "type": "Rythme sinusal", "regulier": true, "frequence_estimee_bpm": 75 },
  "axe": "normal | gauche | droit | indéterminé",
  "intervalles": { "PR_ms": 160, "QRS_ms": 90, "QT_ms": 380 },
  "verdict": {
    "kicker": "Tableau évocateur | Tracé sans anomalie majeure | Lecture limitée",
    "titre": "résumé court de l'orientation principale",
    "sous_titre": "nuance / conduite à confirmer cliniquement",
    "severite": "info | attention | critique"
  },
  "anomalies_visibles": [
    { "libelle": "description courte", "derivations": ["V2","V3"], "severite": "info | attention | critique" }
  ],
  "orientations_therapeutiques": [
    { "label": "Aspirine 250 mg IVD", "query": "Aspirine" }
  ],
  "limites_lecture": "calibration présumée + limites de lecture + rappel de validation médicale"
}

Règles :
- "query" = nom de molécule simple (1 mot si possible) pour une recherche dans un livret de médicaments ; "label" = formulation lisible avec dose.
- Ne propose des orientations thérapeutiques QUE si le tableau ECG les justifie clairement ; sinon laisse un tableau vide [].
- Si la photo n'est pas un ECG lisible (flou, cadrage, autre image) : renvoie {"lisible": false, "raison": "explication courte en français"} et RIEN d'autre.
- N'invente jamais de valeurs précises si elles ne sont pas mesurables : mets null pour le champ concerné.
- Reste factuel, en français, sans jamais affirmer un diagnostic de certitude.`;

type VercelReq = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};
type VercelRes = {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

// Résultat d'une tentative fournisseur. `retryable` = on peut basculer
// sur l'autre fournisseur (quota/erreur réseau) ; sinon échec définitif.
type Attempt =
  { ok: true; text: string } | { ok: false; retryable: boolean; status: number; error: string };

type RateBucket = { start: number; count: number };
type AuthCheck = { ok: true; userId: string } | { ok: false; status: number; error: string };

const rateBuckets = new Map<string, RateBucket>();

function getHeader(req: VercelReq, name: string): string | undefined {
  const headers = req.headers;
  if (!headers) return undefined;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== lower) continue;
    return Array.isArray(v) ? v[0] : v;
  }
  return undefined;
}

function getClientIp(req: VercelReq): string {
  const forwarded = getHeader(req, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return getHeader(req, "x-real-ip") || req.socket?.remoteAddress || "unknown";
}

function checkRateLimit(ip: string): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  const current = rateBuckets.get(ip);
  if (!current || now - current.start > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(ip, { start: now, count: 1 });
    return { allowed: true };
  }
  current.count += 1;
  if (current.count <= RATE_LIMIT_MAX_REQUESTS) return { allowed: true };
  return {
    allowed: false,
    retryAfterSec: Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - current.start)) / 1000)),
  };
}

function getSupabaseServerEnv(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

function getBearerToken(req: VercelReq): string | null {
  const auth = getHeader(req, "authorization");
  const match = /^Bearer\s+(.+)$/i.exec(auth ?? "");
  return match?.[1]?.trim() || null;
}

async function requireActiveSession(req: VercelReq): Promise<AuthCheck> {
  const env = getSupabaseServerEnv();
  if (!env) {
    return {
      ok: false,
      status: 500,
      error: "Authentification serveur non configurée pour l'analyse ECG.",
    };
  }

  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: "Session requise pour analyser un ECG." };
  }

  const supabase = createClient(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return { ok: false, status: 401, error: "Session invalide ou expirée." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      status: 503,
      error: "Vérification du profil indisponible. Réessayer dans quelques instants.",
    };
  }
  if (!profile || profile.status !== "active") {
    return { ok: false, status: 403, error: "Compte non autorisé pour l'analyse ECG." };
  }

  return { ok: true, userId: userData.user.id };
}

function estimateBase64Bytes(b64: string): number {
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

// "data:image/jpeg;base64,XXXX" → { mime, b64 }
function splitDataUrl(image: string): { mime: string; b64: string } | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!m) return null;
  if (!ALLOWED_IMAGE_MIMES.has(m[1])) return null;
  return { mime: m[1], b64: m[2] };
}

async function tryGemini(image: string): Promise<Attempt> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, retryable: true, status: 0, error: "no-key" };
  const parts = splitDataUrl(image);
  if (!parts) return { ok: false, retryable: false, status: 400, error: "bad-image" };

  try {
    const r = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            parts: [
              { text: "Analyse cet ECG et renvoie le JSON demandé." },
              { inline_data: { mime_type: parts.mime, data: parts.b64 } },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (!r.ok) {
      // 429 (quota) / 5xx → on tente le repli Mistral.
      const retryable = r.status === 429 || r.status >= 500;
      return { ok: false, retryable, status: r.status, error: "gemini-http" };
    }
    const data = (await r.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { ok: false, retryable: true, status: 502, error: "gemini-empty" };
    return { ok: true, text };
  } catch {
    return { ok: false, retryable: true, status: 502, error: "gemini-network" };
  }
}

async function tryMistral(image: string): Promise<Attempt> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return { ok: false, retryable: true, status: 0, error: "no-key" };

  try {
    const r = await fetch(MISTRAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyse cet ECG et renvoie le JSON demandé." },
              { type: "image_url", image_url: image },
            ],
          },
        ],
      }),
    });
    if (!r.ok) {
      const retryable = r.status === 429 || r.status >= 500;
      return { ok: false, retryable, status: r.status, error: "mistral-http" };
    }
    const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return { ok: false, retryable: false, status: 502, error: "mistral-empty" };
    return { ok: true, text };
  } catch {
    return { ok: false, retryable: false, status: 502, error: "mistral-network" };
  }
}

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  if (!process.env.GEMINI_API_KEY && !process.env.MISTRAL_API_KEY) {
    res.status(500).json({
      error:
        "Service d'analyse non configuré (aucune clé API). Contacter l'administrateur MediURG.",
    });
    return;
  }

  const rate = checkRateLimit(getClientIp(req));
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSec));
    res
      .status(429)
      .json({ error: "Trop de demandes d'analyse. Reessayer dans quelques instants." });
    return;
  }

  const auth = await requireActiveSession(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  let body: { image?: unknown };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body as typeof body);
  } catch {
    res.status(400).json({ error: "Corps de requête invalide" });
    return;
  }

  const image = body?.image;
  if (typeof image !== "string") {
    res.status(400).json({ error: "Image manquante ou format invalide" });
    return;
  }
  const parts = splitDataUrl(image);
  if (!parts) {
    res.status(415).json({ error: "Format image non supporte (JPEG, PNG ou WebP uniquement)." });
    return;
  }
  if (estimateBase64Bytes(parts.b64) > MAX_IMAGE_BYTES) {
    res.status(413).json({ error: "Image trop volumineuse (2 Mo maximum apres compression)." });
    return;
  }

  // Gemini d'abord ; repli Mistral si Gemini échoue de façon « retryable ».
  let attempt = await tryGemini(image);
  let usedFallback = false;
  if (!attempt.ok && attempt.retryable) {
    const fallback = await tryMistral(image);
    if (fallback.ok || !attempt.ok) {
      usedFallback = true;
      attempt = fallback;
    }
  }

  if (!attempt.ok) {
    const quota = attempt.status === 429;
    res.status(quota ? 429 : 502).json({
      error: quota
        ? "Quota d'analyse gratuit atteint sur les deux services. Réessayer plus tard."
        : "Le service d'analyse est indisponible. Vérifier la connexion réseau.",
    });
    return;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(attempt.text);
  } catch {
    res.status(502).json({ error: "Réponse non exploitable du service d'analyse." });
    return;
  }

  if (
    typeof raw === "object" &&
    raw !== null &&
    (raw as Record<string, unknown>).lisible === false
  ) {
    const raison = (raw as Record<string, unknown>).raison;
    res.status(422).json({
      error: "ecg-illisible",
      message: typeof raison === "string" ? raison : "L'image ne semble pas être un ECG lisible.",
    });
    return;
  }

  const validated = EcgAnalysisSchema.safeParse(raw);
  if (!validated.success) {
    res.status(502).json({ error: "Réponse non exploitable du service d'analyse." });
    return;
  }

  res.setHeader("X-Ecg-Provider", usedFallback ? "mistral" : "gemini");
  res.status(200).json(validated.data);
}
