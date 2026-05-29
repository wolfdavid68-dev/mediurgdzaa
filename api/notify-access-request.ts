// Fonction serverless Vercel - notification Web Push PWA d'une demande d'acces.
//
// Flux cyber :
// - le demandeur appelle cette route avec l'id de profil cree a l'inscription ;
// - si une session Supabase existe, la route verifie d'abord via RLS ;
// - sinon, ou si la session vient d'expirer, la route valide cote serveur que
//   le profil existe toujours en pending ;
// - la cle service_role sert uniquement cote serveur a lire les abonnements
//   push des admins actifs, verifier le statut pending et purger les endpoints expires ;
// - la deduplication 6 h est stockee dans Supabase, pas dans la memoire Vercel ;
// - le payload push reste generique : aucune donnee nominative.
import { createClient } from "@supabase/supabase-js";
import webpush, { type PushSubscription } from "web-push";

export const config = { maxDuration: 10 };

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

type RateBucket = { start: number; count: number };
type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const NOTIFICATION_DEDUPE_MS = 6 * 60 * 60 * 1000;
const rateBuckets = new Map<string, RateBucket>();

function getHeader(req: VercelReq, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(req.headers ?? {})) {
    if (key.toLowerCase() !== lower) continue;
    return Array.isArray(value) ? value[0] : value;
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

function getBaseUrl(req: VercelReq): string {
  const configured = process.env.APP_PUBLIC_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) return configured.startsWith("http") ? configured : `https://${configured}`;
  const host = getHeader(req, "x-forwarded-host") || getHeader(req, "host") || "";
  const proto = getHeader(req, "x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "";
}

function getSupabasePublicEnv(): { url: string; publicKey: string } | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const publicKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  return url && publicKey ? { url, publicKey } : null;
}

function getSupabaseServiceEnv(): { url: string; serviceKey: string } | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY;
  return url && serviceKey ? { url, serviceKey } : null;
}

function getVapidEnv(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY || process.env.VITE_WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const rawSubject = process.env.WEB_PUSH_SUBJECT?.trim() || "mailto:admin@mediurg.local";
  const subject = rawSubject.includes(":") ? rawSubject : `mailto:${rawSubject}`;
  return publicKey && privateKey ? { publicKey, privateKey, subject } : null;
}

function getBearerToken(req: VercelReq): string | null {
  const auth = getHeader(req, "authorization");
  const match = /^Bearer\s+(.+)$/i.exec(auth ?? "");
  return match?.[1]?.trim() || null;
}

function parseBody(body: unknown): { profileId?: unknown } | null {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as { profileId?: unknown };
    } catch {
      return null;
    }
  }
  if (body && typeof body === "object") return body as { profileId?: unknown };
  return null;
}

async function verifyPendingProfileWithSession(
  req: VercelReq,
  profileId: string
): Promise<boolean> {
  const env = getSupabasePublicEnv();
  if (!env) throw new Error("supabase-public-env-missing");

  const token = getBearerToken(req);
  if (!token) return false;

  const supabase = createClient(env.url, env.publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user || userData.user.id !== profileId) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function verifyPendingProfileWithServiceRole(profileId: string): Promise<boolean> {
  const env = getSupabaseServiceEnv();
  if (!env) throw new Error("supabase-service-env-missing");

  const supabase = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function verifyPendingProfile(req: VercelReq, profileId: string): Promise<boolean> {
  if (getBearerToken(req) && (await verifyPendingProfileWithSession(req, profileId))) {
    return true;
  }
  return verifyPendingProfileWithServiceRole(profileId);
}

async function reserveProfileNotification(profileId: string): Promise<"send" | "duplicate"> {
  const env = getSupabaseServiceEnv();
  if (!env) throw new Error("supabase-service-env-missing");

  const supabase = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const now = new Date();
  const nowIso = now.toISOString();
  const cutoffIso = new Date(now.getTime() - NOTIFICATION_DEDUPE_MS).toISOString();

  const { error: insertError } = await supabase
    .from("access_request_notifications")
    .insert({ profile_id: profileId, notified_at: nowIso });

  if (!insertError) return "send";
  if (insertError.code !== "23505") throw insertError;

  const { data, error: updateError } = await supabase
    .from("access_request_notifications")
    .update({ notified_at: nowIso })
    .eq("profile_id", profileId)
    .lte("notified_at", cutoffIso)
    .select("profile_id")
    .maybeSingle();

  if (updateError) throw updateError;
  return data ? "send" : "duplicate";
}

async function fetchAdminSubscriptions(): Promise<StoredPushSubscription[]> {
  const env = getSupabaseServiceEnv();
  if (!env) throw new Error("supabase-service-env-missing");

  const supabase = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, profiles!inner(status, role)")
    .eq("profiles.status", "active")
    .eq("profiles.role", "admin");

  if (error) throw error;
  return ((data ?? []) as StoredPushSubscription[]).filter((s) => s.endpoint && s.p256dh && s.auth);
}

async function deleteSubscription(endpoint: string): Promise<void> {
  const env = getSupabaseServiceEnv();
  if (!env) return;
  const supabase = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

async function publishWebPush(
  subscriptions: StoredPushSubscription[],
  baseUrl: string
): Promise<void> {
  const vapid = getVapidEnv();
  if (!vapid) throw new Error("web-push-env-missing");

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const payload = JSON.stringify({
    title: "MediURG - demande en attente",
    body: "Une nouvelle demande d'acces est en attente dans la console admin.",
    tag: "mediurg-access-request",
    url: baseUrl || "/",
  });

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      };
      try {
        await webpush.sendNotification(pushSubscription, payload, {
          TTL: 60 * 60,
          urgency: "high",
          topic: "access-request",
        });
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscription(subscription.endpoint);
          return;
        }
        throw error;
      }
    })
  );
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

  const rate = checkRateLimit(getClientIp(req));
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSec));
    res.status(429).json({ error: "Trop de demandes de notification" });
    return;
  }

  const body = parseBody(req.body);
  const profileId = body?.profileId;
  if (typeof profileId !== "string" || !UUID_RE.test(profileId)) {
    res.status(400).json({ error: "Profil invalide" });
    return;
  }

  try {
    const profileIsPending = await verifyPendingProfile(req, profileId);
    if (!profileIsPending) {
      res.status(404).json({ error: "Demande introuvable" });
      return;
    }

    const reservation = await reserveProfileNotification(profileId);
    if (reservation === "duplicate") {
      res.status(202).json({ ok: true, duplicate: true });
      return;
    }

    const subscriptions = await fetchAdminSubscriptions();
    if (subscriptions.length > 0) {
      await publishWebPush(subscriptions, getBaseUrl(req));
    }

    res.status(202).json({ ok: true, sent: subscriptions.length });
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";
    console.error("notify-access-request failed", code);
    res.status(502).json({ error: "Notification admin indisponible" });
  }
}
