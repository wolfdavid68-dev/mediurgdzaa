import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createEmptyAcrSession } from "../lib/acrSession";
import { pullSessions } from "../lib/deviceSync";
import { storageKey } from "../lib/storageKeys";
import AcrTimer from "./AcrTimer";

vi.mock("../lib/deviceSync", async () => {
  const actual = await vi.importActual<typeof import("../lib/deviceSync")>("../lib/deviceSync");
  return {
    ...actual,
    enqueueSyncItem: vi.fn(),
    pullSessions: vi.fn(),
  };
});

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

    await user.click(screen.getByRole("button", { name: /Adulte · ERC/ }));

    expect(localStorage.getItem(storageKey.acrSessionV2(remote.id))).not.toBeNull();
    expect(screen.getByRole("button", { name: /^▶ / })).toBeInTheDocument();
  });
});
