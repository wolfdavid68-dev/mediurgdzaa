import { calcPrepDoseKg } from "../../../lib/calc";
import type { Drug } from "../../../types/data";
import {
  computeRecipeDoseInputValue,
  computeRecipePhaseRows,
  computeRecipeWeightBand,
  type DrugPrep,
  type PrepRecipe,
} from "../../PrepBlock.parts";
import type { PreparationStep } from "./types";
import {
  concentrationDescriptor,
  concentrationFromProduct,
  concentrationValue,
  containerCount,
  displayableConcentration,
  extractFinalVolumeLabel,
  extractMedicationQuantity,
  extractPreparedVolume,
  extractSingleContainerVolume,
  formatDosePerKgUnit,
  formatMl,
  formatNumber,
  inferStepResult,
  inferStepTitle,
  joinRecipeValues,
  parseNumber,
  phaseTitle,
  productPresentationLabel,
  requiredContainersLabel,
  resolveProductDetail,
  timelineRow,
  volumeRoleFromAction,
} from "./utils";

export const buildRecipeSteps = (
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
