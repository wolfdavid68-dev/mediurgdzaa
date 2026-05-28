// Fonction serverless Vercel - test Web Push PWA reserve aux admins actifs.
//
// Flux cyber :
// - l'admin appelle cette route avec sa session Supabase ;
// - la route verifie cote serveur que le caller est bien admin actif ;
// - la cle service_role lit uniquement ses propres abonnements push ;
// - le payload reste generique : aucune donnee nominative.
import { createClient } from "@supabase/supabase-js";
import webpush, { type PushSubscription } from "web-push";

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

type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function getHeader(req: VercelReq, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(req.headers ?? {})) {
    if (key.toLowerCase() !== lower) continue;
    return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
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
  const subject = process.env.WEB_PUSH_SUBJECT || "mailto:admin@mediurg.local";
  return publicKey && privateKey ? { publicKey, privateKey, subject } : null;
}

function getBearerToken(req: VercelReq): string | null {
  const auth = getHeader(req, "authorization");
  const match = /^Bearer\s+(.+)$/i.exec(auth ?? "");
  return match?.[1]?.trim() || null;
}

async function verifyActiveAdmin(req: VercelReq): Promise<string | null> {
  const publicEnv = getSupabasePublicEnv();
  const serviceEnv = getSupabaseServiceEnv();
  if (!publicEnv || !serviceEnv) throw new Error("supabase-env-missing");

  const token = getBearerToken(req);
  if (!token) return null;

  const publicClient = createClient(publicEnv.url, publicEnv.publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: userData, error: userError } = await publicClient.auth.getUser(token);
  if (userError || !userData.user) return null;

  const serviceClient = createClient(serviceEnv.url, serviceEnv.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("id", userData.user.id)
    .eq("status", "active")
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw error;
  return data ? userData.user.id : null;
}

async function fetchOwnSubscriptions(adminId: string): Promise<StoredPushSubscription[]> {
  const env = getSupabaseServiceEnv();
  if (!env) throw new Error("supabase-service-env-missing");

  const supabase = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", adminId);

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

async function publishTestPush(
  subscriptions: StoredPushSubscription[],
  baseUrl: string
): Promise<{ sent: number; failed: number; expired: number }> {
  const vapid = getVapidEnv();
  if (!vapid) throw new Error("web-push-env-missing");

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const payload = JSON.stringify({
    title: "MediURG - notification test",
    body: "Test reussi : les notifications admin arrivent sur cet appareil.",
    tag: "mediurg-push-test",
    url: baseUrl || "/",
  });

  let sent = 0;
  let failed = 0;
  let expired = 0;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      };
      try {
        await webpush.sendNotification(pushSubscription, payload, {
          TTL: 5 * 60,
          urgency: "high",
          topic: "push-test",
        });
        sent += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          expired += 1;
          await deleteSubscription(subscription.endpoint);
          return;
        }
        failed += 1;
      }
    })
  );

  return { sent, failed, expired };
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

  try {
    const adminId = await verifyActiveAdmin(req);
    if (!adminId) {
      res.status(403).json({ error: "Acces admin requis" });
      return;
    }

    const subscriptions = await fetchOwnSubscriptions(adminId);
    if (subscriptions.length === 0) {
      res.status(409).json({ error: "Aucun appareil abonne aux notifications" });
      return;
    }

    const result = await publishTestPush(subscriptions, getBaseUrl(req));
    if (result.sent === 0) {
      res.status(502).json({ error: "Notification test non transmise", ...result });
      return;
    }

    res.status(202).json({ ok: true, ...result });
  } catch {
    res.status(502).json({ error: "Notification test indisponible" });
  }
}
