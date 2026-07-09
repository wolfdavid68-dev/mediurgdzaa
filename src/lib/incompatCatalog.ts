import { INCOMPATIBILITIES } from "../data/incompatibilities";
import {
  createIncompatibilityIndex,
  getIncompatDisplayName,
  matchesIncompatSearch,
  normalizeIncompatSearch,
  type IncompatEntry,
} from "./incompatibilityIndex";

// Catalogue d'incompatibilités partagé entre IncompatibilityList (UI) et
// resolveDeepLink (?compat=…). Les alias de recherche vivent ici pour que la
// résolution vocale et la barre de recherche du composant matchent pareil.

export const DRUG_DISPLAY_OVERRIDES: Record<string, string> = {
  "Norépinéphrine (Noradrénaline®)": "Noradrénaline",
};

const DRUG_SEARCH_ALIASES: Record<string, string[]> = {
  "Norépinéphrine (Noradrénaline®)": [
    "noradrénaline",
    "noradrenaline",
    "norépinéphrine",
    "norepinephrine",
  ],
  "Furosémide (Lasilix®)": ["furosémide", "furosemide", "lasilix", "l'asile", "l asile", "lasile"],
};

const COLLATOR = new Intl.Collator("fr", { sensitivity: "base" });

export const DRUGS_INCOMPAT = [...(INCOMPATIBILITIES as IncompatEntry[])].sort((a, b) =>
  COLLATOR.compare(a.drug, b.drug)
);

export const INCOMPAT_INDEX = createIncompatibilityIndex(DRUGS_INCOMPAT, {
  displayOverrides: DRUG_DISPLAY_OVERRIDES,
  searchAliases: DRUG_SEARCH_ALIASES,
});

// Résout une requête libre (« noradrenaline », « propofol », « lasilix ») vers
// le nom exact d'une entrée d'INCOMPATIBILITIES. Priorité au match exact sur
// le nom, le nom affiché ou un alias (« adrenaline » → Adrénaline®, pas
// Noradrénaline) ; sinon match partiel accepté seulement s'il est unique.
export const resolveIncompatDrugName = (query: string): string | undefined => {
  const q = normalizeIncompatSearch(query);
  if (!q) return undefined;
  for (const entry of INCOMPAT_INDEX.entries) {
    const candidates = [
      entry.drug,
      getIncompatDisplayName(entry.drug, DRUG_DISPLAY_OVERRIDES),
      ...(DRUG_SEARCH_ALIASES[entry.drug] || []),
    ];
    if (candidates.some((name) => normalizeIncompatSearch(name) === q)) return entry.drug;
  }
  const matches = INCOMPAT_INDEX.entries.filter((entry) =>
    matchesIncompatSearch(INCOMPAT_INDEX, entry, query)
  );
  return matches.length === 1 ? matches[0].drug : undefined;
};
