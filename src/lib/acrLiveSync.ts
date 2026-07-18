// Synchronisation TEMPS RÉEL de la session ACR entre appareils.
//
// Complète le relais asynchrone de deviceSync.ts : deviceSync garantit la
// persistance (file locale + RPC upsert_sync_item, rejouée au retour réseau),
// acrLiveSync propage l'état EN DIRECT pendant la réanimation via un canal
// Supabase Realtime broadcast privé à l'utilisateur (`acr-live-{userId}`).
// Le leader pilote le chrono sur son téléphone ; les autres appareils du même
// compte (tablette SAUV, téléphone du renfort) voient cycles, compteurs et
// événements arriver sans recharger.
//
// Garanties offline-first :
//  - non authentifié / Supabase absent / hors-ligne → no-op silencieux,
//    le chrono ACR local fonctionne exactement comme avant ;
//  - aucun await bloquant sur le chemin clinique : publish est fire-and-forget.
//
// Anti-boucle : chaque appareil s'identifie par un DEVICE_ID éphémère et
// ignore ses propres broadcasts ; côté AcrTimer, une signature de contenu
// (acrLiveSignature) évite de re-publier une session qu'on vient de recevoir.
//
// Confidentialité : le dossier ACR est anonyme par construction (cf.
// acrSession.ts — jamais de nom/prénom/IPP). Le canal est privé et les
// policies RLS de docs/auth-sync-patch.sql limitent lecture + émission au
// propriétaire dont l'UUID termine le topic.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { coerceAcrSession, type AcrFullSession } from "./acrSession";
import { isAuthEnabled } from "./featureFlags";
import { getSupabase } from "./supabase";

export type AcrLiveStatus = "off" | "connecting" | "connected";

type AcrLiveHandlers = {
  onSession: (session: AcrFullSession) => void;
  onDelete?: (sessionId: string) => void;
  onStatus?: (status: AcrLiveStatus) => void;
};

const LIVE_EVENT = "acr-session";
const LIVE_DELETE_EVENT = "acr-delete";

// Identifiant de CET appareil/onglet — sert uniquement à ignorer l'écho de
// nos propres broadcasts (`self: false` couvre la même connexion, pas deux
// onglets du même appareil). Éphémère par design, pas de persistance.
const DEVICE_ID = (() => {
  try {
    return crypto.randomUUID();
  } catch {
    return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
})();

// Signature de CONTENU clinique : change quand le dossier évolue (événements,
// cycles, compteurs, protocole), PAS à chaque tick du chrono ni sur updatedAt.
// Sert des deux côtés : le publieur ne diffuse pas une session inchangée
// (sinon un broadcast/seconde pendant que le chrono tourne), le receveur ne
// re-publie pas ce qu'il vient d'appliquer (boucle écho).
export const acrLiveSignature = (session: AcrFullSession): string =>
  [
    session.id,
    session.protocol,
    session.pediatric ? 1 : 0,
    session.events.length,
    session.events.at(-1)?.id ?? "",
    session.cycles.length,
    session.stats.shocks,
    session.stats.adres,
    session.stats.amios,
    session.stats.cycle,
  ].join("|");

const resolveUserId = async (): Promise<string | null> => {
  if (!isAuthEnabled()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
};

// Canal actuellement joint — partagé entre connectAcrLive (réception) et
// publishAcrLiveSession (émission). Un seul consommateur monte le canal
// (AcrTimer) ; si un second connectAcrLive arrivait, le dernier gagne.
let activeChannel: RealtimeChannel | null = null;

// Ouvre le canal live et route les sessions distantes vers `onSession`.
// Retourne un cleanup à appeler au démontage. Une erreur Realtime désactive
// uniquement le live : le chrono local et le relais différé restent actifs.
export const connectAcrLive = (handlers: AcrLiveHandlers): (() => void) => {
  let cancelled = false;
  let channel: RealtimeChannel | null = null;

  void resolveUserId().then((userId) => {
    if (cancelled || !userId) {
      if (!userId) handlers.onStatus?.("off");
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      handlers.onStatus?.("off");
      return;
    }

    handlers.onStatus?.("connecting");
    try {
      channel = supabase.channel(`acr-live-${userId}`, {
        config: { broadcast: { self: false }, private: true },
      });
      channel.on("broadcast", { event: LIVE_EVENT }, (message) => {
        const payload = (message as { payload?: { deviceId?: string; session?: unknown } }).payload;
        if (!payload || payload.deviceId === DEVICE_ID || !payload.session) return;
        handlers.onSession(coerceAcrSession(payload.session));
      });
      channel.on("broadcast", { event: LIVE_DELETE_EVENT }, (message) => {
        const payload = (message as { payload?: { deviceId?: string; sessionId?: unknown } })
          .payload;
        if (!payload || payload.deviceId === DEVICE_ID) return;
        if (typeof payload.sessionId === "string") handlers.onDelete?.(payload.sessionId);
      });
      channel.subscribe((status, error) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          activeChannel = channel;
          handlers.onStatus?.("connected");
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (activeChannel === channel) activeChannel = null;
          handlers.onStatus?.("off");
          console.warn("[acr-live] Canal Realtime indisponible", {
            status,
            error: error?.message,
          });
          return;
        }
        handlers.onStatus?.("connecting");
      });
      activeChannel = channel;
    } catch {
      handlers.onStatus?.("off");
    }
  });

  return () => {
    cancelled = true;
    if (channel) {
      try {
        void getSupabase()?.removeChannel(channel);
      } catch {}
      if (activeChannel === channel) activeChannel = null;
    }
  };
};

// Diffuse la session aux autres appareils. Fire-and-forget : si le canal
// n'est pas (encore) joint ou que l'envoi échoue, deviceSync reste le
// filet de sécurité (la session arrivera au prochain pull).
export const publishAcrLiveSession = (session: AcrFullSession): void => {
  const channel = activeChannel;
  if (!channel) return;
  try {
    void channel.send({
      type: "broadcast",
      event: LIVE_EVENT,
      payload: { deviceId: DEVICE_ID, session },
    });
  } catch {}
};

// Annonce la suppression d'une session aux autres appareils, pour que leur
// liste de sessions récentes se nettoie en direct. Même filet de sécurité :
// la pierre tombale de deviceSync fait foi côté serveur.
export const publishAcrLiveDelete = (sessionId: string): void => {
  const channel = activeChannel;
  if (!channel) return;
  try {
    void channel.send({
      type: "broadcast",
      event: LIVE_DELETE_EVENT,
      payload: { deviceId: DEVICE_ID, sessionId },
    });
  } catch {}
};
