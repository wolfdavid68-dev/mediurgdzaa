// Tests du canal live ACR multi-appareils.
// Environnement node (projet "libs") : Supabase est intégralement simulé.

import { createEmptyAcrSession, type AcrFullSession } from "./acrSession";

const getSupabaseMock = vi.fn();
vi.mock("./supabase", () => ({ getSupabase: () => getSupabaseMock() }));

type BroadcastMessage = { payload?: { deviceId?: string; session?: unknown } };
type SentMessage = { type: string; event: string; payload: { deviceId: string; session: unknown } };

const makeFakeSupabase = (userId: string | null) => {
  const sent: SentMessage[] = [];
  let broadcastHandler: ((message: BroadcastMessage) => void) | null = null;
  let statusCallback: ((status: string) => void) | null = null;

  const channel = {
    on(_type: string, _filter: unknown, handler: (message: BroadcastMessage) => void) {
      broadcastHandler = handler;
      return channel;
    },
    subscribe(callback: (status: string) => void) {
      statusCallback = callback;
      return channel;
    },
    send(message: SentMessage) {
      sent.push(message);
      return Promise.resolve("ok");
    },
  };

  const removeChannel = vi.fn();
  const supabase = {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: userId ? { user: { id: userId } } : null } }),
    },
    channel: vi.fn(() => channel),
    removeChannel,
  };

  return {
    supabase,
    sent,
    removeChannel,
    channelFactory: supabase.channel,
    emit: (payload: BroadcastMessage["payload"]) => broadcastHandler?.({ payload }),
    setStatus: (status: string) => statusCallback?.(status),
  };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const loadModule = async () => await import("./acrLiveSync");

beforeEach(() => {
  vi.resetModules();
  getSupabaseMock.mockReset();
});

describe("acrLiveSignature", () => {
  test("stable quand seul le chrono avance, change quand le contenu clinique change", async () => {
    const { acrLiveSignature } = await loadModule();
    const session = createEmptyAcrSession();
    const tick = { ...session, updatedAt: session.updatedAt + 1000 };
    tick.stats = { ...tick.stats, elapsed: 42 };
    expect(acrLiveSignature(tick)).toBe(acrLiveSignature(session));

    const shocked = { ...session, stats: { ...session.stats, shocks: 1 } };
    expect(acrLiveSignature(shocked)).not.toBe(acrLiveSignature(session));
  });
});

describe("connectAcrLive / publishAcrLiveSession", () => {
  test("publish sans canal joint = no-op silencieux", async () => {
    const { publishAcrLiveSession } = await loadModule();
    expect(() => publishAcrLiveSession(createEmptyAcrSession())).not.toThrow();
  });

  test("sans Supabase configuré : statut off, aucun canal", async () => {
    getSupabaseMock.mockReturnValue(null);
    const { connectAcrLive } = await loadModule();
    const onStatus = vi.fn();
    const cleanup = connectAcrLive({ onSession: vi.fn(), onStatus });
    await flush();
    expect(onStatus).toHaveBeenCalledWith("off");
    cleanup();
  });

  test("sans session authentifiée : statut off, aucun canal", async () => {
    const fake = makeFakeSupabase(null);
    getSupabaseMock.mockReturnValue(fake.supabase);
    const { connectAcrLive } = await loadModule();
    const onStatus = vi.fn();
    const cleanup = connectAcrLive({ onSession: vi.fn(), onStatus });
    await flush();
    expect(onStatus).toHaveBeenCalledWith("off");
    expect(fake.channelFactory).not.toHaveBeenCalled();
    cleanup();
  });

  test("connecté : canal par utilisateur, réception coercée, écho local filtré", async () => {
    const fake = makeFakeSupabase("user-42");
    getSupabaseMock.mockReturnValue(fake.supabase);
    const { connectAcrLive, publishAcrLiveSession } = await loadModule();

    const onSession = vi.fn();
    const onStatus = vi.fn();
    const cleanup = connectAcrLive({ onSession, onStatus });
    await flush();

    expect(fake.channelFactory).toHaveBeenCalledWith("acr-live-user-42", {
      config: { broadcast: { self: false } },
    });
    fake.setStatus("SUBSCRIBED");
    expect(onStatus).toHaveBeenLastCalledWith("connected");

    // Réception depuis un AUTRE appareil : coercée puis délivrée.
    const remote = { ...createEmptyAcrSession(), id: "acr-remote-1" };
    fake.emit({ deviceId: "autre-appareil", session: { ...remote, patient: { nom: "X" } } });
    expect(onSession).toHaveBeenCalledTimes(1);
    const delivered = onSession.mock.calls[0][0] as AcrFullSession;
    expect(delivered.id).toBe("acr-remote-1");
    // coerceAcrSession scrube les champs nominatifs.
    expect(delivered.patient).toEqual({});

    // Notre propre broadcast (même deviceId) est ignoré au retour.
    publishAcrLiveSession(remote);
    expect(fake.sent).toHaveLength(1);
    const ownDeviceId = fake.sent[0].payload.deviceId;
    fake.emit({ deviceId: ownDeviceId, session: remote });
    expect(onSession).toHaveBeenCalledTimes(1);

    // Payload sans session : ignoré sans crash.
    fake.emit({ deviceId: "autre-appareil" });
    expect(onSession).toHaveBeenCalledTimes(1);

    cleanup();
    expect(fake.removeChannel).toHaveBeenCalled();
    // Après cleanup, publier redevient un no-op.
    publishAcrLiveSession(remote);
    expect(fake.sent).toHaveLength(1);
  });

  test("cleanup avant résolution de l'utilisateur : aucun canal monté", async () => {
    const fake = makeFakeSupabase("user-42");
    getSupabaseMock.mockReturnValue(fake.supabase);
    const { connectAcrLive } = await loadModule();
    const cleanup = connectAcrLive({ onSession: vi.fn() });
    cleanup();
    await flush();
    expect(fake.channelFactory).not.toHaveBeenCalled();
  });
});
