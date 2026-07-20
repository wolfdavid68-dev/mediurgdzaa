import type { ReactNode } from "react";
import {
  calcPrepAdrenalineTable,
  calcPrepDobutamineTable,
  calcPrepIsuprelTable,
  calcPrepNoradTable,
  calcPrepOctaplexInr,
  calcPrepSufentaIntranasal,
  calcPrepSufentaTable,
} from "../../lib/calc";
import { formatDoseNumber, PrepIcon, recipeModeClass, type PrepRecipe } from "../PrepBlock.parts";

type Variant = "classic" | "v2";
type RecipeRenderer = (recipe: PrepRecipe, variant: Variant) => ReactNode;

type RecipeCalculationContext = {
  weight: string;
  validKg: boolean | 0;
  dosePrepInput: string;
  renderRecipeWeightBand: RecipeRenderer;
  renderRecipePhaseRows: RecipeRenderer;
  renderRecipeDoseBasedDilution: RecipeRenderer;
  renderRecipeCustomRows: RecipeRenderer;
  renderEffectivePrepInput: (recipe: PrepRecipe) => ReactNode;
  renderRecipeDoseInput: (recipe: PrepRecipe) => ReactNode;
  renderKclIvlRows: RecipeRenderer;
  renderKclPediatricRows: RecipeRenderer;
  renderClottafactPediatricRows: RecipeRenderer;
  renderAmiklinAdultRows: RecipeRenderer;
  renderAmoxicillineMeningeeRows: RecipeRenderer;
  renderEffectivePrepRows: (recipe: PrepRecipe) => ReactNode;
  renderRecipeEmpty: (recipe: PrepRecipe) => ReactNode;
  renderPrepTableCurrentRows: (variant: Variant) => ReactNode;
};

export const createRecipeCalculationRenderer = ({
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
}: RecipeCalculationContext) => {
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
    return renderRecipeViVfTable(recipe, variant, r, "mL d'isoprénaline", "IVSE poids", {
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

  return { renderRecipeCalc, renderRecipeCalcBox, renderRecipeViVfTable };
};
