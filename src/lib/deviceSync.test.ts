import { createEmptyAcrSession } from "./acrSession";
import {
  enqueueSyncDelete,
  enqueueSyncItem,
  flushSyncQueue,
  mergeAcrSessionCandidates,
  pullSessions,
  type PulledAcrSession,
} from "./deviceSync";
import { STORAGE_KEYS } from "./storageKeys";

const syncMocks = vi.hoisted(() => ({
  authEnabled: true,
  rpc: vi.fn(),
  getSession: vi.fn(),
  tableDelete: vi.fn(),
}));

vi.mock("./featureFlags", () => ({
  isAuthEnabled: () => syncMocks.authEnabled,
}));

vi.mock("./supabase", () => ({
  getSupabase: () => ({
    auth: { getSession: syncMocks.getSession },
    rpc: syncMocks.rpc,
    // .from("sync_items").delete().eq("kind", …).eq("item_id", …) — la
    // dernière étape résout la promesse via tableDelete.
    from: (table: string) => ({
      delete: () => ({
        eq: (_c1: string, kind: string) => ({
          eq: (_c2: string, itemId: string) => syncMocks.tableDelete(table, kind, itemId),
        }),
      }),
    }),
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
    syncMocks.tableDelete.mockReset();
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

  test("la pierre tombale supprime côté serveur et remplace l'upsert en attente", async () => {
    syncMocks.tableDelete.mockResolvedValue({ error: null });
    const session = { ...createEmptyAcrSession(), id: "acr-del", updatedAt: 1_000 };

    // Un upsert attend déjà pour cette session : la suppression doit le
    // remplacer dans la file, pas s'y ajouter (inspection synchrone, avant
    // que les flushs asynchrones ne tournent).
    enqueueSyncItem({
      kind: "acr-session",
      item_id: session.id,
      payload: session,
      updated_at: session.updatedAt,
    });
    enqueueSyncDelete("acr-session", session.id);
    expect(queuedItems(store)).toEqual([
      expect.objectContaining({ op: "delete", item_id: "acr-del" }),
    ]);

    await flushSyncQueue();

    expect(queuedItems(store)).toEqual([]);
    expect(syncMocks.tableDelete).toHaveBeenCalledWith("sync_items", "acr-session", "acr-del");
    // L'upsert remplacé n'est jamais parti vers la RPC.
    expect(syncMocks.rpc).not.toHaveBeenCalled();
  });

  test("la pierre tombale reste en file si la suppression distante échoue", async () => {
    syncMocks.tableDelete.mockRejectedValue(new Error("Failed to fetch"));

    enqueueSyncDelete("acr-session", "acr-offline");
    await flushSyncQueue();

    expect(queuedItems(store)).toEqual([
      expect.objectContaining({ op: "delete", item_id: "acr-offline" }),
    ]);
  });

  test("pullSessions écarte les sessions dont la suppression est en attente", async () => {
    syncMocks.tableDelete.mockRejectedValue(new Error("Failed to fetch"));
    enqueueSyncDelete("acr-session", "acr-pending-delete");
    await flushSyncQueue();

    syncMocks.rpc.mockResolvedValue({
      error: null,
      data: [
        {
          item_id: "acr-pending-delete",
          payload: { ...createEmptyAcrSession(), id: "acr-pending-delete" },
          updated_at: 2_000,
        },
        {
          item_id: "acr-kept",
          payload: { ...createEmptyAcrSession(), id: "acr-kept" },
          updated_at: 1_000,
        },
      ],
    });

    const pulled = await pullSessions();
    expect(pulled.map((item) => item.session.id)).toEqual(["acr-kept"]);
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
