import {
  createIncompatibilityIndex,
  getIncompatDisplayName,
  getIncompatRelation,
  matchesIncompatSearch,
  type IncompatEntry,
} from "./incompatibilityIndex";

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
