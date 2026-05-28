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
    if (!session?.access_token) return { ok: true };

    const response = await fetch("/api/notify-access-request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
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
