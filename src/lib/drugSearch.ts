import { ALIASES } from "../data/aliases";
import { DRUGS } from "../data/drugs";
import type { Drug } from "../types/data";
import { fuzzyIncludes } from "./fuzzy";
import { normalize } from "./normalize";

type DrugSearchEntry = {
  drug: Drug;
  fields: string[];
};

type AliasSearchEntry = {
  alias: string;
  target: string;
};

export type DrugSearchIndex = {
  entries: DrugSearchEntry[];
  aliases: AliasSearchEntry[];
  byId: Map<number, Drug>;
};

export type DrugSearchFilters = {
  search: string;
  cat: string;
  svc: string;
  showFavoritesOnly: boolean;
  favorites: Set<number>;
};

const DRUG_NAME_COLLATOR = new Intl.Collator("fr", { sensitivity: "base" });

export const createDrugSearchIndex = (
  drugs: Drug[],
  aliases: Record<string, string>
): DrugSearchIndex => {
  const byName = [...drugs].sort((a, b) => DRUG_NAME_COLLATOR.compare(a.nom, b.nom));

  return {
    entries: byName.map((drug) => ({
      drug,
      fields: [drug.nom, drug.commercial, drug.dci, drug.classe].map(normalize),
    })),
    aliases: Object.entries(aliases).map(([alias, target]) => ({
      alias: normalize(alias),
      target: normalize(target),
    })),
    byId: new Map(drugs.map((drug) => [drug.id, drug])),
  };
};

export const filterDrugSearchIndex = (
  index: DrugSearchIndex,
  { search, cat, svc, showFavoritesOnly, favorites }: DrugSearchFilters
): Drug[] => {
  const q = normalize(search.trim());
  const aliasTargets = q
    ? index.aliases
        .filter(({ alias }) => alias.includes(q) || q.includes(alias))
        .map(({ target }) => target)
    : [];

  return index.entries
    .filter(({ drug, fields }) => {
      const matchDirect = !q || fields.some((field) => fuzzyIncludes(field, q));
      const matchAlias = aliasTargets.some((target) =>
        fields.some((field) => fuzzyIncludes(field, target))
      );
      const matchQ = matchDirect || matchAlias;
      const matchC = cat === "Tout" || drug.cat === cat;
      const matchS = svc === "Tout" || drug.svc.includes(svc);
      const matchF = !showFavoritesOnly || favorites.has(drug.id);
      return matchQ && matchC && matchS && matchF;
    })
    .map(({ drug }) => drug);
};

export const getRecentDrugsFromIndex = (index: DrugSearchIndex, history: number[]): Drug[] =>
  history
    .map((id) => index.byId.get(id))
    .filter((drug: Drug | undefined): drug is Drug => Boolean(drug));

const DEFAULT_DRUG_SEARCH_INDEX = createDrugSearchIndex(DRUGS, ALIASES);

export const filterDrugs = (filters: DrugSearchFilters): Drug[] =>
  filterDrugSearchIndex(DEFAULT_DRUG_SEARCH_INDEX, filters);

export const getRecentDrugs = (history: number[]): Drug[] =>
  getRecentDrugsFromIndex(DEFAULT_DRUG_SEARCH_INDEX, history);
