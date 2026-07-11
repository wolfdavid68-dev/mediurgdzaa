import {
  computeEffectivePrep,
  computePrepTableCurrentSteps,
  computeRecipeDoseInputValue,
  computeRecipePhaseRows,
  computeRecipeWeightBand,
  computeThresholdDose,
  computeThresholdTitle,
  recipeModeClass,
  resolvePrep,
} from "./PrepBlock.parts";
import type { DrugPrep, PrepRecipe } from "./PrepBlock.parts";
import type { Drug } from "../types/data";

// Tests des helpers de calcul purs extraits de PrepBlock. Verrouille la logique
// clinique des préparations (dose/kg, caps, bandes de poids, dilution effective)
// qui n'avait jusqu'ici aucune couverture unitaire.

// Fabriques de fixtures minimales typées (champs non pertinents omis via cast).
const recipe = (over: Partial<PrepRecipe>): PrepRecipe => over as PrepRecipe;
const prep = (over: Partial<DrugPrep>): DrugPrep => over as DrugPrep;

describe("resolvePrep", () => {
  const drug = {
    id: 13,
    prep: {
      solvant: "NaCl 0,9%",
      conc_finale: "1 mg/mL",
      pedTable: { titre: "Pédiatrie", bandes: [] },
    },
  } as unknown as Drug;

  test("sans overlay conserve la préparation principale", () => {
    expect(resolvePrep(drug, null)).toBe(drug.prep);
  });

  test("fusionne l’overlay sans perdre la table pédiatrique du main", () => {
    const resolved = resolvePrep(drug, {
      13: { prep: { solvant: "G5%", conc_finale: "0,2 mg/mL" } },
    });
    expect(resolved?.solvant).toBe("G5%");
    expect(resolved?.conc_finale).toBe("0,2 mg/mL");
    expect(resolved?.pedTable?.titre).toBe("Pédiatrie");
  });
});

describe("recipeModeClass", () => {
  test("préfixe la classe quand un mode est défini", () => {
    expect(recipeModeClass(recipe({ mode: "pse" }))).toBe(" prep-recipe-pse");
  });
  test("chaîne vide sans mode", () => {
    expect(recipeModeClass(recipe({}))).toBe("");
  });
});

describe("computeRecipePhaseRows", () => {
  test("dose/kg avec cap max et volume dérivé de conc_produit", () => {
    // Acide tranexamique enfant : 15-20 mg/kg, max 1 g, ampoule 100 mg/mL.
    const r = recipe({
      titre: "Enfant",
      phase_doses: [{ label: "Dose", dose_kg: 15, dose_max_kg: 20, max: 1000 }],
    });
    const rows = computeRecipePhaseRows(r, prep({ conc_produit: 100 }), 40, true);
    expect(rows).toHaveLength(1);
    expect(rows[0].dose).toBe(600); // 15 × 40
    expect(rows[0].doseMax).toBe(800); // 20 × 40
    expect(rows[0].volume).toBe(6); // 600 / 100
    expect(rows[0].volumeMax).toBe(8); // 800 / 100
  });

  test("le cap `max` s'applique à la dose ET à la dose max", () => {
    const r = recipe({
      titre: "Enfant",
      phase_doses: [{ label: "Dose", dose_kg: 15, dose_max_kg: 20, max: 1000 }],
    });
    const rows = computeRecipePhaseRows(r, prep({ conc_produit: 100 }), 60, true);
    expect(rows[0].dose).toBe(900); // min(15 × 60, 1000)
    expect(rows[0].doseMax).toBe(1000); // min(20 × 60 = 1200, 1000)
  });

  test("poids invalide → dose null pour une phase en dose/kg", () => {
    const r = recipe({ titre: "X", phase_doses: [{ label: "Dose", dose_kg: 15 }] });
    const rows = computeRecipePhaseRows(r, prep({ conc_produit: 100 }), NaN, false);
    expect(rows[0].dose).toBeNull();
    expect(rows[0].volume).toBeNull();
  });

  test("dose fixe : indépendante du poids, volume si conc_produit", () => {
    const r = recipe({ titre: "X", phase_doses: [{ label: "Bolus", dose_fixed: 50, unit: "mg" }] });
    const rows = computeRecipePhaseRows(r, prep({ conc_produit: 10 }), 70, true);
    expect(rows[0].dose).toBe(50);
    expect(rows[0].volume).toBe(5); // 50 / 10
  });

  test("débit PSE calculé pour une phase µg/min", () => {
    const r = recipe({
      titre: "X",
      phase_doses: [{ label: "PSE", dose_fixed: 6, unit: "µg/min" }],
    });
    const rows = computeRecipePhaseRows(r, prep({ conc_produit: 0.36 }), 70, true);
    // (6/1000)*60 / 0,36 = 1 mL/h
    expect(rows[0].rate).toBe(1);
  });

  test("débit PSE en plage pour une phase µg/min min-max", () => {
    const r = recipe({
      titre: "Ventoline",
      phase_doses: [{ label: "Débit", dose_kg: 0.1, dose_max_kg: 0.2, unit: "µg/min" }],
    });
    const rows = computeRecipePhaseRows(r, prep({ conc_produit: 0.1 }), 80, true);
    expect(rows[0].dose).toBe(8);
    expect(rows[0].doseMax).toBe(16);
    expect(rows[0].rate).toBe(4.8);
    expect(rows[0].rateMax).toBe(9.6);
  });

  test("dose en gouttes/kg plafonnée sans volume dérivé", () => {
    const r = recipe({
      titre: "Célestène",
      phase_doses: [{ label: "Dose", dose_kg: 15, unit: "gouttes", max: 60 }],
    });
    const rows = computeRecipePhaseRows(r, prep({}), 30, true);
    expect(rows[0].dose).toBe(60);
    expect(rows[0].volume).toBeNull();
  });

  test("phase sans dose_fixed ni dose_kg est ignorée", () => {
    const r = recipe({ titre: "X", phase_doses: [{ label: "Vide" }] });
    expect(computeRecipePhaseRows(r, prep({}), 70, true)).toHaveLength(0);
  });

  test("pas de phase_doses → tableau vide", () => {
    expect(computeRecipePhaseRows(recipe({}), prep({}), 70, true)).toEqual([]);
  });
});

describe("computeRecipeWeightBand", () => {
  const bands = recipe({
    weight_bands: [
      { label: "< 50 kg", lt: 50, dose: 500, unit: "mg" },
      { label: "≥ 50 kg", gte: 50, dose: 1000, unit: "mg" },
    ],
  });

  test("sélectionne la bonne bande et dérive le volume", () => {
    const res = computeRecipeWeightBand(bands, prep({ conc_produit: 100 }), 70, true);
    expect(res?.band?.label).toBe("≥ 50 kg");
    expect(res?.dose).toBe(1000);
    expect(res?.volume).toBe(10); // 1000 / 100
  });

  test("borne basse exclusive : 49 kg tombe dans < 50", () => {
    const res = computeRecipeWeightBand(bands, prep({ conc_produit: 100 }), 49, true);
    expect(res?.band?.label).toBe("< 50 kg");
    expect(res?.dose).toBe(500);
  });

  test("poids invalide → band null", () => {
    const res = computeRecipeWeightBand(bands, prep({}), NaN, false);
    expect(res).toEqual({ band: null, dose: null, volume: null });
  });

  test("aucune bande définie → null", () => {
    expect(computeRecipeWeightBand(recipe({}), prep({}), 70, true)).toBeNull();
  });
});

describe("computeRecipeDoseInputValue", () => {
  const r = recipe({ dose_input_default: 5, dose_input_min: 1, dose_input_max: 10 });

  test("utilise la valeur saisie (virgule décimale FR acceptée)", () => {
    expect(computeRecipeDoseInputValue(r, "7,5")).toBe(7.5);
  });
  test("clamp au max", () => {
    expect(computeRecipeDoseInputValue(r, "20")).toBe(10);
  });
  test("clamp au min", () => {
    expect(computeRecipeDoseInputValue(r, "0,2")).toBe(1);
  });
  test("saisie vide → défaut de la recette", () => {
    expect(computeRecipeDoseInputValue(r, "")).toBe(5);
  });
  test("saisie non numérique → null", () => {
    expect(computeRecipeDoseInputValue(r, "abc")).toBeNull();
  });
});

describe("computeEffectivePrep", () => {
  const r = recipe({ effective_input_conc: 10, effective_output_conc: 2, effective_fraction: 0.5 });

  test("dose horaire et débit à partir du volume saisi", () => {
    const res = computeEffectivePrep(r, "4");
    expect(res?.hourlyDose).toBe(20); // 4 × 10 × 0,5
    expect(res?.rate).toBe(10); // 20 / 2
  });
  test("fraction par défaut 2/3 si non précisée", () => {
    const r2 = recipe({ effective_input_conc: 9, effective_output_conc: 3 });
    const res = computeEffectivePrep(r2, "1");
    expect(res?.hourlyDose).toBe(6); // 1 × 9 × 2/3
  });
  test("concentrations manquantes → null", () => {
    expect(computeEffectivePrep(recipe({}), "4")).toBeNull();
  });
  test("volume invalide → null", () => {
    expect(computeEffectivePrep(r, "0")).toBeNull();
  });
});

describe("computePrepTableCurrentSteps", () => {
  const withTable = prep({
    solvant: "NaCl 0,9%",
    table: {
      rows: [
        { poids: 10, vi: 0.5, vf: 50, vitesse: 20, temps: 30, debitEp: 0.2 },
        { poids: 20, vi: 1, vf: 50, vitesse: 25, temps: 30, debitEp: 0.4 },
      ],
    },
  } as Partial<DrugPrep>);

  test("ligne correspondant au poids → 5 étapes formatées", () => {
    const steps = computePrepTableCurrentSteps(withTable, 20, true);
    expect(steps).toHaveLength(5);
    expect(steps?.[0]).toBe("Pour 20 kg");
    expect(steps?.[1]).toBe("Prélever 1 mL de produit");
    expect(steps?.[2]).toBe("Compléter à 50 mL avec NaCl 0,9%");
  });

  test("poids sans ligne exacte → null", () => {
    expect(computePrepTableCurrentSteps(withTable, 15, true)).toBeNull();
  });

  test("poids invalide → null", () => {
    expect(computePrepTableCurrentSteps(withTable, NaN, false)).toBeNull();
  });

  test("pas de table → null", () => {
    expect(computePrepTableCurrentSteps(prep({}), 20, true)).toBeNull();
  });
});

describe("computeThresholdDose", () => {
  test("convertit la saisie via dose_threshold_input_conc", () => {
    expect(computeThresholdDose(prep({ dose_threshold_input_conc: 5 }), "2")).toBe(10);
  });
  test("sans conc → la saisie telle quelle", () => {
    expect(computeThresholdDose(prep({}), "3")).toBe(3);
  });
  test("saisie invalide → chaîne vide", () => {
    expect(computeThresholdDose(prep({}), "0")).toBe("");
    expect(computeThresholdDose(prep({}), "abc")).toBe("");
  });
});

describe("computeThresholdTitle", () => {
  test("reprend la saisie + l'unité si présentes", () => {
    expect(computeThresholdTitle(prep({ dose_threshold_input_unit: "mg" }), "4")).toBe("Pour 4 mg");
  });
  test("sinon le produit final s'il est fourni", () => {
    expect(computeThresholdTitle(prep({}), "", 8)).toBe("Pour 8 mg");
  });
  test("sinon « PSE entretien »", () => {
    expect(computeThresholdTitle(prep({}), "")).toBe("PSE entretien");
  });
});
