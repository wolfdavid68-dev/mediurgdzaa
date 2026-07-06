import { createEmptyAcrSession } from "./acrSession";
import {
  enqueueSyncItem,
  flushSyncQueue,
  mergeAcrSessionCandidates,
  type PulledAcrSession,
} from "./deviceSync";
import { STORAGE_KEYS } from "./storageKeys";

const syncMocks = vi.hoisted(() => ({
  authEnabled: true,
  rpc: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("./featureFlags", () => ({
  isAuthEnabled: () => syncMocks.authEnabled,
}));

vi.mock("./supabase", () => ({
  getSupabase: () => ({
    auth: { getSession: syncMocks.getSession },
    rpc: syncMocks.rpc,
  }),
}));

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

const queuedItems = (store: Map<string, string>) =>
  JSON.parse(store.get(STORAGE_KEYS.syncQueue) ?? "[]") as unknown[];

describe("deviceSync", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installStorage();
    syncMocks.authEnabled = true;
    syncMocks.rpc.mockReset();
    syncMocks.getSession.mockReset();
    syncMocks.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("enfile puis vide la file quand la RPC réussit", async () => {
    syncMocks.rpc.mockResolvedValue({ error: null });
    const session = { ...createEmptyAcrSession(), id: "acr-1", updatedAt: 1_000 };

    enqueueSyncItem({
      kind: "acr-session",
      item_id: session.id,
      payload: session,
      updated_at: session.updatedAt,
    });
    await flushSyncQueue();

    expect(queuedItems(store)).toEqual([]);
    expect(syncMocks.rpc).toHaveBeenCalledWith(
      "upsert_sync_item",
      expect.objectContaining({ p_kind: "acr-session", p_item_id: "acr-1" })
    );
  });

  test("garde la file si le réseau ou Supabase échoue", async () => {
    syncMocks.rpc.mockRejectedValue(new Error("Failed to fetch"));

    enqueueSyncItem({
      kind: "kit-check",
      item_id: "acr",
      payload: { ts: 1_000, items: { 0: true } },
      updated_at: 1_000,
    });
    await flushSyncQueue();

    expect(queuedItems(store)).toHaveLength(1);
  });

  test("scrub le payload ACR avant l'envoi", async () => {
    syncMocks.rpc.mockResolvedValue({ error: null });
    const session = {
      ...createEmptyAcrSession(),
      id: "acr-2",
      updatedAt: 2_000,
      patient: { age: "72", sexe: "M", nom: "INTERDIT" },
    };

    enqueueSyncItem({
      kind: "acr-session",
      item_id: session.id,
      payload: session,
      updated_at: session.updatedAt,
    });
    await flushSyncQueue();

    const args = syncMocks.rpc.mock.calls.at(-1)?.[1] as { p_payload: { patient: unknown } };
    expect(args.p_payload.patient).toEqual({ age: "72", sexe: "M" });
  });

  test("reste inerte quand l'auth est désactivée", () => {
    syncMocks.authEnabled = false;

    enqueueSyncItem({
      kind: "kit-check",
      item_id: "acr",
      payload: { ts: 1_000, items: { 0: true } },
      updated_at: 1_000,
    });

    expect(queuedItems(store)).toEqual([]);
    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  test("fusionne local et serveur avec priorité au plus récent", () => {
    const local = { ...createEmptyAcrSession(), id: "acr-same", updatedAt: 1_000 };
    const remoteNewer = {
      session: { ...createEmptyAcrSession(), id: "acr-same", updatedAt: 2_000 },
      updatedAt: 2_000,
      source: "remote",
    } satisfies PulledAcrSession;
    const remoteOnly = {
      session: { ...createEmptyAcrSession(), id: "acr-remote", updatedAt: 1_500 },
      updatedAt: 1_500,
      source: "remote",
    } satisfies PulledAcrSession;

    expect(mergeAcrSessionCandidates([local], [remoteNewer, remoteOnly])).toEqual([
      expect.objectContaining({
        session: expect.objectContaining({ id: "acr-same" }),
        source: "remote",
      }),
      expect.objectContaining({
        session: expect.objectContaining({ id: "acr-remote" }),
        source: "remote",
      }),
    ]);
  });
});
