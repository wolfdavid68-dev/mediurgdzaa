import { DRUGS } from "../data/drugs";
import { PSE } from "../data/pse";
import { PSE_PREVIEW } from "../data/pse.preview";
import { calcDoseFromRate } from "../lib/calc";
import {
  buildPreparationModel,
  extractPreparedVolume,
  getPreparationPseDefault,
  getPreparationPseSteps,
  type PreparationPopulation,
} from "./PreparationModel";

const PREVIEW_PSE = { ...PSE, ...PSE_PREVIEW };

const modelFor = (
  drugName: string,
  population: PreparationPopulation,
  weight: string,
  recipeIndex = 0,
  pseInput?: number,
  recipeInput: number | null = null,
  ageBand: "lt6" | "gte6" | null = null
) => {
  const drug = DRUGS.find((candidate) => candidate.nom === drugName);
  if (!drug) throw new Error(`Médicament introuvable : ${drugName}`);
  const pse = PSE[drug.id] || null;
  return buildPreparationModel({
    drug,
    prep: drug.prep || null,
    pse,
    population,
    weight,
    recipeIndex,
    pseInput: pseInput ?? getPreparationPseDefault(pse, weight, drug.prep || null),
    recipeInput,
    ageBand,
    monitoringLabel: (drug.monitoring || []).join(" + "),
  });
};

const previewModelFor = (
  drugName: string,
  population: PreparationPopulation,
  weight: string,
  recipeIndex = 0,
  pseInput?: number,
  recipeInput: number | null = null,
  ageBand: "lt6" | "gte6" | null = null
) => {
  const drug = DRUGS.find((candidate) => candidate.nom === drugName);
  if (!drug) throw new Error(`Médicament introuvable : ${drugName}`);
  const prep = drug.prep || null;
  const pse = PREVIEW_PSE[drug.id] || null;
  return buildPreparationModel({
    drug,
    prep,
    pse,
    population,
    weight,
    recipeIndex,
    pseInput: pseInput ?? getPreparationPseDefault(pse, weight, prep),
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
      const pse = PREVIEW_PSE[drug.id] || null;
      const first = buildPreparationModel({
        drug,
        prep,
        pse,
        population,
        weight,
        recipeIndex: 0,
        pseInput: getPreparationPseDefault(pse, weight, prep),
        monitoringLabel: (drug.monitoring || []).join(" + "),
      });

      expect(first.modes.length, `${drug.nom} ${population}`).toBeGreaterThan(0);
      expect(first.steps.length, `${drug.nom} ${population}`).toBeGreaterThan(0);
      expect(first.controls, `${drug.nom} ${population}`).toHaveLength(5);
      first.controls.forEach((control) => expect(control.trim()).not.toBe(""));

      for (let recipeIndex = 0; recipeIndex < first.modes.length; recipeIndex += 1) {
        const model = buildPreparationModel({
          drug,
          prep,
          pse,
          population,
          weight,
          recipeIndex,
          pseInput: getPreparationPseDefault(pse, weight, prep),
          monitoringLabel: (drug.monitoring || []).join(" + "),
        });
        const text = flattenModelText(model);
        expect(text, `${drug.nom} ${population} recette ${recipeIndex + 1}`).not.toMatch(
          /\b(?:NaN|undefined|Infinity|null)\b/
        );
        expect(model.steps.every((step) => step.title && step.detail && step.result)).toBe(true);

        const recipe = model.activeRecipe;
        const volumePhaseIndexes = model.steps
          .map((step, index) => ({ step, index }))
          .filter(
            ({ step }) =>
              step.phaseDose &&
              !recipe?.hide_phase_volume &&
              /mL(?:\s*\/\s*h)?\b/i.test(step.result)
          )
          .map(({ index }) => index);

        if (volumePhaseIndexes.length) {
          expect(
            recipe?.calculated_volume_role || model.steps.some((step) => step.volumeRole),
            `${drug.nom} ${population}`
          ).toBeTruthy();
        }

        if (recipe?.calculated_volume_role && volumePhaseIndexes.length) {
          const preparationIndexes = model.steps
            .map((step, index) => ({ step, index }))
            .filter(
              ({ step }) =>
                !step.phaseDose &&
                /identifier|reconstituer|prévoir|prélever|compléter|diluer|préparer/i.test(
                  step.title
                )
            )
            .map(({ index }) => index);
          const administrationRole = ["injecter", "perfuser", "administrer", "programmer"].includes(
            recipe.calculated_volume_role
          );
          if (administrationRole && preparationIndexes.length) {
            expect(Math.min(...volumePhaseIndexes), `${drug.nom} ${population}`).toBeGreaterThan(
              Math.max(...preparationIndexes)
            );
          }
          if (!model.isPse && recipe.calculated_volume_role !== "programmer") {
            const expectedLabel = {
              prelever: "Volume de produit à prélever",
              injecter: "Volume à injecter",
              perfuser: "Volume à perfuser",
              administrer: "Volume à administrer",
            }[recipe.calculated_volume_role];
            expect(model.metrics[1].label, `${drug.nom} ${population}`).toBe(expectedLabel);
            expect(model.controls.some((control) => control.includes(`${expectedLabel} :`))).toBe(
              true
            );
          }
        }

        for (const row of recipe?.rows || []) {
          if (row.reference_only) {
            expect(model.steps.some((step) => step.detail.includes(row.value))).toBe(false);
          }
        }
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
    expect(extractPreparedVolume("Ampoule 50 mg/5 mL (10 mg/mL) — administrer pure")).toBeNull();
    expect(extractPreparedVolume("Administrer à 200 mL/h selon la table")).toBeNull();
  });

  test("reprend les doses, volumes et débits de l’application principale", () => {
    const acr = modelFor("ADRÉNALINE", "adulte", "80", 0);
    expect(acr.metrics[1]).toMatchObject({ label: "Volume à injecter", value: "1 mL" });
    expect(acr.metrics[2].value).toMatch(/IV\s*\/\s*IO/i);
    expect(acr.controls).toContain("Volume à injecter : 1 mL");

    const previewAcr = previewModelFor("ADRÉNALINE", "adulte", "80", 0);
    expect(previewAcr.metrics[1]).toMatchObject({ label: "Volume à injecter", value: "1 mL" });
    expect(previewAcr.steps).toContainEqual(
      expect.objectContaining({ title: "Injecter", result: "1 mL" })
    );
    expect(flattenModelText(previewAcr)).not.toContain("1000 mL");

    const celocurine = modelFor("CÉLOCURINE", "adulte", "80");
    expect(celocurine.metrics[1]).toMatchObject({ label: "Volume à injecter", value: "8 mL" });
    expect(celocurine.controls).toContain("Volume final : 10 mL · Volume à injecter : 8 mL");
    expect(celocurine.steps.map((step) => step.title)).toEqual([
      "Identifier l’ampoule",
      "Prélever",
      "Compléter avec NaCl 0,9%",
      "Injecter — ISR",
    ]);

    const esmeron = modelFor("ESMERON", "adulte", "80");
    expect(esmeron.metrics[1]).toMatchObject({ label: "Volume à injecter", value: "9,6 mL" });
    expect(esmeron.steps).toContainEqual(
      expect.objectContaining({ title: "Prévoir les ampoules", result: "2 ampoules de 50 mg" })
    );
    expect(esmeron.steps.at(-1)).toMatchObject({ title: "Injecter — ISR", result: "9,6 mL" });
    expect(flattenModelText(esmeron)).not.toContain("Standard");

    const adrenaline = modelFor("ADRÉNALINE", "adulte", "80", 2, 0.5);
    expect(adrenaline.isPse).toBe(true);
    expect(adrenaline.metrics[0].value).toBe("0,5");
    expect(adrenaline.metrics[1].value).toBe("5 mL/h");
    expect(adrenaline.programmedRateMlH).toBe(5);
    expect(adrenaline.controls).toContain("Débit à programmer : 5 mL/h");
    expect(adrenaline.steps).toEqual([
      expect.objectContaining({ title: "Identifier l’ampoule", result: "1 mg/mL" }),
      expect.objectContaining({ title: "Prélever le médicament", result: "10 mL" }),
      expect.objectContaining({ result: "Vf 50 mL" }),
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
    expect(getPreparationPseSteps(PSE[anexateDrug.id], "80", anexateDrug.prep || null)).toContain(
      20
    );
  });

  test("distingue prélèvement, injection, perfusion et autres voies sur les recettes à risque", () => {
    const cordarone = modelFor("CORDARONE", "adulte", "80", 1);
    expect(cordarone.metrics[1]).toMatchObject({
      label: "Volume de produit à prélever",
      value: "6 mL",
    });
    expect(flattenModelText(cordarone)).not.toContain("Volume à injecter 6 mL");
    expect(cordarone.steps).toContainEqual(
      expect.objectContaining({ title: "Prévoir les ampoules", result: "2 ampoules de 150 mg" })
    );
    expect(cordarone.steps.findIndex((step) => /Compléter/.test(step.title))).toBeLessThan(
      cordarone.steps.findIndex((step) => /Administrer/.test(step.title))
    );

    const keppra = modelFor("KEPPRA", "adulte", "80");
    expect(keppra.metrics[1]).toMatchObject({
      label: "Volume de produit à prélever",
      value: "32–40 mL",
    });
    expect(keppra.steps).toContainEqual(
      expect.objectContaining({ title: "Prévoir les ampoules", result: "8 ampoules de 500 mg" })
    );
    expect(keppra.steps.findIndex((step) => /dilution/i.test(step.title))).toBeLessThan(
      keppra.steps.findIndex((step) => /Perfuser/.test(step.title))
    );

    const sufentanilModes = modelFor("SUFENTANIL", "adulte", "80").modes;
    const intranasalIndex = sufentanilModes.findIndex((mode) => mode.title === "Intranasal");
    const sufentanil = modelFor("SUFENTANIL", "adulte", "80", intranasalIndex);
    expect(sufentanil.metrics[1]).toMatchObject({
      label: "Volume à administrer",
      value: "0,48 mL",
    });

    const valiumModes = modelFor("VALIUM", "enfant", "20").modes;
    const rectalIndex = valiumModes.findIndex((mode) => mode.title === "Rectal enfant");
    const valiumRectal = modelFor("VALIUM", "enfant", "20", rectalIndex);
    expect(valiumRectal.metrics[1]).toMatchObject({
      label: "Volume à administrer",
      value: "1 mL",
    });
    expect(flattenModelText(valiumRectal)).not.toContain("Volume à injecter 1 mL");

    const prodilantin = modelFor("PRODILANTIN", "adulte", "80");
    expect(flattenModelText(prodilantin)).toContain("200 mL/h");
    expect(flattenModelText(prodilantin)).not.toContain("Volume à injecter 200 mL");

    const isoptine = modelFor("ISOPTINE", "adulte", "80");
    expect(isoptine.canValidate).toBe(false);
    expect(isoptine.validationReason).toMatch(/supérieur au volume préparé/i);
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
      expect.objectContaining({
        title: "Dose",
        detail: expect.stringContaining("100 mg/kg"),
        result: "2000 mg",
      })
    );
  });

  test("distingue les doses fixes des phases pondérales dans la préparation", () => {
    const actilyse = modelFor("ACTILYSE", "adulte", "", 0);

    expect(actilyse.steps).toContainEqual(
      expect.objectContaining({
        title: "Identifier le flacon",
        result: "1 mg/mL",
      })
    );
    expect(actilyse.steps).toContainEqual(
      expect.objectContaining({
        title: "Bolus IV",
        detail: "Dose fixe",
        result: "15 mg",
      })
    );
    expect(actilyse.steps).toContainEqual(
      expect.objectContaining({
        title: "PSE 30 min",
        detail: "0,75 mg/kg · 30 min",
        result: "Poids requis",
      })
    );
    expect(actilyse.steps.map((step) => step.title)).toEqual([
      "Identifier le flacon",
      "Reconstituer le flacon",
      "Bolus IV",
      "PSE 30 min",
      "PSE 60 min",
    ]);
    expect(actilyse.steps[1]).toMatchObject({ result: "Vf 50 mL" });

    const actilyse80kg = modelFor("ACTILYSE", "adulte", "80", 0);
    expect(actilyse80kg.steps).toHaveLength(6);
    expect(actilyse80kg.metrics[0]).toMatchObject({
      label: "Dose calculée",
      value: "15 mg puis 50 mg puis 35 mg",
    });
    expect(actilyse80kg.steps).toContainEqual(
      expect.objectContaining({ title: "Prévoir les flacons", result: "2 flacons de 50 mg" })
    );
    expect(actilyse80kg.steps).toContainEqual(
      expect.objectContaining({
        title: "PSE 30 min",
        detail: "0,75 mg/kg · 50 mg pour 80 kg · 30 min",
        result: "100 mL/h",
      })
    );
    expect(actilyse80kg.steps).toContainEqual(
      expect.objectContaining({
        title: "PSE 60 min",
        detail: "0,5 mg/kg · 35 mg pour 80 kg · 60 min",
        result: "35 mL/h",
      })
    );

    const metalyse80kg = modelFor("METALYSE", "adulte", "80", 0);
    expect(metalyse80kg.metrics[0]).toMatchObject({
      label: "Dose calculée",
      value: "45 mg",
    });

    const atropine = modelFor("ATROPINE", "adulte", "80", 0);
    expect(atropine.steps).toContainEqual(
      expect.objectContaining({
        title: "Prélever — Disponible",
        detail: "2 ampoules · Dose fixe · 1 mg",
        result: "2 mL",
      })
    );

    const celesteneChild = modelFor("CÉLESTÈNE", "enfant", "20", 0);
    expect(celesteneChild.metrics[0]).toMatchObject({
      label: "Dose calculée",
      value: "60 gouttes",
    });

    for (const drugName of ["GLUCAGEN", "SOLUMEDROL", "AMOXICILLINE", "ZOVIRAX"]) {
      const productStep = modelFor(drugName, "adulte", "80", 0).steps[0];
      expect(productStep.result, drugName).not.toMatch(/variable|selon|cible|prescription/i);
      expect(productStep.result, drugName).toMatch(/flacon|ampoule|\d/i);
    }
  });

  test("préserve les calculateurs spécialisés et les concentrations produit", () => {
    const sufentanil = modelFor("SUFENTANIL", "adulte", "80", 0, 0.5);
    expect(flattenModelText(sufentanil)).toContain("Vi 5 mL");
    expect(flattenModelText(sufentanil)).toContain("Vf 31 mL");

    expect(flattenModelText(modelFor("ISUPREL", "adulte", "80"))).toContain("0,1 mg/mL");
    expect(flattenModelText(modelFor("VENTOLINE", "adulte", "80"))).toContain("1 mg/mL");
    expect(flattenModelText(modelFor("HÉPARINE SODIQUE", "adulte", "80", 1))).toContain(
      "5 000 UI/mL"
    );
    expect(flattenModelText(modelFor("HÉPARINE SODIQUE", "adulte", "80", 1))).toContain(
      "25 000 UI/5 mL"
    );
    expect(flattenModelText(modelFor("HÉPARINE SODIQUE", "adulte", "80", 1))).not.toContain(
      "25 000 UI/25 mL"
    );
    expect(flattenModelText(modelFor("MORPHINE", "adulte", "80", 1))).toContain("10 mg/mL");

    const octaplex = modelFor("OCTAPLEX", "adulte", "80");
    expect(flattenModelText(octaplex)).toContain("35 UI/kg · 2800 UI");
    expect(flattenModelText(octaplex)).toContain("Vitamine K1 10 mg IV");
    expect(octaplex.metrics[2]).toMatchObject({
      label: "Prescription · mL/kg/min",
      value: "0,12 mL/kg/min",
      control: {
        unit: "mL/kg/min",
        min: 0.05,
        max: 0.12,
        result: "Débit calculé : 480 mL/h",
      },
    });
    expect(octaplex.canValidate).toBe(true);
  });

  test("sépare les bornes thérapeutiques des paliers de saisie rapide", () => {
    const firstDiprivan = modelFor("DIPRIVAN", "adulte", "80");
    const pseIndex = firstDiprivan.modes.findIndex((mode) => /Débit PSE/i.test(mode.title));
    expect(pseIndex).toBeGreaterThanOrEqual(0);

    const diprivan = modelFor("DIPRIVAN", "adulte", "80", pseIndex, 0.5);
    expect(diprivan.metrics[0].control).toMatchObject({
      kind: "pse",
      value: 0.5,
      unit: "mg/kg/h",
      min: 0.5,
      max: 4,
      steps: [1, 2, 3, 4],
    });
  });

  test("projette les préparations particulières médicament par médicament", () => {
    const sufentaIn = modelFor("SUFENTANIL", "enfant", "20", 1);
    expect(sufentaIn.steps).toContainEqual(
      expect.objectContaining({ title: "Prélever la dose pleine", result: "6 µg = 0,12 mL" })
    );
    expect(flattenModelText(sufentaIn)).toContain("3 µg = 0,06 mL");

    const hidonac = modelFor("HIDONAC", "adulte", "20");
    expect(hidonac.steps).toHaveLength(6);
    expect(hidonac.steps).toContainEqual(
      expect.objectContaining({
        title: "Phase 1 — préparer puis perfuser",
        detail: expect.stringContaining("3000 mg = 15 mL dans 500 mL"),
        result: "Vf 500 mL · Vi 15 mL · 60 min",
      })
    );
    expect(hidonac.controls.some((control) => control.includes("Phase 4 : 2 ampoules"))).toBe(true);
    expect(hidonac.controls.some((control) => control.includes("Vi 15 mL"))).toBe(true);
    expect(hidonac.controls.some((control) => control.includes("Vi 30 mL"))).toBe(true);

    const albumineChild = modelFor("VIALEBEX / ALBUMINE HUMAINE", "enfant", "20");
    expect(flattenModelText(albumineChild)).toContain("Albumine 20%");
    expect(flattenModelText(albumineChild)).toContain("1 flacon de 100 mL");
    expect(flattenModelText(albumineChild)).not.toContain("flacon de 250 mL");

    const augmentin = modelFor("AUGMENTIN", "adulte", "80");
    expect(augmentin.steps).toContainEqual(
      expect.objectContaining({ title: "Prélever", result: "1–2 g" })
    );
    expect(augmentin.controls).toContain("Volume final : 100 mL · Quantité à prélever : 1–2 g");

    const glucagenAdult = modelFor("GLUCAGEN", "adulte", "80", 0, undefined, 1);
    expect(glucagenAdult.steps).toContainEqual(
      expect.objectContaining({ title: "Prévoir les flacons", result: "4 flacons de 1 mg" })
    );
    expect(glucagenAdult.controls).toContain("Volume final : 24 mL · Débit à programmer : 6 mL/h");

    const eupressyl = modelFor("EUPRESSYL", "adulte", "80");
    expect(eupressyl.steps).toContainEqual(
      expect.objectContaining({ title: "Programmer le PSE", result: "1-6 mL/h (5-30 mg/h)" })
    );
    expect(eupressyl.controls).toContain("Débit à programmer : 1-6 mL/h");

    const hypnovelBolus = modelFor("HYPNOVEL", "adulte", "80");
    expect(flattenModelText(hypnovelBolus)).toContain("1–3 mL ou 10 mL");
    expect(flattenModelText(hypnovelBolus)).toContain("2 ampoules de 5 mg");

    const vancomycine = modelFor("VANCOMYCINE", "adulte", "80");
    expect(vancomycine.activeRecipe?.empty).toBe(true);
    expect(vancomycine.canValidate).toBe(false);
    expect(vancomycine.validationReason).toMatch(/volume final dépend/i);
    expect(flattenModelText(vancomycine)).not.toMatch(/2000[–-]2400 mg/);

    const prodilantin = modelFor("PRODILANTIN", "adulte", "80");
    expect(flattenModelText(prodilantin)).toContain("Prélever 24 mL de produit");
    expect(flattenModelText(prodilantin)).toContain("50 mL avec NaCl 0,9% ou G5%");
    expect(flattenModelText(prodilantin)).toContain("80 mg/min");
    expect(flattenModelText(prodilantin)).toContain("15 min");
    expect(flattenModelText(prodilantin)).toContain(
      "Flacon 10 mL : 750 mg de fosphénytoïne (= 500 mg EP ; 50 mg EP/mL)"
    );

    const kclAdult = modelFor("KCL", "adulte", "80", 0);
    expect(flattenModelText(kclAdult)).toContain("1 ampoule 1 g/10 mL");
    expect(flattenModelText(kclAdult)).toContain("Vf 250 mL");
    expect(flattenModelText(kclAdult)).toContain("Max 1 g/h");

    const kclChild = modelFor("KCL", "enfant", "20", 0);
    expect(flattenModelText(kclChild)).toContain("10 mmol/h");
    expect(flattenModelText(kclChild)).toContain("7,5 mL");
    expect(flattenModelText(kclChild)).toContain("Vf ≥ 250 mL");
    expect(kclChild.controls).toContain("Dose calculée : 10 mmol/h");

    const glucagenChild = modelFor("GLUCAGEN", "enfant", "20");
    expect(glucagenChild.steps.map((step) => step.title)).toEqual([
      "Identifier le kit",
      "Reconstituer le flacon",
      "Administrer selon le poids",
    ]);
    expect(glucagenChild.controls).toContain("Volume final : 1 mL · Volume à administrer : 0,5 mL");

    const solumedrol = modelFor("SOLUMEDROL", "adulte", "80", 0, undefined, 120);
    expect(solumedrol.steps.at(-1)).toMatchObject({ title: "Injecter en IVD", result: "10 mL" });
    expect(solumedrol.controls).toContain("Volume final : 10 mL · Volume à injecter : 10 mL");
    expect(flattenModelText(solumedrol)).not.toContain("Volume final : 2 mL ou 10 mL");

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

    const amoxicillineStandard = modelFor("AMOXICILLINE", "adulte", "80", 0);
    expect(amoxicillineStandard.steps.map((step) => step.title)).toEqual([
      "Identifier le flacon",
      "Reconstituer le flacon",
      "Transférer dans la poche",
      "Compléter avec NaCl 0,9%",
      "Perfuser",
    ]);
    expect(amoxicillineStandard.controls).toContain(
      "Volume final : 100 mL · Volume de produit à prélever : 10 mL"
    );

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

    const isuprelChild = previewModelFor("ISUPREL", "enfant", "20");
    expect(isuprelChild.activeRecipe?.empty).toBe(true);
    expect(isuprelChild.isPse).toBe(false);
    expect(isuprelChild.canValidate).toBe(false);
    expect(isuprelChild.validationReason).toMatch(/préparation pédiatrique non validée/i);

    for (const model of [
      modelFor("NALBUPHINE", "enfant", "20.1"),
      modelFor("CORDARONE", "enfant", "30.5"),
    ]) {
      expect(model.hasPreparation).toBe(true);
      expect(model.canValidate).toBe(false);
      expect(model.validationReason).toBe(
        "Aucune préparation calculable pour ce poids — vérifier le protocole"
      );
      expect(flattenModelText(model)).not.toMatch(/-\d+(?:[,.]\d+)?\s*mL|NaN/i);
    }
  });

  test("ne laisse aucune recette explicitement adulte dans les modes enfant", () => {
    const adultOnlyRecipes = new Map<string, string[]>([
      ["KÉTAMINE", ["PSE"]],
      ["MORPHINE", ["Bolus / titration", "PSE"]],
      ["NARCAN", ["IVD", "PSE"]],
      ["POLARAMINE", ["IVD pur"]],
      ["ADRÉNALINE", ["ACR", "Choc anaphylactique", "PSR / PSE"]],
      ["ÉPHÉDRINE", ["Bolus titré"]],
      ["ATROPINE", ["IVD pur"]],
      ["CORDARONE", ["ACR", "PSE entretien"]],
      ["DIGOXINE NATIVELLE", ["IVL"]],
      ["LOXEN", ["Bolus", "PSE"]],
      ["RISORDAN", ["Bolus — référence uniquement", "PSE"]],
      ["SANDOSTATINE", ["PSE"]],
      ["SOLUMEDROL", ["IV"]],
    ]);

    expect([...adultOnlyRecipes.values()].flat()).toHaveLength(20);

    for (const [drugName, recipeTitles] of adultOnlyRecipes) {
      const adultTitles = previewModelFor(drugName, "adulte", "80").modes.map((mode) => mode.title);
      const child = previewModelFor(drugName, "enfant", "20");
      const childTitles = child.modes.map((mode) => mode.title);

      for (const recipeTitle of recipeTitles) {
        expect(adultTitles, `${drugName} adulte`).toContain(recipeTitle);
        expect(childTitles, `${drugName} enfant`).not.toContain(recipeTitle);
      }
      expect(child.activeRecipe?.population, `${drugName} enfant`).not.toBe("adulte");
    }
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
      const steps = getPreparationPseSteps(pse, "80", drug.prep || null);
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

    for (const name of [
      "AUGMENTIN",
      "AMOXICILLINE",
      "FLAGYL",
      "TAZOCILLINE",
      "ROVAMYCINE",
      "VANCOMYCINE",
    ]) {
      const model = modelFor(name, "enfant", "20");
      expect(model.activeRecipe?.empty, name).toBe(true);
      expect(model.canValidate, name).toBe(false);
      expect(model.steps, name).toEqual([
        expect.objectContaining({
          title: "Préparation non recommandée",
          result: "Ne pas préparer",
        }),
      ]);
    }

    const vancomycineMaintenance = modelFor("VANCOMYCINE", "adulte", "80", 1);
    expect(vancomycineMaintenance.activeRecipe?.empty).toBe(true);
    expect(vancomycineMaintenance.canValidate).toBe(false);

    const cyanokitAdult = previewModelFor("CYANOKIT", "adulte", "80");
    expect(cyanokitAdult.hasPreparation).toBe(true);
    expect(cyanokitAdult.metrics[0].value).toBe("5000 mg");
    expect(cyanokitAdult.metrics[1]).toMatchObject({
      label: "Volume à administrer",
      value: "200 mL",
    });
    expect(cyanokitAdult.controls).toContain(
      "Volume final : 200 mL · Volume à administrer : 200 mL"
    );

    const cyanokitChild = previewModelFor("CYANOKIT", "enfant", "20");
    expect(cyanokitChild.metrics[0].value).toBe("1400 mg");
    expect(cyanokitChild.metrics[1].value).toBe("56 mL");
    expect(modelFor("LOXEN", "adulte", "80").isPse).toBe(false);
    expect(modelFor("RISORDAN", "adulte", "80").isPse).toBe(false);

    const risordanBolus = modelFor("RISORDAN", "adulte", "80");
    expect(risordanBolus.activeRecipe?.empty).toBe(true);
    expect(risordanBolus.canValidate).toBe(false);
    expect(risordanBolus.validationReason).toMatch(/dose de bolus non définie/i);

    const lasilixBolus = flattenModelText(modelFor("LASILIX", "adulte", "80"));
    expect(lasilixBolus).not.toMatch(/Étape 2.*Voir protocole/i);

    const bridionAdult = flattenModelText(modelFor("BRIDION", "adulte", "80"));
    expect(bridionAdult).toContain("16 mg/kg");
    expect(bridionAdult).not.toMatch(/Administrer\s*(?:→|:)\s*100 mg\/mL pur/i);

    const loxenBolus = flattenModelText(modelFor("LOXEN", "adulte", "80"));
    expect(loxenBolus).toContain("1 mg");
    expect(loxenBolus).not.toMatch(/Administrer\s*(?:→|:)\s*(?:pur )?1 mg\/mL/i);
  });

  test("rend les lacunes enfant comme référence uniquement", () => {
    for (const name of ["KEPPRA", "CHLORURE DE CALCIUM"]) {
      const model = modelFor(name, "enfant", "20");
      expect(model.hasPreparation).toBe(false);
      expect(model.modes[0].title).toBe("Référence uniquement");
    }
  });

  test("sécurise Célestène, Ventoline nébulisée et Glucose 30% pédiatrique", () => {
    const celestene = modelFor("CÉLESTÈNE", "enfant", "20");
    expect(celestene.metrics[0].value).toBe("60 gouttes");
    expect(celestene.steps).toContainEqual(
      expect.objectContaining({
        title: "Administrer — Dose",
        detail: "15 gouttes/kg · 60 gouttes pour 20 kg · maximum 60 gouttes",
        result: "60 gouttes",
      })
    );

    const ventolineAdultIndex = modelFor("VENTOLINE", "adulte", "80").modes.findIndex(
      (mode) => mode.title === "Asthme aigu"
    );
    const ventolineAdult = modelFor("VENTOLINE", "adulte", "80", ventolineAdultIndex);
    expect(ventolineAdult.metrics[0].value).toBe("5 mg");
    expect(ventolineAdult.metrics[1]).toMatchObject({
      label: "Volume à administrer",
      value: "5 mL",
      note: "1 mg/mL",
    });
    expect(ventolineAdult.steps).toContainEqual(
      expect.objectContaining({ title: "Administrer — Dose", result: "5 mL" })
    );

    const ventolineChildIndex = modelFor("VENTOLINE", "enfant", "20").modes.findIndex(
      (mode) => mode.title === "Nébulisation enfant"
    );
    const ventolineChild = modelFor("VENTOLINE", "enfant", "20", ventolineChildIndex);
    expect(ventolineChild.metrics[0].value).toBe("2,5–5 mg");
    expect(ventolineChild.metrics[1]).toMatchObject({
      label: "Volume à administrer",
      value: "2,5–5 mL",
      note: "1 mg/mL",
    });
    expect(ventolineChild.steps).toContainEqual(
      expect.objectContaining({ title: "Administrer — Dose", result: "2,5–5 mL" })
    );

    const glucoseChild = modelFor("GLUCOSE 30%", "enfant", "20");
    expect(glucoseChild.metrics[0].value).toBe("6–10 g");
    expect(glucoseChild.metrics[1]).toMatchObject({
      label: "Volume à administrer",
      value: "60–100 mL",
      note: "0,1 g/mL après dilution à G10%",
    });
    expect(glucoseChild.steps).toContainEqual(
      expect.objectContaining({ title: "Prélever le G30%", result: "20–33,3 mL" })
    );
    expect(glucoseChild.steps).toContainEqual(
      expect.objectContaining({ title: "Diluer à G10%", result: "Vf 60–100 mL" })
    );
    expect(glucoseChild.controls).toContain(
      "Volume final : 60–100 mL · Volume à administrer : 60–100 mL"
    );

    const glucoseWithoutWeight = modelFor("GLUCOSE 30%", "enfant", "");
    expect(glucoseWithoutWeight.canValidate).toBe(false);
    expect(glucoseWithoutWeight.validationReason).toMatch(/saisir le poids/i);
  });
});
