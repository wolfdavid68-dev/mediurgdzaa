import {
  calcDoseFromRate,
  calcPedTable,
  calcPrepDoseKg,
  calcPrepOctaplexInr,
  calcPrepPhases,
  calcPrepSufentaIntranasal,
} from "../lib/calc";
import type { Drug } from "../types/data";
import {
  computeAmiklinAdult,
  computeClottafactPediatric,
  computeKclIvl,
  computeKclPediatric,
  computeMeningitisPump,
  computePrepTableCurrentSteps,
  computeRecipeDoseInputValue,
  computeRecipePhaseRows,
  computeRecipeWeightBand,
  type DrugPrep,
  type PrepRecipe,
} from "./PrepBlock.parts";

import {
  formatNumber,
  parseNumber,
  formatMl,
  formatDosePerKgUnit,
  displayableConcentration,
  productPresentationLabel,
  productUnit,
  extractPreparedVolume,
  extractMedicationQuantity,
  extractSingleContainerVolume,
  extractFinalVolumeLabel,
  getPreparationPseSteps,
  getPreparationPseInputConfig,
  inferStepTitle,
  inferStepResult,
  timelineRow,
  phaseTitle,
  volumeRoleFromAction,
  volumeLabel,
  joinRecipeValues,
  displayedVolumeFromResult,
  displayedActionMeasure,
  finalVolumeSummaryFromResult,
  concentrationDescriptor,
  concentrationValue,
  concentrationFromProduct,
  containerCount,
  powderContainerPlan,
  requiredContainersLabel,
  resolveProductDetail,
  phaseCapacityIssue,
} from "./preparation/model/utils";
import type {
  PreparationStep,
  PreparationMetric,
  PreparationControl,
  PreparationMode,
  PreparationModel,
  BuildPreparationModelArgs,
} from "./preparation/model/types";
export type {
  PreparationModel,
  PreparationNumericControl,
  PreparationPopulation,
} from "./preparation/model/types";
export {
  extractPreparedVolume,
  getPreparationPseDefault,
  getPreparationPseSteps,
} from "./preparation/model/utils";
import {
  buildPseMetrics,
  buildSpecializedPseSteps,
  buildStructuredPseSteps,
} from "./preparation/model/pse";

const buildPedSteps = (prep: DrugPrep, weight: string): PreparationStep[] => {
  const result = calcPedTable(prep, weight);
  const kg = Number.parseFloat(weight);
  if (!result) {
    return [
      {
        title: Number.isFinite(kg) && kg > 0 ? "Vérifier la plage pédiatrique" : "Saisir le poids",
        detail: prep.pedTable?.description || "Le calcul dépend du poids de l’enfant.",
        result: Number.isFinite(kg) && kg > 0 ? `${formatNumber(kg)} kg` : "Poids requis",
      },
    ];
  }

  if (result.mode === "inject") {
    return [
      {
        title: "Identifier la préparation",
        detail: result.preparation,
        result:
          result.dose === null
            ? "Conforme"
            : `${formatNumber(result.dose)} ${result.dose_unit || ""}`.trim(),
      },
      {
        title: "Calculer le volume à injecter",
        detail: `${formatNumber(result.vol_inject!)} mL à injecter pour ${formatNumber(result.kg)} kg`,
        result: formatMl(result.vol_inject!),
        volumeRole: "injecter",
      },
      {
        title: "Administrer",
        detail:
          [result.admin_route, result.admin_interval].filter(Boolean).join(" · ") ||
          "Selon protocole",
        result: result.admin_volume ? formatMl(result.admin_volume) : "Selon protocole",
      },
    ];
  }

  return [
    {
      title: "Identifier la préparation",
      detail: result.preparation,
      result:
        result.dose === null
          ? "Conforme"
          : `${formatNumber(result.dose)} ${result.dose_unit || ""}`.trim(),
    },
    {
      title: "Prélever le médicament",
      detail: `${formatNumber(result.vol_med!)} mL calculés pour ${formatNumber(result.kg)} kg`,
      result: formatMl(result.vol_med!),
    },
    {
      title: `Compléter avec ${result.solvant || "le solvant"}`,
      detail: `${formatNumber(result.vol_solvant!)} mL de solvant`,
      result: `Vf ${formatMl(result.volume_final!)}`,
    },
    {
      title: "Administrer",
      detail:
        result.admin ||
        [result.admin_route, result.admin_interval].filter(Boolean).join(" · ") ||
        "Selon protocole",
      result: result.admin_volume ? formatMl(result.admin_volume) : "Selon protocole",
    },
  ];
};

const buildRecipeSteps = (
  drug: Drug,
  prep: DrugPrep,
  recipe: PrepRecipe | null,
  weight: string,
  concentration: string,
  recipeInput: number | null
): PreparationStep[] => {
  if (recipe?.empty) {
    return [
      {
        title: "Préparation non recommandée",
        detail: recipe.note || "Aucune préparation validée pour cette population.",
        result: "Ne pas préparer",
      },
    ];
  }

  const recipeSteps = recipe
    ? [recipe.prelever, recipe.completer].filter((value): value is string => Boolean(value))
    : [];
  const phaseRole = recipe?.calculated_volume_role;
  const phaseKg = Number.parseFloat(weight);
  const recipeConcentration = concentrationDescriptor(
    recipe?.concentration ||
      recipe?.conc_finale ||
      recipe?.rows?.find((row) => /concentration/i.test(row.label))?.value
  );
  const calculationPrep =
    phaseRole && phaseRole !== "prelever" && recipeConcentration
      ? {
          ...prep,
          conc_produit: recipeConcentration.value,
          unite: recipeConcentration.unit,
        }
      : prep;
  const phaseRows = recipe?.phase_doses?.length
    ? computeRecipePhaseRows(
        recipe,
        calculationPrep,
        phaseKg,
        Number.isFinite(phaseKg) && phaseKg > 0 && phaseKg <= 300
      )
    : [];
  const timelineRows = (recipe?.rows || []).filter(timelineRow);
  const choiceRows = (recipe?.rows || []).filter(
    (row) =>
      !row.reference_only &&
      !timelineRow(row) &&
      !/^(?:concentration|produit|solvant|préparation|conditionnement|équivalence|max|volume final|surveillance|appel d'air)$/i.test(
        row.label
      ) &&
      (/\d+(?:[,.]\d+)?\s*(?:µg|ug|mg|g|MUI|UI|mmol|gouttes?)(?:\s*\/\s*(?:kg|h|min))?/i.test(
        row.value
      ) ||
        (/\d+(?:[,.]\d+)?\s*(?:µg|ug|mg|g|MUI|UI|mmol)\b/i.test(row.label) &&
          /\d+(?:[,.]\d+)?\s*(?:mL|min|h)\b/i.test(row.value)))
  );
  const rawSteps = recipe?.etapes?.length
    ? recipe.etapes
    : recipeSteps.length
      ? recipeSteps
      : prep.etapes || [];

  const usesDirectRecipeFields = Boolean(
    recipe && (recipeSteps.length || recipe.rows?.length || recipe.rate_value)
  );
  const productDetail = usesDirectRecipeFields ? resolveProductDetail(drug, prep, recipe) : null;
  const preleverDescribesReconstitution = /reconstitu|\bqsp\b/i.test(recipe?.prelever || "");
  const preleverIsProductPresentation = Boolean(
    recipe?.prelever &&
    !preleverDescribesReconstitution &&
    /^\s*(?:ampoule|flacon)\b/i.test(recipe.prelever)
  );
  const reconstitutionDetail = preleverDescribesReconstitution
    ? prep.etapes?.find((step) => /reconstitu|\bqsp\b/i.test(step)) || recipe?.prelever || ""
    : "";
  const detectedProductConcentration = concentrationFromProduct(
    productDetail || drug.cond?.[0] || ""
  );
  const steps: PreparationStep[] = usesDirectRecipeFields
    ? [
        {
          title: /flacon/i.test(productDetail || "")
            ? "Identifier le flacon"
            : /ampoule/i.test(productDetail || "")
              ? "Identifier l’ampoule"
              : "Identifier le produit",
          detail: productDetail || `${drug.nom} · ${drug.dci}`,
          result:
            detectedProductConcentration === "Conditionnement vérifié" && concentration
              ? displayableConcentration(concentration) ||
                productPresentationLabel(productDetail || drug.cond?.[0] || "")
              : detectedProductConcentration,
        },
        ...(recipe?.prelever &&
        !preleverIsProductPresentation &&
        !(phaseRole === "prelever" && containerCount(recipe.prelever))
          ? [
              {
                title: preleverDescribesReconstitution
                  ? /^\s*(?:flacon\s+reconstitu|reconstituer\b.*\bflacon)/i.test(recipe.prelever)
                    ? "Reconstituer le flacon"
                    : /^\s*ampoule\b/i.test(recipe.prelever)
                      ? "Reconstituer l’ampoule"
                      : "Reconstituer / diluer"
                  : "Prélever",
                detail: reconstitutionDetail || recipe.prelever,
                result: preleverDescribesReconstitution
                  ? extractFinalVolumeLabel(recipe.prelever)
                    ? `Vf ${extractFinalVolumeLabel(recipe.prelever)}`
                    : recipe.prelever.match(/\bavec\s+(\d+(?:[,.]\d+)?)\s*mL\b(?!\s*\/\s*h)/i)
                      ? `${formatMl(
                          parseNumber(
                            recipe.prelever.match(
                              /\bavec\s+(\d+(?:[,.]\d+)?)\s*mL\b(?!\s*\/\s*h)/i
                            )![1]
                          )
                        )} de solvant`
                      : extractSingleContainerVolume(recipe.prelever)
                        ? `Vf ${formatMl(extractSingleContainerVolume(recipe.prelever)!)}`
                        : concentration
                  : extractPreparedVolume(recipe.prelever) ||
                    containerCount(recipe.prelever) ||
                    extractMedicationQuantity(recipe.prelever) ||
                    recipe.tag ||
                    "Selon prescription",
              },
            ]
          : []),
        ...(recipe?.completer
          ? [
              {
                title: /^\s*reconstituer/i.test(recipe.completer)
                  ? /flacon/i.test(productDetail || "")
                    ? "Reconstituer le flacon"
                    : "Reconstituer le produit"
                  : `Compléter avec ${recipe.solvant || prep.solvant || "le solvant prescrit"}`,
                detail: recipe.completer,
                result: extractFinalVolumeLabel(recipe.completer)
                  ? `Vf ${extractFinalVolumeLabel(recipe.completer)}`
                  : "Selon prescription",
              },
            ]
          : []),
      ]
    : rawSteps
        .filter(
          (detail, index) =>
            !recipe?.phase_doses?.length ||
            (index === 0 && /ampoule|flacon|produit/i.test(detail)) ||
            !/\b(?:dose|injecter|administrer|bolus)\b|\b(?:µg|mg|g|UI)\/kg\b/i.test(detail)
        )
        .map((detail, index) => ({
          title: inferStepTitle(detail, index),
          detail,
          result: inferStepResult(detail, index, recipe, concentration),
        }));

  if (recipe?.phase_doses?.length) {
    const phaseSteps = phaseRows.map((phase) => {
      const unit = phase.unit || "mg";
      const isWeightBased = phase.dose_kg !== undefined;
      const dose =
        phase.dose === null
          ? "Poids requis"
          : phase.doseMax !== null && phase.doseMax !== phase.dose
            ? `${formatNumber(phase.dose)}–${formatNumber(phase.doseMax)} ${unit}`
            : `${formatNumber(phase.dose)} ${unit}`;
      const volume = recipe.hide_phase_volume
        ? phase.rate !== null
          ? `${formatNumber(phase.rate)}${phase.rateMax !== null ? `–${formatNumber(phase.rateMax)}` : ""} mL/h`
          : dose
        : phase.rate !== null
          ? `${formatNumber(phase.rate)}${phase.rateMax !== null && phase.rateMax !== phase.rate ? `–${formatNumber(phase.rateMax)}` : ""} mL/h`
          : phase.volume !== null
            ? `${formatNumber(phase.volume)}${phase.volumeMax !== null && phase.volumeMax !== phase.volume ? `–${formatNumber(phase.volumeMax)}` : ""} mL`
            : dose;
      const prescription = isWeightBased
        ? `${formatNumber(phase.dose_kg!)} ${formatDosePerKgUnit(unit)}`
        : volume === dose
          ? "Dose fixe"
          : `Dose fixe · ${dose}`;
      const duration = phase.duree ? ` · ${phase.duree}` : "";
      const maximum =
        phase.max !== undefined && unit === "gouttes"
          ? ` · maximum ${formatNumber(phase.max)} ${unit}`
          : "";
      const doseStep = {
        title: phaseTitle(phase.label, phaseRole),
        detail: `${phaseRole === "prelever" && containerCount(recipe.prelever) ? `${containerCount(recipe.prelever)} · ` : ""}${
          isWeightBased && Number.isFinite(phaseKg) && phaseKg > 0
            ? `${prescription} · ${dose} pour ${formatNumber(phaseKg)} kg${duration}${maximum}`
            : `${prescription}${duration}${maximum}`
        }`,
        result: volume,
        phaseDose: true,
        doseSummary: phase.dose === null ? undefined : dose,
        volumeRole: phaseRole,
      };
      return doseStep;
    });
    const readyDoseSummaries = phaseSteps
      .map((step) => step.doseSummary)
      .filter((value): value is string => Boolean(value));
    const combinedDoseSummary =
      readyDoseSummaries.length === phaseSteps.length
        ? joinRecipeValues(readyDoseSummaries, recipe.phase_relation)
        : null;
    const calculatedSteps =
      recipe.phase_relation === "alternative" && phaseSteps.length > 1
        ? [
            {
              title: phaseTitle("Choisir l’indication", phaseRole),
              detail: phaseSteps
                .map((step, index) => `${phaseRows[index].label} : ${step.detail}`)
                .join(" · "),
              result: joinRecipeValues(
                phaseSteps.map((step) => step.result),
                "alternative"
              )!,
              phaseDose: true,
              doseSummary: combinedDoseSummary || undefined,
              volumeRole: phaseRole,
            },
          ]
        : phaseSteps
            .filter(
              (_step, index) =>
                recipe.phase_relation !== "breakdown" ||
                !/dose totale/i.test(phaseRows[index].label)
            )
            .map((step) => ({
              ...step,
              doseSummary:
                recipe.phase_relation === "breakdown"
                  ? combinedDoseSummary || undefined
                  : step.doseSummary,
            }));
    const containerLabel = requiredContainersLabel(drug, recipe, phaseRows);
    if (containerLabel) {
      steps.splice(Math.min(1, steps.length), 0, {
        title: /flacon/i.test(containerLabel) ? "Prévoir les flacons" : "Prévoir les ampoules",
        detail: productDetail || drug.cond?.[0] || "Conditionnement disponible",
        result: containerLabel,
      });
    }
    const phaseStepsAreAdministration =
      phaseRole === "injecter" ||
      phaseRole === "perfuser" ||
      phaseRole === "administrer" ||
      phaseRole === "programmer";
    const lastPreparationIndex = steps.reduce(
      (lastIndex, step, index) =>
        /identifier|reconstituer|prévoir|prélever|compléter|diluer|préparer/i.test(step.title)
          ? index
          : lastIndex,
      -1
    );
    const reconstitutionIndex = steps.findIndex((step) => /reconstituer/i.test(step.title));
    const phaseInsertIndex = phaseStepsAreAdministration
      ? lastPreparationIndex >= 0
        ? lastPreparationIndex + 1
        : steps.length
      : phaseRole === "prelever"
        ? reconstitutionIndex >= 0
          ? reconstitutionIndex + 1
          : Math.min(containerLabel ? 2 : 1, steps.length)
        : reconstitutionIndex >= 0
          ? reconstitutionIndex + 1
          : 1;
    steps.splice(Math.min(phaseInsertIndex, steps.length), 0, ...calculatedSteps);
  }

  if (recipe?.rate_value && !steps.some((step) => step.result === recipe.rate_value)) {
    steps.push({
      title: recipe.rate_label || "Programmer / administrer",
      detail: recipe.rate_value,
      result: recipe.rate_value,
    });
  }

  if (timelineRows.length) {
    for (const row of timelineRows) {
      if (steps.some((step) => step.detail.includes(row.value) || step.result === row.value))
        continue;
      const timelineStep = {
        title: row.label,
        detail: `${row.label} : ${row.value}`,
        result: row.value,
      };
      const isPreparationTransfer = /prélever|transférer/i.test(row.label);
      const completionIndex = steps.findIndex((step) => /^(?:compléter|diluer)/i.test(step.title));
      if (isPreparationTransfer && completionIndex >= 0) {
        steps.splice(completionIndex, 0, timelineStep);
      } else {
        steps.push(timelineStep);
      }
    }
  }

  const displayedChoiceRows = recipe?.phase_doses?.length
    ? choiceRows.filter(
        (row) =>
          /\d+(?:[,.]\d+)?\s*(?:µg|ug|mg|g|MUI|UI)\b/i.test(row.label) &&
          /\d+(?:[,.]\d+)?\s*mL\b/i.test(row.value)
      )
    : choiceRows;
  if (displayedChoiceRows.length) {
    const choiceDetail = displayedChoiceRows
      .map((row) => `${row.label} : ${row.value}`)
      .join(" · ");
    if (!steps.some((step) => step.detail === choiceDetail)) {
      const choiceStep = {
        title:
          displayedChoiceRows.length > 1
            ? "Choisir l’indication / la dose"
            : displayedChoiceRows[0].label,
        detail: choiceDetail,
        result: displayedChoiceRows.map((row) => row.value).join(" ou "),
      };
      const onlyConditionalChoices = displayedChoiceRows.every((row) =>
        /^(?:si\b|rappel|répéter)/i.test(row.label)
      );
      const firstAdministrationIndex = steps.findIndex((step) =>
        /injecter|administrer|perfuser|programmer|flush|rincer|nébuliser/i.test(step.title)
      );
      if (!onlyConditionalChoices && firstAdministrationIndex >= 0) {
        steps.splice(firstAdministrationIndex, 0, choiceStep);
      } else {
        steps.push(choiceStep);
      }
    }
  }

  for (const detail of recipe?.etapes || []) {
    if (
      !/^\s*(?:administrer|perfuser|rincer|flush)\b/i.test(detail) &&
      !/^\s*(?:IVD|IVL|IM|SC|IN|PO|PSE)\b.*\b(?:administrer|injecter|perfuser)\b/i.test(detail)
    )
      continue;
    if (steps.some((step) => step.detail === detail || step.detail.includes(detail))) continue;
    const inferredTitle = inferStepTitle(detail, steps.length);
    const inferredRole = volumeRoleFromAction(inferredTitle);
    if (inferredRole && steps.some((step) => volumeRoleFromAction(step.title) === inferredRole)) {
      continue;
    }
    steps.push({
      title: inferredTitle,
      detail,
      result: inferStepResult(detail, steps.length, recipe, concentration),
    });
  }

  if (recipe?.weight_bands?.length) {
    const kg = Number.parseFloat(weight);
    const result = computeRecipeWeightBand(
      recipe,
      prep,
      kg,
      Number.isFinite(kg) && kg > 0 && kg <= 300
    );
    if (result) {
      const unit = result.band?.unit || prep.unite || "mg";
      steps.splice(Math.min(1, steps.length), 0, {
        title: `${result.band?.label || "Dose selon le poids"} — calcul au poids`,
        detail:
          result.dose === null
            ? "Poids requis"
            : `${formatNumber(result.dose)} ${unit} pour ${formatNumber(kg)} kg`,
        result:
          result.volume === null
            ? result.dose === null
              ? "Poids requis"
              : `${formatNumber(result.dose)} ${unit}`
            : formatMl(result.volume),
      });
    }
  } else if (!recipe && prep.dose_kg) {
    const preparedConcentration = concentrationValue(prep.conc_finale);
    const calculated = calcPrepDoseKg(
      preparedConcentration ? { ...prep, conc_produit: preparedConcentration } : prep,
      weight
    );
    if (calculated) {
      const dose = calculated.doseMax
        ? `${formatNumber(calculated.dose)}–${formatNumber(calculated.doseMax)} ${calculated.unite || "mg"}`
        : `${formatNumber(calculated.dose)} ${calculated.unite || "mg"}`;
      const volume = calculated.volMax
        ? `${formatNumber(calculated.volMin)}–${formatNumber(calculated.volMax)} mL`
        : formatMl(calculated.volMin);
      steps.splice(Math.min(1, steps.length), 0, {
        title: "Calculer la dose au poids",
        detail: `${dose} pour ${formatNumber(calculated.kg)} kg`,
        result: volume,
      });
    }
  }

  if (recipe?.dose_based_dilution) {
    const inputDose =
      recipe.dose_based_dilution.source === "dose_input" ||
      (!recipe.phase_doses?.length && recipe.dose_input_default !== undefined)
        ? computeRecipeDoseInputValue(recipe, recipeInput === null ? "" : String(recipeInput))
        : null;
    const kg = Number.parseFloat(weight);
    const phase =
      inputDose === null
        ? computeRecipePhaseRows(recipe, prep, kg, Number.isFinite(kg) && kg > 0 && kg <= 300)[0]
        : null;
    const dose = inputDose ?? phase?.dose ?? null;
    const doseMax = inputDose === null ? (phase?.doseMax ?? dose) : dose;
    if (dose !== null && doseMax !== null) {
      const rule = recipe.dose_based_dilution;
      const below = (value: number) =>
        rule.strict_below ? value < rule.threshold : value <= rule.threshold;
      const belowLabel = rule.strict_below ? `< ${rule.threshold} mg` : `≤ ${rule.threshold} mg`;
      const aboveLabel = rule.strict_below ? `≥ ${rule.threshold} mg` : `> ${rule.threshold} mg`;
      const dilution =
        phase?.doseMax !== null && inputDose === null && below(dose) && !below(doseMax)
          ? `${rule.below_or_equal} si ${belowLabel} / ${rule.above} si ${aboveLabel}`
          : !below(doseMax)
            ? rule.above
            : rule.below_or_equal;
      const firstAdministrationIndex = steps.findIndex((step) =>
        /injecter|administrer|perfuser|programmer|rincer|répéter/i.test(step.title)
      );
      steps.splice(firstAdministrationIndex >= 0 ? firstAdministrationIndex : steps.length, 0, {
        title: rule.label || "Choisir la dilution",
        detail: `Dilution sélectionnée d’après la dose ${formatNumber(dose)}${doseMax !== dose ? `–${formatNumber(doseMax)}` : ""} mg`,
        result: dilution,
      });
    }
  }

  const rinseNote = recipe?.notes?.find((note) => /rincer|flush/i.test(note));
  if (rinseNote && !steps.some((step) => /rincer|flush/i.test(`${step.title} ${step.detail}`))) {
    steps.push({
      title: "Rincer",
      detail: rinseNote,
      result: "Après injection",
    });
  }

  if (steps.length) return steps;
  return [
    {
      title: "Identifier le produit",
      detail: drug.cond?.[0] || `${drug.nom} · ${drug.dci}`,
      result: concentration || drug.nom,
    },
    {
      title: "Vérifier la prescription",
      detail: "Se référer à la posologie et au protocole actif.",
      result: "Prescription requise",
    },
  ];
};

type SpecialRecipeResult = {
  steps: PreparationStep[];
  requiresUserInput: boolean;
  validationReason?: string;
};

const buildSpecialRecipeSteps = (
  drug: Drug,
  prep: DrugPrep,
  recipe: PrepRecipe | null,
  weight: string,
  recipeInput: number | null,
  ageBand: "lt6" | "gte6" | null
): SpecialRecipeResult | null => {
  const kg = Number.parseFloat(weight);
  const validKg = Number.isFinite(kg) && kg > 0 && kg <= 300;

  if (drug.id === 46 && recipe?.population === "enfant") {
    if (!validKg) {
      return {
        requiresUserInput: true,
        validationReason: "Saisir le poids pour calculer le glucose pédiatrique",
        steps: [
          {
            title: "Saisir le poids",
            detail: "La dose de glucose et la dilution à G10% dépendent du poids.",
            result: "Poids requis",
          },
        ],
      };
    }

    const doseLow = +(kg * 0.3).toFixed(1);
    const doseHigh = +(kg * 0.5).toFixed(1);
    const glucose30Low = +(doseLow / 0.3).toFixed(1);
    const glucose30High = +(doseHigh / 0.3).toFixed(1);
    const finalLow = +(doseLow / 0.1).toFixed(1);
    const finalHigh = +(doseHigh / 0.1).toFixed(1);
    const waterLow = +(finalLow - glucose30Low).toFixed(1);
    const waterHigh = +(finalHigh - glucose30High).toFixed(1);
    const ampoulesLow = Math.ceil(glucose30Low / 10);
    const ampoulesHigh = Math.ceil(glucose30High / 10);
    const dose = `${formatNumber(doseLow)}–${formatNumber(doseHigh)} g`;
    const productVolume = `${formatNumber(glucose30Low)}–${formatNumber(glucose30High)} mL`;
    const waterVolume = `${formatNumber(waterLow)}–${formatNumber(waterHigh)} mL`;
    const finalVolume = `${formatNumber(finalLow)}–${formatNumber(finalHigh)} mL`;
    const ampoules =
      ampoulesLow === ampoulesHigh
        ? `${ampoulesLow} ampoule${ampoulesLow > 1 ? "s" : ""} de 3 g/10 mL`
        : `${ampoulesLow}–${ampoulesHigh} ampoules de 3 g/10 mL`;

    return {
      requiresUserInput: false,
      steps: [
        {
          title: "Identifier l’ampoule",
          detail: drug.cond?.[0] || "Ampoule de glucose 30% 3 g/10 mL",
          result: "0,3 g/mL",
        },
        {
          title: "Calculer la dose",
          detail: `0,3–0,5 g/kg pour ${formatNumber(kg)} kg`,
          result: dose,
          phaseDose: true,
          doseSummary: dose,
        },
        {
          title: "Prévoir les ampoules",
          detail: "Calculé sur la borne basse et la borne haute de la prescription",
          result: ampoules,
        },
        {
          title: "Prélever le G30%",
          detail: `${dose} à partir du produit à 0,3 g/mL`,
          result: productVolume,
          volumeRole: "prelever",
        },
        {
          title: "Diluer à G10%",
          detail: `Ajouter ${waterVolume} d’eau PPI (2 volumes d’eau pour 1 volume de G30%)`,
          result: `Vf ${finalVolume}`,
        },
        {
          title: "Administrer le G10%",
          detail: "Administrer en IV lente selon le protocole ; ne pas injecter le G30% pur",
          result: finalVolume,
          volumeRole: "administrer",
        },
        {
          title: "Rincer",
          detail: "Produit veinotoxique : bien rincer après l’administration",
          result: "Après injection",
        },
      ],
    };
  }

  if (drug.id === 13 && recipe?.mode === "ped-ivd") {
    const steps = buildPedSteps(prep, weight);
    const requiresUserInput = steps.some((step) => /poids requis/i.test(step.result));
    return {
      steps,
      requiresUserInput,
      validationReason: requiresUserInput
        ? "Saisir le poids pour calculer l’ACR pédiatrique"
        : undefined,
    };
  }

  if (drug.id === 13 && recipe?.mode === "ped-im") {
    const doseMg = validKg ? Math.min(kg * 0.01, 0.5) : null;
    return {
      requiresUserInput: doseMg === null,
      validationReason:
        doseMg === null ? "Saisir le poids pour calculer l’adrénaline IM" : undefined,
      steps:
        doseMg === null
          ? [
              {
                title: "Saisir le poids",
                detail: "Anaphylaxie : 0,01 mg/kg IM, maximum 0,5 mg.",
                result: "Poids requis",
              },
            ]
          : [
              {
                title: "Identifier l’ampoule",
                detail: "Adrénaline 5 mg/5 mL (1 mg/mL)",
                result: "1 mg/mL",
              },
              {
                title: "Calculer le volume à injecter",
                detail: `0,01 mg/kg pour ${formatNumber(kg)} kg, maximum 0,5 mg`,
                result: `${formatMl(+doseMg.toFixed(2))} = ${formatNumber(doseMg)} mg`,
                volumeRole: "injecter",
              },
              {
                title: "Injecter",
                detail: "Face antérieure de cuisse",
                result: "IM",
              },
            ],
    };
  }

  if (recipe?.sufenta_intranasal) {
    const result = calcPrepSufentaIntranasal(weight);
    return {
      requiresUserInput: !result,
      validationReason: result ? undefined : "Saisir le poids pour calculer la voie intranasale",
      steps: result
        ? [
            {
              title: "Prélever la dose pleine",
              detail: `Sufentanil pur 50 µg/mL · 0,3 µg/kg pour ${formatNumber(result.kg)} kg`,
              result: `${formatNumber(result.dose)} µg = ${formatMl(result.volume)}`,
            },
            {
              title: "Administrer dans la narine n°1",
              detail: "Répartition issue du calculateur de l’application principale",
              result: formatMl(result.narine1),
            },
            {
              title: "Administrer dans la narine n°2",
              detail: "Uniquement si le volume total dépasse le volume de la première narine",
              result: result.narine2 === null ? "Non nécessaire" : formatMl(result.narine2),
            },
            {
              title: "Rappel si nécessaire",
              detail: "Demi-dose à 0,15 µg/kg selon protocole",
              result: `${formatNumber(result.demiDose)} µg = ${formatMl(result.demiVolume)}`,
            },
          ]
        : [
            {
              title: "Saisir le poids",
              detail: "La dose intranasale et sa répartition dépendent du poids.",
              result: "Poids requis",
            },
          ],
    };
  }

  if (!recipe && prep.phases?.length) {
    const phases = calcPrepPhases(prep, weight);
    const containerVolume = extractSingleContainerVolume(drug.cond?.[0]) || 0;
    const phaseContainerLabels = phases?.map((phase) => {
      const count = phase.vol && containerVolume ? Math.ceil(phase.vol / containerVolume) : null;
      return count
        ? `${phase.label} : ${count} ampoule${count > 1 ? "s" : ""}`
        : `${phase.label} : à confirmer`;
    });
    return {
      requiresUserInput: !phases,
      validationReason: phases ? undefined : "Saisir le poids pour calculer les quatre phases",
      steps: phases
        ? [
            {
              title: "Identifier le produit",
              detail: drug.cond?.[0] || prep.etapes?.[0] || `${drug.nom} · ${drug.dci}`,
              result: prep.conc_produit
                ? `${formatNumber(prep.conc_produit)} ${prep.unite || "mg"}/mL`
                : "Conditionnement vérifié",
            },
            {
              title: "Prévoir les ampoules",
              detail: drug.cond?.[0] || "Conditionnement à confirmer",
              result: phaseContainerLabels?.join(" · ") || "À confirmer",
            },
            ...phases.map((phase) => ({
              title: `${phase.label} — préparer puis perfuser`,
              detail: `${formatNumber(phase.dose)} mg${phase.vol === null ? "" : ` = ${formatMl(phase.vol)}`} dans ${formatNumber(phase.solvantVol || 0)} mL de ${prep.solvant || "solvant"}`,
              result: `Vf ${formatMl(phase.solvantVol || 0)} · Vi ${phase.vol === null ? "à calculer" : formatMl(phase.vol)} · ${phase.duree}`,
              phaseDose: true,
              doseSummary: `${formatNumber(phase.dose)} mg`,
              volumeRole: "prelever" as const,
            })),
          ]
        : [
            {
              title: "Saisir le poids",
              detail: "Chaque phase est calculée en mg/kg.",
              result: "Poids requis",
            },
          ],
    };
  }

  if (recipe?.use_table_row) {
    const rows = computePrepTableCurrentSteps(prep, kg, validKg);
    return {
      requiresUserInput: !rows,
      validationReason: rows
        ? undefined
        : validKg
          ? "Poids absent de la table de préparation"
          : "Saisir le poids pour consulter la table de préparation",
      steps: rows
        ? rows.map((detail, index) => ({
            title: inferStepTitle(detail, index),
            detail,
            result:
              extractFinalVolumeLabel(detail) ||
              extractPreparedVolume(detail) ||
              detail.match(/\d+(?:[,.]\d+)?\s*(?:mL\/h|mg\/min|min)\b/i)?.[0] ||
              "Table vérifiée",
          }))
        : [
            {
              title: "Sélectionner un poids de la table",
              detail: "Aucun arrondi automatique n’est appliqué par l’application principale.",
              result: validKg ? `${formatNumber(kg)} kg absent` : "Poids requis",
            },
          ],
    };
  }

  if (drug.id === 30 && recipe?.population === "adulte" && recipe.dose_input_unit === "mg/h") {
    const prescribedRate = recipeInput;
    const vialCount = prescribedRate === null ? null : Math.ceil(prescribedRate * 4);
    return {
      requiresUserInput: prescribedRate === null || vialCount === null,
      validationReason:
        prescribedRate === null ? "Confirmer le débit de Glucagen prescrit" : undefined,
      steps:
        prescribedRate === null || vialCount === null
          ? []
          : [
              {
                title: "Identifier le kit",
                detail: drug.cond?.[0] || "Flacon de Glucagen 1 mg",
                result: "1 mg/mL après reconstitution",
              },
              {
                title: "Prévoir les flacons",
                detail: `Préparation couvrant 4 h à ${formatNumber(prescribedRate)} mg/h`,
                result: `${vialCount} flacon${vialCount > 1 ? "s" : ""} de 1 mg`,
              },
              {
                title: "Reconstituer les flacons",
                detail: "Utiliser pour chaque flacon la seringue de solvant fournie",
                result: `${formatMl(vialCount)} de produit`,
              },
              {
                title: "Compléter avec G5%",
                detail: "Regrouper la dose de 4 h puis compléter la seringue",
                result: "Vf 24 mL",
              },
              {
                title: "Programmer le PSE",
                detail: `${formatNumber(prescribedRate)} mg/h pendant 4 h`,
                result: "6 mL/h",
                volumeRole: "programmer" as const,
              },
            ],
    };
  }

  if (drug.id === 30 && recipe?.population === "enfant") {
    const selected = validKg
      ? recipe.rows?.find((row) => (kg < 25 ? /^<\s*25\s*kg/i : /^≥\s*25\s*kg/i).test(row.label))
      : null;
    const dose = selected?.value.match(/(\d+(?:[,.]\d+)?)\s*mg\b/i)?.[1];
    const volume = dose && prep.conc_produit ? parseNumber(dose) / prep.conc_produit : null;
    return {
      requiresUserInput: !selected || volume === null,
      validationReason: selected ? undefined : "Saisir le poids pour choisir la dose de Glucagen",
      steps: selected
        ? [
            {
              title: "Identifier le kit",
              detail: drug.cond?.[0] || "Kit Glucagen 1 mg",
              result: "1 mg/mL après reconstitution",
            },
            {
              title: "Reconstituer le flacon",
              detail: "Utiliser la seringue de solvant fournie",
              result: "Vf 1 mL",
            },
            {
              title: "Administrer selon le poids",
              detail: `${selected.label} : ${selected.value}`,
              result: volume === null ? "Poids requis" : formatMl(volume),
              phaseDose: true,
              doseSummary: selected.value,
              volumeRole: "administrer" as const,
            },
          ]
        : [
            {
              title: "Saisir le poids",
              detail: "Le seuil pédiatrique est fixé à 25 kg.",
              result: "Poids requis",
            },
          ],
    };
  }

  if (drug.id === 45 && recipe?.dose_based_dilution?.source === "dose_input") {
    const dose = recipeInput;
    const presentations = (drug.cond || [])
      .map((condition) => {
        const match = condition.match(/(\d+(?:[,.]\d+)?)\s*(mg|g)\b/i);
        if (!match) return null;
        const amountMg =
          match[2].toLowerCase() === "g" ? parseNumber(match[1]) * 1000 : parseNumber(match[1]);
        return { condition, amountMg };
      })
      .filter(
        (presentation): presentation is { condition: string; amountMg: number } =>
          presentation !== null
      )
      .sort((a, b) => a.amountMg - b.amountMg);
    const selectedPresentation =
      dose === null
        ? null
        : presentations.find((presentation) => presentation.amountMg >= dose) || null;
    const isIvd = dose !== null && dose <= recipe.dose_based_dilution.threshold;
    return {
      requiresUserInput: dose === null || !selectedPresentation,
      validationReason:
        dose === null
          ? "Confirmer la dose de Solumédrol à préparer"
          : selectedPresentation
            ? undefined
            : "Aucun conditionnement disponible pour cette dose",
      steps:
        dose === null || !selectedPresentation
          ? []
          : [
              {
                title: "Identifier le flacon",
                detail: selectedPresentation.condition,
                result: selectedPresentation.condition,
              },
              {
                title: "Confirmer la dose prescrite",
                detail: isIvd
                  ? "Dose ≤ 120 mg : administration IVD"
                  : "Dose > 120 mg : perfusion IVL",
                result: `${formatNumber(dose)} mg`,
              },
              {
                title: "Reconstituer le flacon",
                detail: isIvd
                  ? "Reconstituer avec 2 mL d’eau PPI"
                  : "Reconstituer avec le solvant fourni",
                result: isIvd ? "2 mL de solvant" : "Selon le conditionnement",
              },
              isIvd
                ? {
                    title: "Compléter avec NaCl 0,9%",
                    detail: "Diluer la dose reconstituée jusqu’à un volume final de 10 mL",
                    result: "Vf 10 mL",
                  }
                : {
                    title: "Diluer avec NaCl 0,9%",
                    detail: "Transférer la dose reconstituée dans une poche de 100 mL",
                    result: "Vf 100 mL",
                  },
              isIvd
                ? {
                    title: "Injecter en IVD",
                    detail: "Administrer selon la prescription et surveiller la voie",
                    result: "10 mL",
                    volumeRole: "injecter" as const,
                  }
                : {
                    title: "Perfuser en IVL",
                    detail: "Administrer sur 20–30 min",
                    result: "100 mL",
                    volumeRole: "perfuser" as const,
                  },
            ],
    };
  }

  if (recipe?.kcl_ivl) {
    const result = computeKclIvl(recipe, recipeInput === null ? "" : String(recipeInput));
    return {
      requiresUserInput: !result,
      validationReason: result ? undefined : "Confirmer la dose de KCl à préparer",
      steps: result
        ? [
            {
              title: "Confirmer la dose prescrite",
              detail: "Préparation IVL adulte · jamais en IVD directe",
              result: `${formatNumber(result.dose)} g`,
            },
            { title: "Prélever le KCl", detail: result.prelever, result: result.prelever },
            {
              title: "Diluer avec NaCl 0,9%",
              detail: `Volume de dilution défini par la dose de ${formatNumber(result.dose)} g`,
              result: `Vf ${formatMl(result.finalVolume)}`,
            },
            {
              title: "Programmer la perfusion",
              detail: "Surveillance ECG obligatoire",
              result: `Max ${result.maxRate}`,
            },
          ]
        : [],
    };
  }

  if (recipe?.kcl_pediatric) {
    const result = computeKclPediatric(
      recipe,
      recipeInput === null ? "" : String(recipeInput),
      kg,
      validKg
    );
    return {
      requiresUserInput: !result,
      validationReason: result ? undefined : "Saisir le poids et confirmer la dose cible de KCl",
      steps: result
        ? [
            {
              title: "Calculer la dose horaire",
              detail: `${formatNumber(result.targetDose)} mmol/kg/h pour ${formatNumber(result.kg)} kg`,
              result: `${formatNumber(result.mmol)} mmol/h`,
            },
            {
              title: "Prélever le KCl",
              detail: "KCl 1 g/10 mL ≈ 1,34 mmol/mL",
              result: formatMl(result.productMl),
            },
            {
              title: "Diluer avec NaCl 0,9%",
              detail: `Respecter la limite VVP de ${result.vvpLimit}`,
              result: `Vf ≥ ${formatMl(result.minFinalMl)}`,
            },
          ]
        : [],
    };
  }

  if (recipe?.clottafact_pediatric) {
    const result = computeClottafactPediatric(recipe, kg, validKg);
    const administration = recipe.rows?.find((row) => /perfuser|administrer/i.test(row.label));
    return {
      requiresUserInput: !result,
      validationReason: result ? undefined : "Saisir le poids pour calculer Clottafact",
      steps: result
        ? [
            {
              title: "Calculer la dose",
              detail: `70 mg/kg pour ${formatNumber(result.kg)} kg`,
              result: `${formatNumber(result.doseMg)} mg = ${formatNumber(result.doseG)} g`,
            },
            {
              title: "Reconstituer",
              detail: "Flacon de 1,5 g selon le protocole principal",
              result: `${result.flacons} flacon${result.flacons > 1 ? "s" : ""} de 1,5 g`,
            },
            ...(administration
              ? [
                  {
                    title: administration.label,
                    detail: administration.value,
                    result: administration.value,
                  },
                ]
              : []),
          ]
        : [],
    };
  }

  if (recipe?.amiklin_adult) {
    const result = computeAmiklinAdult(recipe, prep, kg, validKg);
    return {
      requiresUserInput: !result,
      validationReason: result ? undefined : "Saisir le poids pour calculer Amiklin",
      steps: result
        ? [
            {
              title: "Calculer la plage de dose",
              detail: `${formatNumber(result.low.dose)}${result.high ? `–${formatNumber(result.high.dose)}` : ""} mg pour ${formatNumber(result.kg)} kg`,
              result: `${formatNumber(result.low.dose)}${result.high ? `–${formatNumber(result.high.dose)}` : ""} mg`,
            },
            {
              title: "Préparer la dose basse",
              detail: result.low.plan,
              result: result.low.plan,
            },
            ...(result.high
              ? [
                  {
                    title: "Préparer la dose haute",
                    detail: result.high.plan,
                    result: result.high.plan,
                  },
                ]
              : []),
            {
              title: "Compléter avec G5%",
              detail: "Dilution choisie d’après la dose calculée",
              result:
                result.finalVolume === null
                  ? "250 ou 500 mL selon la dose"
                  : `Vf ${formatMl(result.finalVolume)}`,
            },
            { title: "Perfuser", detail: "Administration IVL adulte", result: "30 min" },
          ]
        : [],
    };
  }

  if (recipe?.amoxicilline_meningee_pump || recipe?.claforan_meningee_pump) {
    const result = computeMeningitisPump(recipe, recipeInput === null ? "" : String(recipeInput));
    const preparedDoseG = result?.prep.match(/^(\d+(?:[,.]\d+)?)\s*g\b/i)?.[1];
    const containerPlan = preparedDoseG
      ? powderContainerPlan(drug, parseNumber(preparedDoseG))
      : null;
    return {
      requiresUserInput: !result,
      validationReason: result ? undefined : "Confirmer la dose journalière de la pompe",
      steps: result
        ? [
            {
              title: "Confirmer la dose journalière",
              detail:
                result.requestedDose === result.dose
                  ? "Ligne exacte de la table principale"
                  : `Ligne la plus proche de ${formatNumber(result.requestedDose)} g/j`,
              result: `${formatNumber(result.dose)} g/j`,
            },
            ...(containerPlan
              ? [
                  {
                    title: "Prévoir les flacons",
                    detail: (drug.cond || []).join(" · "),
                    result: containerPlan,
                  },
                ]
              : []),
            { title: "Préparer la pompe", detail: result.prep, result: result.prep },
            {
              title: "Programmer la pompe",
              detail: "Débit issu de la table de l’application principale, sans interpolation",
              result: `${formatNumber(result.rate)} mL/h`,
            },
          ]
        : [],
    };
  }

  if ((drug.id === 74 || drug.id === 75) && recipe?.population === "enfant") {
    const branchPattern = ageBand === "lt6" ? /^<\s*6\s*ans/i : /^≥\s*6\s*ans/i;
    const selected = ageBand ? recipe.rows?.find((row) => branchPattern.test(row.label)) : null;
    const administration = recipe.rows?.find((row) => /administr/i.test(row.label));
    const selectedDose = selected?.value.match(/^(\d+(?:[,.]\d+)?)\s*mg\b/i)?.[1];
    const administrationVolume =
      selectedDose && prep.conc_produit
        ? formatMl(parseNumber(selectedDose) / prep.conc_produit)
        : "Selon présentation";
    return {
      requiresUserInput: !selected,
      validationReason: selected ? undefined : "Choisir la tranche d’âge de l’enfant",
      steps: selected
        ? [
            {
              title: `Préparer pour ${selected.label}`,
              detail: selected.value,
              result: selected.value,
              phaseDose: true,
              doseSummary: selected.value,
            },
            {
              title: "Prélever le produit",
              detail: `${selected.value} avec le conditionnement identifié`,
              result: administrationVolume,
            },
            {
              title: `Compléter avec ${prep.solvant || "NaCl 0,9%"}`,
              detail: "Associer le bronchodilatateur prévu par le protocole",
              result: prep.volume_final ? `Vf ${formatMl(prep.volume_final)}` : "Selon protocole",
            },
            ...(administration
              ? [
                  {
                    title: administration.label,
                    detail: administration.value,
                    result: prep.volume_final ? formatMl(prep.volume_final) : administration.value,
                    volumeRole: "administrer" as const,
                  },
                ]
              : []),
          ]
        : [
            {
              title: "Choisir la tranche d’âge",
              detail: "Le poids ne permet pas de déduire automatiquement l’âge.",
              result: "Âge requis",
            },
          ],
    };
  }

  return null;
};

export const buildPreparationModel = ({
  drug,
  prep,
  pse,
  population,
  weight,
  recipeIndex,
  pseInput,
  recipeInput = null,
  ageBand = null,
  monitoringLabel,
}: BuildPreparationModelArgs): PreparationModel => {
  const kg = Number.parseFloat(weight);
  const validWeight = Number.isFinite(kg) && kg > 0 && kg <= 300;
  const blockedByWeight = Boolean(
    population === "enfant" &&
    prep?.display_below_kg !== undefined &&
    (!validWeight || kg >= Number(prep.display_below_kg))
  );
  // La donnée principale indique explicitement « Non établi » chez l’enfant.
  // Cette restriction reste liée au médicament, elle ne doit pas être inférée
  // génériquement depuis la présence d’une recette adulte non populationnée.
  const blockedByPopulation = drug.id === 51 && population === "enfant";
  const pediatricTable = Boolean(prep?.pedTable && population === "enfant" && !blockedByWeight);
  const pediatricAdrenaline = Boolean(drug.id === 13 && pediatricTable);
  const pediatricTableOnly = pediatricTable && !pediatricAdrenaline;
  const pediatricAdrenalineRecipes: PrepRecipe[] = pediatricAdrenaline
    ? [
        {
          titre: "ACR pédiatrique",
          mode: "ped-ivd",
          population: "enfant",
          tag: "10 µg/kg IVD",
        },
        {
          titre: "Anaphylaxie IM",
          mode: "ped-im",
          population: "enfant",
          tag: "0,01 mg/kg IM",
        },
        {
          titre: "PSR / PSE enfant",
          mode: "ped-pse",
          population: "enfant",
          tag: "0,2 mg/mL",
          prelever: "2 ampoules 5 mg/5 mL (= 10 mg/10 mL)",
          completer: "à 50 mL avec G5%",
          concentration: "0,2 mg/mL",
        },
      ]
    : [];
  const matchingRecipes =
    prep && !pediatricTableOnly && !blockedByWeight && !blockedByPopulation
      ? pediatricAdrenaline
        ? pediatricAdrenalineRecipes
        : (prep.preparations || []).filter(
            (recipe) => !recipe.population || recipe.population === population
          )
      : [];
  const pseEnabled = Boolean(pse && !pse.hideBlock);
  const hasPseRecipe = matchingRecipes.some(
    (recipe) => recipe.mode === "pse" || /pse|psr|pompe/i.test(recipe.titre || "")
  );
  const syntheticPseRecipe: PrepRecipe | null =
    prep &&
    !pediatricTableOnly &&
    !blockedByWeight &&
    !blockedByPopulation &&
    pseEnabled &&
    !hasPseRecipe &&
    population === "adulte"
      ? {
          titre: "Débit PSE",
          mode: "pse",
          tag: pse?.tag || `${pse?.min}–${pse?.max} ${pse?.unite}`,
          notes: prep.notes,
        }
      : null;
  const recipes = syntheticPseRecipe ? [...matchingRecipes, syntheticPseRecipe] : matchingRecipes;
  const hasMatchingRecipe = !prep?.preparations?.length || recipes.length > 0;
  const hasPreparation = Boolean(
    prep && !blockedByWeight && !blockedByPopulation && (pediatricTableOnly || hasMatchingRecipe)
  );
  const activeRecipe = hasPreparation && recipes.length ? recipes[recipeIndex] || recipes[0] : null;
  const activeRecipeInput =
    recipeInput ??
    (activeRecipe?.dose_input_default !== undefined ? activeRecipe.dose_input_default : null);

  const isPse = Boolean(
    !activeRecipe?.empty &&
    pseEnabled &&
    !pediatricTableOnly &&
    ((activeRecipe &&
      (activeRecipe.mode === "pse" ||
        activeRecipe.mode === "ped-pse" ||
        /pse|psr|pompe/i.test(activeRecipe.titre || ""))) ||
      (!activeRecipe && hasPreparation))
  );

  const concentration =
    activeRecipe?.concentration ||
    activeRecipe?.conc_finale ||
    activeRecipe?.rows?.find((row) => /concentration/i.test(row.label))?.value ||
    prep?.conc_finale ||
    (prep?.conc_produit
      ? `${formatNumber(prep.conc_produit)} ${productUnit(prep)}/mL`
      : drug.cond?.[0] || "Produit vérifié");

  const fallbackPosology =
    (population === "enfant" ? drug.poso?.p?.[0] : drug.poso?.a?.[0]) ||
    drug.poso?.a?.[0] ||
    drug.poso?.p?.[0] ||
    "Selon prescription";

  const modes: PreparationMode[] = blockedByWeight
    ? [
        {
          title: "Préparation non applicable",
          detail: `Réservée aux patients < ${prep?.display_below_kg} kg`,
        },
      ]
    : pediatricTableOnly
      ? [{ title: "Préparation pédiatrique", detail: prep?.pedTable?.titre || "Calcul au poids" }]
      : recipes.length
        ? recipes.map((recipe, index) => ({
            title: recipe.titre || `Préparation ${index + 1}`,
            detail: recipe.empty
              ? recipe.note || "Non recommandée"
              : recipe.tag || recipe.rate_label || recipe.note || "Protocole actif",
          }))
        : [
            {
              title: hasPreparation
                ? pseEnabled
                  ? "Préparation / PSE"
                  : population === "enfant"
                    ? "Pédiatrique"
                    : "Adulte"
                : "Référence uniquement",
              detail: hasPreparation
                ? prep?.conc_finale || prep?.duree || fallbackPosology
                : "Référence clinique uniquement",
            },
          ];

  const specialRecipe =
    hasPreparation && prep
      ? buildSpecialRecipeSteps(drug, prep, activeRecipe, weight, activeRecipeInput, ageBand)
      : null;
  const pediatricTableResult = pediatricTableOnly && prep ? calcPedTable(prep, weight) : null;
  const pedSteps = pediatricTableOnly && prep ? buildPedSteps(prep, weight) : null;
  const baseSteps =
    hasPreparation && prep
      ? specialRecipe?.steps ||
        pedSteps ||
        buildRecipeSteps(drug, prep, activeRecipe, weight, concentration, activeRecipeInput)
      : [
          {
            title: "Identifier le médicament",
            detail: `${drug.nom} · ${drug.dci}`,
            result: drug.cond?.[0] || "Fiche clinique",
          },
          {
            title: "Vérifier la prescription",
            detail: fallbackPosology,
            result: population === "enfant" ? "Enfant" : "Adulte",
          },
          {
            title: "Confirmer l’administration",
            detail: drug.indic?.[0] || drug.desc,
            result: "Selon protocole",
          },
          {
            title: "Surveiller",
            detail: monitoringLabel || "Surveillance clinique selon prescription",
            result: monitoringLabel || "Clinique",
          },
        ];

  const recipeNotes = activeRecipe?.notes ?? (activeRecipe?.note ? [activeRecipe.note] : null);
  const capacityValidationIssue = phaseCapacityIssue(activeRecipe, prep, weight);
  const notes = [...(recipeNotes || prep?.notes || [])];
  if (capacityValidationIssue && !notes.includes(capacityValidationIssue)) {
    notes.push(capacityValidationIssue);
  }
  const pseResult = isPse && pse ? buildPseMetrics(pse, pseInput, weight, prep) : null;
  const programmedRate = pseResult?.rate ?? null;
  const specializedPse =
    isPse && prep && pse
      ? buildSpecializedPseSteps(
          drug,
          prep,
          activeRecipe,
          weight,
          pseInput,
          activeRecipeInput,
          programmedRate,
          pse
        )
      : null;
  const hasExplicitPseRecipe = Boolean(
    activeRecipe?.prelever || activeRecipe?.completer || (prep?.fixed_dilution && prep.fd_prelever)
  );
  const isSyntheticPseRecipe = activeRecipe !== null && activeRecipe === syntheticPseRecipe;
  const steps =
    specializedPse?.steps ||
    (isPse && prep && pse && (hasExplicitPseRecipe || isSyntheticPseRecipe)
      ? buildStructuredPseSteps(drug, prep, activeRecipe, programmedRate, pse)
      : baseSteps);

  const weightCalculatedSteps = steps.filter(
    (step) =>
      /calcul au poids/i.test(step.title) ||
      (/\b(?:µg|mg|g|UI|gouttes)\/kg(?:\/h|\/min)?\b/i.test(step.detail) &&
        /\bpour\s+\d/i.test(step.detail))
  );
  const inferredCalculatedDoseValues = weightCalculatedSteps
    .map((step) => {
      const resultDose = step.result.match(
        /\d+(?:[,.]\d+)?(?:\s*[–-]\s*\d+(?:[,.]\d+)?)?\s*(?:µg|ug|mg|g|UI|mmol|gouttes?)\b(?!\s*\/\s*kg)/i
      )?.[0];
      if (resultDose) return resultDose.replace(/^ug$/i, "µg");
      const detailDose = step.detail.match(/(?:^|·)\s*([^·]+?)\s+pour\s+\d/i)?.[1]?.trim();
      return detailDose && !/\/kg/i.test(detailDose) ? detailDose : undefined;
    })
    .filter((value): value is string => Boolean(value));
  const phaseDoseSteps = steps.filter((step) => step.phaseDose);
  const phaseDisplayConcentration = concentrationDescriptor(
    activeRecipe?.concentration ||
      activeRecipe?.conc_finale ||
      activeRecipe?.rows?.find((row) => /concentration/i.test(row.label))?.value
  );
  const controlPhaseRows =
    activeRecipe?.hide_phase_volume &&
    activeRecipe.phase_doses?.length &&
    prep &&
    phaseDisplayConcentration
      ? computeRecipePhaseRows(
          activeRecipe,
          {
            ...prep,
            conc_produit: phaseDisplayConcentration.value,
            unite: phaseDisplayConcentration.unit,
          },
          kg,
          validWeight
        )
      : [];
  const phaseAdministrationSummary = controlPhaseRows.length
    ? controlPhaseRows
        .map((phase) => {
          const value =
            phase.rate !== null
              ? `${formatNumber(phase.rate)}${phase.rateMax !== null && phase.rateMax !== phase.rate ? `–${formatNumber(phase.rateMax)}` : ""} mL/h`
              : phase.volume !== null
                ? `${formatNumber(phase.volume)}${phase.volumeMax !== null && phase.volumeMax !== phase.volume ? `–${formatNumber(phase.volumeMax)}` : ""} mL`
                : null;
          return value ? `${phase.label} : ${value}` : null;
        })
        .filter((value): value is string => Boolean(value))
        .join(" · ")
    : null;
  const readyPhaseDoseValues = phaseDoseSteps
    .map((step) => step.doseSummary)
    .filter((value): value is string => Boolean(value));
  const calculatedDoseValues = phaseDoseSteps.length
    ? readyPhaseDoseValues.length === phaseDoseSteps.length
      ? readyPhaseDoseValues
      : []
    : inferredCalculatedDoseValues;
  const calculatedDose = joinRecipeValues(calculatedDoseValues, activeRecipe?.phase_relation);
  const calculatedVolume = joinRecipeValues(
    [...phaseDoseSteps, ...weightCalculatedSteps]
      .filter((step) => /mL\b(?!\s*\/\s*h)/i.test(step.result))
      .map((step) => displayedVolumeFromResult(step.result) || step.result),
    activeRecipe?.phase_relation
  );
  const administrationStep = steps.find((step) => {
    const role = volumeRoleFromAction(step.title);
    return (
      /administrer|injecter|perfuser|programmer|débit|bolus/i.test(step.title) &&
      Boolean(displayedActionMeasure(step, role))
    );
  });
  const actionVolumeStep = steps.find((step) => {
    const role = volumeRoleFromAction(step.title);
    return (
      /prélever|transférer|administrer|injecter|perfuser|programmer|débit|bolus/i.test(
        step.title
      ) && Boolean(displayedActionMeasure(step, role))
    );
  });
  const explicitlyTypedActionStep = steps.find(
    (step) => step.volumeRole && Boolean(displayedActionMeasure(step, step.volumeRole))
  );
  const explicitActionRow = activeRecipe?.rows?.find((row) =>
    /inject|administr|perfus|program/i.test(row.label)
  );
  const resolvedVolumeRole =
    activeRecipe?.calculated_volume_role ||
    explicitlyTypedActionStep?.volumeRole ||
    (administrationStep ? volumeRoleFromAction(administrationStep.title) : null) ||
    (actionVolumeStep ? volumeRoleFromAction(actionVolumeStep.title) : null) ||
    (explicitActionRow ? volumeRoleFromAction(explicitActionRow.label) : null);
  const roleVolume = joinRecipeValues(
    phaseDoseSteps
      .filter(
        (step) =>
          step.volumeRole === resolvedVolumeRole &&
          (resolvedVolumeRole === "programmer"
            ? /mL\s*\/\s*h/i.test(step.result)
            : /mL\b(?!\s*\/\s*h)/i.test(step.result))
      )
      .map((step) => step.result),
    activeRecipe?.phase_relation
  );
  const roleQuantity = joinRecipeValues(
    phaseDoseSteps
      .filter((step) => step.volumeRole === resolvedVolumeRole)
      .map((step) => step.result),
    activeRecipe?.phase_relation
  );
  const directActionVolume =
    (activeRecipe?.calculated_volume_role ? calculatedVolume : null) ||
    (explicitlyTypedActionStep?.volumeRole === resolvedVolumeRole
      ? displayedActionMeasure(explicitlyTypedActionStep, resolvedVolumeRole) ||
        explicitlyTypedActionStep.result
      : null) ||
    (administrationStep
      ? displayedActionMeasure(administrationStep, resolvedVolumeRole) || administrationStep.result
      : null) ||
    (actionVolumeStep
      ? displayedActionMeasure(actionVolumeStep, resolvedVolumeRole) || actionVolumeStep.result
      : null) ||
    (resolvedVolumeRole && resolvedVolumeRole !== "prelever" ? calculatedVolume : null) ||
    (resolvedVolumeRole && explicitActionRow && !activeRecipe?.completer
      ? extractPreparedVolume(activeRecipe?.prelever)
      : null);
  const doseOnlyPreparation =
    activeRecipe?.prelever && !/mL\b/i.test(activeRecipe.prelever)
      ? extractMedicationQuantity(activeRecipe.prelever)
      : null;
  const displayedVolume =
    phaseAdministrationSummary ||
    roleVolume ||
    roleQuantity ||
    directActionVolume ||
    (resolvedVolumeRole === "prelever" ? calculatedVolume : null) ||
    extractPreparedVolume(activeRecipe?.prelever || prep?.fd_prelever) ||
    doseOnlyPreparation ||
    prep?.prelever_label ||
    (pediatricTableOnly && pedSteps
      ? pedSteps.find((step) => /volume à injecter|Prélever/i.test(step.title))?.result
      : null) ||
    "Selon prescription";
  const displayedMeasureLabel = phaseAdministrationSummary
    ? "Volumes / débits calculés"
    : doseOnlyPreparation && !resolvedVolumeRole
      ? "Quantité de médicament"
      : resolvedVolumeRole &&
          !/mL\b/i.test(displayedVolume) &&
          !/selon prescription/i.test(displayedVolume)
        ? `Quantité à ${
            {
              prelever: "prélever",
              injecter: "injecter",
              perfuser: "perfuser",
              administrer: "administrer",
              programmer: "programmer",
            }[resolvedVolumeRole]
          }`
        : volumeLabel(resolvedVolumeRole);
  const finalVolumeStep = steps
    .filter(
      (step) =>
        /compléter|reconstituer|diluer|choisir la dilution|préparer (?:la pompe|la seringue)/i.test(
          step.title
        ) && /mL\b(?!\s*\/\s*h)/i.test(step.result)
    )
    .at(-1);
  const recipeVolumeFinal =
    extractFinalVolumeLabel(activeRecipe?.completer) ||
    (activeRecipe?.hide_final && phaseAdministrationSummary
      ? null
      : finalVolumeSummaryFromResult(finalVolumeStep?.result || "")) ||
    (isSyntheticPseRecipe && prep?.volume_final ? formatMl(prep.volume_final) : null);
  const routeSource = [
    activeRecipe?.tag,
    activeRecipe?.rate_value,
    ...(activeRecipe?.etapes || []),
    ...steps.map((step) => `${step.title} ${step.detail}`),
  ]
    .filter(Boolean)
    .join(" ");
  const route =
    routeSource
      .match(/\bIV\s*\/\s*IO\b/i)?.[0]
      .replace(/\s+/g, " ")
      .trim() ||
    routeSource.match(/\b(?:IVSE|IVD|IVL|IM|IO|SC|PSE|PSR)\b/i)?.[0] ||
    null;
  const administrationValue =
    activeRecipe?.rate_value ||
    route ||
    activeRecipe?.duree ||
    (!activeRecipe ? prep?.duree : null) ||
    "Selon protocole";

  const tagDoseMatch = activeRecipe?.tag?.match(
    /\d+(?:[,.]\d+)?(?:\s*[-–]\s*\d+(?:[,.]\d+)?)?\s*(?:µg|ug|mg|g|UI)\b(?!\s*\/\s*(?:mL|kg|h|min))/i
  );
  const tagDose =
    tagDoseMatch && !/\bmax\s*$/i.test((activeRecipe?.tag || "").slice(0, tagDoseMatch.index || 0))
      ? tagDoseMatch[0]
      : null;
  const immediateDose = calculatedDose || tagDose;
  const administrationNote =
    activeRecipe?.notes?.find((note) => /rincer|flush/i.test(note)) ||
    administrationStep?.detail ||
    activeRecipe?.note ||
    monitoringLabel ||
    "Vérifier la voie";
  const defaultMetrics: [PreparationMetric, PreparationMetric, PreparationMetric] = [
    {
      label: activeRecipe?.empty
        ? "Population"
        : calculatedDose
          ? "Dose calculée"
          : immediateDose
            ? "Dose immédiate"
            : activeRecipe?.prelever
              ? "Produit / préparation"
              : "Dose / préparation",
      value: activeRecipe?.empty
        ? population === "enfant"
          ? "Enfant"
          : "Adulte"
        : immediateDose || activeRecipe?.prelever || activeRecipe?.tag || fallbackPosology,
      note: activeRecipe?.empty
        ? activeRecipe.note || "Non recommandée"
        : immediateDose
          ? administrationStep?.detail || `Population ${population}`
          : `Population ${population}`,
      kind: "dose",
    },
    {
      label: pediatricTableOnly ? "Volume calculé" : displayedMeasureLabel,
      value: displayedVolume,
      note:
        resolvedVolumeRole === "prelever" && /\/mL/i.test(steps[0]?.result || "")
          ? steps[0].result
          : concentration,
      kind: "volume",
    },
    {
      label: activeRecipe?.rate_value ? activeRecipe.rate_label || "Débit" : "Administration",
      value: administrationValue,
      note: administrationNote,
      kind: "administration",
    },
  ];
  const pseSteps = getPreparationPseSteps(isPse ? pse : null, weight, prep);
  const pseInputConfig =
    isPse && pse ? getPreparationPseInputConfig(pse, weight, prep, pseSteps) : null;
  const recipeControl: PreparationControl | null =
    activeRecipe?.dose_input_label && activeRecipeInput !== null
      ? {
          kind: "recipe",
          value: activeRecipeInput,
          unit: activeRecipe.dose_input_unit || undefined,
          steps: activeRecipe.dose_input_steps,
          step: activeRecipe.dose_input_step ?? 1,
          min: activeRecipe.dose_input_min ?? 0,
          max: activeRecipe.dose_input_max,
        }
      : null;
  const ageControl: PreparationControl | null =
    (drug.id === 74 || drug.id === 75) && activeRecipe?.population === "enfant"
      ? {
          kind: "age",
          value: ageBand,
          options: [
            { value: "lt6", label: "< 6 ans" },
            { value: "gte6", label: "≥ 6 ans" },
          ],
        }
      : null;
  const octaplexResult = activeRecipe?.octaplex_inr
    ? calcPrepOctaplexInr(weight, activeRecipeInput)
    : null;
  const octaplexMetrics: [PreparationMetric, PreparationMetric, PreparationMetric] | null =
    activeRecipe?.octaplex_inr
      ? [
          {
            label: "INR / dose calculée",
            value: octaplexResult
              ? `${formatNumber(activeRecipeInput || 0)} → ${formatNumber(octaplexResult.totalUi)} UI`
              : "INR ou poids requis",
            note: octaplexResult ? `${octaplexResult.uiKg} UI/kg` : "Calcul selon la table AVK",
            kind: "dose",
            control: recipeControl
              ? {
                  ...recipeControl,
                  result: octaplexResult
                    ? `Dose calculée : ${formatNumber(octaplexResult.totalUi)} UI`
                    : "Poids ou INR requis",
                }
              : undefined,
          },
          {
            label: "Volume à préparer",
            value: octaplexResult ? formatMl(octaplexResult.volumeMl) : "Calcul requis",
            note: "Reconstitution à 25 UI/mL",
            kind: "volume",
          },
          {
            label: "Prescription · mL/kg/min",
            value: `${formatNumber(pseInput)} mL/kg/min`,
            note: "Débit plafonné à 480 mL/h",
            kind: "administration",
            control: {
              kind: "pse",
              value: pseInput,
              ...pseInputConfig,
              result:
                programmedRate === null
                  ? "Poids requis"
                  : `Débit calculé : ${formatNumber(programmedRate)} mL/h`,
              steps: pseSteps,
            },
          },
        ]
      : null;
  const pseMetrics: [PreparationMetric, PreparationMetric, PreparationMetric] | null = pseResult
    ? [
        {
          ...pseResult.metrics[0],
          control: {
            kind: "pse",
            value: pseInput,
            ...pseInputConfig,
            steps: pseSteps,
          },
        },
        pseResult.metrics[1],
        pseResult.metrics[2],
      ]
    : null;
  const recipeMetrics: [PreparationMetric, PreparationMetric, PreparationMetric] = recipeControl
    ? [
        {
          label: activeRecipe?.dose_input_label || "Valeur prescrite",
          value: `${formatNumber(activeRecipeInput || 0)}${activeRecipe?.dose_input_unit ? ` ${activeRecipe.dose_input_unit}` : ""}`,
          note: "Valeur ajustable de la recette active",
          kind: "dose",
          control: recipeControl,
        },
        defaultMetrics[1],
        defaultMetrics[2],
      ]
    : defaultMetrics;
  const ageMetrics: [PreparationMetric, PreparationMetric, PreparationMetric] | null = ageControl
    ? [
        {
          label: "Tranche d’âge",
          value: ageBand === "lt6" ? "< 6 ans" : ageBand === "gte6" ? "≥ 6 ans" : "À sélectionner",
          note: "L’âge n’est jamais déduit du poids",
          kind: "dose",
          control: ageControl,
        },
        defaultMetrics[1],
        defaultMetrics[2],
      ]
    : null;
  const displayMetrics =
    octaplexMetrics || ageMetrics || (isPse ? pseMetrics : null) || recipeMetrics;

  const productSource =
    activeRecipe?.prelever || prep?.fd_prelever || prep?.etapes?.[0] || drug.cond?.[0] || drug.nom;
  const doseMatchedCondition =
    activeRecipe?.dose_input_unit === "mg" && activeRecipeInput !== null
      ? drug.cond?.find((condition) =>
          new RegExp(`\\b${String(activeRecipeInput).replace(".", "[,.]")}\\s*mg\\b`, "i").test(
            condition
          )
        )
      : null;
  const productDescription =
    doseMatchedCondition ||
    (isPse && prep
      ? resolveProductDetail(drug, prep, activeRecipe)
      : steps.find((step) => /identifier/i.test(step.title))?.detail || productSource);
  const requiredContainerLabel =
    steps.find((step) => /^prévoir les /i.test(step.title))?.result ||
    containerCount(activeRecipe?.prelever);
  const productControl = `Conditionnement : ${productDescription.replace(
    /^\s*(?:conditionnement|produit)\s*:\s*/i,
    ""
  )}${requiredContainerLabel ? ` · quantité requise : ${requiredContainerLabel}` : ""}`;
  const recipeInputDose =
    activeRecipe?.dose_input_label && activeRecipeInput !== null
      ? `${formatNumber(activeRecipeInput)}${activeRecipe.dose_input_unit ? ` ${activeRecipe.dose_input_unit}` : ""}`
      : null;
  const stepDose = steps.find((step) => /confirmer|calculer.*dose/i.test(step.title))?.result;
  const controlledDose = calculatedDose || stepDose || recipeInputDose || tagDose;
  const controlledDoseIsCalculated = Boolean(
    calculatedDose ||
    (stepDose && steps.some((step) => step.result === stepDose && /calculer/i.test(step.title)))
  );
  const doseControl = controlledDose
    ? `${controlledDoseIsCalculated ? "Dose calculée" : "Dose prescrite"} : ${controlledDose}`
    : "Dose prescrite : à confirmer";
  const normalizedDisplayedVolume = /selon prescription/i.test(displayedVolume)
    ? "à confirmer selon la prescription"
    : displayedVolume;
  const volumeControl = recipeVolumeFinal
    ? `Volume final : ${recipeVolumeFinal} · ${displayedMeasureLabel} : ${normalizedDisplayedVolume}`
    : `${displayedMeasureLabel} : ${normalizedDisplayedVolume}`;
  const controls = activeRecipe?.octaplex_inr
    ? [
        `Patient et poids : ${weight ? `${weight} kg` : "à confirmer"}`,
        productControl,
        `INR confirmé : ${activeRecipeInput === null ? "à confirmer" : formatNumber(activeRecipeInput)}`,
        `Dose et volume : ${octaplexResult ? `${formatNumber(octaplexResult.totalUi)} UI · ${formatMl(octaplexResult.volumeMl)}` : "à calculer"}`,
        `Débit programmé : ${programmedRate === null ? "à calculer" : `${formatNumber(programmedRate)} mL/h`} · voie, tubulure et traçabilité identifiées`,
      ]
    : isPse
      ? [
          `Patient et poids : ${weight ? `${weight} kg` : "à confirmer"}`,
          productControl,
          `${pseResult?.metrics[0].label || "Prescription ou réglage"} : ${pseResult?.metrics[0].value || "à confirmer"}`,
          `${pseResult?.metrics[1].label || "Débit programmé"} : ${pseResult?.metrics[1].value || "à calculer"}`,
          "Voie, tubulure et pompe identifiées",
        ]
      : activeRecipe?.empty
        ? [
            `Patient et poids : ${weight ? `${weight} kg` : "à confirmer"}`,
            `Population : ${population === "enfant" ? "Enfant" : "Adulte"}`,
            "Préparation : ne pas préparer",
            `Motif : ${activeRecipe.note || "Préparation non recommandée"}`,
            "Référence clinique et alternative thérapeutique vérifiées",
          ]
        : hasPreparation
          ? [
              `Patient et poids : ${weight ? `${weight} kg` : "à confirmer"}`,
              productControl,
              doseControl,
              volumeControl,
              "Voie et modalités d’administration identifiées",
            ]
          : [
              `Patient et poids : ${weight ? `${weight} kg` : "à confirmer"}`,
              `Médicament : ${drug.nom}`,
              "Dose conforme à la prescription",
              "Voie et modalités d’administration vérifiées",
              `Surveillance identifiée${monitoringLabel ? ` : ${monitoringLabel}` : ""}`,
            ];

  const contextParts = [
    activeRecipe?.titre || (pediatricTable ? "Pédiatrique" : drug.nom),
    weight ? `${weight} kg` : null,
    isPse && programmedRate !== null ? `${formatNumber(programmedRate)} mL/h` : null,
  ].filter(Boolean);
  const calculationRequiresInput = [...steps, ...(pseResult?.metrics || [])].some((item) =>
    Object.values(item).some(
      (value) =>
        typeof value === "string" &&
        /poids requis|calcul requis|prescription requise|âge requis|volume IVD requis/i.test(value)
    )
  );
  const pseDoseForRange =
    !isPse || !pse
      ? null
      : pse.inputMode === "mlh"
        ? calcDoseFromRate(pse, pseInput, weight, pse.dosePrecision ?? 3)
        : pse.inputMode === "effectiveDose"
          ? null
          : pseInput;
  const pseWithinRange =
    !isPse ||
    !pse ||
    (pse.inputMode === "effectiveDose"
      ? programmedRate !== null
      : pseDoseForRange !== null && pseDoseForRange >= pse.min && pseDoseForRange <= pse.max);
  const validationReason = !hasPreparation
    ? "Aucune préparation validée pour ce mode"
    : activeRecipe?.empty
      ? activeRecipe.note || "Préparation non recommandée"
      : pediatricTableOnly && validWeight && !pediatricTableResult
        ? "Aucune préparation calculable pour ce poids — vérifier le protocole"
        : specializedPse?.validationReason || specialRecipe?.validationReason
          ? specializedPse?.validationReason || specialRecipe?.validationReason || null
          : capacityValidationIssue
            ? capacityValidationIssue
            : calculationRequiresInput
              ? "Compléter les données nécessaires au calcul"
              : !pseWithinRange
                ? "Le réglage est hors de la plage thérapeutique"
                : null;

  return {
    activeRecipe,
    modes,
    recipes,
    metrics: displayMetrics,
    steps,
    notes,
    controls,
    context: contextParts.join(" · "),
    canValidate: validationReason === null,
    validationReason,
    hasPreparation,
    hasDetailedCalculation: Boolean(prep),
    isPse,
    pseSteps,
    programmedRateMlH: programmedRate,
  };
};
