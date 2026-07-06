import { coerceAcrSession, type AcrFullSession } from "./acrSession";
import { safeGetJson, safeRemoveItem, safeSetJson } from "./safeStorage";
import { STORAGE_KEYS, storageKey } from "./storageKeys";

export const ACR_SESSION_TTL_MS = 48 * 60 * 60 * 1000;

export type AcrSessionSummary = {
  id: string;
  createdAt: number;
  updatedAt: number;
  pediatric: boolean;
  protocol: string;
  shocks: number;
  cycle: number;
};

export type AcrRuntimeState = {
  elapsed: number;
  running: boolean;
};

const readIndex = (): AcrSessionSummary[] =>
  safeGetJson<AcrSessionSummary[]>(STORAGE_KEYS.acrSessionsIndex, []).filter(
    (item): item is AcrSessionSummary =>
      Boolean(item) &&
      typeof item.id === "string" &&
      typeof item.createdAt === "number" &&
      typeof item.updatedAt === "number"
  );

const writeIndex = (items: AcrSessionSummary[]) => {
  safeSetJson(
    STORAGE_KEYS.acrSessionsIndex,
    items.sort((a, b) => b.updatedAt - a.updatedAt)
  );
};

const summarizeSession = (session: AcrFullSession): AcrSessionSummary => ({
  id: session.id,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  pediatric: session.pediatric,
  protocol: session.protocol,
  shocks: session.stats.shocks,
  cycle: session.stats.cycle,
});

const rawWriteSession = (session: AcrFullSession) => {
  const clean = coerceAcrSession(session);
  safeSetJson(storageKey.acrSessionV2(clean.id), clean);
  const nextIndex = [
    summarizeSession(clean),
    ...readIndex().filter((item) => item.id !== clean.id),
  ];
  writeIndex(nextIndex);
  return clean;
};

const migrateV1 = () => {
  const legacy = safeGetJson<unknown | null>(STORAGE_KEYS.acrSession, null);
  if (!legacy) return;
  const session = coerceAcrSession(legacy);
  rawWriteSession(session);
  safeRemoveItem(STORAGE_KEYS.acrSession);
};

const ensureReady = () => {
  migrateV1();
};

export const purgeExpired = (now = Date.now()): void => {
  ensureReady();
  const fresh = readIndex().filter((item) => {
    const expired = now - item.updatedAt > ACR_SESSION_TTL_MS;
    if (expired) safeRemoveItem(storageKey.acrSessionV2(item.id));
    return !expired;
  });
  writeIndex(fresh);
};

export const listSessions = (): AcrSessionSummary[] => {
  ensureReady();
  purgeExpired();
  return readIndex();
};

export const readSession = (id: string): AcrFullSession | null => {
  ensureReady();
  const raw = safeGetJson<unknown | null>(storageKey.acrSessionV2(id), null);
  return raw ? coerceAcrSession(raw) : null;
};

export const writeSession = (session: AcrFullSession): AcrFullSession => {
  ensureReady();
  const clean = rawWriteSession(session);
  purgeExpired();
  return clean;
};

export const deleteSession = (id: string): void => {
  ensureReady();
  safeRemoveItem(storageKey.acrSessionV2(id));
  writeIndex(readIndex().filter((item) => item.id !== id));
};

export const computeAcrRuntime = (session: AcrFullSession, now = Date.now()): AcrRuntimeState => {
  const start = session.events.find((event) => event.type === "start");
  const hasRosc = session.events.some((event) => event.type === "rosc");
  const lastEvent = session.events.at(-1);
  const running = Boolean(start && !hasRosc && lastEvent?.type !== "pause");

  if (!start) return { elapsed: session.stats.elapsed, running: false };
  if (!running) {
    const pause = [...session.events].reverse().find((event) => event.type === "pause");
    return { elapsed: pause?.t ?? session.stats.elapsed, running: false };
  }

  return {
    elapsed: Math.max(session.stats.elapsed, Math.floor((now - start.at) / 1000)),
    running: true,
  };
};
