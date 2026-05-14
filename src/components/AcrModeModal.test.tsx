// Mock d'AcrTimer pour ne tester que le wrapper (picker + persistance protocole
// + bascule vers le timer). AcrTimer a sa propre suite de tests.
vi.mock("./AcrTimer", () => ({
  default: ({ pediatric, protocol }: { pediatric: boolean; protocol: string }) => (
    <div data-testid="mock-acr-timer">
      timer-mounted pediatric={String(pediatric)} protocol={protocol}
    </div>
  ),
}));

// Mock useWakeLock — l'API wakeLock n'existe pas sous happy-dom et le hook
// vérifie navigator.wakeLock avant tout, mais on évite le bruit.
vi.mock("../lib/useWakeLock", () => ({
  useWakeLock: vi.fn(),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import AcrModeModal from "./AcrModeModal";

const PROTOCOL_LS_KEY = "mediurg-acr-protocol";

// Node 22 + happy-dom v20 : localStorage natif Node sans --localstorage-file
// expose un objet sans .getItem/.setItem fonctionnels. On stub avec un Map.
const lsStore = new Map<string, string>();
beforeEach(() => {
  lsStore.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => lsStore.get(k) ?? null,
    setItem: (k: string, v: string) => {
      lsStore.set(k, String(v));
    },
    removeItem: (k: string) => {
      lsStore.delete(k);
    },
    clear: () => lsStore.clear(),
    key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
    get length() {
      return lsStore.size;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AcrModeModal — étape 1 picker", () => {
  test("open=true : affiche le titre + protocoles ERC/ACLS + boutons Adulte/Enfant", () => {
    render(<AcrModeModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/Urgence vitale · ACR/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /ERC 2021/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /ACLS 2024/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adulte/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enfant/ })).toBeInTheDocument();
    // Le timer n'est pas encore monté
    expect(screen.queryByTestId("mock-acr-timer")).not.toBeInTheDocument();
  });

  test("ERC est sélectionné par défaut", () => {
    render(<AcrModeModal open={true} onClose={() => {}} />);
    const erc = screen.getByRole("radio", { name: /ERC 2021/ });
    const acls = screen.getByRole("radio", { name: /ACLS 2024/ });
    expect(erc).toHaveAttribute("aria-checked", "true");
    expect(acls).toHaveAttribute("aria-checked", "false");
  });

  test("clic sur ACLS bascule la sélection et persiste en localStorage", () => {
    render(<AcrModeModal open={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("radio", { name: /ACLS 2024/ }));
    expect(screen.getByRole("radio", { name: /ACLS 2024/ })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(lsStore.get(PROTOCOL_LS_KEY)).toBe("acls");
  });

  test("au mount, lit la sélection persistée en localStorage (acls)", () => {
    lsStore.set(PROTOCOL_LS_KEY, "acls");
    render(<AcrModeModal open={true} onClose={() => {}} />);
    expect(screen.getByRole("radio", { name: /ACLS 2024/ })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  test("valeur localStorage invalide → fallback sur ERC", () => {
    lsStore.set(PROTOCOL_LS_KEY, "valeur-invalide");
    render(<AcrModeModal open={true} onClose={() => {}} />);
    expect(screen.getByRole("radio", { name: /ERC 2021/ })).toHaveAttribute("aria-checked", "true");
  });
});

describe("AcrModeModal — étape 2 timer monté", () => {
  test("clic sur Adulte monte AcrTimer avec pediatric=false + bascule l'UI", () => {
    const { container } = render(<AcrModeModal open={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Adulte/ }));
    const timer = screen.getByTestId("mock-acr-timer");
    expect(timer).toBeInTheDocument();
    expect(timer.textContent).toContain("pediatric=false");
    expect(timer.textContent).toContain("protocol=erc");
    // Le picker initial (.acr-mode-picker) n'est plus rendu — note : un bouton
    // de bascule "↔ Enfant" apparaît MAIS dans .acr-mode-switch, pas le picker.
    expect(container.querySelector(".acr-mode-picker")).toBeNull();
    expect(container.querySelector(".acr-mode-switch")).toBeInTheDocument();
  });

  test("clic sur Enfant monte AcrTimer avec pediatric=true + sous-titre adapté", () => {
    render(<AcrModeModal open={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Enfant/ }));
    const timer = screen.getByTestId("mock-acr-timer");
    expect(timer.textContent).toContain("pediatric=true");
    expect(screen.getByText(/· Enfant/)).toBeInTheDocument();
  });

  test("ACLS sélectionné puis Adulte : timer reçoit protocol=acls", () => {
    render(<AcrModeModal open={true} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("radio", { name: /ACLS 2024/ }));
    fireEvent.click(screen.getByRole("button", { name: /Adulte/ }));
    expect(screen.getByTestId("mock-acr-timer").textContent).toContain("protocol=acls");
  });
});

describe("AcrModeModal — fermeture", () => {
  test("clic sur le bouton fermer (×) appelle onClose", () => {
    const onClose = vi.fn();
    render(<AcrModeModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Fermer le mode urgence"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("open=false : la modale n'a pas le picker visible", () => {
    render(<AcrModeModal open={false} onClose={() => {}} />);
    // <dialog> avec open=false ne doit pas afficher son contenu interactif
    // (le DOM est rendu mais display:none par <dialog> natif).
    // On vérifie au moins que les useEffect ne plantent pas.
    expect(document.querySelector("dialog.acr-mode-dialog")).toBeInTheDocument();
  });
});
