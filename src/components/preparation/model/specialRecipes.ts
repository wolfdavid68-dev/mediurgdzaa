import { calcPrepPhases, calcPrepSufentaIntranasal, calcPedTable } from "../../../lib/calc";
import type { Drug } from "../../../types/data";
import {
  computeAmiklinAdult,
  computeClottafactPediatric,
  computeKclIvl,
  computeKclPediatric,
  computeMeningitisPump,
  computePrepTableCurrentSteps,
  type DrugPrep,
  type PrepRecipe,
} from "../../PrepBlock.parts";
import type { PreparationStep } from "./types";
import {
  extractFinalVolumeLabel,
  extractPreparedVolume,
  extractSingleContainerVolume,
  formatMl,
  formatNumber,
  inferStepTitle,
  parseNumber,
  powderContainerPlan,
} from "./utils";

export const buildPedSteps = (prep: DrugPrep, weight: string): PreparationStep[] => {
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

type SpecialRecipeResult = {
  steps: PreparationStep[];
  requiresUserInput: boolean;
  validationReason?: string;
};

export const buildSpecialRecipeSteps = (
  drug: Drug,
  prep: DrugPrep,
  recipe: PrepRecipe | null,
  weight: string,
  recipeInput: number | null,
  ageBand: "lt6" | "gte6" | null
): SpecialRecipeResult | null => {
  const kg = Number.parseFloat(weight);
  const validKg = Number.isFinite(kg) && kg > 0 && kg <= 300;

  if (drug.preparationStrategy === "pediatric-glucose" && recipe?.population === "enfant") {
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

  if (drug.preparationStrategy === "pediatric-adrenaline" && recipe?.mode === "ped-ivd") {
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

  if (drug.preparationStrategy === "pediatric-adrenaline" && recipe?.mode === "ped-im") {
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

  if (
    drug.preparationStrategy === "glucagon-infusion" &&
    recipe?.population === "adulte" &&
    recipe.dose_input_unit === "mg/h"
  ) {
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

  if (drug.preparationStrategy === "glucagon-infusion" && recipe?.population === "enfant") {
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

  if (
    drug.preparationStrategy === "dose-based-dilution" &&
    recipe?.dose_based_dilution?.source === "dose_input"
  ) {
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

  if (drug.preparationStrategy === "pediatric-age-band" && recipe?.population === "enfant") {
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
