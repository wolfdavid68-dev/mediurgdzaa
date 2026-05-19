// Fonction serverless Vercel — proxy d'analyse ECG (bi-fournisseur).
//
// POURQUOI un proxy : MediURG est un PWA 100 % client. Mettre une clé API
// dans le bundle l'exposerait à tout utilisateur (lisible dans le JS).
// Cette fonction tourne côté serveur Vercel : les clés restent secrètes
// dans process.env (jamais préfixées VITE_ → jamais bundlées).
//
// STRATÉGIE : Gemini 2.5 Flash en principal (meilleure lecture ECG des
// modèles gratuits), repli automatique sur Mistral Pixtral si Gemini
// échoue ou si son quota gratuit est atteint (429). Au moins une des deux
// clés doit être configurée.
//
// Variables d'env (Vercel dashboard + .env.local pour `vercel dev`) :
//   GEMINI_API_KEY=...    (Google AI Studio — offre gratuite)
//   MISTRAL_API_KEY=...   (Mistral La Plateforme — offre « Experiment »)
//   Aucune n'a de préfixe VITE_ (sinon elle serait bundlée côté client).
//
// ⚠️ Contenu non-diagnostique : le prompt impose des disclaimers ; la
// validation médicale obligatoire reste affichée côté UI (EcgReader.tsx).

// Le chemin Gemini → repli Mistral peut enchaîner deux appels réseau :
// on relève le plafond (défaut Hobby = 10 s) pour éviter un timeout.
export const config = { maxDuration: 30 };

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "pixtral-12b-2409";

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

type VercelReq = { method?: string; body?: unknown };
type VercelRes = {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

// Résultat d'une tentative fournisseur. `retryable` = on peut basculer
// sur l'autre fournisseur (quota/erreur réseau) ; sinon échec définitif.
type Attempt =
  | { ok: true; text: string }
  | { ok: false; retryable: boolean; status: number; error: string };

// "data:image/jpeg;base64,XXXX" → { mime, b64 }
function splitDataUrl(image: string): { mime: string; b64: string } | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(image);
  if (!m) return null;
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
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
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
  if (req.method !== "POST") {
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

  let body: { image?: unknown };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body as typeof body);
  } catch {
    res.status(400).json({ error: "Corps de requête invalide" });
    return;
  }

  const image = body?.image;
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    res.status(400).json({ error: "Image manquante ou format invalide" });
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

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(attempt.text);
  } catch {
    res.status(502).json({ error: "Réponse non exploitable du service d'analyse." });
    return;
  }

  if (parsed.lisible === false) {
    res.status(422).json({
      error: "ecg-illisible",
      message:
        typeof parsed.raison === "string"
          ? parsed.raison
          : "L'image ne semble pas être un ECG lisible.",
    });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Ecg-Provider", usedFallback ? "mistral" : "gemini");
  res.status(200).json(parsed);
}
