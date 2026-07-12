import {
  calcDebit,
  calcDoseFromRate,
  calcPrepAdrenalineTable,
  calcPrepDobutamineTable,
  calcPrepIsuprelTable,
  calcPrepNoradTable,
  calcPrepOctaplexInr,
  calcPrepSufentaTable,
  calcPrepThreshold,
} from "../../../lib/calc";
import type { Drug } from "../../../types/data";
import { computeThresholdDose, type DrugPrep, type PrepRecipe } from "../../PrepBlock.parts";
import { computeEffectivePse, type PseEntry } from "../../PseBlock.parts";
import type { PreparationMetric, PreparationStep } from "./types";
import {
  concentrationFromProduct,
  containerCount,
  extractFinalVolumeLabel,
  extractPreparedVolume,
  formatMl,
  formatNumber,
  pseConcentrationUnit,
  resolveProductDetail,
} from "./utils";

export const buildPseMetrics = (
  pse: PseEntry,
  input: number,
  weight: string,
  prep: DrugPrep | null
): { metrics: [PreparationMetric, PreparationMetric, PreparationMetric]; rate: number | null } => {
  const inputLabel = formatNumber(input, pse.dosePrecision ?? 3);
  const concentration = pse.tag || `${formatNumber(pse.conc)} ${pseConcentrationUnit(pse)}/mL`;

  if (prep?.dose_threshold !== undefined && prep.dose_threshold_input_unit === "mL") {
    const effectiveDose = computeThresholdDose(prep, String(input));
    const threshold = calcPrepThreshold(prep, effectiveDose);
    return {
      rate: threshold?.injectMl ?? null,
      metrics: [
        {
          label: "Volume IVD efficace",
          value: `${inputLabel} mL`,
          note:
            typeof effectiveDose === "number"
              ? `${formatNumber(effectiveDose)} mg administrés en IVD`
              : "Volume IVD requis",
          kind: "dose",
        },
        {
          label: "Débit à programmer",
          value: threshold ? `${formatNumber(threshold.injectMl)} mL/h` : "Volume IVD requis",
          note: "PSE d’entretien = dose efficace par heure",
          kind: "volume",
        },
        {
          label: "Concentration de référence",
          value: concentration,
          note: "Ampoules administrées pures",
          kind: "administration",
        },
      ],
    };
  }

  if (pse.inputMode === "mlh") {
    const dose = calcDoseFromRate(pse, input, weight, pse.dosePrecision ?? 3);
    return {
      rate: input > 0 ? input : null,
      metrics: [
        {
          label: "Débit à programmer · mL/h",
          value: `${inputLabel} mL/h`,
          note: "Réglage de la pompe",
          kind: "dose",
        },
        {
          label: "Dose délivrée",
          value:
            dose === null
              ? "Poids requis"
              : `${formatNumber(dose, pse.dosePrecision ?? 3)} ${pse.unite}`,
          note: `Plage ${formatNumber(pse.min)}–${formatNumber(pse.max)} ${pse.unite}`,
          kind: "volume",
        },
        {
          label: "Concentration de référence",
          value: concentration,
          note: "Vérifier la préparation avant programmation",
          kind: "administration",
        },
      ],
    };
  }

  if (pse.inputMode === "effectiveDose") {
    const effective = computeEffectivePse(pse, String(input));
    return {
      rate: effective?.debit ?? null,
      metrics: [
        {
          label:
            pse.effectiveInputUnit === "mL"
              ? "Volume IVD efficace"
              : pse.effectiveInputLabel || "Dose efficace",
          value: `${inputLabel} ${pse.effectiveInputUnit || pse.unite}`,
          note:
            pse.effectiveInputUnit === "mL"
              ? "Volume total efficace administré en IVD"
              : `Plage ${formatNumber(pse.min)}–${formatNumber(pse.max)}`,
          kind: "dose",
        },
        {
          label: "Débit à programmer",
          value: effective ? `${formatNumber(effective.debit)} mL/h` : "—",
          note: effective
            ? `${formatNumber(effective.hourlyDose)} mg/h`
            : "Saisir une valeur valide",
          kind: "volume",
        },
        {
          label: "Concentration de référence",
          value: concentration,
          note: "Administration continue",
          kind: "administration",
        },
      ],
    };
  }

  const rate = calcDebit(pse, input, weight);
  return {
    rate,
    metrics: [
      {
        label: `Prescription · ${pse.unite}`,
        value: inputLabel,
        note: `Plage ${formatNumber(pse.min)}–${formatNumber(pse.max)}`,
        kind: "dose",
      },
      {
        label: "Débit à programmer",
        value: rate === null ? "Poids requis" : `${formatNumber(rate)} mL/h`,
        note: "Calcul identique à l’application principale",
        kind: "volume",
      },
      {
        label: "Concentration de référence",
        value: concentration,
        note: "Vérifier la dilution et la voie",
        kind: "administration",
      },
    ],
  };
};

const buildProgramPseStep = (pse: PseEntry, programmedRate: number | null): PreparationStep => ({
  title: "Programmer le PSE",
  detail:
    pse.inputMode === "mlh"
      ? "Régler le débit prescrit sur la pompe"
      : `Débit calculé à partir de la prescription en ${pse.unite}`,
  result:
    programmedRate === null
      ? "Poids ou prescription requis"
      : `${formatNumber(programmedRate)} mL/h`,
});

export const buildStructuredPseSteps = (
  drug: Drug,
  prep: DrugPrep,
  recipe: PrepRecipe | null,
  programmedRate: number | null,
  pse: PseEntry
): PreparationStep[] => {
  const productDetail = resolveProductDetail(drug, prep, recipe);
  const productLabel = /flacon/i.test(productDetail)
    ? "le flacon"
    : /ampoule/i.test(productDetail)
      ? "l’ampoule"
      : "le produit";
  const preleverDetail = recipe?.prelever || prep.fd_prelever || null;
  const finalVolume =
    extractFinalVolumeLabel(recipe?.completer) ||
    (prep.volume_final ? formatMl(prep.volume_final) : null);
  const solvent = recipe?.solvant || prep.solvant || "le solvant prescrit";
  const completeDetail =
    recipe?.completer || (finalVolume ? `Compléter à ${finalVolume} avec ${solvent}` : null);
  const preleverResult =
    extractPreparedVolume(preleverDetail || undefined) ||
    containerCount(preleverDetail || undefined) ||
    "Selon prescription";

  return [
    {
      title: `Identifier ${productLabel}`,
      detail: productDetail,
      result: concentrationFromProduct(productDetail),
    },
    ...(preleverDetail
      ? [
          {
            title: "Prélever le médicament",
            detail: preleverDetail,
            result: preleverResult,
          },
        ]
      : []),
    ...(completeDetail
      ? [
          {
            title: `Compléter avec ${solvent}`,
            detail: completeDetail,
            result: finalVolume ? `Vf ${finalVolume}` : "Selon prescription",
          },
        ]
      : []),
    buildProgramPseStep(pse, programmedRate),
  ];
};

export const buildSpecializedPseSteps = (
  drug: Drug,
  prep: DrugPrep,
  recipe: PrepRecipe | null,
  weight: string,
  pseInput: number,
  recipeInput: number | null,
  programmedRate: number | null,
  pse: PseEntry
): { steps: PreparationStep[]; requiresUserInput: boolean; validationReason?: string } | null => {
  if (prep.dose_threshold !== undefined && prep.dose_threshold_input_unit === "mL") {
    const effectiveDose = computeThresholdDose(prep, String(pseInput));
    const result = calcPrepThreshold(prep, effectiveDose);
    const productDetail = resolveProductDetail(drug, prep, recipe);
    return {
      requiresUserInput: !result,
      validationReason: result ? undefined : "Saisir le volume IVD ayant obtenu l’effet clinique",
      steps: [
        {
          title: "Identifier l’ampoule",
          detail: productDetail,
          result: concentrationFromProduct(productDetail),
        },
        {
          title: "Reporter le volume IVD efficace",
          detail: "Reprendre le volume total ayant obtenu l’effet clinique en IVD",
          result: result
            ? `${formatNumber(pseInput)} mL = ${formatNumber(result.pf)} mg`
            : "Volume IVD requis",
        },
        {
          title: "Préparer le PSE",
          detail: result
            ? `${result.pf < prep.dose_threshold ? "Dose efficace <" : "Dose efficace ≥"} ${formatNumber(prep.dose_threshold)} mg`
            : "Après saisie du volume IVD",
          result: result
            ? `${result.ampCount} ampoules · ${formatNumber(result.vol || 0)} mL purs`
            : "Calcul requis",
        },
        {
          ...buildProgramPseStep(pse, programmedRate),
          detail: "Régler la dose efficace par heure",
        },
      ],
    };
  }

  if (recipe?.octaplex_inr) {
    const inr = recipeInput ?? recipe.dose_input_default ?? 4;
    const result = calcPrepOctaplexInr(weight, inr);
    const rawSteps = recipe.etapes || prep.etapes || [];
    const reconstitution =
      rawSteps.find((step) => /reconstitu/i.test(step)) || "Reconstituer avec le solvant fourni";
    const vitaminK = rawSteps.find((step) => /vitamine\s*K/i.test(step));
    return {
      requiresUserInput: !result || programmedRate === null,
      validationReason: !result
        ? "Saisir un poids valide et un INR ≥ 2"
        : programmedRate === null
          ? "Confirmer le débit d’administration"
          : undefined,
      steps: [
        {
          title: "Déterminer la dose selon l’INR",
          detail: result
            ? `Repère affiché pour INR ${formatNumber(result.inr)}`
            : "INR et poids requis",
          result: result
            ? `${result.uiKg} UI/kg · ${formatNumber(result.totalUi)} UI`
            : "Calcul requis",
        },
        {
          title: "Reconstituer",
          detail: reconstitution,
          result: prep.solvant || "Solvant fourni",
        },
        {
          title: "Préparer le volume calculé",
          detail: result
            ? `${formatNumber(result.totalUi)} UI à 25 UI/mL`
            : "Après calcul INR/poids",
          result: result ? formatMl(result.volumeMl) : "Calcul requis",
        },
        buildProgramPseStep(pse, programmedRate),
        ...(vitaminK
          ? [
              {
                title: "Associer selon indication",
                detail: vitaminK,
                result: "Vitamine K1",
              },
            ]
          : []),
      ],
    };
  }

  const tableResult = recipe?.sufenta_table
    ? calcPrepSufentaTable(weight)
    : recipe?.adrenaline_table || prep.adrenaline_table
      ? calcPrepAdrenalineTable(weight)
      : recipe?.norad_table || prep.norad_table
        ? calcPrepNoradTable(weight)
        : recipe?.dobutamine_table || prep.dobutamine_table
          ? calcPrepDobutamineTable(weight)
          : recipe?.isuprel_table || prep.isuprel_table
            ? calcPrepIsuprelTable(weight)
            : null;
  const usesWeightTable = Boolean(
    recipe?.sufenta_table ||
    recipe?.adrenaline_table ||
    prep.adrenaline_table ||
    recipe?.norad_table ||
    prep.norad_table ||
    recipe?.dobutamine_table ||
    prep.dobutamine_table ||
    recipe?.isuprel_table ||
    prep.isuprel_table
  );
  if (!usesWeightTable) return null;

  const productDetail = resolveProductDetail(drug, prep, recipe);
  return {
    requiresUserInput: !tableResult,
    steps: [
      {
        title: /flacon/i.test(productDetail) ? "Identifier le flacon" : "Identifier l’ampoule",
        detail: productDetail,
        result: concentrationFromProduct(productDetail),
      },
      {
        title: "Prélever selon le poids",
        detail: tableResult
          ? `Table Vi/Vf de l’application principale pour ${formatNumber(tableResult.kg)} kg`
          : "Saisir le poids pour calculer Vi",
        result: tableResult ? `Vi ${formatMl(tableResult.vi)}` : "Poids requis",
      },
      {
        title: `Compléter avec ${prep.solvant || "le solvant prescrit"}`,
        detail: tableResult ? `Diluer jusqu’au volume final calculé` : "Calcul pondéral requis",
        result: tableResult ? `Vf ${formatMl(tableResult.vf)}` : "Poids requis",
      },
      buildProgramPseStep(pse, programmedRate),
    ],
  };
};
