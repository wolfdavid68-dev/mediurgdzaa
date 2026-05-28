// Notification best-effort d'une nouvelle demande d'acces.
// Le secret de push reste cote serveur dans /api/notify-access-request.
import { getCurrentSession } from "./auth";

type NotifyAccessRequestResult = { ok: true } | { ok: false; error: string };

export const notifyAccessRequestCreated = async (
  profileId: string | undefined
): Promise<NotifyAccessRequestResult> => {
  if (!profileId || typeof fetch !== "function") return { ok: true };

  try {
    const session = await getCurrentSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch("/api/notify-access-request", {
      method: "POST",
      headers,
      body: JSON.stringify({ profileId }),
    });

    if (!response.ok) {
      return { ok: false, error: "Notification admin non transmise" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Notification admin indisponible" };
  }
};
