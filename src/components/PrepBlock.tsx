import { Fragment, useState } from "react";
import { calcPedTable, calcDoseLibre } from "../lib/calc";
import { isPreview } from "../lib/featureFlags";
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
  computeThresholdDose,
  computeThresholdTitle,
  formatDoseNumber,
  formatNumberRange,
  InfoIcon,
  PrepIcon,
} from "./PrepBlock.parts";
import type { PrepRecipe, PrepRecipePhaseRow } from "./PrepBlock.parts";
import {
  EmptyRecipe,
  PediatricPreparationTable,
  PediatricModeSwitch,
  PrepHeader,
  RecipeSwitch,
} from "./preparation/PrepBlockParts";
import type { PrepBlockProps } from "./preparation/PrepBlockParts";
import { createRecipeCalculationRenderer } from "./preparation/PrepRecipeCalculations";
import { createCalculationLayoutRenderers } from "./preparation/PrepCalculationLayouts";
import { useResolvedDrugPrep } from "./useResolvedPreparation";

// Bloc Préparation : étapes + calculateur (4 variantes selon la shape de prep).
const PrepBlock = ({
  drug,
  weight,
  produitFinal,
  prepPopulation,
  includePreviewOverrides = true,
}: PrepBlockProps) => {
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
  const { prep } = useResolvedDrugPrep(drug, includePreviewOverrides);
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

  const renderRecipeSwitch = () => (
    <RecipeSwitch
      recipes={visiblePreparations}
      activeIndex={activeRecipeIndex}
      onSelect={setActivePrepIndex}
    />
  );

  const renderRecipeEmpty = (recipe: PrepRecipe) => <EmptyRecipe recipe={recipe} />;

  const { renderRecipeCalc, renderRecipeCalcBox, renderRecipeViVfTable } =
    createRecipeCalculationRenderer({
      weight,
      validKg,
      dosePrepInput,
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
      renderRecipeEmpty,
      renderPrepTableCurrentRows,
    });

  const { renderPrepCalc, renderPrepCalcV2 } = createCalculationLayoutRenderers({
    prep,
    weight,
    kg,
    validKg,
    visiblePreparations,
    activeRecipeIndex,
    renderRecipeSwitch,
    renderRecipeCalc,
    renderRecipeCalcBox,
    renderRecipeViVfTable,
    renderStaticPrepCalcV2,
    renderThresholdInput,
    getThresholdDose,
    getThresholdTitle,
  });

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
    : activeRecipe?.empty
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
    : activeRecipe?.empty
      ? []
      : activeRecipe && Object.hasOwn(activeRecipe, "notes")
        ? activeRecipe.notes
        : prep.notes;
  const displaySolvant = activeRecipe?.empty ? undefined : activeRecipe?.solvant || prep.solvant;
  const displayDuree = activeRecipe?.empty ? undefined : activeRecipe?.duree || prep.duree;
  const displayStabilite = activeRecipe?.empty
    ? undefined
    : activeRecipe?.stabilite || prep.stabilite;
  const displayConc = activeRecipe?.empty
    ? undefined
    : activeRecipe?.conc_finale || prep.conc_finale;
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

  const pedTableBlock = prep.pedTable ? (
    <PediatricPreparationTable
      table={prep.pedTable}
      result={pedTableResult}
      validWeight={validKg}
      previewMode={previewMode}
    />
  ) : null;
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
      <PediatricModeSwitch activeMode={activePedPrep} onSelect={setActivePedPrep} />
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
        <PrepHeader tags={tags} />
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
