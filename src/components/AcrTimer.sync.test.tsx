import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createEmptyAcrSession, type AcrFullSession } from "../lib/acrSession";
import { writeSession } from "../lib/acrSessionStore";
import {
  connectAcrLive,
  publishAcrLiveDelete,
  publishAcrLiveSession,
  type AcrLiveStatus,
} from "../lib/acrLiveSync";
import { enqueueSyncDelete, pullSessions } from "../lib/deviceSync";
import { storageKey } from "../lib/storageKeys";
import AcrTimer from "./AcrTimer";

vi.mock("../lib/deviceSync", async () => {
  const actual = await vi.importActual<typeof import("../lib/deviceSync")>("../lib/deviceSync");
  return {
    ...actual,
    enqueueSyncItem: vi.fn(),
    enqueueSyncDelete: vi.fn(),
    pullSessions: vi.fn(),
  };
});

vi.mock("../lib/acrLiveSync", async () => {
  const actual = await vi.importActual<typeof import("../lib/acrLiveSync")>("../lib/acrLiveSync");
  return {
    ...actual,
    connectAcrLive: vi.fn(() => () => {}),
    publishAcrLiveSession: vi.fn(),
    publishAcrLiveDelete: vi.fn(),
  };
});

// Récupère les handlers passés par AcrTimer à connectAcrLive pour pouvoir
// simuler une réception broadcast / un changement de statut du canal.
const liveHandlers = () => {
  const calls = vi.mocked(connectAcrLive).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][0] as {
    onSession: (session: AcrFullSession) => void;
    onDelete?: (sessionId: string) => void;
    onStatus?: (status: AcrLiveStatus) => void;
  };
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "AudioContext",
    class {
      currentTime = 0;
      state = "running";
      destination = {};
      createOscillator() {
        return { frequency: { value: 0 }, type: "", connect() {}, start() {}, stop() {} };
      }
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
      }
      resume() {
        return Promise.resolve();
      }
    }
  );
  vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn() });
  vi.stubGlobal("SpeechSynthesisUtterance", class {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AcrTimer · relais multi-appareils", () => {
  test("affiche une session distante avec badge et ne l'écrit localement qu'à la reprise", async () => {
    const user = userEvent.setup();
    const remote = {
      ...createEmptyAcrSession(),
      id: "acr-remote",
      createdAt: Date.now() - 60_000,
      updatedAt: Date.now(),
      stats: { elapsed: 0, shocks: 3, adres: 0, amios: 0, cycle: 5 },
    };
    vi.mocked(pullSessions).mockResolvedValue([
      { session: remote, updatedAt: remote.updatedAt, source: "remote" },
    ]);

    render(<AcrTimer onOpenDrug={() => {}} />);

    expect(await screen.findByText("depuis un autre appareil")).toBeInTheDocument();
    expect(localStorage.getItem(storageKey.acrSessionV2(remote.id))).toBeNull();

    await user.click(screen.getByRole("button", { name: /^Adulte · ERC/ }));

    expect(localStorage.getItem(storageKey.acrSessionV2(remote.id))).not.toBeNull();
    expect(screen.getByRole("button", { name: /^▶ / })).toBeInTheDocument();
  });
});

describe("AcrTimer · synchro live multi-appareils", () => {
  test("une session distante reçue en broadcast apparaît dans les sessions récentes", async () => {
    vi.mocked(pullSessions).mockResolvedValue([]);
    render(<AcrTimer onOpenDrug={() => {}} />);

    const remote = {
      ...createEmptyAcrSession(),
      id: "acr-live-list",
      stats: { elapsed: 0, shocks: 1, adres: 0, amios: 0, cycle: 2 },
    };
    act(() => liveHandlers().onSession(remote));

    expect(await screen.findByText("depuis un autre appareil")).toBeInTheDocument();
    // Pas d'écriture locale tant qu'on n'a pas repris la session.
    expect(localStorage.getItem(storageKey.acrSessionV2(remote.id))).toBeNull();
  });

  test("la session active est mise à jour en direct et re-publiée seulement sur vrai changement", async () => {
    vi.mocked(pullSessions).mockResolvedValue([]);
    const user = userEvent.setup();
    const local = {
      ...createEmptyAcrSession(),
      id: "acr-live-active",
      createdAt: Date.now() - 120_000,
      updatedAt: Date.now() - 60_000,
    };
    writeSession(local);

    render(<AcrTimer onOpenDrug={() => {}} />);
    await user.click(screen.getByRole("button", { name: /^Adulte · ERC/ }));
    expect(screen.getByText(/Cycle 1/)).toBeInTheDocument();
    // La reprise publie l'état courant vers les autres appareils.
    expect(publishAcrLiveSession).toHaveBeenCalled();
    const publishCount = vi.mocked(publishAcrLiveSession).mock.calls.length;

    // Le badge Live apparaît quand le canal est joint.
    act(() => liveHandlers().onStatus?.("connected"));
    expect(screen.getByText("⇄ Live")).toBeInTheDocument();

    // Un autre appareil pousse 3 chocs / cycle 4 → appliqué en direct.
    // updatedAt strictement futur : la reprise locale vient de rafraîchir
    // updatedAt à Date.now(), il faut que le distant soit plus récent.
    const remote = {
      ...local,
      updatedAt: Date.now() + 5_000,
      stats: { elapsed: 30, shocks: 3, adres: 1, amios: 0, cycle: 4 },
    };
    act(() => liveHandlers().onSession(remote));

    expect(screen.getByText(/Cycle 4/)).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(storageKey.acrSessionV2(local.id)) ?? "{}");
    expect(stored.stats.shocks).toBe(3);
    // L'application d'une session distante ne déclenche pas de re-broadcast
    // (anti-écho) : aucune publication supplémentaire.
    expect(vi.mocked(publishAcrLiveSession).mock.calls.length).toBe(publishCount);
  });
});

describe("AcrTimer · suppression manuelle des sessions", () => {
  test("supprimer efface localement, enfile la tombale serveur et prévient les autres appareils", async () => {
    vi.mocked(pullSessions).mockResolvedValue([]);
    const confirmMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirmMock);
    const user = userEvent.setup();
    const local = {
      ...createEmptyAcrSession(),
      id: "acr-delete-me",
      createdAt: Date.now() - 120_000,
      updatedAt: Date.now() - 60_000,
    };
    writeSession(local);

    render(<AcrTimer onOpenDrug={() => {}} />);
    expect(screen.getByRole("button", { name: /^Adulte · ERC/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Supprimer la session/ }));

    expect(confirmMock).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^Adulte · ERC/ })).not.toBeInTheDocument();
    expect(localStorage.getItem(storageKey.acrSessionV2(local.id))).toBeNull();
    expect(enqueueSyncDelete).toHaveBeenCalledWith(null, "acr-session", local.id);
    expect(publishAcrLiveDelete).toHaveBeenCalledWith(local.id);
  });

  test("annuler la confirmation ne supprime rien", async () => {
    vi.mocked(pullSessions).mockResolvedValue([]);
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    const user = userEvent.setup();
    const local = { ...createEmptyAcrSession(), id: "acr-keep-me" };
    writeSession(local);

    render(<AcrTimer onOpenDrug={() => {}} />);
    await user.click(screen.getByRole("button", { name: /^Supprimer la session/ }));

    expect(screen.getByRole("button", { name: /^Adulte · ERC/ })).toBeInTheDocument();
    expect(localStorage.getItem(storageKey.acrSessionV2(local.id))).not.toBeNull();
  });

  test("une suppression annoncée par un autre appareil retire la session de la liste", async () => {
    vi.mocked(pullSessions).mockResolvedValue([]);
    const local = { ...createEmptyAcrSession(), id: "acr-remote-delete" };
    writeSession(local);

    render(<AcrTimer onOpenDrug={() => {}} />);
    expect(screen.getByRole("button", { name: /^Adulte · ERC/ })).toBeInTheDocument();

    act(() => liveHandlers().onDelete?.("acr-remote-delete"));

    expect(screen.queryByRole("button", { name: /^Adulte · ERC/ })).not.toBeInTheDocument();
    expect(localStorage.getItem(storageKey.acrSessionV2(local.id))).toBeNull();
  });
});
