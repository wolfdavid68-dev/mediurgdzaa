import {
  calcDebit,
  calcDoseFromRate,
  calcPedTable,
  calcPrepAdrenalineTable,
  calcPrepDoseKg,
  calcPrepDobutamineTable,
  calcPrepIsuprelTable,
  calcPrepNoradTable,
  calcPrepOctaplexInr,
  calcPrepPhases,
  calcPrepSufentaIntranasal,
  calcPrepSufentaTable,
  calcPrepThreshold,
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
  computeThresholdDose,
  type DrugPrep,
  type PrepRecipe,
} from "./PrepBlock.parts";
import { computeEffectivePse, type PseEntry } from "./PseBlock.parts";

export type PrepPreviewPopulation = "adulte" | "enfant";

type PrepPreviewStep = {
  title: string;
  detail: string;
  result: string;
};

type PrepPreviewMetric = {
  label: string;
  value: string;
  note: string;
  kind?: "dose" | "volume" | "administration";
  control?: PrepPreviewControl;
};

type PrepPreviewControl =
  | {
      kind: "pse" | "recipe";
      value: number;
      steps?: number[];
      step?: number;
      min?: number;
      max?: number;
    }
  | {
      kind: "age";
      value: "lt6" | "gte6" | null;
      options: Array<{ value: "lt6" | "gte6"; label: string }>;
    };

type PrepPreviewMode = {
  title: string;
  detail: string;
};

export type PrepMedPreviewModel = {
  activeRecipe: PrepRecipe | null;
  modes: PrepPreviewMode[];
  recipes: PrepRecipe[];
  metrics: [PrepPreviewMetric, PrepPreviewMetric, PrepPreviewMetric];
  steps: PrepPreviewStep[];
  notes: string[];
  controls: string[];
  context: string;
  canValidate: boolean;
  validationReason: string | null;
  hasPreparation: boolean;
  hasDetailedCalculation: boolean;
  isPse: boolean;
  pseSteps: number[];
  programmedRateMlH: number | null;
};

type BuildPrepMedPreviewModelArgs = {
  drug: Drug;
  prep: DrugPrep | null;
  pse: PseEntry | null;
  population: PrepPreviewPopulation;
  weight: string;
  recipeIndex: number;
  pseInput: number;
  recipeInput?: number | null;
  ageBand?: "lt6" | "gte6" | null;
  monitoringLabel: string;
};

const formatNumber = (value: number, precision?: number) => {
  const rounded =
    precision === undefined
      ? String(Number(value.toFixed(6)))
      : value.toFixed(precision).replace(/0+$/, "").replace(/\.$/, "");
  return rounded.replace(".", ",");
};

const parseNumber = (value: string) => Number(value.replace(",", "."));

const formatMl = (value: number) => `${formatNumber(value)} mL`;

const productUnit = (prep: DrugPrep | null) => prep?.unite || "mg";

const pseConcentrationUnit = (pse: PseEntry) => {
  if (pse.unite.includes("UI")) return "UI";
  if (pse.unite.includes("mg")) return "mg";
  if (pse.unite.startsWith("mL")) return "mL";
  return "µg";
};

const explicitActionVolume = (value?: string): number | null => {
  if (!value) return null;
  const leadingVolume = value.match(/^\s*(\d+(?:[,.]\d+)?)\s*mL\b/i);
  if (leadingVolume) return parseNumber(leadingVolume[1]);
  const actionMatch = value.match(
    /(?:prélev(?:er|é|ement)?|inject(?:er|é|ion)?|administr(?:er|é|ation)?|aspir(?:er|é)|volume(?:\s+à)?)[^\d]{0,40}(\d+(?:[,.]\d+)?)\s*mL/i
  );
  if (actionMatch) return parseNumber(actionMatch[1]);

  const explicitTotal = value.match(
    /=\s*\d+(?:[,.]\d+)?\s*(?:µg|ug|mg|g|UI)\s*\/\s*(\d+(?:[,.]\d+)?)\s*mL/i
  );
  if (explicitTotal) return parseNumber(explicitTotal[1]);

  const ampouleMatch = value.match(
    /(\d+(?:[,.]\d+)?)\s*(?:ampoules?|flacons?)[\s\S]*?\d+(?:[,.]\d+)?\s*(?:µg|ug|mg|g|UI)\s*\/\s*(\d+(?:[,.]\d+)?)\s*mL/i
  );
  if (ampouleMatch) {
    return +(parseNumber(ampouleMatch[1]) * parseNumber(ampouleMatch[2])).toFixed(2);
  }

  const singleContainerMatch = value.match(
    /(?:ampoule|flacon)[\s\S]*?\d+(?:[,.]\d+)?\s*(?:µg|ug|mg|g|UI)\s*\/\s*(\d+(?:[,.]\d+)?)\s*mL/i
  );
  return singleContainerMatch ? parseNumber(singleContainerMatch[1]) : null;
};

export const extractPreparedVolume = (value?: string): string | null => {
  const volume = explicitActionVolume(value);
  return volume === null || !Number.isFinite(volume) ? null : formatMl(volume);
};

const extractFinalVolumeLabel = (value?: string): string | null => {
  if (!value) return null;
  const alternative = value.match(
    /(\d+(?:[,.]\d+)?)\s*(?:mL\s*)?(?:ou|\/)\s*(\d+(?:[,.]\d+)?)\s*mL\b/i
  );
  if (alternative) {
    return `${formatNumber(parseNumber(alternative[1]))} ou ${formatNumber(parseNumber(alternative[2]))} mL`;
  }
  const contextual = value.match(
    /(?:dans|qsp|jusqu['’]?à|jusqu'a|à)\s*(?:un\s+volume(?:\s+final)?\s+de\s*)?(\d+(?:[,.]\d+)?)\s*mL\b/i
  );
  if (contextual) return formatMl(parseNumber(contextual[1]));
  return extractPreparedVolume(value);
};

export const getPreviewPseSteps = (
  pse: PseEntry | null,
  weight = "",
  prep: DrugPrep | null = null
): number[] => {
  if (!pse || pse.hideBlock) return [];
  const source = pse.inputMode === "mlh" ? pse.mlhSteps || [] : pse.steps || [];
  const volumeDrivenThreshold = Boolean(
    prep?.dose_threshold !== undefined && prep.dose_threshold_input_unit === "mL"
  );
  return [...new Set(source)]
    .filter((step) => Number.isFinite(step) && step > 0)
    .filter((step) => {
      if (pse.inputMode !== "mlh" || volumeDrivenThreshold) return true;
      const deliveredDose = calcDoseFromRate(pse, step, weight, pse.dosePrecision ?? 3);
      return deliveredDose !== null && deliveredDose >= pse.min && deliveredDose <= pse.max;
    })
    .sort((a, b) => a - b);
};

export const getPreviewPseDefault = (
  pse: PseEntry | null,
  weight = "",
  prep: DrugPrep | null = null
): number => {
  const steps = getPreviewPseSteps(pse, weight, prep);
  if (prep?.dose_threshold !== undefined || pse?.inputMode === "effectiveDose") return 0;
  if (pse?.unite === "mL/kg/min") return pse.max;
  if (pse?.inputMode === "mlh") {
    const firstTherapeuticRate = steps.find((rate) => {
      const deliveredDose = calcDoseFromRate(pse, rate, weight, pse.dosePrecision ?? 3);
      return deliveredDose !== null && deliveredDose >= pse.min && deliveredDose <= pse.max;
    });
    return firstTherapeuticRate || steps[0] || 1;
  }
  if (steps.includes(0.5)) return 0.5;
  return steps[0] || pse?.min || 0.5;
};

const inferStepTitle = (detail: string, index: number) => {
  if (index === 0 && /ampoule|flacon|produit/i.test(detail)) return "Identifier le produit";
  if (/inr|dose.*UI\/kg|saisir.*dose/i.test(detail)) return "Déterminer la dose";
  if (/prépar|prepar/i.test(detail)) return "Préparer";
  if (/prélev|prelev|aspir/i.test(detail)) return "Prélever";
  if (/dilu|compl|qsp|reconstitu/i.test(detail)) return "Diluer / compléter";
  if (/inject/i.test(detail)) return "Injecter";
  if (/administr|bolus/i.test(detail)) return "Administrer";
  if (/répéter|repeter/i.test(detail)) return "Répéter";
  if (/rincer|flush/i.test(detail)) return "Rincer";
  if (/perfus|pse|pompe|débit|debit|mL\/h/i.test(detail)) return "Programmer / perfuser";
  if (/ampoule|flacon|produit/i.test(detail)) return "Identifier le produit";
  return `Étape ${index + 1}`;
};

const inferStepResult = (
  detail: string,
  index: number,
  recipe: PrepRecipe | null,
  concentration: string
) => {
  if (index === 0 && /ampoule|flacon|produit/i.test(detail) && concentration) {
    return concentrationFromProduct(detail);
  }
  const volume = extractPreparedVolume(detail);
  if (volume && /prélev|prelev|ampoule|flacon|inject|administr/i.test(detail)) return volume;
  const finalVolume = extractFinalVolumeLabel(detail);
  if (finalVolume && /dilu|compl|qsp|reconstitu/i.test(detail)) {
    return `Vf ${finalVolume}`;
  }
  if (/perfus|pse|pompe|débit|debit/i.test(detail) && recipe?.rate_value) {
    return recipe.rate_value;
  }
  const duration = detail.match(
    /(?:^|[\s/])(\d+(?:[,.]\d+)?)\s*(?:[-–à]\s*(\d+(?:[,.]\d+)?))?\s*(min|h)\b/i
  );
  if (duration) {
    const range = duration[2] ? `${duration[1]}–${duration[2]}` : duration[1];
    return `${range.replaceAll(".", ",")} ${duration[3].toLowerCase()}`;
  }
  if (/inject|administr|bolus/i.test(detail) && recipe?.tag) return recipe.tag;
  if (/rincer|flush/i.test(detail)) return "Après injection";
  return "Voir protocole";
};

const buildPedSteps = (prep: DrugPrep, weight: string): PrepPreviewStep[] => {
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
        title: "Prélever",
        detail: `${formatNumber(result.vol_inject!)} mL calculés pour ${formatNumber(result.kg)} kg`,
        result: formatMl(result.vol_inject!),
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
): PrepPreviewStep[] => {
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
    ? [recipe.prelever, recipe.completer, recipe.rate_value].filter((value): value is string =>
        Boolean(value)
      )
    : [];
  const rawSteps = recipe?.etapes?.length
    ? recipe.etapes
    : recipeSteps.length
      ? recipeSteps
      : prep.etapes || [];

  const usesDirectRecipeFields = Boolean(recipe && (recipeSteps.length || recipe.rows?.length));
  const productDetail = usesDirectRecipeFields ? resolveProductDetail(drug, prep, recipe) : null;
  const steps: PrepPreviewStep[] = usesDirectRecipeFields
    ? [
        {
          title: /flacon/i.test(productDetail || "")
            ? "Identifier le flacon"
            : /ampoule/i.test(productDetail || "")
              ? "Identifier l’ampoule"
              : "Identifier le produit",
          detail: productDetail || `${drug.nom} · ${drug.dci}`,
          result: concentrationFromProduct(productDetail || drug.cond?.[0] || ""),
        },
        ...(recipe?.prelever
          ? [
              {
                title: "Prélever",
                detail: recipe.prelever,
                result:
                  extractPreparedVolume(recipe.prelever) ||
                  containerCount(recipe.prelever) ||
                  recipe.tag ||
                  "Selon prescription",
              },
            ]
          : []),
        ...(recipe?.completer
          ? [
              {
                title: `Compléter avec ${recipe.solvant || prep.solvant || "le solvant prescrit"}`,
                detail: recipe.completer,
                result: extractFinalVolumeLabel(recipe.completer)
                  ? `Vf ${extractFinalVolumeLabel(recipe.completer)}`
                  : "Selon prescription",
              },
            ]
          : []),
        ...(recipe?.rows || []).map((row) => ({
          title: row.label,
          detail: `${row.label} : ${row.value}`,
          result: row.value,
        })),
        ...(recipe?.rate_value
          ? [
              {
                title: recipe.rate_label || "Programmer / administrer",
                detail: recipe.rate_value,
                result: recipe.rate_value,
              },
            ]
          : []),
      ]
    : rawSteps.map((detail, index) => ({
        title: inferStepTitle(detail, index),
        detail,
        result: inferStepResult(detail, index, recipe, concentration),
      }));

  if (recipe?.phase_doses?.length) {
    const kg = Number.parseFloat(weight);
    const phaseRows = computeRecipePhaseRows(
      recipe,
      prep,
      kg,
      Number.isFinite(kg) && kg > 0 && kg <= 300
    );
    const calculatedSteps = phaseRows.flatMap((phase) => {
      const unit = phase.unit || "mg";
      const dose =
        phase.dose === null
          ? "Poids requis"
          : phase.doseMax !== null && phase.doseMax !== phase.dose
            ? `${formatNumber(phase.dose)}–${formatNumber(phase.doseMax)} ${unit}`
            : `${formatNumber(phase.dose)} ${unit}`;
      const volume = recipe.hide_phase_volume
        ? dose
        : phase.rate !== null
          ? `${formatNumber(phase.rate)}${phase.rateMax !== null ? `–${formatNumber(phase.rateMax)}` : ""} mL/h`
          : phase.volume !== null
            ? `${formatNumber(phase.volume)}${phase.volumeMax !== null ? `–${formatNumber(phase.volumeMax)}` : ""} mL`
            : dose;
      const doseStep = {
        title: `${phase.label} — calcul au poids`,
        detail: Number.isFinite(kg) && kg > 0 ? `${dose} pour ${formatNumber(kg)} kg` : dose,
        result: volume,
      };
      if (phase.rate === null) return [doseStep];
      return [
        doseStep,
        {
          title: `${phase.label} — débit PSE`,
          detail: phase.duree ? `Administration sur ${phase.duree}` : "Débit calculé par le main",
          result: `${formatNumber(phase.rate)}${phase.rateMax !== null ? `–${formatNumber(phase.rateMax)}` : ""} mL/h`,
        },
      ];
    });
    steps.splice(Math.min(1, steps.length), 0, ...calculatedSteps);
  }

  if (recipe?.rows?.length) {
    for (const row of recipe.rows) {
      if (steps.some((step) => step.detail.includes(row.value) || step.result === row.value))
        continue;
      steps.push({
        title: row.label,
        detail: `${row.label} : ${row.value}`,
        result: row.value,
      });
    }
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
    const calculated = calcPrepDoseKg(prep, weight);
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
      steps.push({
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
  steps: PrepPreviewStep[];
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
                title: "Prélever",
                detail: `0,01 mg/kg pour ${formatNumber(kg)} kg, maximum 0,5 mg`,
                result: `${formatMl(+doseMg.toFixed(2))} = ${formatNumber(doseMg)} mg`,
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
            ...phases.map((phase) => ({
              title: `${phase.label} — préparer puis perfuser`,
              detail: `${formatNumber(phase.dose)} mg${phase.vol === null ? "" : ` = ${formatMl(phase.vol)}`} dans ${formatNumber(phase.solvantVol || 0)} mL de ${prep.solvant || "solvant"}`,
              result: phase.duree,
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
    return {
      requiresUserInput: !selected,
      validationReason: selected ? undefined : "Choisir la tranche d’âge de l’enfant",
      steps: selected
        ? [
            {
              title: `Préparer pour ${selected.label}`,
              detail: selected.value,
              result: selected.value,
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

const buildPseMetrics = (
  pse: PseEntry,
  input: number,
  weight: string,
  prep: DrugPrep | null
): { metrics: [PrepPreviewMetric, PrepPreviewMetric, PrepPreviewMetric]; rate: number | null } => {
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

const parseSpacedNumber = (value: string) => Number(value.replace(/\s+/g, "").replace(",", "."));

const concentrationFromProduct = (detail: string) => {
  const matches = [...detail.matchAll(/(\d[\d\s]*(?:[,.]\d+)?)\s*(µg|ug|mg|g|UI)\s*\/\s*mL/gi)];
  const match = matches[matches.length - 1];
  if (match) {
    return `${match[1].trim().replace(/\s+/g, " ")} ${match[2].replace(/^ug$/i, "µg")}/mL`;
  }

  const presentation = detail.match(
    /(\d[\d\s]*(?:[,.]\d+)?)\s*(µg|ug|mg|g|UI)\s*\/\s*(\d[\d\s]*(?:[,.]\d+)?)\s*mL/i
  );
  if (!presentation) return "Conditionnement vérifié";
  const dose = parseSpacedNumber(presentation[1]);
  const volume = parseSpacedNumber(presentation[3]);
  if (!Number.isFinite(dose) || !Number.isFinite(volume) || volume <= 0) {
    return "Conditionnement vérifié";
  }
  return `${formatNumber(dose / volume)} ${presentation[2].replace(/^ug$/i, "µg")}/mL`;
};

const presentationSignatures = (value?: string) =>
  value
    ? [
        ...value.matchAll(
          /(\d[\d\s]*(?:[,.]\d+)?)\s*(µg|ug|mg|g|UI)\s*\/\s*(\d[\d\s]*(?:[,.]\d+)?)\s*mL/gi
        ),
      ].map(
        (match) =>
          `${parseSpacedNumber(match[1])}${match[2].toLowerCase()}/${parseSpacedNumber(match[3])}`
      )
    : [];

const containerCount = (value?: string) =>
  value?.match(
    /\b(\d+(?:[,.]\d+)?(?:\s*[-–à]\s*\d+(?:[,.]\d+)?)?)\s*(ampoules?|flacons?)\b/i
  )?.[0] || null;

const resolveProductDetail = (drug: Drug, prep: DrugPrep, recipe: PrepRecipe | null) => {
  const sourceSteps = recipe?.etapes?.length ? recipe.etapes : prep.etapes || [];
  const selectedPresentations = presentationSignatures(recipe?.prelever);
  const matchingCondition = drug.cond?.find((condition) =>
    presentationSignatures(condition).some((signature) => selectedPresentations.includes(signature))
  );
  return (
    matchingCondition ||
    sourceSteps.find((step) => /^\s*(?:ampoule|flacon)\b/i.test(step)) ||
    sourceSteps.find((step) => /\b(?:ampoule|flacon)\b/i.test(step)) ||
    drug.cond?.[0] ||
    `${drug.nom} · ${drug.dci}`
  );
};

const buildProgramPseStep = (pse: PseEntry, programmedRate: number | null): PrepPreviewStep => ({
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

const buildStructuredPseSteps = (
  drug: Drug,
  prep: DrugPrep,
  recipe: PrepRecipe | null,
  programmedRate: number | null,
  pse: PseEntry
): PrepPreviewStep[] => {
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

const buildSpecializedPseSteps = (
  drug: Drug,
  prep: DrugPrep,
  recipe: PrepRecipe | null,
  weight: string,
  pseInput: number,
  recipeInput: number | null,
  programmedRate: number | null,
  pse: PseEntry
): { steps: PrepPreviewStep[]; requiresUserInput: boolean; validationReason?: string } | null => {
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

export const buildPrepMedPreviewModel = ({
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
}: BuildPrepMedPreviewModelArgs): PrepMedPreviewModel => {
  const kg = Number.parseFloat(weight);
  const validWeight = Number.isFinite(kg) && kg > 0 && kg <= 300;
  const blockedByWeight = Boolean(
    prep?.display_below_kg !== undefined && (!validWeight || kg >= Number(prep.display_below_kg))
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
    !hasPseRecipe
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
    prep?.conc_finale ||
    (prep?.conc_produit
      ? `${formatNumber(prep.conc_produit)} ${productUnit(prep)}/mL`
      : drug.cond?.[0] || "Produit vérifié");

  const fallbackPosology =
    (population === "enfant" ? drug.poso?.p?.[0] : drug.poso?.a?.[0]) ||
    drug.poso?.a?.[0] ||
    drug.poso?.p?.[0] ||
    "Selon prescription";

  const modes: PrepPreviewMode[] = blockedByWeight
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
  const notes = recipeNotes || prep?.notes || [];
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

  const calculatedDoseValues = steps
    .filter((step) => /calcul au poids/i.test(step.title))
    .map((step) => step.detail.match(/^(.+?)\s+pour\s+\d/i)?.[1]?.trim())
    .filter((value): value is string => Boolean(value));
  const calculatedDose = calculatedDoseValues.length
    ? [...new Set(calculatedDoseValues)].join(" puis ")
    : null;
  const calculatedVolumes = steps
    .filter((step) => /calcul au poids/i.test(step.title) && /mL(?!\/h)/i.test(step.result))
    .map((step) => step.result);
  const calculatedVolume = calculatedVolumes.length
    ? [...new Set(calculatedVolumes)].join(" puis ")
    : null;
  const isInjectionRecipe = Boolean(activeRecipe && /bolus|ivd|im/i.test(activeRecipe.mode || ""));
  const administrationStep = steps.find(
    (step) => /administrer|injecter|bolus/i.test(step.title) && /mL\b/i.test(step.result)
  );
  const hasExplicitInjectionRow = Boolean(
    activeRecipe?.rows?.some((row) => /inject|administr/i.test(row.label))
  );
  const administrationVolume =
    administrationStep?.result ||
    (isInjectionRecipe && hasExplicitInjectionRow
      ? extractPreparedVolume(activeRecipe?.prelever)
      : null) ||
    null;
  const prelevement =
    administrationVolume ||
    calculatedVolume ||
    extractPreparedVolume(activeRecipe?.prelever || prep?.fd_prelever) ||
    prep?.prelever_label ||
    (pediatricTableOnly && pedSteps
      ? pedSteps.find((step) => /Prélever/i.test(step.title))?.result
      : null) ||
    "Selon prescription";
  const recipeVolumeFinal =
    extractFinalVolumeLabel(activeRecipe?.completer) ||
    (activeRecipe &&
    /pse|psr|pompe/i.test(activeRecipe.mode || activeRecipe.titre || "") &&
    prep?.volume_final
      ? formatMl(prep.volume_final)
      : null);
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

  const tagDose =
    activeRecipe && /bolus|ivd|im/i.test(activeRecipe.mode || "")
      ? activeRecipe.tag?.match(
          /\d+(?:[,.]\d+)?(?:\s*[-–]\s*\d+(?:[,.]\d+)?)?\s*(?:µg|ug|mg|g|UI)\b(?!\s*\/\s*(?:mL|kg))/i
        )?.[0]
      : null;
  const immediateDose = calculatedDose || tagDose;
  const administrationNote =
    activeRecipe?.notes?.find((note) => /rincer|flush/i.test(note)) ||
    administrationStep?.detail ||
    activeRecipe?.note ||
    monitoringLabel ||
    "Vérifier la voie";
  const defaultMetrics: [PrepPreviewMetric, PrepPreviewMetric, PrepPreviewMetric] = [
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
      label: pediatricTableOnly
        ? "Volume calculé"
        : administrationVolume
          ? "Volume à injecter"
          : "Volume à prélever",
      value: prelevement,
      note: concentration,
      kind: "volume",
    },
    {
      label: activeRecipe?.rate_value ? activeRecipe.rate_label || "Débit" : "Administration",
      value: administrationValue,
      note: administrationNote,
      kind: "administration",
    },
  ];
  const pseSteps = getPreviewPseSteps(isPse ? pse : null, weight, prep);
  const recipeControl: PrepPreviewControl | null =
    activeRecipe?.dose_input_label && activeRecipeInput !== null
      ? {
          kind: "recipe",
          value: activeRecipeInput,
          step: activeRecipe.dose_input_step ?? 1,
          min: activeRecipe.dose_input_min ?? 0,
          max: activeRecipe.dose_input_max,
        }
      : null;
  const ageControl: PrepPreviewControl | null =
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
  const octaplexMetrics: [PrepPreviewMetric, PrepPreviewMetric, PrepPreviewMetric] | null =
    activeRecipe?.octaplex_inr
      ? [
          {
            label: "INR / dose calculée",
            value: octaplexResult
              ? `${formatNumber(activeRecipeInput || 0)} → ${formatNumber(octaplexResult.totalUi)} UI`
              : "INR ou poids requis",
            note: octaplexResult ? `${octaplexResult.uiKg} UI/kg` : "Calcul selon la table AVK",
            kind: "dose",
            control: recipeControl || undefined,
          },
          {
            label: "Volume à préparer",
            value: octaplexResult ? formatMl(octaplexResult.volumeMl) : "Calcul requis",
            note: "Reconstitution à 25 UI/mL",
            kind: "volume",
          },
          {
            label: "Débit à programmer",
            value:
              programmedRate === null ? "Poids requis" : `${formatNumber(programmedRate)} mL/h`,
            note: `${formatNumber(pseInput)} mL/kg/min · maximum 480 mL/h`,
            kind: "administration",
            control: {
              kind: "pse",
              value: pseInput,
              steps: pseSteps,
            },
          },
        ]
      : null;
  const pseMetrics: [PrepPreviewMetric, PrepPreviewMetric, PrepPreviewMetric] | null = pseResult
    ? [
        {
          ...pseResult.metrics[0],
          control: {
            kind: "pse",
            value: pseInput,
            steps: pseSteps,
          },
        },
        pseResult.metrics[1],
        pseResult.metrics[2],
      ]
    : null;
  const recipeMetrics: [PrepPreviewMetric, PrepPreviewMetric, PrepPreviewMetric] = recipeControl
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
  const ageMetrics: [PrepPreviewMetric, PrepPreviewMetric, PrepPreviewMetric] | null = ageControl
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
  const productDescription =
    isPse && prep
      ? resolveProductDetail(drug, prep, activeRecipe)
      : steps[0]?.detail || productSource;
  const productKind = /ampoules/i.test(productDescription)
    ? "Ampoules"
    : /ampoule/i.test(productDescription)
      ? "Ampoule"
      : /flacons/i.test(productDescription)
        ? "Flacons"
        : /flacon/i.test(productDescription)
          ? "Flacon"
          : "Produit";
  const controls = activeRecipe?.octaplex_inr
    ? [
        `Patient et poids : ${weight ? `${weight} kg` : "à confirmer"}`,
        `INR confirmé : ${activeRecipeInput === null ? "à confirmer" : formatNumber(activeRecipeInput)}`,
        `Dose et volume : ${octaplexResult ? `${formatNumber(octaplexResult.totalUi)} UI · ${formatMl(octaplexResult.volumeMl)}` : "à calculer"}`,
        `Débit programmé : ${programmedRate === null ? "à calculer" : `${formatNumber(programmedRate)} mL/h`}`,
        "Voie, tubulure et traçabilité identifiées",
      ]
    : isPse
      ? [
          `Patient et poids : ${weight ? `${weight} kg` : "à confirmer"}`,
          `${productKind} : ${productDescription}`,
          `${pseResult?.metrics[0].label || "Prescription ou réglage"} : ${pseResult?.metrics[0].value || "à confirmer"}`,
          `${pseResult?.metrics[1].label || "Débit programmé"} : ${pseResult?.metrics[1].value || "à calculer"}`,
          "Voie, tubulure et pompe identifiées",
        ]
      : hasPreparation
        ? [
            `Patient et poids : ${weight ? `${weight} kg` : "à confirmer"}`,
            `${productKind} : ${productDescription}`,
            `${administrationVolume ? "Volume injecté" : "Volume prélevé"} : ${prelevement}`,
            recipeVolumeFinal
              ? `Volume final : ${recipeVolumeFinal}`
              : "Dose et volume conformes à la prescription",
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
      : specializedPse?.validationReason || specialRecipe?.validationReason
        ? specializedPse?.validationReason || specialRecipe?.validationReason || null
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
