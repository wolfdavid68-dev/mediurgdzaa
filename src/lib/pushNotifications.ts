import { getCurrentSession } from "./auth";

export type PushNotificationStatus =
  | "unsupported"
  | "missing-key"
  | "denied"
  | "default"
  | "enabled"
  | "disabled";

type PushResult = { ok: true; status: PushNotificationStatus } | { ok: false; error: string };
type PushTestResult = { ok: true; sent: number } | { ok: false; error: string };

let cachedVapidPublicKey = "";

const getSupabaseClient = async () => {
  const { getSupabase } = await import("./supabase");
  return getSupabase();
};

const fetchVapidPublicKey = async (force = false): Promise<string> => {
  if (!force && cachedVapidPublicKey) return cachedVapidPublicKey;

  const buildKey = ((import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined) ?? "").trim();
  if (buildKey) {
    cachedVapidPublicKey = buildKey;
    return buildKey;
  }

  try {
    const response = await fetch(`/api/push-public-key?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      return "";
    }
    const data = (await response.json()) as { publicKey?: unknown };
    const runtimeKey = typeof data.publicKey === "string" ? data.publicKey.trim() : "";
    if (runtimeKey) cachedVapidPublicKey = runtimeKey;
    return runtimeKey;
  } catch {
    return "";
  }
};

const isPushSupported = (): boolean =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

const urlBase64ToArrayBuffer = (base64String: string): ArrayBuffer => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
};

const getCurrentSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

export const getAdminPushStatus = async (): Promise<PushNotificationStatus> => {
  if (!isPushSupported()) return "unsupported";
  if (!(await fetchVapidPublicKey())) return "missing-key";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "default") return "default";
  const subscription = await getCurrentSubscription();
  return subscription ? "enabled" : "disabled";
};

export const enableAdminPushNotifications = async (): Promise<PushResult> => {
  if (!isPushSupported())
    return { ok: false, error: "Notifications non supportées sur cet appareil" };

  const publicKey = await fetchVapidPublicKey(true);
  if (!publicKey) return { ok: false, error: "Clé publique Web Push manquante" };

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission === "denied")
    return { ok: false, error: "Notifications refusées par le navigateur" };
  if (permission !== "granted") return { ok: true, status: "default" };

  const session = await getCurrentSession();
  if (!session?.user?.id) return { ok: false, error: "Session admin introuvable" };

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(publicKey),
    }));

  const serialized = subscription.toJSON();
  if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys?.auth) {
    return { ok: false, error: "Abonnement push incomplet" };
  }

  const supabase = await getSupabaseClient();
  if (!supabase) return { ok: false, error: "Backend non configuré" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: session.user.id,
      endpoint: serialized.endpoint,
      p256dh: serialized.keys.p256dh,
      auth: serialized.keys.auth,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) return { ok: false, error: "Enregistrement de la notification impossible" };
  return { ok: true, status: "enabled" };
};

export const disableAdminPushNotifications = async (): Promise<PushResult> => {
  const subscription = await getCurrentSubscription();
  if (!subscription) return { ok: true, status: await getAdminPushStatus() };

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const supabase = await getSupabaseClient();
  if (supabase) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }

  return { ok: true, status: await getAdminPushStatus() };
};

export const sendAdminPushTestNotification = async (): Promise<PushTestResult> => {
  if (!isPushSupported())
    return { ok: false, error: "Notifications non supportées sur cet appareil" };
  if (Notification.permission !== "granted") {
    return { ok: false, error: "Notifications non autorisées sur cet appareil" };
  }

  const subscription = await getCurrentSubscription();
  if (!subscription) return { ok: false, error: "Aucun abonnement push sur cet appareil" };

  const session = await getCurrentSession();
  if (!session?.access_token) return { ok: false, error: "Session admin introuvable" };

  try {
    const response = await fetch("/api/test-push-notification", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      sent?: number;
    } | null;

    if (!response.ok) {
      return { ok: false, error: body?.error || "Notification test non transmise" };
    }
    return { ok: true, sent: body?.sent ?? 0 };
  } catch {
    return { ok: false, error: "Notification test indisponible" };
  }
};
