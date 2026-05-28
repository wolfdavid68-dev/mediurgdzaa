// Mock du module virtuel `virtual:pwa-register/react` fourni par
// vite-plugin-pwa. Permet de simuler "needRefresh=true/false" et de capturer
// les appels à updateServiceWorker.
import { useState } from "react";

let mockNeedRefresh = false;
let mockOfflineReady = false;
let mockUpdateSW = vi.fn();
type MockServiceWorkerRegistration = Pick<ServiceWorkerRegistration, "update">;

let mockOnRegistered: ((reg: MockServiceWorkerRegistration | null) => void) | undefined;
let mockOnRegisterError: ((err: unknown) => void) | undefined;

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: (opts: {
    onRegistered?: (reg: MockServiceWorkerRegistration | null) => void;
    onRegisterError?: (err: unknown) => void;
  }) => {
    const [needRefresh, setNeedRefresh] = useState(mockNeedRefresh);
    const [offlineReady, setOfflineReady] = useState(mockOfflineReady);
    mockOnRegistered = opts?.onRegistered;
    mockOnRegisterError = opts?.onRegisterError;
    return {
      needRefresh: [needRefresh, setNeedRefresh],
      offlineReady: [offlineReady, setOfflineReady],
      updateServiceWorker: mockUpdateSW,
    };
  },
}));

import { act, fireEvent, render, screen } from "@testing-library/react";
import UpdatePrompt from "./UpdatePrompt";

beforeEach(() => {
  mockNeedRefresh = false;
  mockOfflineReady = false;
  mockUpdateSW = vi.fn();
  mockOnRegistered = undefined;
  mockOnRegisterError = undefined;
});

describe("UpdatePrompt", () => {
  test("needRefresh=false : ne rend rien", () => {
    mockNeedRefresh = false;
    const { container } = render(<UpdatePrompt />);
    expect(container.querySelector(".update-prompt")).toBeNull();
  });

  test("needRefresh=true : affiche le toast + boutons", () => {
    mockNeedRefresh = true;
    render(<UpdatePrompt />);
    expect(screen.getByText("Nouvelle version disponible")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mettre à jour" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fermer")).toBeInTheDocument();
  });

  test("clic sur « Mettre à jour » appelle updateServiceWorker(true)", () => {
    mockNeedRefresh = true;
    render(<UpdatePrompt />);
    fireEvent.click(screen.getByRole("button", { name: "Mettre à jour" }));
    expect(mockUpdateSW).toHaveBeenCalledWith(true);
  });

  test("clic sur « Fermer » cache le toast", () => {
    mockNeedRefresh = true;
    render(<UpdatePrompt />);
    expect(screen.getByText("Nouvelle version disponible")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Fermer"));
    expect(screen.queryByText("Nouvelle version disponible")).not.toBeInTheDocument();
  });

  test("toast utilise role=status + aria-live=polite (annonce non intrusive)", () => {
    mockNeedRefresh = true;
    render(<UpdatePrompt />);
    const toast = screen.getByRole("status");
    expect(toast).toHaveAttribute("aria-live", "polite");
  });

  test("onRegistered : si reg fourni, programme un setInterval (vérification 1h)", () => {
    vi.useFakeTimers();
    mockNeedRefresh = false;
    render(<UpdatePrompt />);
    expect(mockOnRegistered).toBeDefined();
    const update = vi.fn().mockResolvedValue(undefined);
    mockOnRegistered!({ update });
    // Avance 1h ⇒ update() doit avoir été appelé une fois
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(1);
    // 2h ⇒ 2 appels
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  test("onRegistered avec reg=null : pas de setInterval (no-op)", () => {
    vi.useFakeTimers();
    render(<UpdatePrompt />);
    expect(() => mockOnRegistered!(null)).not.toThrow();
    vi.advanceTimersByTime(60 * 60 * 1000);
    // Aucune assertion d'appel — juste vérifier que ça ne crashe pas
    vi.useRealTimers();
  });

  test("offlineReady=true : affiche « ✓ Disponible hors-ligne » (sans bouton)", () => {
    mockOfflineReady = true;
    render(<UpdatePrompt />);
    expect(screen.getByText("✓ Disponible hors-ligne")).toBeInTheDocument();
    // Toast purement informatif : aucun bouton d'action.
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("offlineReady disparaît après 5 s", () => {
    vi.useFakeTimers();
    mockOfflineReady = true;
    render(<UpdatePrompt />);
    expect(screen.getByText("✓ Disponible hors-ligne")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("✓ Disponible hors-ligne")).toBeNull();
    vi.useRealTimers();
  });

  test("needRefresh prioritaire sur offlineReady", () => {
    mockNeedRefresh = true;
    mockOfflineReady = true;
    render(<UpdatePrompt />);
    expect(screen.getByText("Nouvelle version disponible")).toBeInTheDocument();
    expect(screen.queryByText("✓ Disponible hors-ligne")).toBeNull();
  });

  test("onRegisterError : log warning sans crasher", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<UpdatePrompt />);
    expect(mockOnRegisterError).toBeDefined();
    mockOnRegisterError!(new Error("boom"));
    expect(warn).toHaveBeenCalledTimes(1);
    const [message, error] = warn.mock.calls[0];
    expect(message).toBe("SW registration error");
    expect(error).toBeInstanceOf(Error);
    warn.mockRestore();
  });
});
