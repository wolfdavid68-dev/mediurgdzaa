import { calcDoseFromRate, calcPedTable, calcPrepOctaplexInr } from "../lib/calc";
import { computeRecipePhaseRows, type PrepRecipe } from "./PrepBlock.parts";

import {
  formatNumber,
  formatMl,
  productUnit,
  extractPreparedVolume,
  extractMedicationQuantity,
  extractFinalVolumeLabel,
  getPreparationPseSteps,
  getPreparationPseInputConfig,
  volumeRoleFromAction,
  volumeLabel,
  joinRecipeValues,
  displayedVolumeFromResult,
  displayedActionMeasure,
  finalVolumeSummaryFromResult,
  concentrationDescriptor,
  containerCount,
  resolveProductDetail,
  phaseCapacityIssue,
} from "./preparation/model/utils";
import type {
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
import { buildPedSteps, buildSpecialRecipeSteps } from "./preparation/model/specialRecipes";
import { buildRecipeSteps } from "./preparation/model/recipeSteps";

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
