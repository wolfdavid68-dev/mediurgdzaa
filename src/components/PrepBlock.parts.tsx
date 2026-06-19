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
  rateMax: number | null;
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

// ── Helpers de calcul purs (extraits du composant PrepBlock) ──────────
// Fonctions sans état ni JSX : elles ne dépendent que de leurs arguments
// (la recette, l'objet prep, le poids). Extraites pour alléger PrepBlock.tsx
// et rendre la logique de calcul des préparations testable isolément.
// PrepBlock conserve des wrappers fins qui les appellent avec les valeurs de
// son closure (kg, validKg, prep) → aucun site d'appel JSX ne change.

// Classe CSS de variante de mode (ex. " prep-recipe-pse").
export const recipeModeClass = (recipe: PrepRecipe) =>
  recipe.mode ? ` prep-recipe-${recipe.mode}` : "";

// Dilution « effective » (ex. dérivé sang) : volume saisi → dose/h + débit.
export const computeEffectivePrep = (recipe: PrepRecipe, effectivePrepInput: string) => {
  if (!recipe.effective_input_conc || !recipe.effective_output_conc) return null;
  const volume = parseFloat(effectivePrepInput);
  if (!Number.isFinite(volume) || volume <= 0) return null;
  const fraction = recipe.effective_fraction ?? 2 / 3;
  const hourlyDose = +(volume * recipe.effective_input_conc * fraction).toFixed(3);
  const rate = +(hourlyDose / recipe.effective_output_conc).toFixed(2);
  return { hourlyDose, rate };
};

// Dose saisie librement, bornée par les min/max de la recette (défaut compris).
export const computeRecipeDoseInputValue = (recipe: PrepRecipe, dosePrepInput: string) => {
  const raw = dosePrepInput || String(recipe.dose_input_default ?? "");
  const value = parseFloat(raw.replace(",", "."));
  const min = recipe.dose_input_min ?? 0;
  const max = recipe.dose_input_max;
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.min(Math.max(value, min), max ?? value);
};

// Lignes de phases (bolus/entretien…) : dose fixe ou dose/kg, volume dérivé de
// conc_produit, débit PSE le cas échéant. Retourne une ligne par phase, avec
// dose=null si le poids manque pour une phase en dose/kg.
export const computeRecipePhaseRows = (
  recipe: PrepRecipe,
  prep: DrugPrep,
  kg: number,
  validKg: boolean
): PrepRecipePhaseRow[] => {
  if (!recipe.phase_doses?.length) return [];
  const getDurationHours = (duration?: string) => {
    if (!duration) return null;
    const normalized = duration.toLowerCase().replace(",", ".");
    const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(min|h)$/);
    if (!match) return null;
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) return null;
    return match[2] === "min" ? value / 60 : value;
  };
  const rows: PrepRecipePhaseRow[] = [];
  recipe.phase_doses.forEach((phase) => {
    if (phase.dose_fixed === undefined && phase.dose_kg === undefined) return;
    if (phase.dose_kg !== undefined && !validKg) {
      rows.push({
        ...phase,
        dose: null,
        doseMax: null,
        volume: null,
        volumeMax: null,
        rate: null,
        rateMax: null,
      });
      return;
    }
    const rawDose = phase.dose_fixed !== undefined ? phase.dose_fixed : Number(phase.dose_kg) * kg;
    const rawDoseMax =
      phase.dose_max_fixed !== undefined
        ? phase.dose_max_fixed
        : phase.dose_max_kg !== undefined && validKg
          ? phase.dose_max_kg * kg
          : null;
    const dose = phase.max !== undefined ? Math.min(rawDose, phase.max) : rawDose;
    const doseMax =
      rawDoseMax !== null
        ? phase.max !== undefined
          ? Math.min(rawDoseMax, phase.max)
          : rawDoseMax
        : null;
    const unit = phase.unit || "mg";
    const roundedDose = +dose.toFixed(1);
    const roundedDoseMax = doseMax !== null ? +doseMax.toFixed(1) : null;
    const volume =
      (unit === "mg" || unit === "mg/h") && prep.conc_produit
        ? +(dose / prep.conc_produit).toFixed(1)
        : null;
    const volumeMax =
      (unit === "mg" || unit === "mg/h") && prep.conc_produit && doseMax !== null
        ? +(doseMax / prep.conc_produit).toFixed(1)
        : null;
    const durationHours = getDurationHours(phase.duree);
    const rate =
      unit === "µg/min" && prep.conc_produit
        ? +(((roundedDose / 1000) * 60) / prep.conc_produit).toFixed(1)
        : volume !== null && durationHours && phase.label.toLowerCase().includes("pse")
          ? +(volume / durationHours).toFixed(1)
          : null;
    const rateMax =
      unit === "µg/min" && prep.conc_produit && roundedDoseMax !== null
        ? +(((roundedDoseMax / 1000) * 60) / prep.conc_produit).toFixed(1)
        : volumeMax !== null && durationHours && phase.label.toLowerCase().includes("pse")
          ? +(volumeMax / durationHours).toFixed(1)
          : null;
    rows.push({
      ...phase,
      dose: roundedDose,
      doseMax: roundedDoseMax,
      volume,
      volumeMax,
      rate,
      rateMax,
    });
  });
  return rows;
};

// Sélection de la bande de poids applicable (gt/gte/lt/lte) + volume dérivé.
export const computeRecipeWeightBand = (
  recipe: PrepRecipe,
  prep: DrugPrep,
  kg: number,
  validKg: boolean
) => {
  if (!recipe.weight_bands?.length) return null;
  if (!validKg) return { band: null, dose: null, volume: null };
  const band = recipe.weight_bands.find((candidate: PrepRecipeWeightBand) => {
    const aboveMin =
      (candidate.gt === undefined || kg > candidate.gt) &&
      (candidate.gte === undefined || kg >= candidate.gte);
    const belowMax =
      (candidate.lt === undefined || kg < candidate.lt) &&
      (candidate.lte === undefined || kg <= candidate.lte);
    return aboveMin && belowMax;
  });
  if (!band) return { band: null, dose: null, volume: null };
  const volume = prep.conc_produit ? +(band.dose / prep.conc_produit).toFixed(1) : null;
  return { band, dose: band.dose, volume };
};

// Étapes de préparation lues dans la table pondérale fixe (prep.table) pour le
// poids courant : prélèvement, dilution, vitesse, débit EP. null si pas de
// table ou pas de ligne pour ce poids exact.
export const computePrepTableCurrentSteps = (
  prep: DrugPrep,
  kg: number,
  validKg: boolean
): string[] | null => {
  if (!prep.table || !validKg) return null;
  const currentRow = prep.table.rows.find((row) => row.poids === kg);
  if (!currentRow) return null;
  return [
    `Pour ${kg} kg`,
    `Prélever ${formatDoseNumber(currentRow.vi)} mL de produit`,
    `Compléter à ${currentRow.vf} mL avec ${prep.solvant}`,
    `Administrer à ${currentRow.vitesse} mL/h pendant ${currentRow.temps} min`,
    `Débit EP : ${formatDoseNumber(currentRow.debitEp)} mg/min`,
  ];
};

// Dose seuil (type Anexate) : la saisie « dose efficace » convertie en dose
// réelle via dose_threshold_input_conc. "" si saisie invalide.
export const computeThresholdDose = (prep: DrugPrep, thresholdValue: string): number | "" => {
  const value = parseFloat(thresholdValue);
  if (!Number.isFinite(value) || value <= 0) return "";
  return prep.dose_threshold_input_conc ? value * prep.dose_threshold_input_conc : value;
};

// Titre du bloc seuil : reprend la saisie si présente, sinon le produit final.
export const computeThresholdTitle = (
  prep: DrugPrep,
  thresholdValue: string,
  pf?: number
): string => {
  if (thresholdValue && prep.dose_threshold_input_unit) {
    return `Pour ${thresholdValue} ${prep.dose_threshold_input_unit}`;
  }
  return pf ? `Pour ${pf} mg` : "PSE entretien";
};

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
