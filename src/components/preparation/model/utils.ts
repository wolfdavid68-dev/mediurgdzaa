import { calcDebit, calcDoseFromRate } from "../../../lib/calc";
import type { Drug } from "../../../types/data";
import { computeRecipePhaseRows, type DrugPrep, type PrepRecipe } from "../../PrepBlock.parts";
import type { PseEntry } from "../../PseBlock.parts";
import type { PreparationNumericControl, PreparationStep } from "./types";

export const formatNumber = (value: number, precision?: number) => {
  const rounded =
    precision === undefined
      ? String(Number(value.toFixed(6)))
      : value.toFixed(precision).replace(/0+$/, "").replace(/\.$/, "");
  return rounded.replace(".", ",");
};

export const parseNumber = (value: string) => Number(value.replace(",", "."));

export const formatMl = (value: number) => `${formatNumber(value)} mL`;

export const formatDosePerKgUnit = (unit: string) => {
  if (unit === "mg/h") return "mg/kg/h";
  if (unit === "UI/h") return "UI/kg/h";
  if (unit === "µg/min") return "µg/kg/min";
  return `${unit}/kg`;
};

export const displayableConcentration = (value: string) => {
  if (!value || /variable|selon|cible|prescription/i.test(value)) return null;
  return /\d[\d\s]*(?:[,.]\d+)?\s*(?:µg|ug|mg|g|UI)\s*\/\s*(?:\d[\d\s]*(?:[,.]\d+)?\s*)?mL\b/i.test(
    value
  )
    ? value
    : null;
};

export const productPresentationLabel = (detail: string) => {
  if (/\bflacon\b/i.test(detail)) return "Flacon";
  if (/\bampoule\b/i.test(detail)) return "Ampoule";
  return "Conditionnement vérifié";
};

export const productUnit = (prep: DrugPrep | null) => prep?.unite || "mg";

export const pseConcentrationUnit = (pse: PseEntry) => {
  if (pse.unite.includes("UI")) return "UI";
  if (pse.unite.includes("mg")) return "mg";
  if (pse.unite.startsWith("mL")) return "mL";
  return "µg";
};

const explicitActionVolume = (value?: string): number | null => {
  if (!value) return null;
  const leadingVolume = value.match(/^\s*(\d+(?:[,.]\d+)?)\s*mL\b(?!\s*\/\s*h)/i);
  if (leadingVolume) return parseNumber(leadingVolume[1]);
  const actionMatch = value.match(
    /(?:prélev(?:er|é|ement)?|inject(?:er|é|ion)?|administr(?:er|é|ation)?|aspir(?:er|é)|volume(?:\s+à)?)[^\d]{0,40}(\d+(?:[,.]\d+)?)\s*mL\b(?!\s*\/\s*h)/i
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

  return null;
};

export const extractPreparedVolume = (value?: string): string | null => {
  const containerRange = value?.match(
    /(\d+(?:[,.]\d+)?)\s*(?:à|[-–])\s*(\d+(?:[,.]\d+)?)\s*(?:ampoules?|flacons?)[\s\S]*?\d+(?:[,.]\d+)?\s*(?:µg|ug|mg|g|UI)\s*\/\s*(\d+(?:[,.]\d+)?)\s*mL/i
  );
  if (containerRange) {
    const min = parseNumber(containerRange[1]) * parseNumber(containerRange[3]);
    const max = parseNumber(containerRange[2]) * parseNumber(containerRange[3]);
    return `${formatNumber(min)}–${formatNumber(max)} mL`;
  }
  const volume = explicitActionVolume(value);
  return volume === null || !Number.isFinite(volume) ? null : formatMl(volume);
};

export const extractMedicationQuantity = (value?: string): string | null => {
  const match = value?.match(
    /(\d+(?:[,.]\d+)?)(?:\s*(?:à|[-–])\s*(\d+(?:[,.]\d+)?))?\s*(µg|ug|mg|g|MUI|UI)\b(?!\s*\/\s*mL)/i
  );
  if (!match) return null;
  const minimum = formatNumber(parseNumber(match[1]));
  const maximum = match[2] ? `–${formatNumber(parseNumber(match[2]))}` : "";
  return `${minimum}${maximum} ${match[3].replace(/^ug$/i, "µg")}`;
};

export const extractSingleContainerVolume = (value?: string): number | null => {
  if (!value) return null;
  const match = value.match(
    /(?:ampoule|flacon)[\s\S]*?\d+(?:[,.]\d+)?\s*(?:µg|ug|mg|g|UI)\s*\/\s*(\d+(?:[,.]\d+)?)\s*mL/i
  );
  return match ? parseNumber(match[1]) : null;
};

export const extractFinalVolumeLabel = (value?: string): string | null => {
  if (!value) return null;
  const alternative = value.match(
    /(\d+(?:[,.]\d+)?)\s*(?:mL\s*)?(?:ou|\/)\s*(\d+(?:[,.]\d+)?)\s*mL\b/i
  );
  if (alternative) {
    return `${formatNumber(parseNumber(alternative[1]))} ou ${formatNumber(parseNumber(alternative[2]))} mL`;
  }
  const contextual = value.match(
    /(?:dans|qsp|jusqu['’]?à|jusqu'a|à)\s*(?:un\s+volume(?:\s+final)?\s+de\s*)?(\d+(?:[,.]\d+)?)\s*mL\b(?!\s*\/\s*h)/i
  );
  if (contextual) return formatMl(parseNumber(contextual[1]));
  return extractPreparedVolume(value);
};

export const getPreparationPseSteps = (
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

export const getPreparationPseDefault = (
  pse: PseEntry | null,
  weight = "",
  prep: DrugPrep | null = null
): number => {
  const steps = getPreparationPseSteps(pse, weight, prep);
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

export const getPreparationPseInputConfig = (
  pse: PseEntry,
  weight: string,
  prep: DrugPrep | null,
  steps: number[]
): Pick<PreparationNumericControl, "unit" | "min" | "max"> => {
  const stepMinimum = steps.length ? Math.min(...steps) : undefined;
  const stepMaximum = steps.length ? Math.max(...steps) : undefined;

  // ANEXATE : l'entrée est le volume IVD efficace. Les min/max PSE sont
  // exprimés en mg/h et ne doivent donc pas borner ce champ en mL.
  if (prep?.dose_threshold_input_unit === "mL") {
    return { unit: "mL", min: stepMinimum, max: stepMaximum };
  }

  if (pse.inputMode === "effectiveDose") {
    return {
      unit: pse.effectiveInputUnit || pse.unite,
      min: pse.min,
      max: pse.max,
    };
  }

  if (pse.inputMode === "mlh") {
    const minimumRate = calcDebit(pse, pse.min, weight);
    const maximumRate = calcDebit(pse, pse.max, weight);
    return {
      unit: "mL/h",
      min: minimumRate ?? undefined,
      max: maximumRate ?? undefined,
    };
  }

  return { unit: pse.unite, min: pse.min, max: pse.max };
};

export const inferStepTitle = (detail: string, index: number) => {
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

export const inferStepResult = (
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

export type CalculatedVolumeRole = NonNullable<PrepRecipe["calculated_volume_role"]>;

export const timelineRow = (row: NonNullable<PrepRecipe["rows"]>[number]) =>
  !row.reference_only &&
  /^(?:puis\s+)?(?:reconstituer|prélever|diluer|compléter|injecter|administrer|perfuser|programmer|rincer|flush|répéter|fractionner|rythme|durée|débit|bolus|pse|surveiller|agiter|transférer|purger|nébuliser|instiller)\b/i.test(
    row.label
  );

export const phaseTitle = (label: string, role?: CalculatedVolumeRole) => {
  if (!role || (role === "prelever" && /prélev/i.test(label))) return label;
  if (role === "injecter" && /inject/i.test(label)) return label;
  if (role === "perfuser" && /perfus/i.test(label)) return label;
  if (role === "administrer" && /administr/i.test(label)) return label;
  if (role === "programmer" && /program|pse|débit/i.test(label)) return `Programmer — ${label}`;
  const verb = {
    prelever: "Prélever",
    injecter: "Injecter",
    perfuser: "Perfuser",
    administrer: "Administrer",
    programmer: "Programmer",
  }[role];
  return `${verb} — ${label}`;
};

export const volumeRoleFromAction = (value: string): CalculatedVolumeRole | null => {
  if (/inject|bolus/i.test(value)) return "injecter";
  if (/perfus/i.test(value)) return "perfuser";
  if (/administr/i.test(value)) return "administrer";
  if (/program|pse|débit/i.test(value)) return "programmer";
  if (/prélev|transfér/i.test(value)) return "prelever";
  return null;
};

export const volumeLabel = (role: CalculatedVolumeRole | null) =>
  ({
    prelever: "Volume de produit à prélever",
    injecter: "Volume à injecter",
    perfuser: "Volume à perfuser",
    administrer: "Volume à administrer",
    programmer: "Débit à programmer",
  })[role || "prelever"];

export const joinRecipeValues = (values: string[], relation?: PrepRecipe["phase_relation"]) => {
  const uniqueValues = [...new Set(values)];
  const separator =
    relation === "alternative" ? " ou " : relation === "breakdown" ? " · dont " : " puis ";
  return uniqueValues.length ? uniqueValues.join(separator) : null;
};

export const displayedVolumeFromResult = (value: string) =>
  [...value.matchAll(/\d+(?:[,.]\d+)?(?:\s*[–-]\s*\d+(?:[,.]\d+)?)?\s*mL\b(?!\s*\/\s*h)/gi)].at(
    -1
  )?.[0] || null;

const displayedRateFromResult = (value: string) =>
  value.match(/\d+(?:[,.]\d+)?(?:\s*[–-]\s*\d+(?:[,.]\d+)?)?\s*mL\s*\/\s*h\b/i)?.[0] || null;

export const displayedActionMeasure = (step: PreparationStep, role: CalculatedVolumeRole | null) =>
  role === "programmer"
    ? displayedRateFromResult(step.result)
    : displayedVolumeFromResult(step.result);

export const finalVolumeSummaryFromResult = (value: string) => {
  const volumes = [
    ...new Set(
      [
        ...value.matchAll(/\d+(?:[,.]\d+)?(?:\s*[–-]\s*\d+(?:[,.]\d+)?)?\s*mL\b(?!\s*\/\s*h)/gi),
      ].map((match) => match[0])
    ),
  ];
  if (volumes.length > 1) return volumes.join(" ou ");
  return extractFinalVolumeLabel(value) || volumes[0] || null;
};

export const concentrationDescriptor = (value?: string) => {
  const match = value?.match(/(\d[\d\s]*(?:[,.]\d+)?)\s*(µg|ug|mg|g|UI)\s*\/\s*mL\b/i);
  if (!match) return null;
  return {
    value: parseSpacedNumber(match[1]),
    unit: /^(?:µg|ug)$/i.test(match[2]) ? "µg" : match[2],
  };
};

export const concentrationValue = (value?: string): number | null =>
  concentrationDescriptor(value)?.value ?? null;

export type ContainerPresentation = {
  type: "ampoule" | "flacon";
  dose: number;
  unit: string;
  volume: number;
};

const containerPresentations = (value?: string): ContainerPresentation[] => {
  if (!value) return [];
  const type = /flacon/i.test(value) ? "flacon" : /ampoule/i.test(value) ? "ampoule" : null;
  if (!type) return [];
  const presentations: ContainerPresentation[] = [
    ...value.matchAll(/(\d[\d\s]*(?:[,.]\d+)?)\s*(µg|ug|mg|g|UI)\s*\/\s*(\d+(?:[,.]\d+)?)\s*mL/gi),
  ].map((match): ContainerPresentation => ({
    type,
    dose: parseSpacedNumber(match[1]),
    unit: match[2].replace(/^ug$/i, "µg"),
    volume: parseNumber(match[3]),
  }));
  return presentations.filter(
    (presentation, index) =>
      presentations.findIndex(
        (candidate) =>
          candidate.dose === presentation.dose &&
          candidate.unit === presentation.unit &&
          candidate.volume === presentation.volume &&
          candidate.type === presentation.type
      ) === index
  );
};

const containerVolumePresentations = (value?: string) => {
  if (!value) return [];
  const type = /flacon/i.test(value) ? "flacon" : /ampoule/i.test(value) ? "ampoule" : null;
  if (!type) return [];
  return [
    ...new Set(
      [...value.matchAll(/(\d+(?:[,.]\d+)?)\s*mL\b/gi)].map((match) => parseNumber(match[1]))
    ),
  ]
    .filter((volume) => Number.isFinite(volume) && volume > 0)
    .map((volume) => ({ type, volume }));
};

const matchingProductPercentage = (value: string, conditions: string[] = []) =>
  [...value.matchAll(/\b\d+(?:[,.]\d+)?\s*%/gi)]
    .map((match) => match[0])
    .find((percentage) => conditions.some((condition) => condition.includes(percentage)));

const parseSpacedNumber = (value: string) => Number(value.replace(/\s+/g, "").replace(",", "."));

export const concentrationFromProduct = (detail: string) => {
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

export const containerCount = (value?: string) =>
  value?.match(
    /\b(\d+(?:[,.]\d+)?(?:\s*[-–à]\s*\d+(?:[,.]\d+)?)?)\s*(ampoules?|flacons?)\b/i
  )?.[0] || null;

export const resolveProductDetail = (drug: Drug, prep: DrugPrep, recipe: PrepRecipe | null) => {
  if (recipe?.titre === "Débit PSE" && !recipe.prelever && prep.fd_prelever) {
    return prep.fd_prelever;
  }
  const sourceSteps = recipe?.etapes?.length ? recipe.etapes : prep.etapes || [];
  const selectedPresentations = presentationSignatures(recipe?.prelever);
  const matchingCondition = drug.cond?.find((condition) =>
    presentationSignatures(condition).some((signature) => selectedPresentations.includes(signature))
  );
  const recipeText = [
    recipe?.tag,
    recipe?.prelever,
    ...(recipe?.rows || []).flatMap((row) => [row.label, row.value]),
    ...(recipe?.etapes || []),
  ]
    .filter(Boolean)
    .join(" ");
  const requestedConcentration = matchingProductPercentage(recipeText, drug.cond);
  const matchingConcentrationCondition = requestedConcentration
    ? drug.cond?.find((condition) => condition.includes(requestedConcentration))
    : null;
  return (
    matchingCondition ||
    matchingConcentrationCondition ||
    sourceSteps.find((step) => /^\s*(?:ampoule|flacon)\b/i.test(step)) ||
    sourceSteps.find((step) => /\b(?:ampoule|flacon)\b/i.test(step)) ||
    drug.cond?.[0] ||
    `${drug.nom} · ${drug.dci}`
  );
};

export const powderContainerPlan = (drug: Drug, requiredDoseG: number) => {
  const sizes = [
    ...new Set(
      (drug.cond || []).flatMap((condition) =>
        [...condition.matchAll(/(\d+(?:[,.]\d+)?)\s*(mg|g)\b/gi)].map((match) => {
          const value = parseNumber(match[1]);
          return match[2].toLowerCase() === "mg" ? value / 1000 : value;
        })
      )
    ),
  ]
    .filter((value) => value > 0 && value <= requiredDoseG)
    .sort((a, b) => b - a);
  if (!sizes.length) return null;

  const plans: Array<{ count: number; label: string }> = [];
  for (const size of sizes) {
    const count = requiredDoseG / size;
    if (Math.abs(count - Math.round(count)) < 0.0001) {
      const rounded = Math.round(count);
      plans.push({
        count: rounded,
        label: `${rounded} flacon${rounded > 1 ? "s" : ""} de ${formatNumber(size)} g`,
      });
    }
  }

  let remaining = requiredDoseG;
  const parts: string[] = [];
  let greedyCount = 0;
  for (const size of sizes) {
    const count = Math.floor((remaining + 0.0001) / size);
    if (!count) continue;
    remaining = +(remaining - count * size).toFixed(4);
    greedyCount += count;
    parts.push(`${count} flacon${count > 1 ? "s" : ""} de ${formatNumber(size)} g`);
  }
  if (remaining < 0.0001 && parts.length > 1) {
    plans.push({ count: greedyCount, label: parts.join(" + ") });
  }

  return [...new Map(plans.map((plan) => [plan.label, plan])).values()]
    .sort((a, b) => a.count - b.count)
    .slice(0, 2)
    .map((plan) => plan.label)
    .join(" ou ");
};

export const requiredContainersLabel = (
  drug: Drug,
  recipe: PrepRecipe,
  phaseRows: ReturnType<typeof computeRecipePhaseRows>
) => {
  if (!phaseRows.length || containerCount(recipe.prelever)) return null;
  const doses = phaseRows
    .map((phase) => phase.doseMax ?? phase.dose)
    .filter((dose): dose is number => dose !== null && Number.isFinite(dose));
  if (!doses.length) return null;
  const totalDoseIndex = phaseRows.findIndex((phase) => /dose totale/i.test(phase.label));
  const requiredDose =
    totalDoseIndex >= 0
      ? doses[totalDoseIndex]
      : recipe.phase_relation === "sequence"
        ? doses.reduce((a, b) => a + b, 0)
        : Math.max(...doses);
  const unit = phaseRows[0]?.unit || "mg";
  const recipeText = [
    recipe.tag,
    recipe.prelever,
    ...(recipe.rows || []).flatMap((row) => [row.label, row.value]),
    ...(recipe.etapes || []),
  ]
    .filter(Boolean)
    .join(" ");
  const requestedConcentration = matchingProductPercentage(recipeText, drug.cond);
  const relevantConditions = requestedConcentration
    ? (drug.cond || []).filter((condition) => condition.includes(requestedConcentration))
    : drug.cond || [];
  const recipePresentations = containerPresentations(recipe.prelever);
  const presentationSources = recipePresentations.length ? [recipe.prelever!] : relevantConditions;
  const presentations = presentationSources
    .flatMap(containerPresentations)
    .filter((presentation) => presentation.unit.toLowerCase() === unit.toLowerCase());
  const options = presentations
    .map((presentation) => ({
      ...presentation,
      count: Math.ceil(requiredDose / presentation.dose),
    }))
    .filter(
      (presentation) =>
        presentation.dose > 0 && Number.isFinite(presentation.count) && presentation.count >= 1
    )
    .sort((a, b) => a.count - b.count);
  if (options.length && (options.length > 1 || options.some((option) => option.count > 1))) {
    return options
      .slice(0, 2)
      .map(
        (option) =>
          `${option.count} ${option.type}${option.count > 1 ? "s" : ""} de ${formatNumber(option.dose)} ${option.unit}`
      )
      .join(" ou ");
  }
  if (presentations.length) return null;

  const requiredVolume = Math.max(
    0,
    ...phaseRows.map((phase) => phase.volumeMax ?? phase.volume ?? 0).filter(Number.isFinite)
  );
  const volumeOptions = presentationSources
    .flatMap(containerVolumePresentations)
    .map((presentation) => ({
      ...presentation,
      count: Math.ceil(requiredVolume / presentation.volume),
    }))
    .filter(
      (presentation) =>
        requiredVolume > 0 && Number.isFinite(presentation.count) && presentation.count >= 1
    )
    .sort((a, b) => a.count - b.count);
  if (!volumeOptions.length || (volumeOptions.length === 1 && volumeOptions[0].count === 1)) {
    return null;
  }
  return volumeOptions
    .slice(0, 2)
    .map(
      (option) =>
        `${option.count} ${option.type}${option.count > 1 ? "s" : ""} de ${formatMl(option.volume)}`
    )
    .join(" ou ");
};

export const phaseCapacityIssue = (
  recipe: PrepRecipe | null,
  prep: DrugPrep | null,
  weight: string
) => {
  if (
    !recipe ||
    !prep ||
    !["injecter", "administrer"].includes(recipe.calculated_volume_role || "")
  ) {
    return null;
  }
  const finalLabel = extractFinalVolumeLabel(recipe.completer || recipe.prelever);
  if (!finalLabel) return null;
  const finalVolumes = [...finalLabel.matchAll(/\d+(?:[,.]\d+)?/g)].map((match) =>
    parseNumber(match[0])
  );
  const availableVolume = finalVolumes.length ? Math.max(...finalVolumes) : null;
  if (!availableVolume) return null;
  const kg = Number.parseFloat(weight);
  const recipeConcentration = concentrationDescriptor(recipe.concentration || recipe.conc_finale);
  const rows = computeRecipePhaseRows(
    recipe,
    recipeConcentration
      ? {
          ...prep,
          conc_produit: recipeConcentration.value,
          unite: recipeConcentration.unit,
        }
      : prep,
    kg,
    Number.isFinite(kg) && kg > 0 && kg <= 300
  );
  const requiredVolume = Math.max(
    0,
    ...rows.map((row) => row.volumeMax ?? row.volume ?? 0).filter(Number.isFinite)
  );
  return requiredVolume > availableVolume + 0.01
    ? `Volume calculé ${formatMl(requiredVolume)} supérieur au volume préparé ${formatMl(availableVolume)} — vérifier le protocole`
    : null;
};
