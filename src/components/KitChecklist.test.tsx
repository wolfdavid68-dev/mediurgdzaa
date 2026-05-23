import { afterEach, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import KitChecklist from "./KitChecklist";

// Mini-checklist couvrant les 3 types d'items + un select dérivé des drogues.
const mockChecklist = [
  {
    titre: "Section A",
    items: [
      { type: "check" as const, label: "Item 1" },
      { type: "check" as const, label: "Item 2" },
    ],
  },
  {
    titre: "Section B",
    items: [
      { type: "choice" as const, label: "Choix B", options: ["Opt1", "Opt2"] },
      { type: "text" as const, label: "Texte B", unit: "mg" },
    ],
  },
  {
    titre: "Section C",
    items: [
      { type: "select" as const, label: "Drogue", from: "Hypnotique" },
      { type: "check" as const, label: "Coche finale" },
    ],
  },
];

const drogues = [
  { nom: "Étomidate", role: "Hypnotique d'induction" },
  { nom: "Sufentanil", role: "Morphinique d'induction" },
];

const renderChecklist = () =>
  render(
    <KitChecklist
      kitId="test-kit"
      titre="Test — KitChecklist"
      checklist={mockChecklist}
      drogues={drogues}
      couleur="#FF453A"
    />
  );

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
afterEach(() => {
  localStorage.clear();
});

describe("KitChecklist — rendu", () => {
  test("affiche les titres de section et les libellés des items", () => {
    renderChecklist();
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Choix B")).toBeInTheDocument();
    expect(screen.getByText("Coche finale")).toBeInTheDocument();
  });

  test("le select dérivé filtre les drogues du kit par le mot-clé `from`", () => {
    renderChecklist();
    // Hypnotiques uniquement → Étomidate, pas Sufentanil
    const select = screen.getByLabelText("Drogue") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("Étomidate");
    expect(options).not.toContain("Sufentanil");
  });

  test("compteur initial 0/6 (tous les items comptés, pas que les coches)", () => {
    renderChecklist();
    expect(screen.getByText(/0\/6 complétés?/)).toBeInTheDocument();
  });
});

describe("KitChecklist — interactions", () => {
  test("cocher un item incrémente le compteur global", () => {
    renderChecklist();
    fireEvent.click(screen.getByLabelText("Item 1"));
    expect(screen.getByText(/1\/6 complétés?/)).toBeInTheDocument();
  });

  test("sélectionner un choix met à jour la valeur (chip actif)", () => {
    renderChecklist();
    fireEvent.click(screen.getByRole("radio", { name: "Opt1" }));
    expect(screen.getByRole("radio", { name: "Opt1" })).toHaveAttribute("aria-checked", "true");
  });

  test("saisir dans un champ texte met à jour sa valeur", () => {
    renderChecklist();
    const input = screen.getByLabelText("Texte B") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5" } });
    expect(input.value).toBe("5");
  });
});

describe("KitChecklist — auto-repli des sections", () => {
  test("une section devient repliée quand toutes ses cases sont cochées", () => {
    renderChecklist();
    // Section A : 2 cases. Items visibles initialement.
    expect(screen.getByLabelText("Item 1")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Item 1"));
    fireEvent.click(screen.getByLabelText("Item 2"));
    // Après la 2e coche → section A complète → auto-replie → items cachés.
    expect(screen.queryByLabelText("Item 1")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Item 2")).not.toBeInTheDocument();
    // Mais le titre reste visible (en-tête cliquable)
    expect(screen.getByText("Section A")).toBeInTheDocument();
  });

  test("toggle manuel : un clic sur l'en-tête déplie/replie la section", () => {
    renderChecklist();
    const header = screen.getByText("Section A").closest("button")!;
    fireEvent.click(header);
    // Repli manuel → items cachés
    expect(screen.queryByLabelText("Item 1")).not.toBeInTheDocument();
    fireEvent.click(header);
    // Re-clic → re-dépliée
    expect(screen.getByLabelText("Item 1")).toBeInTheDocument();
  });
});

describe("KitChecklist — réinitialisation", () => {
  test("bouton Réinitialiser désactivé si aucune valeur", () => {
    renderChecklist();
    const reset = screen.getByRole("button", { name: /Réinitialiser/ });
    expect(reset).toBeDisabled();
  });

  test("clic Réinitialiser demande confirmation puis efface tout si OK", () => {
    const confirmMock = vi.fn().mockReturnValue(true);
    window.confirm = confirmMock;
    renderChecklist();
    fireEvent.click(screen.getByLabelText("Item 1"));
    expect(screen.getByText(/1\/6 complétés?/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Réinitialiser/ }));
    expect(confirmMock).toHaveBeenCalled();
    expect(screen.getByText(/0\/6 complétés?/)).toBeInTheDocument();
  });

  test("clic Réinitialiser annulé : rien n'est effacé", () => {
    window.confirm = vi.fn().mockReturnValue(false);
    renderChecklist();
    fireEvent.click(screen.getByLabelText("Item 1"));
    fireEvent.click(screen.getByRole("button", { name: /Réinitialiser/ }));
    // Valeur conservée
    expect(screen.getByText(/1\/6 complétés?/)).toBeInTheDocument();
  });
});

describe("KitChecklist — persistance localStorage", () => {
  test("l'état est sauvegardé en localStorage avec ts + values", () => {
    renderChecklist();
    fireEvent.click(screen.getByLabelText("Item 1"));
    const raw = localStorage.getItem("mediurg-kit-checklist-test-kit");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(typeof parsed.ts).toBe("number");
    expect(parsed.values["0-0"]).toBe(true);
  });

  test("rechargement : restaure les valeurs de moins de 3h", () => {
    localStorage.setItem(
      "mediurg-kit-checklist-test-kit",
      JSON.stringify({ ts: Date.now(), values: { "0-0": true } })
    );
    renderChecklist();
    expect(screen.getByText(/1\/6 complétés?/)).toBeInTheDocument();
  });

  test("rechargement : ignore les valeurs vieilles de > 3h", () => {
    const oldTs = Date.now() - 4 * 60 * 60 * 1000; // 4h
    localStorage.setItem(
      "mediurg-kit-checklist-test-kit",
      JSON.stringify({ ts: oldTs, values: { "0-0": true } })
    );
    renderChecklist();
    expect(screen.getByText(/0\/6 complétés?/)).toBeInTheDocument();
  });
});
