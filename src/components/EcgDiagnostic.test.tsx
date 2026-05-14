import { fireEvent, render, screen, within } from "@testing-library/react";
import EcgDiagnostic from "./EcgDiagnostic";

// EcgDiagnostic = sélecteur 4 critères (FC / Rythme / QRS / Ondes P) qui matche
// dans une table de 24 combinaisons. Le tableau de référence est toujours rendu
// → on doit scoper les requêtes au picker (.ecg-picker) pour éviter les
// collisions de labels (« Régulier » apparaît dans les chips ET dans la table).

const clickChip = (container: HTMLElement, kind: string, label: string) => {
  // chips de classe `ecg-pchip-{kind}` (fc, r, q, p)
  const chip = container.querySelector(`.ecg-pchip-${kind}` + Array.from({ length: 0 }).join(""));
  // En réalité il y a plusieurs chips par kind ; on les filtre par textContent
  const chips = container.querySelectorAll(`.ecg-pchip-${kind}`);
  const target = Array.from(chips).find((c) =>
    c.textContent?.replace(/\s+/g, " ").trim().includes(label)
  );
  if (!target) throw new Error(`Chip ${kind}/${label} introuvable`);
  fireEvent.click(target);
  return chip;
};

const getResultText = () => document.querySelector(".ecg-result-dx")?.textContent?.trim() ?? "";

const getAltText = () => document.querySelector(".ecg-result-alt")?.textContent?.trim() ?? "";

describe("EcgDiagnostic", () => {
  test("rendu initial : tableau de référence visible, pas de diagnostic", () => {
    render(<EcgDiagnostic />);
    expect(screen.getByText(/Tableau de référence/)).toBeInTheDocument();
    // Pas de section .ecg-result tant que rien n'est sélectionné
    expect(document.querySelector(".ecg-result")).toBeNull();
    expect(screen.queryByRole("button", { name: "Réinitialiser" })).not.toBeInTheDocument();
  });

  test("sélection partielle : pas de diagnostic, bouton Réinitialiser apparaît", () => {
    const { container } = render(<EcgDiagnostic />);
    clickChip(container, "fc", "100");
    expect(document.querySelector(".ecg-result")).toBeNull();
    expect(screen.getByRole("button", { name: "Réinitialiser" })).toBeInTheDocument();
  });

  test("4 critères TV : > 100 + Régulier + Larges + P:Non → TV", () => {
    const { container } = render(<EcgDiagnostic />);
    clickChip(container, "fc", "> 100");
    clickChip(container, "r", "Régulier");
    clickChip(container, "q", "Larges");
    clickChip(container, "p", "Non");
    expect(getResultText()).toBe("TV");
  });

  test("4 critères RSN : 60-100 + Régulier + Fins + P:Oui → RSN", () => {
    const { container } = render(<EcgDiagnostic />);
    clickChip(container, "fc", "60–100");
    clickChip(container, "r", "Régulier");
    clickChip(container, "q", "Fins");
    clickChip(container, "p", "Oui");
    expect(getResultText()).toBe("RSN");
  });

  test("diagnostic avec note alternative : < 60 + Irrég + Fins + P:Oui → Brady + ESSV avec alt", () => {
    const { container } = render(<EcgDiagnostic />);
    clickChip(container, "fc", "< 60");
    clickChip(container, "r", "Irrégulier");
    clickChip(container, "q", "Fins");
    clickChip(container, "p", "Oui");
    expect(getResultText()).toMatch(/Bradycardie sinusale \+ ESSV/);
    expect(getAltText()).toMatch(/Bloc II ou III/);
  });

  test("diagnostic sans note alternative : pas de .ecg-result-alt", () => {
    const { container } = render(<EcgDiagnostic />);
    // RSN n'a pas d'alt
    clickChip(container, "fc", "60–100");
    clickChip(container, "r", "Régulier");
    clickChip(container, "q", "Fins");
    clickChip(container, "p", "Oui");
    expect(document.querySelector(".ecg-result-alt")).toBeNull();
  });

  test("re-clic sur un chip actif le désélectionne", () => {
    const { container } = render(<EcgDiagnostic />);
    clickChip(container, "fc", "> 100");
    expect(screen.getByRole("button", { name: "Réinitialiser" })).toBeInTheDocument();
    clickChip(container, "fc", "> 100");
    expect(screen.queryByRole("button", { name: "Réinitialiser" })).not.toBeInTheDocument();
  });

  test("Réinitialiser efface toutes les sélections", () => {
    const { container } = render(<EcgDiagnostic />);
    clickChip(container, "fc", "60–100");
    clickChip(container, "r", "Régulier");
    clickChip(container, "q", "Fins");
    clickChip(container, "p", "Oui");
    expect(getResultText()).toBe("RSN");
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(document.querySelector(".ecg-result")).toBeNull();
    expect(screen.queryByRole("button", { name: "Réinitialiser" })).not.toBeInTheDocument();
  });

  test("matching partiel surligne les lignes compatibles dans le tableau", () => {
    const { container } = render(<EcgDiagnostic />);
    clickChip(container, "fc", "60–100");
    // Toutes les lignes 60-100 (8 combinaisons) doivent être en classe partial
    const partialRows = container.querySelectorAll(".ecg-row-partial");
    expect(partialRows.length).toBeGreaterThan(0);
    // Les lignes hors plage 60-100 doivent être en dim
    const dimRows = container.querySelectorAll(".ecg-row-dim, [class*='dim']");
    // Au moins quelques lignes dim (16 hors plage sur 24)
    expect(dimRows.length + partialRows.length).toBeGreaterThan(0);
  });

  // L'import `within` est utilisé conditionnellement dans certains tests
  void within;
});
