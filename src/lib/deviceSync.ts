import { coerceAcrSession, type AcrFullSession } from "./acrSession";
import { isAuthEnabled } from "./featureFlags";
import { safeGetJson, safeSetJson } from "./safeStorage";
import { getSupabase } from "./supabase";
import { STORAGE_KEYS } from "./storageKeys";

type SyncKind = "acr-session" | "kit-check";

export type SyncQueueItem = {
  owner_id: string;
  kind: SyncKind;
  item_id: string;
  payload: unknown;
  updated_at: number;
  // "delete" = pierre tombale : suppression distante différée, rejouée au
  // retour réseau comme les upserts. Absent/"upsert" = comportement historique.
  op?: "upsert" | "delete";
};

type SyncQueueInput = Omit<SyncQueueItem, "owner_id">;

export type PulledAcrSession = {
  session: AcrFullSession;
  updatedAt: number;
  source: "remote";
};

export type KitCheckPayload = {
  ts?: number;
  items?: Record<number, boolean>;
};

export type PulledKitCheck = {
  kitId: string;
  payload: KitCheckPayload;
  updatedAt: number;
};

export type AcrSessionCandidate = {
  session: AcrFullSession;
  updatedAt: number;
  source: "local" | "remote";
};

type SyncRow = {
  item_id: string;
  payload: unknown;
  updated_at: string | number;
};

const readQueue = (): SyncQueueItem[] =>
  safeGetJson<SyncQueueItem[]>(STORAGE_KEYS.syncQueue, []).filter(
    (item): item is SyncQueueItem =>
      Boolean(item) &&
      typeof item.owner_id === "string" &&
      item.owner_id.length > 0 &&
      (item.kind === "acr-session" || item.kind === "kit-check") &&
      typeof item.item_id === "string" &&
      typeof item.updated_at === "number" &&
      (item.op === undefined || item.op === "upsert" || item.op === "delete")
  );

const writeQueue = (items: SyncQueueItem[]) => {
  safeSetJson(STORAGE_KEYS.syncQueue, items);
};

const sanitizeItem = (item: SyncQueueItem): SyncQueueItem => {
  if (item.op === "delete" || item.kind !== "acr-session") return item;
  const session = coerceAcrSession(item.payload);
  return {
    ...item,
    item_id: session.id,
    payload: session,
    updated_at: session.updatedAt,
  };
};

const currentUserId = async (): Promise<string | null> => {
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

export const enqueueSyncItem = (ownerId: string | null, item: SyncQueueInput): void => {
  if (!isAuthEnabled() || !ownerId) return;
  const clean = sanitizeItem({ ...item, owner_id: ownerId });
  const next = [
    clean,
    ...readQueue().filter(
      (queued) =>
        queued.owner_id !== ownerId ||
        queued.kind !== clean.kind ||
        queued.item_id !== clean.item_id
    ),
  ];
  writeQueue(next);
  void flushSyncQueue();
};

// Suppression distante différée. La pierre tombale remplace tout upsert en
// attente pour le même item (inutile de pousser un état qu'on supprime) et
// sera rejouée au retour réseau — sans elle, une session supprimée
// localement « ressusciterait » au prochain pull.
export const enqueueSyncDelete = (ownerId: string | null, kind: SyncKind, itemId: string): void => {
  if (!isAuthEnabled() || !ownerId) return;
  const tombstone: SyncQueueItem = {
    owner_id: ownerId,
    kind,
    item_id: itemId,
    payload: null,
    updated_at: Date.now(),
    op: "delete",
  };
  const next = [
    tombstone,
    ...readQueue().filter(
      (queued) => queued.owner_id !== ownerId || queued.kind !== kind || queued.item_id !== itemId
    ),
  ];
  writeQueue(next);
  void flushSyncQueue();
};

// IDs avec une suppression en attente — les pulls les écartent pour que la
// session ne réapparaisse pas dans la liste tant que la tombale n'est pas
// passée côté serveur.
const pendingDeleteIds = (ownerId: string, kind: SyncKind): Set<string> =>
  new Set(
    readQueue()
      .filter((item) => item.owner_id === ownerId && item.op === "delete" && item.kind === kind)
      .map((item) => item.item_id)
  );

export const flushSyncQueue = async (): Promise<void> => {
  const supabase = getSupabase();
  const userId = await currentUserId();
  if (!supabase || !userId) return;

  const queue = readQueue().map(sanitizeItem);
  const remaining = queue.filter((item) => item.owner_id !== userId);
  for (const item of queue.filter((item) => item.owner_id === userId)) {
    try {
      if (item.op === "delete") {
        // Suppression directe sur la table : la policy RLS
        // sync_items_self_delete limite déjà aux lignes de l'utilisateur.
        const { error } = await supabase
          .from("sync_items")
          .delete()
          .eq("kind", item.kind)
          .eq("item_id", item.item_id);
        if (error) remaining.push(item);
        continue;
      }
      const { error } = await supabase.rpc("upsert_sync_item", {
        p_kind: item.kind,
        p_item_id: item.item_id,
        p_payload: item.payload,
        p_updated_at: new Date(item.updated_at).toISOString(),
      });
      if (error) remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
};

export const initializeDeviceSync = (): (() => void) => {
  void flushSyncQueue();
  const onOnline = () => void flushSyncQueue();
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
};

export const pullSessions = async (): Promise<PulledAcrSession[]> => {
  const supabase = getSupabase();
  const userId = await currentUserId();
  if (!supabase || !userId) return [];

  await flushSyncQueue();
  try {
    const { data, error } = await supabase.rpc("list_sync_items", {
      p_kind: "acr-session",
    });
    if (error || !Array.isArray(data)) return [];
    const deleted = pendingDeleteIds(userId, "acr-session");
    return (data as SyncRow[])
      .filter((row) => !deleted.has(row.item_id))
      .map((row) => {
        const session = coerceAcrSession(row.payload);
        return {
          session,
          updatedAt:
            typeof row.updated_at === "number"
              ? row.updated_at
              : new Date(row.updated_at).getTime(),
          source: "remote",
        };
      });
  } catch {
    return [];
  }
};

export const pullKitChecks = async (): Promise<PulledKitCheck[]> => {
  const supabase = getSupabase();
  const userId = await currentUserId();
  if (!supabase || !userId) return [];

  await flushSyncQueue();
  try {
    const { data, error } = await supabase.rpc("list_sync_items", {
      p_kind: "kit-check",
    });
    if (error || !Array.isArray(data)) return [];
    return (data as SyncRow[]).map((row) => ({
      kitId: row.item_id,
      payload: row.payload as KitCheckPayload,
      updatedAt:
        typeof row.updated_at === "number" ? row.updated_at : new Date(row.updated_at).getTime(),
    }));
  } catch {
    return [];
  }
};

export const mergeAcrSessionCandidates = (
  localSessions: AcrFullSession[],
  remoteSessions: PulledAcrSession[]
): AcrSessionCandidate[] => {
  const byId = new Map<string, AcrSessionCandidate>();
  for (const session of localSessions) {
    byId.set(session.id, {
      session,
      updatedAt: session.updatedAt,
      source: "local",
    });
  }
  for (const remote of remoteSessions) {
    const previous = byId.get(remote.session.id);
    if (!previous || remote.updatedAt > previous.updatedAt) {
      byId.set(remote.session.id, {
        session: remote.session,
        updatedAt: remote.updatedAt,
        source: "remote",
      });
    }
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
};
