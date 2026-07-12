// Tests d'intégration de la page Médicaments. Vérifient que la chaîne de
// props patientWeight (App → MedicamentsPage → DrugList → DrugCard) ne se
// casse pas silencieusement — exactement le genre de bug qu'on a eu hier où
// le 2e DrugList (liste filtrée principale) ne recevait pas le poids et le
// calc de dose n'apparaissait jamais.

import { fireEvent, render, screen } from "@testing-library/react";
import MedicamentsPage from "./MedicamentsPage";
import type { Drug } from "../types/data";

const mkDrug = (over: Partial<Drug> & { id: number; nom: string }): Drug => ({
  commercial: "Commercial",
  dci: "DCI",
  classe: "Classe",
  cat: "Hypnotiques",
  svc: ["SAU"],
  couleur: "#F5D300",
  icon: "💊",
  desc: "Description.",
  indic: ["Indication"],
  ci: [],
  ei: [],
  cond: [],
  poso: { a: ["1-2 mg/kg IV lente"], p: ["0,5 mg/kg IV"] },
  ...over,
});

const drug1 = mkDrug({ id: 1, nom: "ZAA" });
const drug2 = mkDrug({ id: 2, nom: "ZBB" });

const baseProps = {
  filtered: [drug1, drug2],
  recentDrugs: [],
  favorites: new Set<number>(),
  showFavoritesOnly: false,
  patientWeight: "",
  onToggleFavorite: () => {},
  onOpen: () => {},
  onOpenChange: () => {},
  onProtocolOpen: () => {},
};

describe("MedicamentsPage — intégration patientWeight → DrugCard", () => {
  test("active Prépa Med v2.5 sur l’application principale sans URL preview", async () => {
    window.history.replaceState({}, "", "/");
    render(<MedicamentsPage {...baseProps} prepV25Enabled />);
    fireEvent.click(screen.getByText("ZAA").closest("button")!);

    expect(screen.getByRole("navigation", { name: "Étapes de la fiche médicament" })).toBeVisible();
    expect(await screen.findByRole("group", { name: "Modes de préparation" })).toBeVisible();
    expect(screen.getByText("Double contrôle")).toBeVisible();
  });

  test("sans poids saisi : ouverture d'une fiche ne produit aucun calc", () => {
    render(<MedicamentsPage {...baseProps} />);
    fireEvent.click(screen.getByText("ZAA").closest("button")!);
    // Le texte de poso est visible mais pas de calc-result
    const adulte = screen.getByText(/1-2 mg\/kg IV lente/).closest(".poso-item");
    expect(adulte?.querySelector(".calc-result")).toBeNull();
  });

  test("poids fourni à la page → calc s'affiche dans une fiche ouverte depuis la liste filtrée", () => {
    // Ce test aurait attrapé le bug du 23 mai : patientWeight oublié sur la
    // 2e DrugList (liste filtrée). Sans le prop, calcDose recevait "" et le
    // calc-result n'apparaissait jamais pour les médicaments ouverts depuis
    // la liste principale.
    render(<MedicamentsPage {...baseProps} patientWeight="70" />);
    fireEvent.click(screen.getByText("ZAA").closest("button")!);
    const adulte = screen.getByText(/1-2 mg\/kg IV lente/).closest(".poso-item");
    const calc = adulte?.querySelector(".calc-result");
    expect(calc).toBeTruthy();
    expect(calc!.textContent).toMatch(/70.*140 mg/);
  });

  test("poids 70 kg → fiche ouverte depuis la section Récents montre aussi le calc", () => {
    render(
      <MedicamentsPage {...baseProps} filtered={[drug2]} recentDrugs={[drug1]} patientWeight="70" />
    );
    // ZAA est dans Récents, ZBB dans la liste filtrée. On ouvre ZAA (récents).
    fireEvent.click(screen.getByText("ZAA").closest("button")!);
    const adulte = screen.getByText(/1-2 mg\/kg IV lente/).closest(".poso-item");
    const calc = adulte?.querySelector(".calc-result");
    expect(calc).toBeTruthy();
    expect(calc!.textContent).toMatch(/70.*140 mg/);
  });

  test("mode adulte explicite → la posologie enfant disparaît sans second clic", () => {
    render(<MedicamentsPage {...baseProps} patientWeight="80" prepPopulation="adulte" />);
    fireEvent.click(screen.getByText("ZAA").closest("button")!);

    expect(screen.getByText("Adulte")).toBeInTheDocument();
    expect(screen.queryByText("Pédiatrique")).not.toBeInTheDocument();
    expect(screen.queryByText("0,5 mg/kg IV")).not.toBeInTheDocument();
  });
});
