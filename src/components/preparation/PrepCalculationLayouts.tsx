import type { ReactNode } from "react";
import {
  calcPrepAdrenalineTable,
  calcPrepDoseKg,
  calcPrepDobutamineTable,
  calcPrepIsuprelTable,
  calcPrepNoradTable,
  calcPrepPhases,
  calcPrepSufentaTable,
  calcPrepThreshold,
} from "../../lib/calc";
import { computeThresholdDose, PrepIcon, type DrugPrep, type PrepRecipe } from "../PrepBlock.parts";

type RecipeRenderer = (recipe: PrepRecipe) => ReactNode;

type CalculationLayoutContext = {
  prep: DrugPrep;
  weight: string;
  kg: number;
  validKg: boolean | 0;
  visiblePreparations: PrepRecipe[];
  activeRecipeIndex: number;
  renderRecipeSwitch: () => ReactNode;
  renderRecipeCalc: RecipeRenderer;
  renderRecipeCalcBox: RecipeRenderer;
  renderRecipeViVfTable: (
    recipe: PrepRecipe,
    variant: "classic" | "v2",
    result: { kg: number; vi: number; vf: number },
    productLabel: string,
    defaultTag: string,
    debit: { classic: string; v2: string }
  ) => ReactNode;
  renderStaticPrepCalcV2: () => ReactNode;
  renderThresholdInput: () => ReactNode;
  getThresholdDose: () => ReturnType<typeof computeThresholdDose>;
  getThresholdTitle: (pf?: number) => string;
};

export const createCalculationLayoutRenderers = ({
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
}: CalculationLayoutContext) => {
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

  return { renderPrepCalc, renderPrepCalcV2 };
};
