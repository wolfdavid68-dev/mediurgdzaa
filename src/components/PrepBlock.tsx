import { Fragment, useEffect, useState } from "react";
import {
  calcPrepThreshold,
  calcPrepSufentaTable,
  calcPrepNoradTable,
  calcPrepAdrenalineTable,
  calcPrepDobutamineTable,
  calcPrepIsuprelTable,
  calcPrepOctaplexInr,
  calcPrepSufentaIntranasal,
  calcPrepPhases,
  calcPrepDoseKg,
  calcPedTable,
  calcDoseLibre,
} from "../lib/calc";
import { isPreview } from "../lib/featureFlags";
import type { Drug } from "../types/data";
import {
  computeEffectivePrep,
  computePrepTableCurrentSteps,
  computeRecipeDoseInputValue,
  computeRecipePhaseRows,
  computeRecipeWeightBand,
  computeThresholdDose,
  computeThresholdTitle,
  formatDoseNumber,
  formatNumberRange,
  InfoIcon,
  PrepIcon,
  recipeModeClass,
  resolvePrep,
} from "./PrepBlock.parts";
import type { PreviewPrepByDrugId, PrepRecipe, PrepRecipePhaseRow } from "./PrepBlock.parts";

type PrepBlockProps = {
  drug: Drug;
  weight: string;
  produitFinal?: string;
  prepPopulation?: "adulte" | "enfant" | null;
};

// Bloc Préparation : étapes + calculateur (4 variantes selon la shape de prep).
const PrepBlock = ({ drug, weight, produitFinal, prepPopulation }: PrepBlockProps) => {
  const [doseLibre, setDoseLibre] = useState("");
  const [activePrepIndex, setActivePrepIndex] = useState(0);
  const [activePedPrep, setActivePedPrep] = useState<"ivd" | "im" | "pse">("ivd");
  const [effectivePrepInput, setEffectivePrepInput] = useState("");
  const [dosePrepInput, setDosePrepInput] = useState("");
  const [thresholdInput, setThresholdInput] = useState("");
  const previewMode = isPreview();
  // Le layout Préparation v2 est public sur main ; previewMode ne pilote plus
  // que le chargement des données preview, pas la forme visuelle du bloc.
  const prepV2Mode = true;
  const [previewPrepByDrugId, setPreviewPrepByDrugId] = useState<PreviewPrepByDrugId | null>(null);

  useEffect(() => {
    if (!previewMode) {
      setPreviewPrepByDrugId(null);
      return;
    }

    let active = true;
    import("../data/drugs.preview")
      .then(({ DRUGS_PREVIEW }) => {
        if (active) setPreviewPrepByDrugId(DRUGS_PREVIEW as unknown as PreviewPrepByDrugId);
      })
      .catch(() => {
        if (active) setPreviewPrepByDrugId({});
      });

    return () => {
      active = false;
    };
  }, [previewMode]);

  const prep = resolvePrep(drug, previewMode ? previewPrepByDrugId : null);
  if (!prep) return null;

  const kg = parseFloat(weight);
  const validKg = kg && kg > 0 && kg <= 300;
  if (prep.display_below_kg !== undefined && (!validKg || kg >= prep.display_below_kg)) {
    return null;
  }
  const inferredPopulation = validKg && kg < 30 ? "enfant" : "adulte";
  const activePopulation = prepPopulation || inferredPopulation;
  const visiblePreparations = (prep.preparations || []).filter(
    (recipe) => !recipe.population || recipe.population === activePopulation
  );
  const activeRecipeIndex = visiblePreparations[activePrepIndex] ? activePrepIndex : 0;
  // Wrappers fins : la logique pure vit dans PrepBlock.parts (testée à part).
  // Ici on ne fait que la lier au closure du composant (kg, validKg, prep,
  // saisies) pour garder les sites d'appel JSX inchangés.
  const okKg = Boolean(validKg);
  const getEffectivePrep = (recipe: PrepRecipe) => computeEffectivePrep(recipe, effectivePrepInput);
  const getRecipeDoseInputValue = (recipe: PrepRecipe) =>
    computeRecipeDoseInputValue(recipe, dosePrepInput);
  const getRecipePhaseRows = (recipe: PrepRecipe): PrepRecipePhaseRow[] =>
    computeRecipePhaseRows(recipe, prep, kg, okKg);
  const getRecipeWeightBand = (recipe: PrepRecipe) =>
    computeRecipeWeightBand(recipe, prep, kg, okKg);
  const renderRecipeWeightBand = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const result = getRecipeWeightBand(recipe);
    if (!result) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    const label = result.band?.label || "Dose poids";
    const value =
      result.dose === null
        ? "Saisir le poids"
        : `${formatDoseNumber(result.dose)} ${result.band?.unit || prep.unite || "mg"}${
            result.volume !== null ? ` = ${formatDoseNumber(result.volume)} mL` : ""
          }`;
    return (
      <div className="prep-calc-row">
        <span className="prep-calc-step">{label}</span>
        <span className={`prep-calc-val ${highlightClass}`}>{value}</span>
      </div>
    );
  };
  const renderRecipePhaseRows = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const rows = getRecipePhaseRows(recipe);
    if (!rows.length) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    return (
      <>
        {rows.map((phase) => {
          const doseText =
            phase.dose === null
              ? "Saisir le poids"
              : `${formatNumberRange(phase.dose, phase.doseMax)} ${phase.unit || "mg"}${
                  phase.volume !== null && !recipe.hide_phase_volume
                    ? ` = ${formatNumberRange(phase.volume, phase.volumeMax)} mL`
                    : ""
                }${phase.duree && !recipe.hide_phase_volume ? ` / ${phase.duree}` : ""}${
                  phase.suffix || ""
                }`;
          return (
            <Fragment key={`${recipe.titre}-${phase.label}`}>
              <div className="prep-calc-row">
                <span className="prep-calc-step">{phase.label}</span>
                <span className={`prep-calc-val ${highlightClass}`}>{doseText}</span>
              </div>
              {phase.rate !== null && (
                <div className="prep-calc-row">
                  <span className="prep-calc-step">Débit PSE</span>
                  <span className={`prep-calc-val ${highlightClass}`}>
                    {formatNumberRange(phase.rate, phase.rateMax)} mL/h
                  </span>
                </div>
              )}
            </Fragment>
          );
        })}
      </>
    );
  };
  const renderRecipeDoseBasedDilution = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    if (!recipe.dose_based_dilution) return null;
    const {
      threshold,
      below_or_equal,
      above,
      label = "Diluer",
      strict_below,
      source,
    } = recipe.dose_based_dilution;
    const inputDose =
      source === "dose_input" ||
      (!recipe.phase_doses?.length && recipe.dose_input_default !== undefined)
        ? getRecipeDoseInputValue(recipe)
        : null;
    const phase = inputDose === null ? getRecipePhaseRows(recipe)[0] : null;
    const dose = inputDose ?? phase?.dose ?? null;
    const doseMax = inputDose === null ? (phase?.doseMax ?? dose) : dose;
    if (dose === null || doseMax === null) return null;
    const isBelowThreshold = (value: number) =>
      strict_below ? value < threshold : value <= threshold;
    const belowLabel = strict_below ? `< ${threshold} mg` : `≤ ${threshold} mg`;
    const aboveLabel = strict_below ? `≥ ${threshold} mg` : `> ${threshold} mg`;
    const dilution =
      phase?.doseMax !== null &&
      inputDose === null &&
      isBelowThreshold(dose) &&
      !isBelowThreshold(doseMax)
        ? `${below_or_equal} si ${belowLabel} / ${above} si ${aboveLabel}`
        : !isBelowThreshold(doseMax)
          ? above
          : below_or_equal;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    return (
      <div className="prep-calc-row">
        <span className="prep-calc-step">{label}</span>
        <span className={`prep-calc-val ${highlightClass}`}>{dilution}</span>
      </div>
    );
  };
  const renderRecipeCustomRows = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    if (!recipe.rows?.length) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    return (
      <>
        {recipe.rows.map((row) => (
          <div key={`${recipe.titre}-${row.label}`} className="prep-calc-row">
            <span className="prep-calc-step">{row.label}</span>
            <span className={`prep-calc-val${row.highlight ? ` ${highlightClass}` : ""}`}>
              {row.value}
            </span>
          </div>
        ))}
      </>
    );
  };
  const renderEffectivePrepInput = (recipe: PrepRecipe) =>
    recipe.effective_input_conc && recipe.effective_output_conc ? (
      <label className="prep-inline-input">
        <span>{recipe.effective_input_label || "Dose efficace"}</span>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder={recipe.effective_placeholder || "mL"}
          aria-label={recipe.effective_input_label || "Dose efficace"}
          value={effectivePrepInput}
          onChange={(event) => setEffectivePrepInput(event.target.value)}
        />
        <span>{recipe.effective_input_unit || "mL"}</span>
      </label>
    ) : null;
  const renderRecipeDoseInput = (recipe: PrepRecipe) => {
    const unit = recipe.dose_input_unit ?? "g";
    return recipe.kcl_ivl ||
      recipe.kcl_pediatric ||
      recipe.dose_input_default !== undefined ||
      recipe.dose_input_label ? (
      <label className="prep-inline-input">
        <span>{recipe.dose_input_label || "Dose"}</span>
        <input
          type="number"
          min={recipe.dose_input_min ?? 0}
          max={recipe.dose_input_max}
          step={recipe.dose_input_step ?? 1}
          placeholder={String(recipe.dose_input_default ?? "")}
          aria-label={recipe.dose_input_label || "Dose"}
          value={dosePrepInput}
          onChange={(event) => setDosePrepInput(event.target.value)}
        />
        {unit && <span>{unit}</span>}
      </label>
    ) : null;
  };
  const renderKclIvlRows = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    if (!recipe.kcl_ivl) return null;
    const dose = getRecipeDoseInputValue(recipe);
    if (!dose) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    const volume = dose <= 1 ? 250 : dose <= 2 ? 500 : 1000;
    const doseLabel = formatDoseNumber(dose);
    const prelever =
      Number.isInteger(dose) && dose >= 1
        ? `${doseLabel} ampoule${dose > 1 ? "s" : ""} 1 g/10 mL (= ${doseLabel} g)`
        : `${formatDoseNumber(dose * 10)} mL de KCl 1 g/10 mL (= ${doseLabel} g)`;
    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose</span>
          <span className={`prep-calc-val ${highlightClass}`}>{doseLabel} g</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Prélever</span>
          <span className={`prep-calc-val ${highlightClass}`}>{prelever}</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Diluer</span>
          <span className="prep-calc-val">{volume} mL avec NaCl 0,9%</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Débit max</span>
          <span className="prep-calc-val">1 g/h</span>
        </div>
      </>
    );
  };
  const renderKclPediatricRows = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    if (!recipe.kcl_pediatric || !validKg) return null;
    const targetDose = getRecipeDoseInputValue(recipe);
    if (!targetDose) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    const mmol = +(kg * targetDose).toFixed(1);
    const productMl = +(mmol / 1.34).toFixed(1);
    const minFinalMl = Math.ceil(mmol * 25);
    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Pour</span>
          <span className={`prep-calc-val ${highlightClass}`}>{formatDoseNumber(kg)} kg</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose</span>
          <span className={`prep-calc-val ${highlightClass}`}>{formatDoseNumber(mmol)} mmol/h</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Prélever</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(productMl)} mL de KCl 1 g/10 mL
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Diluer</span>
          <span className="prep-calc-val">
            au moins {formatDoseNumber(minFinalMl)} mL NaCl 0,9%
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Limite VVP</span>
          <span className="prep-calc-val">max 40 mmol/L</span>
        </div>
      </>
    );
  };
  const renderClottafactPediatricRows = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    if (!recipe.clottafact_pediatric || !validKg) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    const doseMg = Math.round(kg * 70);
    const doseG = +(doseMg / 1000).toFixed(2);
    const flacons = Math.ceil(doseG / 1.5);

    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Pour</span>
          <span className={`prep-calc-val ${highlightClass}`}>{formatDoseNumber(kg)} kg</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {doseMg} mg = {formatDoseNumber(doseG)} g
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Reconstituer</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {flacons} flacon{flacons > 1 ? "s" : ""} de 1,5 g
          </span>
        </div>
      </>
    );
  };
  const renderAmiklinAdultRows = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    if (!recipe.amiklin_adult || !validKg) return null;
    const phase = getRecipePhaseRows(recipe)[0];
    if (!phase || phase.dose === null) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    const doseMin = phase.dose;
    const doseMax = phase.doseMax ?? phase.dose;
    const concMgMl = 100;
    const formatPlan = (dose: number) => {
      const flacon1g = Math.floor(dose / 1000);
      const remainderAfter1g = dose - flacon1g * 1000;
      const flacon500 = Math.floor(remainderAfter1g / 500);
      const appointMg = +(remainderAfter1g - flacon500 * 500).toFixed(1);
      const appointMl = +(appointMg / concMgMl).toFixed(1);
      const parts = [
        flacon1g > 0 ? `${flacon1g} flacon${flacon1g > 1 ? "s" : ""} 1 g` : null,
        flacon500 > 0 ? `${flacon500} flacon 500 mg` : null,
        appointMg > 0
          ? `${formatDoseNumber(appointMg)} mg (${formatDoseNumber(appointMl)} mL) d'appoint`
          : null,
      ].filter(Boolean);
      const opened = [
        flacon1g > 0 ? `${flacon1g} x 1 g` : null,
        flacon500 + (appointMg > 0 ? 1 : 0) > 0
          ? `${flacon500 + (appointMg > 0 ? 1 : 0)} x 500 mg`
          : null,
      ].filter(Boolean);
      return {
        dose,
        plan: parts.join(" + "),
        opened: opened.join(" + "),
      };
    };
    const lowPlan = formatPlan(doseMin);
    const highPlan = doseMax !== doseMin ? formatPlan(doseMax) : null;

    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose basse</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(lowPlan.dose)} mg : {lowPlan.plan}
          </span>
        </div>
        {highPlan && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Dose haute</span>
            <span className={`prep-calc-val ${highlightClass}`}>
              {formatDoseNumber(highPlan.dose)} mg : {highPlan.plan}
            </span>
          </div>
        )}
      </>
    );
  };
  const renderAmoxicillineMeningeeRows = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    if (!recipe.amoxicilline_meningee_pump && !recipe.claforan_meningee_pump) return null;
    const requestedDose = getRecipeDoseInputValue(recipe);
    if (!requestedDose) return null;
    const table = recipe.claforan_meningee_pump
      ? [
          { dose: 6, prep: "2 g/48 mL", rate: 6 },
          { dose: 12, prep: "3 g/48 mL", rate: 8 },
          { dose: 14, prep: "3 g/48 mL", rate: 9.3 },
          { dose: 16, prep: "4 g/48 mL", rate: 8 },
          { dose: 20, prep: "5 g/48 mL", rate: 8 },
          { dose: 24, prep: "6 g/250 mL", rate: 8 },
        ]
      : [
          { dose: 6, prep: "2 g/100 mL", rate: 12 },
          { dose: 8, prep: "2 g/100 mL", rate: 17 },
          { dose: 10, prep: "5 g/250 mL", rate: 21 },
          { dose: 12, prep: "5 g/250 mL", rate: 25 },
          { dose: 14, prep: "5 g/250 mL", rate: 29 },
          { dose: 16, prep: "5 g/250 mL", rate: 33 },
          { dose: 18, prep: "5 g/250 mL", rate: 37 },
          { dose: 20, prep: "5 g/250 mL", rate: 42 },
          { dose: 22, prep: "5 g/250 mL", rate: 46 },
          { dose: 24, prep: "5 g/250 mL", rate: 50 },
        ];
    const current =
      table.find((row) => row.dose === requestedDose) ||
      table.reduce((closest, row) =>
        Math.abs(row.dose - requestedDose) < Math.abs(closest.dose - requestedDose) ? row : closest
      );
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";

    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose/j</span>
          <span className={`prep-calc-val ${highlightClass}`}>{current.dose} g/j</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Préparation</span>
          <span className={`prep-calc-val ${highlightClass}`}>{current.prep}</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Débit pompe</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(current.rate)} mL/h
          </span>
        </div>
      </>
    );
  };
  const renderEffectivePrepRows = (recipe: PrepRecipe) => {
    const result = getEffectivePrep(recipe);
    if (!result) return null;
    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">{recipe.effective_output_label || "Débit"}</span>
          <span className="prep-calc-val prep-highlight">{result.rate} mL/h</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Repère</span>
          <span className="prep-calc-val">
            2/3 dose = {result.hourlyDose.toString().replace(".", ",")} mg/h
          </span>
        </div>
      </>
    );
  };
  const renderPrepTableCurrentRows = (variant: "classic" | "v2") => {
    if (!prep.table || !validKg) return null;
    const currentRow = prep.table.rows.find((row) => row.poids === kg);
    if (!currentRow) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Pour</span>
          <span className={`prep-calc-val ${highlightClass}`}>{kg} kg</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Prélever Vi</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(currentRow.vi)} mL de produit
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Compléter Vf</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {currentRow.vf} mL avec {prep.solvant}
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Vitesse</span>
          <span className="prep-calc-val">{currentRow.vitesse} mL/h</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Débit EP</span>
          <span className="prep-calc-val">{formatDoseNumber(currentRow.debitEp)} mg/min</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Temps</span>
          <span className="prep-calc-val">{currentRow.temps} min</span>
        </div>
      </>
    );
  };
  const getPrepTableCurrentSteps = () => computePrepTableCurrentSteps(prep, kg, okKg);
  const renderStaticPrepCalcV2 = () => {
    const preleverLabel = prep.prelever_label || prep.fd_prelever;
    const firstStep = prep.etapes?.[0];
    const hasUsefulFirstStep = firstStep && !firstStep.toLowerCase().startsWith("débit");
    const rows = [
      preleverLabel
        ? { label: "Prélever", value: preleverLabel, highlight: true }
        : hasUsefulFirstStep
          ? { label: "Préparer", value: firstStep, highlight: true }
          : null,
      prep.volume_final && prep.solvant
        ? { label: "Compléter", value: `${prep.volume_final} mL avec ${prep.solvant}` }
        : null,
      prep.debit ? { label: "Débit", value: prep.debit, highlight: true } : null,
      prep.conc_finale ? { label: "Final", value: prep.conc_finale, highlight: true } : null,
    ].filter(Boolean) as Array<{ label: string; value: string; highlight?: boolean }>;

    if (!rows.length) return null;
    return (
      <div className="prep-calc">
        <div className="prep-calc-header">
          <span>Préparation</span>
          {prep.duree && <span>{prep.duree}</span>}
        </div>
        {rows.map((row) => (
          <div key={row.label} className="prep-calc-row">
            <span className="prep-calc-step">{row.label}</span>
            <span className={`prep-calc-val${row.highlight ? " prep-highlight" : ""}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    );
  };
  const thresholdValue = thresholdInput || produitFinal || "";
  const renderThresholdInput = () => (
    <label className="prep-inline-input">
      <span>{prep.dose_threshold_input_label || "Dose efficace"}</span>
      <input
        type="number"
        min="0"
        step="0.1"
        placeholder={prep.dose_threshold_placeholder || prep.dose_threshold_input_unit || "mg"}
        aria-label={prep.dose_threshold_input_label || "Dose efficace"}
        value={thresholdInput}
        onChange={(event) => setThresholdInput(event.target.value)}
      />
      <span>{prep.dose_threshold_input_unit || "mg"}</span>
    </label>
  );
  const getThresholdDose = () => computeThresholdDose(prep, thresholdValue);
  const getThresholdTitle = (pf?: number) => computeThresholdTitle(prep, thresholdValue, pf);

  const renderRecipeSwitch = () =>
    visiblePreparations.length > 1 ? (
      <div className="prep-mode-switch" role="group" aria-label="Choix de préparation">
        {visiblePreparations.map((recipe, index) => (
          <button
            key={recipe.titre}
            type="button"
            className={`prep-mode-option${recipeModeClass(recipe)}${
              index === activeRecipeIndex ? " is-active" : ""
            }`}
            aria-pressed={index === activeRecipeIndex}
            onClick={() => setActivePrepIndex(index)}
          >
            <span>{recipe.titre}</span>
            {recipe.tag && <small>{recipe.tag}</small>}
          </button>
        ))}
      </div>
    ) : null;

  const renderRecipeEmpty = (recipe: PrepRecipe) => (
    <div className={`prep-calc-empty${recipeModeClass(recipe)}`}>
      <div className="prep-calc-header">
        <InfoIcon /> {recipe.titre}
        {recipe.tag && <span style={{ marginLeft: "auto" }}>{recipe.tag}</span>}
      </div>
      <div className="prep-empty-text">{recipe.note || "Préparation à compléter."}</div>
    </div>
  );

  const renderRecipeSufentaTable = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const r = calcPrepSufentaTable(weight);
    if (!r) return null;
    if (variant === "v2") {
      return (
        <div className={`prep-calc${recipeModeClass(recipe)}`}>
          <div className="prep-calc-header">
            <span>Pour {r.kg} kg</span>
            <span>{recipe.tag || "IVSE"}</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prélever</span>
            <span className="prep-calc-val prep-highlight">{r.vi} mL d'ampoule pure</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Diluer</span>
            <span className="prep-calc-val">à {r.vf} mL dans la seringue</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Débit</span>
            <span className="prep-calc-val">2 à 20 mL/h (= 0,2 à 2 µg/kg/h)</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`prep-calc-box${recipeModeClass(recipe)}`}>
        <div className="prep-calc-header">
          <PrepIcon /> Pour {r.kg} kg
          {recipe.tag && <span style={{ marginLeft: "auto" }}>{recipe.tag}</span>}
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Vi (prélever)</span>
          <span className="prep-calc-val prep-calc-highlight">{r.vi} mL d'ampoule pure</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Vf (diluer à)</span>
          <span
            className="prep-calc-val prep-calc-highlight"
            style={{ color: "#60a5fa", fontWeight: 800 }}
          >
            {r.vf} mL dans la seringue
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Débit IVSE</span>
          <span className="prep-calc-val">2 à 20 mL/h (= 0,2 à 2 µg/kg/h)</span>
        </div>
      </div>
    );
  };

  const renderRecipeNoradTable = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const r = calcPrepNoradTable(weight);
    if (!r) return null;
    if (variant === "v2") {
      return (
        <div className={`prep-calc${recipeModeClass(recipe)}`}>
          <div className="prep-calc-header">
            <span>Pour {r.kg} kg</span>
            <span>{recipe.tag || "IVSE poids"}</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prélever</span>
            <span className="prep-calc-val prep-highlight">{r.vi} mL de noradrénaline</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Diluer</span>
            <span className="prep-calc-val">à {r.vf} mL dans la seringue</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Débit</span>
            <span className="prep-calc-val">2,5 à 20 mL/h (= 0,25 à 2 µg/kg/min)</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`prep-calc-box${recipeModeClass(recipe)}`}>
        <div className="prep-calc-header">
          <PrepIcon /> Pour {r.kg} kg
          {recipe.tag && <span style={{ marginLeft: "auto" }}>{recipe.tag}</span>}
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Vi (prélever)</span>
          <span className="prep-calc-val prep-calc-highlight">{r.vi} mL de noradrénaline</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Vf (diluer à)</span>
          <span
            className="prep-calc-val prep-calc-highlight"
            style={{ color: "#60a5fa", fontWeight: 800 }}
          >
            {r.vf} mL dans la seringue
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Débit IVSE</span>
          <span className="prep-calc-val">2,5 à 20 mL/h (= 0,25 à 2 µg/kg/min)</span>
        </div>
      </div>
    );
  };

  const renderRecipeAdrenalineTable = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const r = calcPrepAdrenalineTable(weight);
    if (!r) return null;
    return renderRecipeViVfTable(recipe, variant, r, "mL d'adrénaline", "IVSE poids", {
      classic: "1,25 à 20 mL/h (= 0,125 à 2 µg/kg/min)",
      v2: "1,25 à 20 mL/h (= 0,125 à 2 µg/kg/min)",
    });
  };

  const renderRecipeDobutamineTable = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const r = calcPrepDobutamineTable(weight);
    if (!r) return null;
    return renderRecipeViVfTable(recipe, variant, r, "mL de Dobutrex", "IVSE poids", {
      classic: "2,5 à 20 mL/h (= 2,5 à 20 µg/kg/min)",
      v2: "2,5 à 20 mL/h (= 2,5 à 20 µg/kg/min)",
    });
  };

  const renderRecipeIsuprelTable = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const r = calcPrepIsuprelTable(weight);
    if (!r) return null;
    return renderRecipeViVfTable(recipe, variant, r, "mL d'Isuprel", "IVSE poids", {
      classic: "1 à 10 mL/h (= 0,01 à 0,1 µg/kg/min)",
      v2: "1 à 10 mL/h (= 0,01 à 0,1 µg/kg/min)",
    });
  };

  function renderRecipeViVfTable(
    recipe: PrepRecipe,
    variant: "classic" | "v2",
    r: { kg: number; vi: number; vf: number },
    productLabel: string,
    defaultTag: string,
    debit: { classic: string; v2: string }
  ) {
    if (variant === "v2") {
      return (
        <div className={`prep-calc${recipeModeClass(recipe)}`}>
          <div className="prep-calc-header">
            <span>Pour {r.kg} kg</span>
            <span>{recipe.tag || defaultTag}</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prélever</span>
            <span className="prep-calc-val prep-highlight">
              {r.vi} {productLabel}
            </span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Diluer</span>
            <span className="prep-calc-val">à {r.vf} mL dans la seringue</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Débit</span>
            <span className="prep-calc-val">{debit.v2}</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`prep-calc-box${recipeModeClass(recipe)}`}>
        <div className="prep-calc-header">
          <PrepIcon /> Pour {r.kg} kg
          {recipe.tag && <span style={{ marginLeft: "auto" }}>{recipe.tag}</span>}
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Vi (prélever)</span>
          <span className="prep-calc-val prep-calc-highlight">
            {r.vi} {productLabel}
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Vf (diluer à)</span>
          <span
            className="prep-calc-val prep-calc-highlight"
            style={{ color: "#60a5fa", fontWeight: 800 }}
          >
            {r.vf} mL dans la seringue
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Débit IVSE</span>
          <span className="prep-calc-val">{debit.classic}</span>
        </div>
      </div>
    );
  }

  const renderRecipeOctaplexInr = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const result = calcPrepOctaplexInr(weight, dosePrepInput || recipe.dose_input_default);
    const boxClass = variant === "v2" ? "prep-calc" : "prep-calc-box";
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    const headerTitle = recipe.titre || "AVK selon INR";
    return (
      <div className={`${boxClass}${recipeModeClass(recipe)}`}>
        <div className="prep-calc-header">
          {variant === "classic" && <PrepIcon />}
          <span>{headerTitle}</span>
          {renderRecipeDoseInput(recipe)}
          {recipe.tag && <span>{recipe.tag}</span>}
        </div>
        {!validKg && <div className="prep-empty-text">Saisir le poids pour calculer la dose.</div>}
        {validKg && !result && (
          <div className="prep-empty-text">Saisir un INR ≥ 2 pour calculer la dose AVK.</div>
        )}
        {result && (
          <>
            <div className="prep-calc-row">
              <span className="prep-calc-step">Dose</span>
              <span className={`prep-calc-val ${highlightClass}`}>{result.uiKg} UI/kg</span>
            </div>
            <div className="prep-calc-row">
              <span className="prep-calc-step">Total</span>
              <span className={`prep-calc-val ${highlightClass}`}>
                {formatDoseNumber(result.totalUi)} UI
                {result.capped ? " (max 3000 UI)" : ""}
              </span>
            </div>
            <div className="prep-calc-row">
              <span className="prep-calc-step">Volume estimé</span>
              <span className="prep-calc-val">
                {formatDoseNumber(result.volumeMl)} mL à 25 UI/mL
              </span>
            </div>
            <div className="prep-calc-row">
              <span className="prep-calc-step">Associer</span>
              <span className="prep-calc-val">Vitamine K1 10 mg IV si AVK</span>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderRecipeSufentaIntranasal = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const r = calcPrepSufentaIntranasal(weight);
    if (!r) return null;
    const boxClass = variant === "v2" ? "prep-calc" : "prep-calc-box";
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    const secondNarine = r.narine2 !== null ? `${formatDoseNumber(r.narine2)} mL` : "non";
    return (
      <div className={`${boxClass}${recipeModeClass(recipe)}`}>
        <div className="prep-calc-header">
          <span>Pour {r.kg} kg</span>
          <span>{recipe.tag || "Intranasal"}</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose pleine</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(r.dose)} µg = {formatDoseNumber(r.volume)} mL
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Narine n°1</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(r.narine1)} mL
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Narine n°2</span>
          <span className="prep-calc-val">{secondNarine}</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Rappel demi-dose</span>
          <span className="prep-calc-val">
            {formatDoseNumber(r.demiDose)} µg = {formatDoseNumber(r.demiVolume)} mL
          </span>
        </div>
      </div>
    );
  };

  const renderRecipeCalcBox = (recipe: PrepRecipe) =>
    recipe.empty ? (
      renderRecipeEmpty(recipe)
    ) : recipe.adrenaline_table ? (
      renderRecipeAdrenalineTable(recipe, "classic")
    ) : recipe.dobutamine_table ? (
      renderRecipeDobutamineTable(recipe, "classic")
    ) : recipe.isuprel_table ? (
      renderRecipeIsuprelTable(recipe, "classic")
    ) : recipe.sufenta_table ? (
      renderRecipeSufentaTable(recipe, "classic")
    ) : recipe.norad_table ? (
      renderRecipeNoradTable(recipe, "classic")
    ) : recipe.octaplex_inr ? (
      renderRecipeOctaplexInr(recipe, "classic")
    ) : recipe.sufenta_intranasal ? (
      renderRecipeSufentaIntranasal(recipe, "classic")
    ) : (
      <div key={recipe.titre} className={`prep-calc-box${recipeModeClass(recipe)}`}>
        <div className="prep-calc-header">
          <PrepIcon /> {recipe.titre}
          {renderEffectivePrepInput(recipe)}
          {renderRecipeDoseInput(recipe)}
          {recipe.tag && <span style={{ marginLeft: "auto" }}>{recipe.tag}</span>}
        </div>
        {renderKclIvlRows(recipe, "classic")}
        {renderKclPediatricRows(recipe, "classic")}
        {renderClottafactPediatricRows(recipe, "classic")}
        {renderAmiklinAdultRows(recipe, "classic")}
        {renderAmoxicillineMeningeeRows(recipe, "classic")}
        {recipe.prelever && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prélever</span>
            <span className="prep-calc-val prep-calc-highlight">{recipe.prelever}</span>
          </div>
        )}
        {recipe.completer && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Compléter à</span>
            <span
              className="prep-calc-val prep-calc-highlight"
              style={{ color: "#60a5fa", fontWeight: 800 }}
            >
              {recipe.completer}
            </span>
          </div>
        )}
        {renderRecipeWeightBand(recipe, "classic")}
        {recipe.rate_label && recipe.rate_value && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">{recipe.rate_label}</span>
            <span className="prep-calc-val prep-calc-highlight">{recipe.rate_value}</span>
          </div>
        )}
        {renderRecipePhaseRows(recipe, "classic")}
        {recipe.use_table_row && renderPrepTableCurrentRows("classic")}
        {renderRecipeDoseBasedDilution(recipe, "classic")}
        {renderRecipeCustomRows(recipe, "classic")}
        {renderEffectivePrepRows(recipe)}
        {recipe.concentration && !recipe.effective_output_label && !recipe.hide_final && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Final</span>
            <span className="prep-calc-val">{recipe.concentration}</span>
          </div>
        )}
        {recipe.note && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Note</span>
            <span className="prep-calc-val">{recipe.note}</span>
          </div>
        )}
      </div>
    );

  const renderRecipeCalc = (recipe: PrepRecipe) =>
    recipe.empty ? (
      renderRecipeEmpty(recipe)
    ) : recipe.adrenaline_table ? (
      renderRecipeAdrenalineTable(recipe, "v2")
    ) : recipe.dobutamine_table ? (
      renderRecipeDobutamineTable(recipe, "v2")
    ) : recipe.isuprel_table ? (
      renderRecipeIsuprelTable(recipe, "v2")
    ) : recipe.sufenta_table ? (
      renderRecipeSufentaTable(recipe, "v2")
    ) : recipe.norad_table ? (
      renderRecipeNoradTable(recipe, "v2")
    ) : recipe.octaplex_inr ? (
      renderRecipeOctaplexInr(recipe, "v2")
    ) : recipe.sufenta_intranasal ? (
      renderRecipeSufentaIntranasal(recipe, "v2")
    ) : (
      <div key={recipe.titre} className={`prep-calc${recipeModeClass(recipe)}`}>
        <div className="prep-calc-header">
          <span>{recipe.titre}</span>
          {renderEffectivePrepInput(recipe)}
          {renderRecipeDoseInput(recipe)}
          {recipe.tag && <span>{recipe.tag}</span>}
        </div>
        {renderKclIvlRows(recipe, "v2")}
        {renderKclPediatricRows(recipe, "v2")}
        {renderClottafactPediatricRows(recipe, "v2")}
        {renderAmiklinAdultRows(recipe, "v2")}
        {renderAmoxicillineMeningeeRows(recipe, "v2")}
        {recipe.prelever && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prélever</span>
            <span className="prep-calc-val prep-highlight">{recipe.prelever}</span>
          </div>
        )}
        {recipe.completer && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Compléter</span>
            <span className="prep-calc-val">{recipe.completer}</span>
          </div>
        )}
        {renderRecipeWeightBand(recipe, "v2")}
        {recipe.rate_label && recipe.rate_value && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">{recipe.rate_label}</span>
            <span className="prep-calc-val prep-highlight">{recipe.rate_value}</span>
          </div>
        )}
        {renderRecipePhaseRows(recipe, "v2")}
        {recipe.use_table_row && renderPrepTableCurrentRows("v2")}
        {renderRecipeDoseBasedDilution(recipe, "v2")}
        {renderRecipeCustomRows(recipe, "v2")}
        {renderEffectivePrepRows(recipe)}
        {recipe.concentration && !recipe.effective_output_label && !recipe.hide_final && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Final</span>
            <span className="prep-calc-val prep-highlight">{recipe.concentration}</span>
          </div>
        )}
        {recipe.note && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Note</span>
            <span className="prep-calc-val">{recipe.note}</span>
          </div>
        )}
      </div>
    );

  const renderPrepCalc = () => {
    if (visiblePreparations.length > 0) {
      const activeRecipe = visiblePreparations[activeRecipeIndex];
      return (
        <div className="prep-calc-list">
          {renderRecipeSwitch()}
          {renderRecipeCalcBox(activeRecipe)}
        </div>
      );
    }
    if (prep.preparations?.length) return null;

    const staticPrepCalc = renderStaticPrepCalcV2();
    if (!validKg && !staticPrepCalc) return null;

    // Dilution FIXE (nouvelle prépa service) : préparation indépendante
    // du poids (toujours la même seringue). Boîte bleue « Pour X kg »
    // = recette fixe uniquement. Le débit IVSE est géré par le bloc
    // « Débit PSE » dédié (saisie mL/h ↔ dose) → on ne le duplique pas ici.
    if (prep.fixed_dilution) {
      return (
        <div className="prep-calc-box">
          <div className="prep-calc-header">
            <PrepIcon /> {prep.calc_titre || `Pour ${kg} kg`}
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prélever</span>
            <span className="prep-calc-val prep-calc-highlight">{prep.fd_prelever}</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Compléter à</span>
            <span
              className="prep-calc-val prep-calc-highlight"
              style={{ color: "#60a5fa", fontWeight: 800 }}
            >
              {prep.volume_final} mL avec {prep.solvant}
            </span>
          </div>
        </div>
      );
    }

    if (prep.dose_threshold !== undefined) {
      const r = calcPrepThreshold(prep, getThresholdDose());
      const resultLabel = prep.dose_threshold_result_label || "Injecter";
      const resultUnit = prep.dose_threshold_result_unit || "mL";
      return (
        <div className="prep-calc-box">
          <div className="prep-calc-header">
            <PrepIcon /> {getThresholdTitle(r?.pf)}
            {renderThresholdInput()}
          </div>
          {r ? (
            <>
              <div className="prep-calc-row">
                <span className="prep-calc-step">Prendre</span>
                <span className="prep-calc-val prep-calc-highlight">
                  {r.ampCount} ampoules soit {r.vol} mL
                </span>
              </div>
              <div className="prep-calc-row">
                <span className="prep-calc-step">{resultLabel}</span>
                <span
                  className="prep-calc-val prep-calc-highlight"
                  style={{ color: "#60a5fa", fontWeight: 800 }}
                >
                  {r.injectMl} {resultUnit}
                </span>
              </div>
            </>
          ) : (
            <div className="prep-empty-text">Saisir la dose efficace pour calculer le débit.</div>
          )}
        </div>
      );
    }

    if (prep.adrenaline_table) {
      const r = calcPrepAdrenalineTable(weight);
      if (!r) return null;
      return renderRecipeViVfTable(
        { titre: "PSE", tag: "IVSE poids" },
        "classic",
        r,
        "mL d'adrénaline",
        "IVSE poids",
        {
          classic: "1,25 à 20 mL/h (= 0,125 à 2 µg/kg/min)",
          v2: "1,25 à 20 mL/h (= 0,125 à 2 µg/kg/min)",
        }
      );
    }

    if (prep.dobutamine_table) {
      const r = calcPrepDobutamineTable(weight);
      if (!r) return null;
      return renderRecipeViVfTable(
        { titre: "PSE", tag: "IVSE poids" },
        "classic",
        r,
        "mL de Dobutrex",
        "IVSE poids",
        {
          classic: "2,5 à 20 mL/h (= 2,5 à 20 µg/kg/min)",
          v2: "2,5 à 20 mL/h (= 2,5 à 20 µg/kg/min)",
        }
      );
    }

    if (prep.isuprel_table) {
      const r = calcPrepIsuprelTable(weight);
      if (!r) return null;
      return renderRecipeViVfTable(
        { titre: "PSE", tag: "IVSE poids" },
        "classic",
        r,
        "mL d'Isuprel",
        "IVSE poids",
        {
          classic: "1 à 10 mL/h (= 0,01 à 0,1 µg/kg/min)",
          v2: "1 à 10 mL/h (= 0,01 à 0,1 µg/kg/min)",
        }
      );
    }

    if (prep.sufenta_table) {
      const r = calcPrepSufentaTable(weight);
      if (!r) return null;
      return (
        <div className="prep-calc-box">
          <div className="prep-calc-header">
            <PrepIcon /> Pour {r.kg} kg
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Vi (prélever)</span>
            <span className="prep-calc-val prep-calc-highlight">{r.vi} mL d'ampoule pure</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Vf (diluer à)</span>
            <span
              className="prep-calc-val prep-calc-highlight"
              style={{ color: "#60a5fa", fontWeight: 800 }}
            >
              {r.vf} mL dans la seringue
            </span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Débit IVSE</span>
            <span className="prep-calc-val">2 à 20 mL/h (= 0,2 à 2 µg/kg/h)</span>
          </div>
        </div>
      );
    }

    if (prep.norad_table) {
      const r = calcPrepNoradTable(weight);
      if (!r) return null;
      return (
        <div className="prep-calc-box">
          <div className="prep-calc-header">
            <PrepIcon /> Pour {r.kg} kg
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Vi (prélever)</span>
            <span className="prep-calc-val prep-calc-highlight">{r.vi} mL de noradrénaline</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Vf (diluer à)</span>
            <span
              className="prep-calc-val prep-calc-highlight"
              style={{ color: "#60a5fa", fontWeight: 800 }}
            >
              {r.vf} mL dans la seringue
            </span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Débit IVSE</span>
            <span className="prep-calc-val">2,5 à 20 mL/h (= 0,25 à 2 µg/kg/min)</span>
          </div>
        </div>
      );
    }

    if (prep.phases && prep.phases.length > 0) {
      const phases = calcPrepPhases(prep, weight);
      if (!phases) return null;
      return (
        <div className="prep-calc-box">
          <div className="prep-calc-header">
            <PrepIcon /> Pour {kg} kg
          </div>
          {phases.map((phase, i: number) => (
            <div
              key={i}
              style={{
                marginTop: i > 0 ? 8 : 0,
                paddingTop: i > 0 ? 8 : 0,
                borderTop: i > 0 ? "1px solid var(--border)" : "none",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                }}
              >
                {phase.label} — {phase.duree}
              </div>
              <div className="prep-calc-row">
                <span className="prep-calc-step">Dose</span>
                <span className="prep-calc-val">{phase.dose} mg</span>
              </div>
              {phase.vol !== null && (
                <div className="prep-calc-row">
                  <span className="prep-calc-step">Prélever</span>
                  <span className="prep-calc-val prep-calc-highlight">{phase.vol} mL</span>
                </div>
              )}
              <div className="prep-calc-row">
                <span className="prep-calc-step">Diluer dans</span>
                <span
                  className="prep-calc-val prep-calc-highlight"
                  style={{ color: "#60a5fa", fontWeight: 800 }}
                >
                  {phase.solvantVol} mL G5%
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const r = calcPrepDoseKg(prep, weight);
    if (!r) return staticPrepCalc;
    const { volMin, volMax } = r;
    const volLabel = volMax && volMax !== volMin ? `${volMin}–${volMax} mL` : `${volMin} mL`;
    const doseLabel = r.doseMax ? `${r.dose}–${r.doseMax} ${r.unite}` : `${r.dose} ${r.unite}`;
    const solvantVol =
      !prep.prelever_total && prep.volume_final ? prep.volume_final - volMin : null;
    return (
      <div className="prep-calc-box">
        <div className="prep-calc-header">
          <PrepIcon /> Pour {kg} kg
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose</span>
          <span className="prep-calc-val">{doseLabel}</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Prélever</span>
          <span className="prep-calc-val prep-calc-highlight">
            {prep.prelever_total
              ? prep.prelever_label || `${prep.prelever_vol ?? prep.volume_final} mL du produit`
              : `${volLabel} du produit`}
          </span>
        </div>
        {prep.prelever_total && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Compléter à</span>
            <span className="prep-calc-val prep-calc-highlight">
              {prep.volume_final} mL avec {prep.solvant}
            </span>
          </div>
        )}
        {solvantVol !== null && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Compléter à</span>
            <span className="prep-calc-val prep-calc-highlight">
              {prep.volume_final} mL avec {prep.solvant}
            </span>
          </div>
        )}
        {prep.prelever_total && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Injecter</span>
            <span
              className="prep-calc-val prep-calc-highlight"
              style={{ color: "#60a5fa", fontWeight: 800 }}
            >
              {volLabel}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderPrepCalcV2 = () => {
    if (visiblePreparations.length > 0) {
      const activeRecipe = visiblePreparations[activeRecipeIndex];
      return (
        <div className="prep-calc-list">
          {renderRecipeSwitch()}
          {renderRecipeCalc(activeRecipe)}
        </div>
      );
    }
    if (prep.preparations?.length) return null;

    const staticPrepCalc = renderStaticPrepCalcV2();
    if (!validKg && !staticPrepCalc) return null;

    if (prep.fixed_dilution) {
      return (
        <div className="prep-calc">
          <div className="prep-calc-header">
            <span>{prep.calc_titre || (validKg ? `Pour ${kg} kg` : "Préparation")}</span>
            <span>{prep.debit || prep.duree || "Préparation"}</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prélever</span>
            <span className="prep-calc-val prep-highlight">{prep.fd_prelever}</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Compléter</span>
            <span className="prep-calc-val">
              à {prep.volume_final} mL avec {prep.solvant}
            </span>
          </div>
        </div>
      );
    }

    if (prep.dose_threshold !== undefined) {
      const r = calcPrepThreshold(prep, getThresholdDose());
      const resultLabel = prep.dose_threshold_result_label || "Injecter";
      const resultUnit = prep.dose_threshold_result_unit || "mL";
      return (
        <div className="prep-calc">
          <div className="prep-calc-header">
            <span>{getThresholdTitle(r?.pf)}</span>
            {renderThresholdInput()}
            <span>{prep.duree || "Bolus"}</span>
          </div>
          {r ? (
            <>
              <div className="prep-calc-row">
                <span className="prep-calc-step">Prendre</span>
                <span className="prep-calc-val prep-highlight">
                  {r.ampCount} ampoules soit {r.vol} mL
                </span>
              </div>
              <div className="prep-calc-row">
                <span className="prep-calc-step">{resultLabel}</span>
                <span className="prep-calc-val prep-highlight prep-inject">
                  {r.injectMl} {resultUnit}
                </span>
              </div>
            </>
          ) : (
            <div className="prep-empty-text">Saisir la dose efficace pour calculer le débit.</div>
          )}
        </div>
      );
    }

    if (prep.adrenaline_table) {
      const r = calcPrepAdrenalineTable(weight);
      if (!r) return null;
      return renderRecipeViVfTable(
        { titre: "PSE", tag: "IVSE poids" },
        "v2",
        r,
        "mL d'adrénaline",
        "IVSE poids",
        {
          classic: "1,25 à 20 mL/h (= 0,125 à 2 µg/kg/min)",
          v2: "1,25 à 20 mL/h (= 0,125 à 2 µg/kg/min)",
        }
      );
    }

    if (prep.dobutamine_table) {
      const r = calcPrepDobutamineTable(weight);
      if (!r) return null;
      return renderRecipeViVfTable(
        { titre: "PSE", tag: "IVSE poids" },
        "v2",
        r,
        "mL de Dobutrex",
        "IVSE poids",
        {
          classic: "2,5 à 20 mL/h (= 2,5 à 20 µg/kg/min)",
          v2: "2,5 à 20 mL/h (= 2,5 à 20 µg/kg/min)",
        }
      );
    }

    if (prep.isuprel_table) {
      const r = calcPrepIsuprelTable(weight);
      if (!r) return null;
      return renderRecipeViVfTable(
        { titre: "PSE", tag: "IVSE poids" },
        "v2",
        r,
        "mL d'Isuprel",
        "IVSE poids",
        {
          classic: "1 à 10 mL/h (= 0,01 à 0,1 µg/kg/min)",
          v2: "1 à 10 mL/h (= 0,01 à 0,1 µg/kg/min)",
        }
      );
    }

    if (prep.sufenta_table) {
      const r = calcPrepSufentaTable(weight);
      if (!r) return null;
      return (
        <div className="prep-calc">
          <div className="prep-calc-header">
            <span>Pour {r.kg} kg</span>
            <span>IVSE</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prélever</span>
            <span className="prep-calc-val prep-highlight">{r.vi} mL d'ampoule pure</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Diluer</span>
            <span className="prep-calc-val">à {r.vf} mL dans la seringue</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Débit</span>
            <span className="prep-calc-val">2 à 20 mL/h (= 0,2 à 2 µg/kg/h)</span>
          </div>
        </div>
      );
    }

    if (prep.norad_table) {
      const r = calcPrepNoradTable(weight);
      if (!r) return null;
      return (
        <div className="prep-calc">
          <div className="prep-calc-header">
            <span>Pour {r.kg} kg</span>
            <span>IVSE poids</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prélever</span>
            <span className="prep-calc-val prep-highlight">{r.vi} mL de noradrénaline</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Diluer</span>
            <span className="prep-calc-val">à {r.vf} mL dans la seringue</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Débit</span>
            <span className="prep-calc-val">2,5 à 20 mL/h (= 0,25 à 2 µg/kg/min)</span>
          </div>
        </div>
      );
    }

    if (prep.phases && prep.phases.length > 0) {
      const phases = calcPrepPhases(prep, weight);
      if (!phases) return null;
      return (
        <div className="prep-calc">
          <div className="prep-calc-header">
            <span>Pour {kg} kg</span>
            <span>Protocole</span>
          </div>
          {phases.map((phase, i: number) => (
            <div key={i} className="prep-phase">
              <div className="prep-phase-title">
                {phase.label} — {phase.duree}
              </div>
              <div className="prep-calc-row">
                <span className="prep-calc-step">Dose</span>
                <span className="prep-calc-val prep-highlight">{phase.dose} mg</span>
              </div>
              {phase.vol !== null && (
                <div className="prep-calc-row">
                  <span className="prep-calc-step">Prélever</span>
                  <span className="prep-calc-val prep-highlight">{phase.vol} mL</span>
                </div>
              )}
              <div className="prep-calc-row">
                <span className="prep-calc-step">Diluer</span>
                <span className="prep-calc-val">{phase.solvantVol} mL G5%</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const r = calcPrepDoseKg(prep, weight);
    if (!r) return staticPrepCalc;
    const { volMin, volMax } = r;
    const volLabel = volMax && volMax !== volMin ? `${volMin}–${volMax} mL` : `${volMin} mL`;
    const doseLabel = r.doseMax ? `${r.dose}–${r.doseMax} ${r.unite}` : `${r.dose} ${r.unite}`;
    const modeLabel = prep.duree?.includes("ISR") ? "ISR" : prep.debit || prep.duree || "";

    return (
      <div className="prep-calc">
        <div className="prep-calc-header">
          <span>Pour {kg} kg</span>
          {modeLabel && <span>{modeLabel}</span>}
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose</span>
          <span className="prep-calc-val prep-highlight">{doseLabel}</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Prélever</span>
          <span className="prep-calc-val prep-highlight">
            {prep.prelever_total
              ? prep.prelever_label || `${prep.prelever_vol ?? prep.volume_final} mL du produit`
              : `${volLabel} du produit`}
          </span>
        </div>
        {prep.volume_final && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Compléter</span>
            <span className="prep-calc-val">
              à {prep.volume_final} mL avec {prep.solvant}
            </span>
          </div>
        )}
        {prep.prelever_total && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Injecter</span>
            <span className="prep-calc-val prep-highlight prep-inject">{volLabel}</span>
          </div>
        )}
      </div>
    );
  };

  const pediatricPrepOnly = Boolean(prep.pedTable && validKg && activePopulation === "enfant");
  const prepCalcBlock = pediatricPrepOnly ? null : renderPrepCalc();
  const prepCalcV2Block = pediatricPrepOnly ? null : renderPrepCalcV2();
  const activeRecipe = visiblePreparations[activeRecipeIndex];
  const firstStaticStep = prep.etapes?.[0];
  const staticLegacyUsesFirstStep = Boolean(
    previewMode &&
    !prep.preparations?.length &&
    !prep.fixed_dilution &&
    prep.dose_threshold === undefined &&
    !prep.adrenaline_table &&
    !prep.dobutamine_table &&
    !prep.isuprel_table &&
    !prep.sufenta_table &&
    !prep.norad_table &&
    !prep.phases?.length &&
    !prep.dose_kg &&
    !prep.table &&
    firstStaticStep &&
    !firstStaticStep.toLowerCase().startsWith("débit")
  );
  const rawVisibleEtapes = pediatricPrepOnly
    ? []
    : activeRecipe?.use_table_row && getPrepTableCurrentSteps()
      ? getPrepTableCurrentSteps()
      : activeRecipe && Object.hasOwn(activeRecipe, "etapes")
        ? activeRecipe.etapes
        : prep.etapes;
  const visibleEtapes = staticLegacyUsesFirstStep
    ? rawVisibleEtapes?.filter((_, index) => index !== 0)
    : rawVisibleEtapes;
  const visibleNotes = pediatricPrepOnly
    ? []
    : activeRecipe && Object.hasOwn(activeRecipe, "notes")
      ? activeRecipe.notes
      : prep.notes;
  const displaySolvant = activeRecipe?.solvant || prep.solvant;
  const displayDuree = activeRecipe?.duree || prep.duree;
  const displayStabilite = activeRecipe?.stabilite || prep.stabilite;
  const displayConc = activeRecipe?.conc_finale || prep.conc_finale;
  const pedTableResult = prep.pedTable ? calcPedTable(prep, weight) : null;
  const pedImDoseMg = validKg ? Math.min(kg * 0.01, 0.5) : null;
  const pedImVolumeMl = pedImDoseMg !== null ? +pedImDoseMg.toFixed(2) : null;
  const pedVisibleEtapes =
    pediatricPrepOnly && activePedPrep === "pse"
      ? [
          "Ampoule 5 mg/5 mL (1 mg/mL)",
          "PSE : 2 ampoules (10 mg) qsp 50 mL G5% → 0,2 mg/mL",
          "Débit selon µg/kg/min — voir bloc « Débit PSE »",
        ]
      : pediatricPrepOnly &&
          activePedPrep === "im" &&
          pedImDoseMg !== null &&
          pedImVolumeMl !== null
        ? [
            "Ampoule adrénaline 5 mg/5 mL (1 mg/mL)",
            `Prélever ${formatDoseNumber(pedImVolumeMl)} mL (= ${formatDoseNumber(pedImDoseMg)} mg)`,
            "Injecter en IM face antérieure de cuisse",
          ]
        : pediatricPrepOnly && pedTableResult?.mode === "dilute"
          ? [
              pedTableResult.preparation,
              `Prélever ${pedTableResult.vol_med} mL de produit`,
              `Compléter avec ${pedTableResult.vol_solvant} mL ${pedTableResult.solvant} → ${pedTableResult.volume_final} mL`,
              pedTableResult.admin ? `Injecter : ${pedTableResult.admin}` : "",
            ].filter(Boolean)
          : [];
  const pedVisibleNotes =
    pediatricPrepOnly && activePedPrep === "pse"
      ? [
          "Administrer toujours au plus proche du patient",
          "IVSE : débit constant — pas de bolus sur cette voie",
          "Voie centrale proximale idéale en PSE",
          "Surveillance cardiaque rapprochée + état cutané",
        ]
      : pediatricPrepOnly && activePedPrep === "im"
        ? ["Anaphylaxie : 0,01 mg/kg IM (max 0,5 mg)."]
        : pediatricPrepOnly && prep.pedTable?.description
          ? [prep.pedTable.description]
          : [];
  const pedTableBlock = prep.pedTable
    ? (() => {
        const r = pedTableResult;
        return (
          <div className={previewMode ? "prep-calc prep-recipe-ped" : "prep-calc-box"}>
            <div className="prep-calc-header">
              {previewMode ? (
                <>
                  <span>Préparation pédiatrique</span>
                  <span>{r?.volume_final ? `${r.volume_final} mL` : "Pédiatrique"}</span>
                </>
              ) : (
                <>
                  <PrepIcon />
                  {prep.pedTable.titre}
                </>
              )}
            </div>
            {!previewMode && prep.pedTable.description && (
              <p className="prep-table-desc">{prep.pedTable.description}</p>
            )}
            {!validKg && (
              <div className="prep-empty-text">
                Saisir le poids de l'enfant ci-dessus pour calculer.
              </div>
            )}
            {validKg && !r && (
              <div className="prep-empty-text">
                Hors plage de la table — utiliser la posologie adulte.
              </div>
            )}
            {validKg && r && (
              <>
                <div className="prep-calc-row">
                  <span className="prep-calc-step">Pour</span>
                  <span className="prep-calc-val prep-calc-highlight">{r.kg} kg</span>
                </div>
                {r.dose && r.dose_unit && (
                  <div className="prep-calc-row">
                    <span className="prep-calc-step">Dose</span>
                    <span className="prep-calc-val prep-calc-highlight">
                      {formatDoseNumber(r.dose)} {r.dose_unit}
                    </span>
                  </div>
                )}
                {r.mode === "inject" && (
                  <div className="prep-calc-row">
                    <span className="prep-calc-step">Injecter</span>
                    <span className="prep-calc-val prep-calc-highlight">{r.vol_inject} mL</span>
                  </div>
                )}
                {r.mode === "dilute" && (
                  <>
                    <div className="prep-calc-row">
                      <span className="prep-calc-step">Prélever</span>
                      <span className="prep-calc-val prep-calc-highlight">
                        {r.vol_med} mL de produit
                      </span>
                    </div>
                    <div className="prep-calc-row">
                      <span className="prep-calc-step">Compléter</span>
                      <span className="prep-calc-val">
                        {r.vol_solvant} mL {r.solvant}
                      </span>
                    </div>
                    <div className="prep-calc-row">
                      <span className="prep-calc-step">Préparation</span>
                      <span className="prep-calc-val">{r.preparation}</span>
                    </div>
                    <div className="prep-calc-row">
                      <span className="prep-calc-step">Final</span>
                      <span className="prep-calc-val">{r.volume_final} mL</span>
                    </div>
                    {r.admin && (
                      <div className="prep-calc-row">
                        <span className="prep-calc-step">Injecter</span>
                        <span className="prep-calc-val prep-calc-highlight">{r.admin}</span>
                      </div>
                    )}
                  </>
                )}
                {r.admin_volume && !("admin" in r && r.admin) && (
                  <div className="prep-calc-row">
                    <span className="prep-calc-step">{r.admin_route || "IV"}</span>
                    <span className="prep-calc-val prep-calc-highlight">
                      {formatDoseNumber(r.admin_volume)} mL {r.admin_interval}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()
    : null;
  const pedImBlock =
    pediatricPrepOnly && pedImDoseMg !== null && pedImVolumeMl !== null ? (
      <div className={previewMode ? "prep-calc prep-recipe-ped-im" : "prep-calc-box"}>
        <div className="prep-calc-header">
          {previewMode ? (
            <>
              <span>IM anaphylaxie</span>
              <span>1 mg/mL pur</span>
            </>
          ) : (
            <>
              <PrepIcon />
              IM anaphylaxie
            </>
          )}
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Pour</span>
          <span className="prep-calc-val prep-calc-highlight">{kg} kg</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose</span>
          <span className="prep-calc-val prep-calc-highlight">
            {formatDoseNumber(pedImDoseMg)} mg
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Prélever</span>
          <span className="prep-calc-val prep-calc-highlight">
            {formatDoseNumber(pedImVolumeMl)} mL du produit
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Final</span>
          <span className="prep-calc-val">1 mg/mL</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Injecter</span>
          <span className="prep-calc-val prep-calc-highlight">IM cuisse</span>
        </div>
      </div>
    ) : null;
  const pedPseBlock = pediatricPrepOnly ? (
    <div className={previewMode ? "prep-calc prep-recipe-pse" : "prep-calc-box"}>
      <div className="prep-calc-header">
        {previewMode ? (
          <>
            <span>PSE</span>
            <span>0,2 mg/mL</span>
          </>
        ) : (
          <>
            <PrepIcon />
            PSE
          </>
        )}
      </div>
      <div className="prep-calc-row">
        <span className="prep-calc-step">Prélever</span>
        <span className="prep-calc-val prep-calc-highlight">2 ampoules 5 mg/5 mL (= 10 mg)</span>
      </div>
      <div className="prep-calc-row">
        <span className="prep-calc-step">Compléter</span>
        <span className="prep-calc-val">50 mL avec G5%</span>
      </div>
      <div className="prep-calc-row">
        <span className="prep-calc-step">Final</span>
        <span className="prep-calc-val prep-calc-highlight">0,2 mg/mL (200 µg/mL)</span>
      </div>
    </div>
  ) : null;
  const pediatricPrepBlock =
    activePedPrep === "pse" ? pedPseBlock : activePedPrep === "im" ? pedImBlock : pedTableBlock;
  // Le switch IVD ACR / IM / PSE et les blocs pedIm/pedPse sont du contenu
  // spécifique ADRÉNALINE codé en dur → réservé à drug.id === 13. Les autres
  // drogues à pedTable (ex. Nalbuphine) restent sur activePedPrep "ivd" et
  // rendent leur pedTable générique via pedTableBlock.
  const pediatricModeSwitch =
    pediatricPrepOnly && drug.id === 13 ? (
      <div className="prep-mode-switch" role="group" aria-label="Choix de préparation pédiatrique">
        <button
          type="button"
          className={`prep-mode-option prep-recipe-ped${activePedPrep === "ivd" ? " is-active" : ""}`}
          aria-pressed={activePedPrep === "ivd"}
          onClick={() => setActivePedPrep("ivd")}
        >
          <span>IVD ACR</span>
          <small>10 mL</small>
        </button>
        <button
          type="button"
          className={`prep-mode-option prep-recipe-ped-im${activePedPrep === "im" ? " is-active" : ""}`}
          aria-pressed={activePedPrep === "im"}
          onClick={() => setActivePedPrep("im")}
        >
          <span>IM anaphylaxie</span>
          <small>1 mg/mL pur</small>
        </button>
        <button
          type="button"
          className={`prep-mode-option prep-recipe-pse${activePedPrep === "pse" ? " is-active" : ""}`}
          aria-pressed={activePedPrep === "pse"}
          onClick={() => setActivePedPrep("pse")}
        >
          <span>PSE</span>
          <small>0,2 mg/mL</small>
        </button>
      </div>
    ) : null;
  const prepTableCurrentRow =
    prep.table && validKg ? prep.table.rows.find((row) => row.poids === kg) : null;
  const prepTableBlock = prep.table ? (
    <div className="prep-table-card">
      <div className="prep-table-head">
        <PrepIcon />
        <span>{prep.table.titre}</span>
      </div>
      {prep.table.description && <p className="prep-table-desc">{prep.table.description}</p>}
      {validKg && prepTableCurrentRow ? (
        <div className="prep-table-current" aria-label={`Préparation pour ${kg} kg`}>
          <div className="prep-table-current-head">
            <PrepIcon />
            Pour {kg} kg
          </div>
          <div className="prep-table-current-grid">
            <div>
              <span>Vi</span>
              <strong>{formatDoseNumber(prepTableCurrentRow.vi)} mL</strong>
            </div>
            <div>
              <span>Vf</span>
              <strong>{prepTableCurrentRow.vf} mL</strong>
            </div>
            <div>
              <span>Vitesse</span>
              <strong>{prepTableCurrentRow.vitesse} mL/h</strong>
            </div>
            <div>
              <span>Débit EP</span>
              <strong>{formatDoseNumber(prepTableCurrentRow.debitEp)} mg/min</strong>
            </div>
            <div>
              <span>Temps</span>
              <strong>{prepTableCurrentRow.temps} min</strong>
            </div>
          </div>
        </div>
      ) : (
        validKg && (
          <div className="prep-table-current prep-table-current-muted">
            Poids non listé dans la table : choisir la ligne selon le protocole local.
          </div>
        )
      )}
      <div className="prep-table-scroll" role="region" aria-label={prep.table.titre}>
        <table className="prep-table">
          <thead>
            <tr>
              <th>Poids</th>
              <th>Vi</th>
              <th>Vf</th>
              <th>Vitesse</th>
              <th>Débit EP</th>
              <th>Temps</th>
            </tr>
          </thead>
          <tbody>
            {prep.table.rows.map((row) => (
              <tr
                key={row.poids}
                className={validKg && kg === row.poids ? "is-current" : undefined}
              >
                <td>{row.poids} kg</td>
                <td>{formatDoseNumber(row.vi)} mL</td>
                <td>{row.vf} mL</td>
                <td>{row.vitesse} mL/h</td>
                <td>{formatDoseNumber(row.debitEp)} mg/min</td>
                <td>{row.temps} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : null;
  const doseLibreBlock =
    prep.dose_calc && prep.conc_produit ? (
      <div className="prep-calc-box" style={{ marginTop: 8 }}>
        <div className="prep-calc-header">
          <InfoIcon /> Calcul dose libre
        </div>
        <div className="prep-calc-row" style={{ alignItems: "center", gap: 8 }}>
          <span className="prep-calc-step">Dose</span>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="mg"
            value={doseLibre}
            onChange={(e) => setDoseLibre(e.target.value)}
            style={{
              width: 80,
              padding: "3px 6px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: 13,
            }}
          />
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>mg</span>
          {doseLibre && (
            <button
              type="button"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                fontSize: 14,
              }}
              onClick={() => setDoseLibre("")}
              aria-label="Effacer la dose"
            >
              ×
            </button>
          )}
        </div>
        {(() => {
          const ml = calcDoseLibre(prep, doseLibre);
          return ml !== null ? (
            <div className="prep-calc-row">
              <span className="prep-calc-step">Prélever</span>
              <span
                className="prep-calc-val prep-calc-highlight"
                style={{ color: "#60a5fa", fontWeight: 800 }}
              >
                {ml} mL
              </span>
            </div>
          ) : null;
        })()}
      </div>
    ) : null;
  const prepTableV2Block = !visiblePreparations.length ? prepTableBlock : null;
  const prepMainV2Block = prepCalcV2Block || prepTableV2Block;

  if (prep.preparations?.length && visiblePreparations.length === 0 && !pediatricPrepOnly) {
    return null;
  }

  if (prepV2Mode) {
    const tags = pediatricPrepOnly
      ? ["Pédiatrique"]
      : [displaySolvant, displayConc, displayDuree, displayStabilite, prep.debit].filter(Boolean);

    return (
      <section className="prep-v2" aria-label="Préparation v2">
        <div className="prep-head">
          <div className="prep-head-title">
            <PrepIcon />
            Préparation
          </div>
          <div className="prep-tags">
            {tags.map((tag) => (
              <span key={tag} className="prep-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div
          className={`prep-body ${!pediatricPrepOnly && !prepMainV2Block ? "prep-body-single" : ""}`}
        >
          {pediatricPrepOnly ? (
            <div className="prep-calc-list">
              {pediatricModeSwitch}
              {pediatricPrepBlock}
            </div>
          ) : (
            prepMainV2Block
          )}

          <div>
            {pediatricPrepOnly && pedVisibleEtapes.length > 0 && (
              <div className="prep-steps">
                {pedVisibleEtapes.map((e: string, i: number) => (
                  <div key={i} className="prep-step">
                    <span className="prep-step-num">{i + 1}</span>
                    <span className="prep-step-text">{e}</span>
                  </div>
                ))}
              </div>
            )}

            {!pediatricPrepOnly && visibleEtapes && visibleEtapes.length > 0 && (
              <div className="prep-steps">
                {visibleEtapes.map((e: string, i: number) => (
                  <div key={i} className="prep-step">
                    <span className="prep-step-num">{i + 1}</span>
                    <span className="prep-step-text">{e}</span>
                  </div>
                ))}
              </div>
            )}

            {pediatricPrepOnly && pedVisibleNotes.length > 0 && (
              <div className="prep-alerts">
                {pedVisibleNotes.map((n: string, i: number) => (
                  <div key={i} className="prep-alert">
                    <span aria-hidden="true">⚠</span>
                    <span>{n}</span>
                  </div>
                ))}
              </div>
            )}

            {!pediatricPrepOnly && visibleNotes && visibleNotes.length > 0 && (
              <div className="prep-alerts">
                {visibleNotes.map((n: string, i: number) => (
                  <div key={i} className="prep-alert">
                    <span aria-hidden="true">⚠</span>
                    <span>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!pediatricPrepOnly && doseLibreBlock && (
          <div className="prep-v2-extra">{doseLibreBlock}</div>
        )}
      </section>
    );
  }

  return (
    <div className="prep-block">
      <div className="prep-header">
        <PrepIcon />
        <span>Préparation</span>
        {displaySolvant && <span className="prep-solvant-tag">{displaySolvant}</span>}
      </div>
      {!pediatricPrepOnly && (
        <div className="prep-meta-row">
          {displayDuree && <span className="prep-meta-chip">{displayDuree}</span>}
          {displayStabilite && (
            <span className="prep-meta-chip prep-chip-stab">{displayStabilite}</span>
          )}
          {prep.debit && <span className="prep-meta-chip prep-chip-debit">{prep.debit}</span>}
          {displayConc && <span className="prep-meta-chip prep-chip-conc">{displayConc}</span>}
        </div>
      )}

      {visibleEtapes && visibleEtapes.length > 0 && (
        <ol className="prep-etapes">
          {visibleEtapes.map((e: string, i: number) => (
            <li key={i} className="prep-etape">
              {e}
            </li>
          ))}
        </ol>
      )}

      {prepCalcBlock}
      {pediatricPrepOnly && pedTableBlock}
      {prepTableBlock}
      {doseLibreBlock}

      {visibleNotes && visibleNotes.length > 0 && (
        <ul className="prep-notes">
          {visibleNotes.map((n: string, i: number) => (
            <li key={i} className="prep-note-item">
              <svg
                viewBox="0 0 24 24"
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PrepBlock;
