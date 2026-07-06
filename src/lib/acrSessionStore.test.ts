import { createEmptyAcrSession } from "./acrSession";
import {
  ACR_SESSION_TTL_MS,
  computeAcrRuntime,
  deleteSession,
  listSessions,
  purgeExpired,
  readSession,
  writeSession,
} from "./acrSessionStore";
import { STORAGE_KEYS, storageKey } from "./storageKeys";

const installStorage = () => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => store.clear()),
  });
  return store;
};

const makeSession = (id: string, updatedAt: number) => ({
  ...createEmptyAcrSession(),
  id,
  createdAt: updatedAt - 1_000,
  updatedAt,
  stats: { elapsed: 0, shocks: 0, adres: 0, amios: 0, cycle: 1 },
});

describe("acrSessionStore", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(20_000);
    store = installStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("écrit, liste, lit et supprime une session", () => {
    const session = makeSession("acr-a", 2_000);
    writeSession(session);

    expect(listSessions()).toEqual([
      expect.objectContaining({ id: "acr-a", updatedAt: 2_000, cycle: 1 }),
    ]);
    expect(readSession("acr-a")).toMatchObject({ id: "acr-a" });

    deleteSession("acr-a");
    expect(readSession("acr-a")).toBeNull();
    expect(listSessions()).toEqual([]);
  });

  test("trie l'index par mise à jour décroissante", () => {
    writeSession(makeSession("acr-a", 2_000));
    writeSession(makeSession("acr-b", 4_000));

    expect(listSessions().map((item) => item.id)).toEqual(["acr-b", "acr-a"]);
  });

  test("migre la clé v1 vers une session v2 puis supprime l'ancien blob", () => {
    const legacy = makeSession("acr-legacy", 5_000);
    store.set(STORAGE_KEYS.acrSession, JSON.stringify(legacy));

    expect(listSessions()).toEqual([expect.objectContaining({ id: "acr-legacy" })]);
    expect(store.has(STORAGE_KEYS.acrSession)).toBe(false);
    expect(store.has(storageKey.acrSessionV2("acr-legacy"))).toBe(true);
  });

  test("purge les sessions de plus de 48 h", () => {
    const now = 10 * ACR_SESSION_TTL_MS;
    writeSession(makeSession("acr-old", now - ACR_SESSION_TTL_MS - 1));
    writeSession(makeSession("acr-fresh", now - 1_000));

    purgeExpired(now);

    expect(listSessions().map((item) => item.id)).toEqual(["acr-fresh"]);
    expect(store.has(storageKey.acrSessionV2("acr-old"))).toBe(false);
  });

  test("recalcule le chrono d'une session en cours depuis l'heure murale", () => {
    const session = {
      ...makeSession("acr-running", 1_000),
      stats: { elapsed: 30, shocks: 0, adres: 0, amios: 0, cycle: 1 },
      events: [{ id: "start", type: "start", label: "Début ACR", t: 0, at: 1_000 }],
    };

    expect(computeAcrRuntime(session, 126_000)).toEqual({ elapsed: 125, running: true });
  });

  test("conserve le chrono figé d'une session pausée ou en RACS", () => {
    const paused = {
      ...makeSession("acr-paused", 1_000),
      stats: { elapsed: 80, shocks: 0, adres: 0, amios: 0, cycle: 1 },
      events: [
        { id: "start", type: "start", label: "Début ACR", t: 0, at: 1_000 },
        { id: "pause", type: "pause", label: "Pause", t: 80, at: 81_000 },
      ],
    };
    const rosc = {
      ...paused,
      id: "acr-rosc",
      stats: { elapsed: 140, shocks: 0, adres: 0, amios: 0, cycle: 1 },
      events: [
        { id: "start", type: "start", label: "Début ACR", t: 0, at: 1_000 },
        { id: "rosc", type: "rosc", label: "ROSC obtenu", t: 140, at: 141_000 },
      ],
    };

    expect(computeAcrRuntime(paused, 200_000)).toEqual({ elapsed: 80, running: false });
    expect(computeAcrRuntime(rosc, 200_000)).toEqual({ elapsed: 140, running: false });
  });
});
