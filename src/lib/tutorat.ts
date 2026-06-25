// Compagnon Tutorat ESI/AS (repo wolfdavid68-dev/tutorat-sau-mulhouse).
// Origine unifiée : Tutorat est servi sous le sous-chemin /tutorat/ du MÊME
// host que MediURG (via un rewrite Vercel qui proxifie /tutorat/* vers le
// déploiement Tutorat). Naviguer en relatif garde la PWA « interne » → pas de
// barre d'adresse Custom Tab sur mobile au passage MediURG → Tutorat.
// Override possible en dev via .env.local : VITE_TUTORAT_URL=http://localhost:5174.
const TUTORAT_URL = import.meta.env.VITE_TUTORAT_URL || "/tutorat/";

const TUTORAT_OPEN_PARAM = "open";
const TUTORAT_OPEN_VALUE = "tutorat";

export function shouldOpenTutoratFromLogin(search = window.location.search): boolean {
  return new URLSearchParams(search).get(TUTORAT_OPEN_PARAM) === TUTORAT_OPEN_VALUE;
}

export function buildTutoratLoginRequestUrl(rawUrl = window.location.href): string {
  const url = new URL(rawUrl);
  url.searchParams.set(TUTORAT_OPEN_PARAM, TUTORAT_OPEN_VALUE);
  return url.toString();
}

export function buildTutoratTokenUrl(token: string, rawTutoratUrl = TUTORAT_URL): string {
  const baseOrigin =
    typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  const url = new URL(rawTutoratUrl, baseOrigin);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function openTutoratWithCurrentSession(): Promise<boolean> {
  const { getCurrentSession } = await import("./auth");
  const session = await getCurrentSession();
  if (!session?.access_token) return false;

  const response = await fetch("/api/generate-tutorat-token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) return false;
  const result = (await response.json()) as { token?: unknown };
  if (typeof result.token !== "string" || !result.token) return false;

  window.location.assign(buildTutoratTokenUrl(result.token));
  return true;
}
