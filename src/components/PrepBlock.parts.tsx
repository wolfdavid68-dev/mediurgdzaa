import type { Drug } from "../types/data";

// Types partagés du bloc Préparation (extraits de PrepBlock.tsx pour alléger
// le composant). `prep` public (drugs.js) éventuellement enrichi par l'override
// preview (drugs.preview.js) si ?author=preview.
export type DrugPrep = NonNullable<Drug["prep"]>;
export type PreviewPrepByDrugId = Partial<Record<number, { prep?: Partial<DrugPrep> }>>;
export type PrepRecipe = NonNullable<DrugPrep["preparations"]>[number];
type PrepRecipePhase = NonNullable<PrepRecipe["phase_doses"]>[number];
export type PrepRecipeWeightBand = NonNullable<PrepRecipe["weight_bands"]>[number];
export type PrepRecipePhaseRow = PrepRecipePhase & {
  dose: number | null;
  doseMax: number | null;
  volume: number | null;
  volumeMax: number | null;
  rate: number | null;
};

// On FUSIONNE l'override preview par-dessus le public (au lieu de le remplacer) :
// l'override ne porte que la nouvelle dilution fixe (fixed_dilution + étapes),
// donc les champs qu'il ne redéfinit pas — notamment `pedTable`, la table de
// dilution PÉDIATRIQUE — doivent survivre. Sans fusion, la table pédiatrique
// d'Adrénaline (et autres drogues à pedTable dans l'override) disparaît en
// preview.
export const resolvePrep = (
  drug: Drug,
  previewPrepByDrugId: PreviewPrepByDrugId | null
): DrugPrep | null => {
  const override = previewPrepByDrugId?.[drug.id]?.prep ?? null;
  if (override) return { ...drug.prep, ...override };
  return drug.prep || null;
};

// Formatage des doses : entiers tels quels, décimaux avec virgule (convention FR).
export const formatDoseNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : String(value).replace(".", ",");

export const formatNumberRange = (min: number, max: number | null) =>
  max !== null && max !== min
    ? `${formatDoseNumber(min)}-${formatDoseNumber(max)}`
    : formatDoseNumber(min);

export const PrepIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
  </svg>
);

export const InfoIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
