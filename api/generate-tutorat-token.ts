import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const config = { maxDuration: 10 };

type VercelReq = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};
type VercelRes = {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

type ProfileRow = {
  id: string;
  mediurg_user_id?: string | null;
  email?: string | null;
  name?: string | null;
  prenom?: string | null;
  nom?: string | null;
  fonction?: string | null;
  role?: string | null;
  is_admin?: boolean | number | string | null;
  note?: string | null;
  status?: string | null;
};

export const PROFILE_COLUMNS = "*";
const TOKEN_TTL_SECONDS = 5 * 60;

function getHeader(req: VercelReq, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(req.headers ?? {})) {
    if (key.toLowerCase() !== lower) continue;
    return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

function getBearerToken(req: VercelReq): string | null {
  const auth = getHeader(req, "authorization");
  const match = /^Bearer\s+(.+)$/i.exec(auth ?? "");
  return match?.[1]?.trim() || null;
}

function getSupabaseServiceEnv(): { url: string; serviceKey: string } | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY;
  return url && serviceKey ? { url, serviceKey } : null;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function signHs256Jwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${signature}`;
}

function buildSignedTutoratProfile(profile: ProfileRow): Record<string, unknown> {
  return {
    id: profile.id,
    mediurg_user_id: profile.mediurg_user_id || undefined,
    email: profile.email || undefined,
    name: profile.name || undefined,
    prenom: profile.prenom || undefined,
    nom: profile.nom || undefined,
    fonction: profile.fonction || undefined,
    role: profile.role || undefined,
    is_admin: profile.is_admin ?? undefined,
    note: profile.note || undefined,
  };
}

export function buildTutoratPayload(profile: ProfileRow): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    userId: profile.mediurg_user_id || profile.id,
    sub: profile.id,
    id: profile.id,
    email: profile.email || undefined,
    fonction: profile.fonction || undefined,
    role: profile.role || undefined,
    profile: buildSignedTutoratProfile(profile),
    exp: now + TOKEN_TTL_SECONDS,
    iat: now,
  };
}

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Methode non autorisee" });
    return;
  }

  const env = getSupabaseServiceEnv();
  const jwtSecret = process.env.JWT_SECRET;
  const accessToken = getBearerToken(req);
  if (!env || !jwtSecret) {
    res.status(503).json({ error: "Configuration Tutorat manquante" });
    return;
  }
  if (!accessToken) {
    res.status(401).json({ error: "Session MediURG requise" });
    return;
  }

  try {
    const supabase = createClient(env.url, env.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      res.status(401).json({ error: "Session MediURG invalide" });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      res.status(403).json({ error: "Profil MediURG non autorise" });
      return;
    }

    res.status(200).json({
      token: signHs256Jwt(buildTutoratPayload(profile as ProfileRow), jwtSecret),
    });
  } catch (error) {
    console.error("generate-tutorat-token failed", error);
    res.status(502).json({ error: "Generation du token Tutorat indisponible" });
  }
}
