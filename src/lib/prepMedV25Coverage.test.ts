import { describe, expect, test } from "vitest";
import { DRUGS } from "../data/drugs";
import { PREP_MED_V25_COVERAGE } from "../data/prepMedV25Coverage";
import { PSE } from "../data/pse";

const RECIPE_FLAGS = [
  "adrenaline_table",
  "dobutamine_table",
  "isuprel_table",
  "sufenta_table",
  "norad_table",
  "sufenta_intranasal",
  "kcl_ivl",
  "kcl_pediatric",
  "clottafact_pediatric",
  "amiklin_adult",
  "amoxicilline_meningee_pump",
  "claforan_meningee_pump",
  "octaplex_inr",
  "use_table_row",
] as const;

function strategiesFromMainData(drug: (typeof DRUGS)[number]) {
  const prep = drug.prep;
  const pse = PSE[drug.id];
  const recipes = prep?.preparations ?? [];
  const strategies: string[] = [];

  if (!prep && !pse) strategies.push("reference_only");
  if (prep && ((prep.etapes?.length ?? 0) > 0 || recipes.length > 0)) strategies.push("steps");
  if (prep?.dose_kg != null) strategies.push("dose_kg");
  if (prep?.pedTable) strategies.push("ped_table");
  if (prep?.table) strategies.push("prep_table");
  if (prep?.phases?.length) strategies.push("phases");
  if (prep?.dose_threshold != null) strategies.push("dose_threshold");
  if (prep?.fixed_dilution) strategies.push("fixed_dilution");

  for (const flag of [
    "adrenaline_table",
    "dobutamine_table",
    "isuprel_table",
    "sufenta_table",
    "norad_table",
  ] as const) {
    if (prep?.[flag]) strategies.push(flag);
  }

  if (recipes.some((recipe) => recipe.phase_doses?.length)) strategies.push("phase_doses");
  if (recipes.some((recipe) => recipe.weight_bands?.length)) strategies.push("weight_bands");
  if (recipes.some((recipe) => recipe.dose_based_dilution)) {
    strategies.push("dose_based_dilution");
  }
  if (recipes.some((recipe) => recipe.dose_input_label)) strategies.push("dose_input");

  for (const flag of RECIPE_FLAGS) {
    if (recipes.some((recipe) => recipe[flag]) && !strategies.includes(flag)) {
      strategies.push(flag);
    }
  }

  if (
    recipes.some((recipe) => recipe.effective_input_label) ||
    pse?.inputMode === "effectiveDose"
  ) {
    strategies.push("effective_input");
  }

  if (pse) {
    strategies.push("pse");
    if (pse.inputMode === "mlh") strategies.push("pse_mlh_input");
    if (pse.referenceTables?.length) strategies.push("pse_reference_tables");
    if (pse.extra) strategies.push("pse_extra_unit");
  }

  // Cas explicitement portés par le moteur main mais non exprimés par un
  // champ générique dans drugs.js : ils restent volontairement liés à l’id.
  if (drug.id === 13) strategies.push("pediatric_adrenaline_modes");
  if (drug.id === 51) strategies.push("pediatric_not_established");
  if (drug.id === 74 || drug.id === 75) strategies.push("pediatric_age_band");

  return strategies;
}

describe("manifeste Prep Med V2.5", () => {
  test("référence chacun des 81 médicaments une seule fois avec le bon id et le bon nom", () => {
    const coverageEntries = Object.entries(PREP_MED_V25_COVERAGE);
    const coverageIds = coverageEntries.map(([id]) => Number(id));
    const declaredIds = coverageEntries.map(([, item]) => item.id);
    const drugIds = DRUGS.map((drug) => drug.id);

    expect(DRUGS).toHaveLength(81);
    expect(new Set(drugIds).size).toBe(DRUGS.length);
    expect(coverageEntries).toHaveLength(DRUGS.length);
    expect(new Set(coverageIds).size).toBe(coverageEntries.length);
    expect(new Set(declaredIds).size).toBe(coverageEntries.length);
    expect([...coverageIds].sort((a, b) => a - b)).toEqual([...drugIds].sort((a, b) => a - b));

    for (const drug of DRUGS) {
      const coverage = PREP_MED_V25_COVERAGE[drug.id as keyof typeof PREP_MED_V25_COVERAGE];
      expect(coverage, `${drug.id} ${drug.nom} absent du manifeste`).toBeDefined();
      expect(coverage.id).toBe(drug.id);
      expect(coverage.nom).toBe(drug.nom);
    }
  });

  test("garde pour chaque médicament les stratégies réellement portées par DRUGS/PSE", () => {
    for (const drug of DRUGS) {
      const coverage = PREP_MED_V25_COVERAGE[drug.id as keyof typeof PREP_MED_V25_COVERAGE];
      const expectedStrategies = strategiesFromMainData(drug);

      expect(new Set(coverage.strategies).size, `${drug.id} ${drug.nom}: stratégie dupliquée`).toBe(
        coverage.strategies.length
      );
      expect([...coverage.strategies].sort(), `${drug.id} ${drug.nom}`).toEqual(
        [...expectedStrategies].sort()
      );
    }
  });
});
