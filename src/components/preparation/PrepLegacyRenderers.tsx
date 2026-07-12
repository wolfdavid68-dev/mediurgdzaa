import { Fragment, type Dispatch, type SetStateAction } from "react";
import {
  computeAmiklinAdult,
  computeClottafactPediatric,
  computeEffectivePrep,
  computeKclIvl,
  computeKclPediatric,
  computeMeningitisPump,
  computePrepTableCurrentSteps,
  computeRecipeDoseInputValue,
  computeRecipePhaseRows,
  computeRecipeWeightBand,
  formatDoseNumber,
  formatNumberRange,
  type DrugPrep,
  type PrepRecipe,
  type PrepRecipePhaseRow,
} from "../PrepBlock.parts";

type PrepLegacyRendererOptions = {
  prep: DrugPrep;
  kg: number;
  validKg: boolean;
  effectivePrepInput: string;
  dosePrepInput: string;
  setEffectivePrepInput: Dispatch<SetStateAction<string>>;
  setDosePrepInput: Dispatch<SetStateAction<string>>;
};

export const createPrepLegacyRenderers = ({
  prep,
  kg,
  validKg,
  effectivePrepInput,
  dosePrepInput,
  setEffectivePrepInput,
  setDosePrepInput,
}: PrepLegacyRendererOptions) => {
  const okKg = validKg;
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
    const result = computeKclIvl(recipe, dosePrepInput);
    if (!result) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    const doseLabel = formatDoseNumber(result.dose);
    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose</span>
          <span className={`prep-calc-val ${highlightClass}`}>{doseLabel} g</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Prélever</span>
          <span className={`prep-calc-val ${highlightClass}`}>{result.prelever}</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Diluer</span>
          <span className="prep-calc-val">{result.finalVolume} mL avec NaCl 0,9%</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Débit max</span>
          <span className="prep-calc-val">{result.maxRate}</span>
        </div>
      </>
    );
  };
  const renderKclPediatricRows = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const result = computeKclPediatric(recipe, dosePrepInput, kg, okKg);
    if (!result) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";
    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Pour</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(result.kg)} kg
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(result.mmol)} mmol/h
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Prélever</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(result.productMl)} mL de KCl 1 g/10 mL
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Diluer</span>
          <span className="prep-calc-val">
            au moins {formatDoseNumber(result.minFinalMl)} mL NaCl 0,9%
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Limite VVP</span>
          <span className="prep-calc-val">max {result.vvpLimit}</span>
        </div>
      </>
    );
  };
  const renderClottafactPediatricRows = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const result = computeClottafactPediatric(recipe, kg, okKg);
    if (!result) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";

    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Pour</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(result.kg)} kg
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {result.doseMg} mg = {formatDoseNumber(result.doseG)} g
          </span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Reconstituer</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {result.flacons} flacon{result.flacons > 1 ? "s" : ""} de 1,5 g
          </span>
        </div>
      </>
    );
  };
  const renderAmiklinAdultRows = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const result = computeAmiklinAdult(recipe, prep, kg, okKg);
    if (!result) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";

    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose basse</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(result.low.dose)} mg : {result.low.plan}
          </span>
        </div>
        {result.high && (
          <div className="prep-calc-row">
            <span className="prep-calc-step">Dose haute</span>
            <span className={`prep-calc-val ${highlightClass}`}>
              {formatDoseNumber(result.high.dose)} mg : {result.high.plan}
            </span>
          </div>
        )}
      </>
    );
  };
  const renderAmoxicillineMeningeeRows = (recipe: PrepRecipe, variant: "classic" | "v2") => {
    const result = computeMeningitisPump(recipe, dosePrepInput);
    if (!result) return null;
    const highlightClass = variant === "v2" ? "prep-highlight" : "prep-calc-highlight";

    return (
      <>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Dose/j</span>
          <span className={`prep-calc-val ${highlightClass}`}>{result.dose} g/j</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Préparation</span>
          <span className={`prep-calc-val ${highlightClass}`}>{result.prep}</span>
        </div>
        <div className="prep-calc-row">
          <span className="prep-calc-step">Débit pompe</span>
          <span className={`prep-calc-val ${highlightClass}`}>
            {formatDoseNumber(result.rate)} mL/h
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

  return {
    renderRecipeWeightBand,
    renderRecipePhaseRows,
    renderRecipeDoseBasedDilution,
    renderRecipeCustomRows,
    renderEffectivePrepInput,
    renderRecipeDoseInput,
    renderKclIvlRows,
    renderKclPediatricRows,
    renderClottafactPediatricRows,
    renderAmiklinAdultRows,
    renderAmoxicillineMeningeeRows,
    renderEffectivePrepRows,
    renderPrepTableCurrentRows,
    getPrepTableCurrentSteps,
  };
};
