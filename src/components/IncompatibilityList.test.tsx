// Mock des données AVANT l'import du composant : buildMatrix() est exécuté
// au chargement du module, on doit donc fournir nos données mockées dès là.
// Mini dataset à 3 drogues : A incompatible avec B, A compatible avec C,
// B pH-vigilance avec C. Permet de tester chaque type de cellule sans
// dépendre du contenu réel d'incompatibilities.js.
vi.mock("../data/incompatibilities", () => ({
  INCOMPATIBILITIES: [
    {
      drug: "DrugA",
      short: "A",
      color: "#dc2626",
      solvant: "NaCl 0,9 %",
      items: [{ with: "DrugB", type: "incompatible", note: "Précipite immédiatement" }],
      compatibleWith: ["DrugC"],
    },
    {
      drug: "DrugB",
      short: "B",
      color: "#3b82f6",
      solvant: "G5 %",
      items: [{ with: "DrugC", type: "pH", note: "Vigilance pH compatible" }],
    },
    {
      drug: "DrugC",
      short: "C",
      color: "#16a34a",
      items: [],
    },
  ],
}));

import { fireEvent, render, screen } from "@testing-library/react";
import IncompatibilityList from "./IncompatibilityList";

describe("IncompatibilityList", () => {
  test("affiche la légende des 3 types (rouge, vert/pH, blanc)", () => {
    render(<IncompatibilityList />);
    expect(screen.getByText(/Incompatibilité \(Rouge\)/)).toBeInTheDocument();
    expect(screen.getByText(/Compatibilité \(Vert\)/)).toBeInTheDocument();
    expect(screen.getByText(/Pas de données/)).toBeInTheDocument();
  });

  test("affiche les noms de drogues en en-tête de ligne", () => {
    render(<IncompatibilityList />);
    expect(screen.getAllByText("DrugA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("DrugB").length).toBeGreaterThan(0);
    expect(screen.getAllByText("DrugC").length).toBeGreaterThan(0);
  });

  test("aucun détail affiché tant qu'on ne clique pas sur une cellule", () => {
    render(<IncompatibilityList />);
    expect(screen.queryByText(/Précipite immédiatement/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Fermer le détail")).not.toBeInTheDocument();
  });

  test("clic sur la cellule incompatible B×A : affiche détail + note + solvant DrugA", () => {
    const { container } = render(<IncompatibilityList />);
    // Avec 3 drogues triangle inférieur, on a 3 cellules cliquables :
    //   - ligne B → col A : incompatible (la première)
    //   - ligne C → col A : compatibleWith
    //   - ligne C → col B : pH
    const hitCells = container.querySelectorAll(".incompat-cell-hit");
    expect(hitCells.length).toBe(3);
    fireEvent.click(hitCells[0] as HTMLElement);
    expect(screen.getByText(/Précipite immédiatement/)).toBeInTheDocument();
    // selected.drugA = ligne cliquée = DrugB → on affiche son solvant (G5 %).
    // Texte coupé par l'icône SVG, on cherche dans le textContent.
    const detail = container.querySelector(".incompat-detail")!;
    expect(detail.textContent).toMatch(/Solvant DrugB.*G5 %/);
    expect(screen.getByLabelText("Fermer le détail")).toBeInTheDocument();
  });

  test("clic sur le bouton fermer ferme le détail", () => {
    const { container } = render(<IncompatibilityList />);
    const incompCell = container.querySelector(".incompat-cell-hit") as HTMLElement;
    fireEvent.click(incompCell);
    expect(screen.getByLabelText("Fermer le détail")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Fermer le détail"));
    expect(screen.queryByLabelText("Fermer le détail")).not.toBeInTheDocument();
  });

  test("re-clic sur la même cellule ferme le détail (toggle)", () => {
    const { container } = render(<IncompatibilityList />);
    const incompCell = container.querySelector(".incompat-cell-hit") as HTMLElement;
    fireEvent.click(incompCell);
    expect(screen.getByLabelText("Fermer le détail")).toBeInTheDocument();
    fireEvent.click(incompCell);
    expect(screen.queryByLabelText("Fermer le détail")).not.toBeInTheDocument();
  });

  test("matrice : triangle supérieur masqué (cellules upper sans contenu cliquable)", () => {
    const { container } = render(<IncompatibilityList />);
    const upperCells = container.querySelectorAll(".incompat-cell-upper");
    // Pour 3 drogues, la diagonale supérieure stricte = 3 cellules (indices : (0,1), (0,2), (1,2))
    expect(upperCells.length).toBe(3);
  });

  test("clic sur une cellule sans données (no-data) ne fait rien", () => {
    const { container } = render(<IncompatibilityList />);
    const noDataCells = container.querySelectorAll(".incompat-cell-nodata");
    if (noDataCells.length > 0) {
      fireEvent.click(noDataCells[0] as HTMLElement);
      expect(screen.queryByLabelText("Fermer le détail")).not.toBeInTheDocument();
    }
  });
});
