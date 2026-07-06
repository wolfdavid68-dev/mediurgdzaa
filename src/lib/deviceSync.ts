import { coerceAcrSession, type AcrFullSession } from "./acrSession";
import { isAuthEnabled } from "./featureFlags";
import { safeGetJson, safeSetJson } from "./safeStorage";
import { getSupabase } from "./supabase";
import { STORAGE_KEYS } from "./storageKeys";

type SyncKind = "acr-session" | "kit-check";

export type SyncQueueItem = {
  kind: SyncKind;
  item_id: string;
  payload: unknown;
  updated_at: number;
};

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
      (item.kind === "acr-session" || item.kind === "kit-check") &&
      typeof item.item_id === "string" &&
      typeof item.updated_at === "number"
  );

const writeQueue = (items: SyncQueueItem[]) => {
  safeSetJson(STORAGE_KEYS.syncQueue, items);
};

const sanitizeItem = (item: SyncQueueItem): SyncQueueItem => {
  if (item.kind !== "acr-session") return item;
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

export const enqueueSyncItem = (item: SyncQueueItem): void => {
  if (!isAuthEnabled()) return;
  const clean = sanitizeItem(item);
  const next = [
    clean,
    ...readQueue().filter(
      (queued) => queued.kind !== clean.kind || queued.item_id !== clean.item_id
    ),
  ];
  writeQueue(next);
  void flushSyncQueue();
};

export const flushSyncQueue = async (): Promise<void> => {
  const supabase = getSupabase();
  const userId = await currentUserId();
  if (!supabase || !userId) return;

  const remaining: SyncQueueItem[] = [];
  for (const item of readQueue().map(sanitizeItem)) {
    try {
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
    return (data as SyncRow[]).map((row) => {
      const session = coerceAcrSession(row.payload);
      return {
        session,
        updatedAt:
          typeof row.updated_at === "number" ? row.updated_at : new Date(row.updated_at).getTime(),
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
