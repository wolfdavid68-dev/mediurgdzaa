import {
  createIncompatibilityIndex,
  getIncompatDisplayName,
  getIncompatRelation,
  matchesIncompatSearch,
  type IncompatEntry,
} from "./incompatibilityIndex";
import { INCOMPATIBILITIES } from "../data/incompatibilities";

const entries: IncompatEntry[] = [
  {
    drug: "DrugA",
    short: "A",
    color: "#dc2626",
    items: [{ with: "DrugB", type: "incompatible", note: "Précipite" }],
    compatibleWith: ["DrugC"],
  },
  {
    drug: "DrugB",
    short: "B",
    color: "#3b82f6",
    items: [{ with: "DrugC", type: "pH", note: "Vigilance pH" }],
  },
  {
    drug: "DrugC",
    short: "C",
    color: "#16a34a",
    items: [],
  },
];

const index = createIncompatibilityIndex(entries, {
  displayOverrides: { DrugA: "Drogue A" },
  searchAliases: { DrugA: ["alpha"] },
});

describe("incompatibilityIndex", () => {
  test("construit des relations symétriques avec priorité aux incompatibilités", () => {
    expect(getIncompatRelation(index, "DrugB", "DrugA")).toEqual({
      type: "incompatible",
      note: "Précipite",
    });
    expect(getIncompatRelation(index, "DrugC", "DrugB")).toEqual({
      type: "pH",
      note: "Vigilance pH",
    });
    expect(getIncompatRelation(index, "DrugC", "DrugA")).toEqual({
      type: "compatible",
      note: "",
    });
  });

  test("retourne unknown quand aucune relation n'est documentée", () => {
    expect(getIncompatRelation(index, "DrugA", "Inconnu")).toEqual({
      type: "unknown",
      note: "",
    });
  });

  test("cherche via alias et nom d'affichage", () => {
    expect(matchesIncompatSearch(index, entries[0], "alpha")).toBe(true);
    expect(matchesIncompatSearch(index, entries[0], "drogue")).toBe(true);
    expect(matchesIncompatSearch(index, entries[1], "alpha")).toBe(false);
  });

  test("applique les overrides d'affichage sans modifier la donnée source", () => {
    expect(getIncompatDisplayName("DrugA", { DrugA: "Drogue A" })).toBe("Drogue A");
    expect(getIncompatDisplayName("DrugB", { DrugA: "Drogue A" })).toBe("DrugB");
  });
});

describe("données incompatibilités", () => {
  const clinicalEntries = INCOMPATIBILITIES as IncompatEntry[];
  const names = new Set(clinicalEntries.map((entry) => entry.drug));
  const clinicalIndex = createIncompatibilityIndex(clinicalEntries);

  test("ne contient ni doublon ni référence introuvable", () => {
    expect(names.size).toBe(clinicalEntries.length);

    const missing = clinicalEntries.flatMap((entry) => [
      ...(entry.items ?? [])
        .filter((item) => !names.has(item.with))
        .map((item) => `${entry.drug} -> ${item.with}`),
      ...(entry.compatibleWith ?? [])
        .filter((drug) => !names.has(drug))
        .map((drug) => `${entry.drug} -> ${drug}`),
    ]);

    expect(missing).toEqual([]);
  });

  test("conserve une matrice symétrique pour incompatibles, pH et compatibles", () => {
    clinicalEntries.forEach((entry) => {
      (entry.items ?? []).forEach((item) => {
        expect(getIncompatRelation(clinicalIndex, entry.drug, item.with)).toEqual(
          getIncompatRelation(clinicalIndex, item.with, entry.drug)
        );
      });
      (entry.compatibleWith ?? []).forEach((drug) => {
        expect(getIncompatRelation(clinicalIndex, entry.drug, drug)).toEqual(
          getIncompatRelation(clinicalIndex, drug, entry.drug)
        );
      });
    });
  });

  test("couvre les familles critiques fréquemment utilisées en urgence", () => {
    const criticalNeedles = [
      "Adrénaline",
      "Noradrénaline",
      "Amiodarone",
      "Dobutamine",
      "Furosémide",
      "Kétamine",
      "Midazolam",
    ];

    criticalNeedles.forEach((needle) => {
      expect(clinicalEntries.some((entry) => entry.drug.includes(needle))).toBe(true);
    });
  });
});
