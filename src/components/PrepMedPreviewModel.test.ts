import { DRUGS } from "../data/drugs";
import { PSE } from "../data/pse";
import { calcDoseFromRate } from "../lib/calc";
import {
  buildPrepMedPreviewModel,
  extractPreparedVolume,
  getPreviewPseDefault,
  getPreviewPseSteps,
  type PrepPreviewPopulation,
} from "./PrepMedPreviewModel";

const modelFor = (
  drugName: string,
  population: PrepPreviewPopulation,
  weight: string,
  recipeIndex = 0,
  pseInput?: number,
  recipeInput: number | null = null,
  ageBand: "lt6" | "gte6" | null = null
) => {
  const drug = DRUGS.find((candidate) => candidate.nom === drugName);
  if (!drug) throw new Error(`Médicament introuvable : ${drugName}`);
  const pse = PSE[drug.id] || null;
  return buildPrepMedPreviewModel({
    drug,
    prep: drug.prep || null,
    pse,
    population,
    weight,
    recipeIndex,
    pseInput: pseInput ?? getPreviewPseDefault(pse, weight, drug.prep || null),
    recipeInput,
    ageBand,
    monitoringLabel: (drug.monitoring || []).join(" + "),
  });
};

const flattenModelText = (model: ReturnType<typeof modelFor>) =>
  [
    ...model.modes.flatMap((mode) => [mode.title, mode.detail]),
    ...model.metrics.flatMap((metric) => [metric.label, metric.value, metric.note]),
    ...model.steps.flatMap((step) => [step.title, step.detail, step.result]),
    ...model.notes,
    ...model.controls,
    model.context,
  ].join(" ");

describe("modèle Prépa Med v2.5", () => {
  test("couvre les 81 médicaments en adulte et enfant sans valeur technique invalide", () => {
    expect(DRUGS).toHaveLength(81);
    const cases = DRUGS.flatMap((drug) => [
      { drug, population: "adulte" as const, weight: "80" },
      { drug, population: "enfant" as const, weight: "20" },
    ]);
    expect(cases).toHaveLength(162);

    for (const { drug, population, weight } of cases) {
      const prep = drug.prep || null;
      const pse = PSE[drug.id] || null;
      const first = buildPrepMedPreviewModel({
        drug,
        prep,
        pse,
        population,
        weight,
        recipeIndex: 0,
        pseInput: getPreviewPseDefault(pse, weight, prep),
        monitoringLabel: (drug.monitoring || []).join(" + "),
      });

      expect(first.modes.length, `${drug.nom} ${population}`).toBeGreaterThan(0);
      expect(first.steps.length, `${drug.nom} ${population}`).toBeGreaterThan(0);
      expect(first.controls, `${drug.nom} ${population}`).toHaveLength(5);
      first.controls.forEach((control) => expect(control.trim()).not.toBe(""));

      for (let recipeIndex = 0; recipeIndex < first.modes.length; recipeIndex += 1) {
        const model = buildPrepMedPreviewModel({
          drug,
          prep,
          pse,
          population,
          weight,
          recipeIndex,
          pseInput: getPreviewPseDefault(pse, weight, prep),
          monitoringLabel: (drug.monitoring || []).join(" + "),
        });
        const text = flattenModelText(model);
        expect(text, `${drug.nom} ${population} recette ${recipeIndex + 1}`).not.toMatch(
          /\b(?:NaN|undefined|Infinity|null)\b/
        );
        expect(model.steps.every((step) => step.title && step.detail && step.result)).toBe(true);
      }
    }
  });

  test("ne tronque aucun protocole et conserve tous les avertissements", () => {
    const magnesium = modelFor("SULFATE DE MAGNÉSIUM", "adulte", "80");
    expect(magnesium.modes.map((mode) => mode.title)).toEqual([
      "Hypomagnésémie",
      "Torsade de pointe",
      "Hypokaliémie",
      "Éclampsie",
    ]);

    const eclampsie = modelFor("SULFATE DE MAGNÉSIUM", "adulte", "80", 3);
    expect(eclampsie.notes).toHaveLength(4);
    expect(eclampsie.notes).toContain("Insuffisance rénale : adapter posologie");
  });

  test("calcule les volumes explicites sans confondre le conditionnement", () => {
    expect(extractPreparedVolume("2 mL de kétamine 250 mg/5 mL (= 100 mg)")).toBe("2 mL");
    expect(extractPreparedVolume("Prélever 5 mL de morphine 100 mg/10 mL")).toBe("5 mL");
    expect(extractPreparedVolume("6 ampoules 100 µg/1 mL (= 600 µg)")).toBe("6 mL");
    expect(extractPreparedVolume("2 ampoules 0,5 g/5 mL (= 1 g)")).toBe("10 mL");
    expect(extractPreparedVolume("Préparer 2 ampoules (= 10 mg/10 mL) — utiliser pur")).toBe(
      "10 mL"
    );
  });

  test("reprend les doses, volumes et débits de l’application principale", () => {
    const acr = modelFor("ADRÉNALINE", "adulte", "80", 0);
    expect(acr.metrics[1]).toMatchObject({ label: "Volume à injecter", value: "1 mL" });
    expect(acr.metrics[2].value).toMatch(/IV\s*\/\s*IO/i);
    expect(acr.controls).toContain("Volume injecté : 1 mL");

    const adrenaline = modelFor("ADRÉNALINE", "adulte", "80", 2, 0.5);
    expect(adrenaline.isPse).toBe(true);
    expect(adrenaline.metrics[0].value).toBe("0,5");
    expect(adrenaline.metrics[1].value).toBe("5 mL/h");
    expect(adrenaline.programmedRateMlH).toBe(5);
    expect(adrenaline.controls).toContain("Débit à programmer : 5 mL/h");
    expect(adrenaline.steps).toEqual([
      expect.objectContaining({ title: "Identifier l’ampoule", result: "1 mg/mL" }),
      expect.objectContaining({ title: "Prélever selon le poids", result: "Vi 20 mL" }),
      expect.objectContaining({ result: "Vf 42 mL" }),
      expect.objectContaining({ title: "Programmer le PSE", result: "5 mL/h" }),
    ]);

    const narcanFirst = modelFor("NARCAN", "adulte", "80");
    const narcanPseIndex = narcanFirst.modes.findIndex((mode) => mode.title === "PSE");
    const narcan = modelFor("NARCAN", "adulte", "80", narcanPseIndex, 10);
    expect(narcan.metrics[0]).toMatchObject({
      label: "Volume IVD efficace",
      value: "10 mL",
      note: "Volume total efficace administré en IVD",
    });
    expect(narcan.metrics[1].value).toBe("2,67 mL/h");

    const effectiveDoseEntries = Object.entries(PSE).filter(
      ([, entry]) => entry?.inputMode === "effectiveDose"
    );
    expect(effectiveDoseEntries.map(([id]) => Number(id))).toEqual([8]);

    const anexate = modelFor("ANEXATE", "adulte", "80", 0, 12);
    expect(anexate.metrics[0]).toMatchObject({
      label: "Volume IVD efficace",
      value: "12 mL",
      note: "1,2 mg administrés en IVD",
    });
    expect(anexate.metrics[1]).toMatchObject({
      label: "Débit à programmer",
      value: "12 mL/h",
    });
    expect(anexate.steps).toContainEqual(
      expect.objectContaining({ title: "Préparer le PSE", result: "4 ampoules · 20 mL purs" })
    );
    expect(flattenModelText(anexate)).not.toContain("1,2000000000000002");
    const anexateDrug = DRUGS.find((drug) => drug.nom === "ANEXATE")!;
    expect(getPreviewPseSteps(PSE[anexateDrug.id], "80", anexateDrug.prep || null)).toContain(20);
  });

  test("remplace les pastilles génériques par les résultats concrets de la recette", () => {
    const acupan = modelFor("ACUPAN", "adulte", "80");
    expect(acupan.steps).toContainEqual(expect.objectContaining({ result: "10 mg/mL" }));
    expect(acupan.steps).toContainEqual(expect.objectContaining({ result: "2 mL" }));
    expect(acupan.steps).toContainEqual(expect.objectContaining({ result: "Vf 100 mL" }));
    expect(flattenModelText(acupan)).toContain("15-20 min");
    expect(flattenModelText(acupan)).toContain("4-6h");
    expect(acupan.steps.map((step) => step.result)).not.toContain("Voir protocole");
    expect(acupan.canValidate).toBe(true);

    const gluconateChild = modelFor("GLUCONATE DE CALCIUM", "enfant", "20");
    expect(flattenModelText(gluconateChild)).not.toContain("20000 mL");
    expect(gluconateChild.steps).toContainEqual(
      expect.objectContaining({ title: "Dose — calcul au poids", result: "2000 mg" })
    );
  });

  test("préserve les calculateurs spécialisés et les concentrations produit", () => {
    const sufentanil = modelFor("SUFENTANIL", "adulte", "80", 0, 0.5);
    expect(flattenModelText(sufentanil)).toContain("Vi 5 mL");
    expect(flattenModelText(sufentanil)).toContain("Vf 31 mL");

    expect(flattenModelText(modelFor("ISUPREL", "adulte", "80"))).toContain("0,2 mg/mL");
    expect(flattenModelText(modelFor("VENTOLINE", "adulte", "80"))).toContain("1 mg/mL");
    expect(flattenModelText(modelFor("HÉPARINE SODIQUE", "adulte", "80", 1))).toContain(
      "5 000 UI/mL"
    );
    expect(flattenModelText(modelFor("MORPHINE", "adulte", "80", 1))).toContain("10 mg/mL");

    const octaplex = modelFor("OCTAPLEX", "adulte", "80");
    expect(flattenModelText(octaplex)).toContain("35 UI/kg · 2800 UI");
    expect(flattenModelText(octaplex)).toContain("Vitamine K1 10 mg IV");
    expect(octaplex.metrics[2]).toMatchObject({
      label: "Débit à programmer",
      value: "480 mL/h",
    });
    expect(octaplex.canValidate).toBe(true);
  });

  test("projette les préparations particulières médicament par médicament", () => {
    const sufentaIn = modelFor("SUFENTANIL", "enfant", "20", 1);
    expect(sufentaIn.steps).toContainEqual(
      expect.objectContaining({ title: "Prélever la dose pleine", result: "6 µg = 0,12 mL" })
    );
    expect(flattenModelText(sufentaIn)).toContain("3 µg = 0,06 mL");

    const hidonac = modelFor("HIDONAC", "adulte", "20");
    expect(hidonac.steps).toHaveLength(5);
    expect(hidonac.steps).toContainEqual(
      expect.objectContaining({
        title: "Phase 1 — préparer puis perfuser",
        detail: expect.stringContaining("3000 mg = 15 mL dans 500 mL"),
        result: "60 min",
      })
    );

    const prodilantin = modelFor("PRODILANTIN", "adulte", "80");
    expect(flattenModelText(prodilantin)).toContain("Prélever 24 mL de produit");
    expect(flattenModelText(prodilantin)).toContain("50 mL avec NaCl 0,9% ou G5%");
    expect(flattenModelText(prodilantin)).toContain("80 mg/min");
    expect(flattenModelText(prodilantin)).toContain("15 min");

    const kclAdult = modelFor("KCL", "adulte", "80", 0);
    expect(flattenModelText(kclAdult)).toContain("1 ampoule 1 g/10 mL");
    expect(flattenModelText(kclAdult)).toContain("Vf 250 mL");
    expect(flattenModelText(kclAdult)).toContain("Max 1 g/h");

    const kclChild = modelFor("KCL", "enfant", "20", 0);
    expect(flattenModelText(kclChild)).toContain("10 mmol/h");
    expect(flattenModelText(kclChild)).toContain("7,5 mL");
    expect(flattenModelText(kclChild)).toContain("Vf ≥ 250 mL");

    const clottafact = modelFor("CLOTTAFACT", "enfant", "20");
    expect(flattenModelText(clottafact)).toContain("1400 mg = 1,4 g");
    expect(flattenModelText(clottafact)).toContain("1 flacon de 1,5 g");

    const amiklin = modelFor("AMIKLIN", "adulte", "80");
    expect(flattenModelText(amiklin)).toContain("1600–2400 mg");
    expect(flattenModelText(amiklin)).toContain("Vf 500 mL");

    const amoxicilline = modelFor("AMOXICILLINE", "adulte", "80", 1);
    expect(flattenModelText(amoxicilline)).toContain("12 g/j");
    expect(flattenModelText(amoxicilline)).toContain("5 g/250 mL");
    expect(flattenModelText(amoxicilline)).toContain("25 mL/h");

    const claforan = modelFor("CLAFORAN", "adulte", "80", 1);
    expect(flattenModelText(claforan)).toContain("16 g/j");
    expect(flattenModelText(claforan)).toContain("4 g/48 mL");
    expect(flattenModelText(claforan)).toContain("8 mL/h");
  });

  test("gère explicitement les modes pédiatriques qui ne sont pas génériques", () => {
    const adrenaline = modelFor("ADRÉNALINE", "enfant", "20");
    expect(adrenaline.modes.map((mode) => mode.title)).toEqual([
      "ACR pédiatrique",
      "Anaphylaxie IM",
      "PSR / PSE enfant",
    ]);
    expect(flattenModelText(adrenaline)).toContain("200 µg");

    const adrenalineIm = modelFor("ADRÉNALINE", "enfant", "20", 1);
    expect(flattenModelText(adrenalineIm)).toContain("0,2 mL = 0,2 mg");

    const adrenalinePse = modelFor("ADRÉNALINE", "enfant", "20", 2, 0.5);
    expect(adrenalinePse.isPse).toBe(true);
    expect(flattenModelText(adrenalinePse)).toContain("2 ampoules 5 mg/5 mL");
    expect(flattenModelText(adrenalinePse)).toContain("Vf 50 mL");

    for (const drugName of ["BRICANYL", "ATROVENT"]) {
      const unselected = modelFor(drugName, "enfant", "20");
      expect(unselected.canValidate).toBe(false);
      expect(unselected.validationReason).toBe("Choisir la tranche d’âge de l’enfant");
      const selected = modelFor(drugName, "enfant", "20", 0, undefined, null, "lt6");
      expect(selected.canValidate).toBe(true);
      expect(flattenModelText(selected)).toContain("< 6 ans");
    }

    const nimotopChild = modelFor("NIMOTOP", "enfant", "20");
    expect(nimotopChild.hasPreparation).toBe(false);
    expect(nimotopChild.modes[0].title).toBe("Référence uniquement");
  });

  test("ne réutilise pas les doses de bolus dans une recette PSE synthétique", () => {
    const diprivanFirst = modelFor("DIPRIVAN", "adulte", "80");
    const pseIndex = diprivanFirst.modes.findIndex((mode) => mode.title === "Débit PSE");
    expect(pseIndex).toBeGreaterThanOrEqual(0);
    const pse = modelFor("DIPRIVAN", "adulte", "80", pseIndex, 1);
    expect(pse.isPse).toBe(true);
    expect(pse.steps.map((step) => step.detail).join(" ")).not.toMatch(
      /Induction|Sédation procédurale/i
    );
    expect(pse.steps).toContainEqual(
      expect.objectContaining({
        title: "Programmer le PSE",
        result: expect.stringMatching(/mL\/h/),
      })
    );
  });

  test("ne propose en saisie mL/h que des paliers dans la plage thérapeutique", () => {
    for (const drug of DRUGS) {
      const pse = PSE[drug.id];
      if (!pse || pse.hideBlock || pse.inputMode !== "mlh") continue;
      const steps = getPreviewPseSteps(pse, "80", drug.prep || null);
      expect(steps.length).toBeGreaterThan(0);
      if (drug.prep?.dose_threshold !== undefined) {
        expect(steps).toContain(20);
        continue;
      }
      for (const rate of steps) {
        const delivered = calcDoseFromRate(pse, rate, "80", pse.dosePrecision ?? 3);
        expect(delivered).not.toBeNull();
        expect(delivered!).toBeGreaterThanOrEqual(pse.min);
        expect(delivered!).toBeLessThanOrEqual(pse.max);
      }
    }
  });

  test("respecte pédiatrie, recettes vides, restrictions de poids et masquages PSE", () => {
    const adrenalineChild = modelFor("ADRÉNALINE", "enfant", "20");
    expect(adrenalineChild.modes.map((mode) => mode.title)).toEqual([
      "ACR pédiatrique",
      "Anaphylaxie IM",
      "PSR / PSE enfant",
    ]);
    expect(flattenModelText(adrenalineChild)).toContain("200 µg");
    expect(flattenModelText(adrenalineChild)).toContain("2 mL");
    expect(flattenModelText(adrenalineChild)).toContain("Vf 10 mL");

    const celocurine = modelFor("CÉLOCURINE", "enfant", "20");
    expect(flattenModelText(celocurine)).toContain("30–40 mg");

    for (const name of ["ACUPAN", "PRIMPERAN", "LÉVOFLOXACINE"]) {
      const model = modelFor(name, "enfant", "20");
      expect(model.activeRecipe?.empty).toBe(true);
      expect(flattenModelText(model)).toMatch(/Non recommandé/i);
    }

    expect(modelFor("CYANOKIT", "adulte", "80").hasPreparation).toBe(false);
    expect(modelFor("CYANOKIT", "enfant", "20").hasPreparation).toBe(true);
    expect(modelFor("LOXEN", "adulte", "80").isPse).toBe(false);
    expect(modelFor("RISORDAN", "adulte", "80").isPse).toBe(false);
  });

  test("rend les lacunes enfant comme référence uniquement", () => {
    for (const name of ["KEPPRA", "CHLORURE DE CALCIUM"]) {
      const model = modelFor(name, "enfant", "20");
      expect(model.hasPreparation).toBe(false);
      expect(model.modes[0].title).toBe("Référence uniquement");
    }
  });
});
