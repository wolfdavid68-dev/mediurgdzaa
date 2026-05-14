// Mock html-to-image (toPng) — happy-dom n'a pas de canvas, et on n'a pas
// besoin de vraiment générer une image pour tester la logique.
vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,FAKEPNG"),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import AcrSummary from "./AcrSummary";

const baseProps = {
  pediatric: false,
  elapsed: 365, // 06:05
  shocks: 3,
  adres: 2,
  amios: 1,
  cycle: 5,
  history: [
    { cycle: 1, t: 120, rhythm: "choquable", actions: ["Choc 200 J", "Adrénaline 1 mg"] },
    { cycle: 2, t: 240, rhythm: "non_choquable", actions: [] },
  ],
  events: [
    { id: "e1", type: "start", label: "Début ACR", t: 0, at: Date.now() },
    { id: "e2", type: "choc", label: "Choc 200 J", t: 120, at: Date.now() + 1000 },
    { id: "e3", type: "adre", label: "Adrénaline 1 mg", t: 130, at: Date.now() + 2000 },
  ],
  onClose: () => {},
};

describe("AcrSummary — affichage", () => {
  test("titre adapté Adulte/Enfant", () => {
    const { rerender } = render(<AcrSummary {...baseProps} />);
    expect(screen.getByText(/Bilan ACR — Adulte/)).toBeInTheDocument();
    rerender(<AcrSummary {...baseProps} pediatric={true} />);
    expect(screen.getByText(/Bilan ACR — Enfant/)).toBeInTheDocument();
  });

  test("stats : durée, chocs, adré, cordarone, cycles", () => {
    render(<AcrSummary {...baseProps} />);
    // Durée 06:05 (365 s)
    expect(screen.getByText("06:05")).toBeInTheDocument();
    // 3 chocs (au pluriel)
    expect(screen.getByText("Chocs")).toBeInTheDocument();
    // 2 adré adulte → "2 mg"
    expect(screen.getByText("2 mg")).toBeInTheDocument();
    // 1 cordarone adulte → "300 mg" (1re dose)
    expect(screen.getByText("300 mg")).toBeInTheDocument();
  });

  test("formatAmio : 2 doses = 300 + 150 mg", () => {
    render(<AcrSummary {...baseProps} amios={2} />);
    expect(screen.getByText("300 + 150 mg")).toBeInTheDocument();
  });

  test("formatAmio enfant : 2 × 5 mg/kg", () => {
    render(<AcrSummary {...baseProps} pediatric={true} amios={2} />);
    expect(screen.getByText("2 × 5 mg/kg")).toBeInTheDocument();
  });

  test("formatAdre enfant : N × 0,01 mg/kg", () => {
    render(<AcrSummary {...baseProps} pediatric={true} adres={3} />);
    expect(screen.getByText("3 × 0,01 mg/kg")).toBeInTheDocument();
  });

  test("section events affichée si events.length > 0", () => {
    render(<AcrSummary {...baseProps} />);
    expect(screen.getByText("Horodatage des actions")).toBeInTheDocument();
    // Texte coupé par les spans → on cherche partiellement
    expect(screen.getByText("Début ACR")).toBeInTheDocument();
  });

  test("section events absente si events vide", () => {
    render(<AcrSummary {...baseProps} events={[]} />);
    expect(screen.queryByText("Horodatage des actions")).not.toBeInTheDocument();
  });

  test("section cycles affichée avec rythme + actions", () => {
    render(<AcrSummary {...baseProps} />);
    expect(screen.getByText("Détail des cycles")).toBeInTheDocument();
    expect(screen.getByText("C1")).toBeInTheDocument();
    expect(screen.getByText("C2")).toBeInTheDocument();
    // Cycle 1 : choquable + actions
    expect(screen.getByText(/Choc 200 J · Adrénaline 1 mg/)).toBeInTheDocument();
    // Cycle 2 : aucune action → "—"
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  test("bloc texte « Pour transmission » avec format MM:SS", () => {
    render(<AcrSummary {...baseProps} />);
    const pre = document.querySelector(".acr-summary-text");
    expect(pre).toBeTruthy();
    expect(pre!.textContent).toMatch(/BILAN ACR — Adulte/);
    expect(pre!.textContent).toMatch(/Durée totale : 06:05/);
    expect(pre!.textContent).toMatch(/Chocs\s+: 3/);
  });
});

describe("AcrSummary — actions", () => {
  test("clic sur Fermer appelle onClose", () => {
    const onClose = vi.fn();
    render(<AcrSummary {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clic sur le × header appelle onClose aussi", () => {
    const onClose = vi.fn();
    render(<AcrSummary {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Fermer le bilan"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clic sur Copier : appelle navigator.clipboard.writeText avec le résumé", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<AcrSummary {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Copier" }));
    // Le handler est async, on attend une microtask
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("BILAN ACR"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Durée totale : 06:05"));
  });

  test("3 boutons d'export visibles : Partager, Télécharger, Copier", () => {
    render(<AcrSummary {...baseProps} />);
    expect(screen.getByRole("button", { name: /Partager/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Télécharger/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copier" })).toBeInTheDocument();
  });

  test("formatAdre : 0 dose → '0'", () => {
    render(<AcrSummary {...baseProps} adres={0} />);
    // Dans la stats grid, on cherche le label "Adré" et la valeur "0"
    const adreStats = Array.from(document.querySelectorAll(".acr-summary-stat-label")).find(
      (el) => el.textContent === "Adré"
    )?.previousElementSibling;
    expect(adreStats?.textContent).toBe("0");
  });
});
