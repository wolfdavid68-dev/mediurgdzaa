import type { Drug } from "../types/data";
import {
  createDrugSearchIndex,
  filterDrugSearchIndex,
  getRecentDrugsFromIndex,
} from "./drugSearch";

const mkDrug = (over: Partial<Drug> & { id: number; nom: string }): Drug => ({
  commercial: "Commercial",
  dci: "DCI",
  classe: "Classe",
  cat: "Hypnotiques",
  svc: ["SAU"],
  couleur: "#f5d300",
  icon: "pilule",
  desc: "Description.",
  indic: ["Indication"],
  ci: [],
  ei: [],
  cond: [],
  poso: { a: [], p: [] },
  prep: null,
  ...over,
});

const drugs = [
  mkDrug({
    id: 1,
    nom: "Zopiclone",
    commercial: "Imovane",
    dci: "zopiclone",
    cat: "Neurologie",
    svc: ["SAU"],
  }),
  mkDrug({
    id: 2,
    nom: "Adrénaline",
    commercial: "Adrenaline Aguettant",
    dci: "épinéphrine",
    cat: "Cardiologie",
    svc: ["SAU", "SMUR"],
  }),
  mkDrug({
    id: 3,
    nom: "Kétamine",
    commercial: "Ketamine",
    dci: "ketamine",
    cat: "Hypnotiques",
    svc: ["SMUR"],
  }),
];

const index = createDrugSearchIndex(drugs, {
  epi: "adrenaline",
  keta: "ketamine",
});

const baseFilters = {
  search: "",
  cat: "Tout",
  svc: "Tout",
  showFavoritesOnly: false,
  favorites: new Set<number>(),
};

describe("drugSearch", () => {
  test("retourne les médicaments triés une fois par nom français", () => {
    expect(filterDrugSearchIndex(index, baseFilters).map((drug) => drug.nom)).toEqual([
      "Adrénaline",
      "Kétamine",
      "Zopiclone",
    ]);
  });

  test("cherche sans accent et via alias", () => {
    const byAccent = filterDrugSearchIndex(index, { ...baseFilters, search: "ketamine" });
    const byAlias = filterDrugSearchIndex(index, { ...baseFilters, search: "epi" });

    expect(byAccent.map((drug) => drug.nom)).toEqual(["Kétamine"]);
    expect(byAlias.map((drug) => drug.nom)).toEqual(["Adrénaline"]);
  });

  test("applique les filtres catégorie, service et favoris", () => {
    const filtered = filterDrugSearchIndex(index, {
      ...baseFilters,
      cat: "Hypnotiques",
      svc: "SMUR",
      showFavoritesOnly: true,
      favorites: new Set([3]),
    });

    expect(filtered.map((drug) => drug.nom)).toEqual(["Kétamine"]);
  });

  test("reconstruit l'historique sans les ids inconnus", () => {
    expect(getRecentDrugsFromIndex(index, [3, 999, 2]).map((drug) => drug.nom)).toEqual([
      "Kétamine",
      "Adrénaline",
    ]);
  });
});
