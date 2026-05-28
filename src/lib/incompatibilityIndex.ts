import { normalize } from "./normalize";

export type IncompatRelationType = "compatible" | "incompatible" | "pH" | "unknown";

export type IncompatEntry = {
  drug: string;
  short: string;
  color: string;
  items: Array<{ with: string; type: "incompatible" | "pH"; note?: string }>;
  compatibleWith?: string[];
  solvant?: string;
  exclusif?: boolean;
};

type IncompatCell = {
  type: "incompatible" | "pH";
  note: string;
};

type IncompatMatrix = Record<string, Record<string, IncompatCell>>;
type CompatMatrix = Record<string, Record<string, true>>;

export type IncompatibilityIndex = {
  entries: IncompatEntry[];
  byName: Map<string, IncompatEntry>;
  searchTextByName: Map<string, string>;
  incomp: IncompatMatrix;
  compat: CompatMatrix;
};

export type IncompatIndexOptions = {
  displayOverrides?: Record<string, string>;
  searchAliases?: Record<string, string[]>;
};

const normalizeIncompatSearch = (value: string) =>
  normalize(value)
    .replace(/®/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const getIncompatDisplayName = (
  drug: string,
  displayOverrides: Record<string, string> = {}
) => displayOverrides[drug] || drug;

export const createIncompatibilityIndex = (
  entries: IncompatEntry[],
  { displayOverrides = {}, searchAliases = {} }: IncompatIndexOptions = {}
): IncompatibilityIndex => {
  const byName = new Map(entries.map((entry) => [entry.drug, entry]));
  const searchTextByName = new Map(
    entries.map((entry) => [
      entry.drug,
      normalizeIncompatSearch(
        [
          entry.drug,
          entry.short,
          getIncompatDisplayName(entry.drug, displayOverrides),
          ...(searchAliases[entry.drug] || []),
        ].join(" ")
      ),
    ])
  );
  const incomp: IncompatMatrix = {};
  const compat: CompatMatrix = {};

  entries.forEach((entry) => {
    entry.items.forEach((item) => {
      const target = byName.get(item.with);
      if (!target) return;
      if (!incomp[entry.drug]) incomp[entry.drug] = {};
      if (!incomp[target.drug]) incomp[target.drug] = {};
      const cell = { type: item.type, note: item.note || "" };
      incomp[entry.drug][target.drug] = cell;
      incomp[target.drug][entry.drug] = cell;
    });
  });

  entries.forEach((entry) => {
    (entry.compatibleWith || []).forEach((name) => {
      const target = byName.get(name);
      if (!target) return;
      if (!compat[entry.drug]) compat[entry.drug] = {};
      if (!compat[target.drug]) compat[target.drug] = {};
      compat[entry.drug][target.drug] = true;
      compat[target.drug][entry.drug] = true;
    });
  });

  return { entries, byName, searchTextByName, incomp, compat };
};

export const matchesIncompatSearch = (
  index: IncompatibilityIndex,
  entry: IncompatEntry,
  query: string
) => {
  const q = normalizeIncompatSearch(query);
  if (!q) return true;
  return (index.searchTextByName.get(entry.drug) || "").includes(q);
};

export const getIncompatRelation = (
  index: IncompatibilityIndex,
  drugA: string,
  drugB: string
): { type: IncompatRelationType; note: string } => {
  const cell = index.incomp[drugA]?.[drugB];
  if (cell) return { type: cell.type, note: cell.note };
  if (index.compat[drugA]?.[drugB]) return { type: "compatible", note: "" };
  return { type: "unknown", note: "" };
};
