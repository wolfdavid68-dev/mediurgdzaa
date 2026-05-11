import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AcrTimer from "./AcrTimer";

// Stubs : happy-dom n'embarque ni AudioContext ni speechSynthesis. Sans ces
// stubs, beep() et speak() lèveraient. Le composant les wrap déjà dans try/catch,
// donc absence ne casse pas les tests, mais on les fournit en no-op pour éviter
// du bruit dans la console.
beforeEach(() => {
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
  vi.useRealTimers();
});

// Le bouton principal a un préfixe ▶ / ⏸ (cf. AcrTimer.tsx ligne 621-625) qui
// permet de le distinguer du bouton métronome dont aria-label = "Démarrer le
// métronome MCE" / "Arrêter le métronome MCE".
const MAIN_START = /^▶ /;
const MAIN_PAUSE = /^⏸ /;

describe("AcrTimer", () => {
  test("rend l'état initial : chrono à 00:00, bouton « Démarrer », cycle 1", () => {
    render(<AcrTimer onOpenDrug={() => {}} />);
    expect(screen.getByRole("button", { name: MAIN_START })).toBeInTheDocument();
    // Le chrono d'affichage commence à 00:00 — il y a plusieurs 00:00 sur la
    // page (elapsed, cycle countdown). On vérifie juste qu'il en existe au moins un.
    const zeros = screen.getAllByText("00:00");
    expect(zeros.length).toBeGreaterThan(0);
  });

  test("clic « Démarrer » bascule le bouton en « Pause »", async () => {
    const user = userEvent.setup();
    render(<AcrTimer onOpenDrug={() => {}} />);
    await user.click(screen.getByRole("button", { name: MAIN_START }));
    expect(screen.getByRole("button", { name: MAIN_PAUSE })).toBeInTheDocument();
  });

  test("avec fake timers, après 5s le chrono affiche 00:05", () => {
    // fireEvent (sync) plutôt que userEvent (async) : userEvent.setup avec
    // advanceTimers se bloque sur happy-dom — le couple fake-timers + async
    // events est connu pour interagir mal. fireEvent.click suffit ici.
    vi.useFakeTimers();
    render(<AcrTimer onOpenDrug={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: MAIN_START }));
    // Le tick s'appuie sur Date.now() ; advanceTimersByTime fait avancer
    // setInterval, et le tick lit le nouveau Date.now() mocké automatiquement.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("00:05")).toBeInTheDocument();
  });
});
