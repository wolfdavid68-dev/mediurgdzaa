import { useState } from "react";
import {
  calcPrepThreshold,
  calcPrepSufentaTable,
  calcPrepPhases,
  calcPrepDoseKg,
  calcPedTable,
  calcDoseLibre,
} from "../lib/calc";
import { isPreview } from "../lib/featureFlags";
import { DRUGS_PREVIEW } from "../data/drugs.preview";
import type { Drug } from "../types/data";

// `prep` public (drugs.js) éventuellement enrichi par l'override preview
// (drugs.preview.js) si ?author=preview. On FUSIONNE l'override par-dessus le
// public (au lieu de le remplacer) : l'override preview ne porte que la
// nouvelle dilution fixe (fixed_dilution + étapes), donc les champs qu'il ne
// redéfinit pas — notamment `pedTable`, la table de dilution PÉDIATRIQUE —
// doivent survivre. Sans fusion, la table pédiatrique d'Adrénaline (et autres
// drogues à pedTable présentes dans l'override) disparaît en preview.
type DrugPrep = NonNullable<Drug["prep"]>;
type PreviewPrepByDrugId = Partial<Record<number, { prep?: Partial<DrugPrep> }>>;

const resolvePrep = (drug: Drug): DrugPrep | null => {
  const override = isPreview() ? (DRUGS_PREVIEW as PreviewPrepByDrugId)[drug.id]?.prep : null;
  if (override) return { ...drug.prep, ...override };
  return drug.prep || null;
};

const PrepIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

type PrepBlockProps = { drug: Drug; weight: string; produitFinal: string };

// Bloc Préparation : étapes + calculateur (4 variantes selon la shape de prep).
// produitFinal vient du parent car son input vit au-dessus du bloc poso (input swap).
const PrepBlock = ({ drug, weight, produitFinal }: PrepBlockProps) => {
  const [doseLibre, setDoseLibre] = useState("");
  const [activePrepIndex, setActivePrepIndex] = useState(0);
  const prep = resolvePrep(drug);
  if (!prep) return null;

  const kg = parseFloat(weight);
  const validKg = kg && kg > 0 && kg <= 300;
  const formatDoseNumber = (value: number) =>
    Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
  const activeRecipeIndex = prep.preparations?.[activePrepIndex] ? activePrepIndex : 0;
  const recipeModeClass = (recipe: NonNullable<DrugPrep["preparations"]>[number]) =>
    recipe.mode ? ` prep-recipe-${recipe.mode}` : "";

  const renderRecipeSwitch = () =>
    prep.preparations && prep.preparations.length > 1 ? (
      <div className="prep-mode-switch" role="group" aria-label="Choix de préparation">
        {prep.preparations.map((recipe, index) => (
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

  const renderRecipeCalcBox = (recipe: NonNullable<DrugPrep["preparations"]>[number]) => (
    <div key={recipe.titre} className={`prep-calc-box${recipeModeClass(recipe)}`}>
      <div className="prep-calc-header">
        <PrepIcon /> {recipe.titre}
        {recipe.tag && <span style={{ marginLeft: "auto" }}>{recipe.tag}</span>}
      </div>
      <div className="prep-calc-row">
        <span className="prep-calc-step">Prélever</span>
        <span className="prep-calc-val prep-calc-highlight">{recipe.prelever}</span>
      </div>
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
      {recipe.concentration && (
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

  const renderRecipeCalc = (recipe: NonNullable<DrugPrep["preparations"]>[number]) => (
    <div key={recipe.titre} className={`prep-calc${recipeModeClass(recipe)}`}>
      <div className="prep-calc-header">
        <span>{recipe.titre}</span>
        {recipe.tag && <span>{recipe.tag}</span>}
      </div>
      <div className="prep-calc-row">
        <span className="prep-calc-step">Prélever</span>
        <span className="prep-calc-val prep-highlight">{recipe.prelever}</span>
      </div>
      {recipe.completer && (
        <div className="prep-calc-row">
          <span className="prep-calc-step">Compléter</span>
          <span className="prep-calc-val">{recipe.completer}</span>
        </div>
      )}
      {recipe.concentration && (
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
    if (!validKg) return null;

    if (prep.preparations && prep.preparations.length > 0) {
      const activeRecipe = prep.preparations[activeRecipeIndex];
      return (
        <div className="prep-calc-list">
          {renderRecipeSwitch()}
          {renderRecipeCalcBox(activeRecipe)}
        </div>
      );
    }

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
      const r = calcPrepThreshold(prep, produitFinal);
      if (!r) return null;
      return (
        <div className="prep-calc-box">
          <div className="prep-calc-header">
            <PrepIcon /> Pour {r.pf} mg
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prendre</span>
            <span className="prep-calc-val prep-calc-highlight">
              {r.ampCount} ampoules soit {r.vol} mL
            </span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Injecter</span>
            <span
              className="prep-calc-val prep-calc-highlight"
              style={{ color: "#60a5fa", fontWeight: 800 }}
            >
              {r.injectMl} mL
            </span>
          </div>
        </div>
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
    if (!r) return null;
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
    if (!validKg) return null;

    if (prep.preparations && prep.preparations.length > 0) {
      const activeRecipe = prep.preparations[activeRecipeIndex];
      return (
        <div className="prep-calc-list">
          {renderRecipeSwitch()}
          {renderRecipeCalc(activeRecipe)}
        </div>
      );
    }

    if (prep.fixed_dilution) {
      return (
        <div className="prep-calc">
          <div className="prep-calc-header">
            <span>{prep.calc_titre || `Pour ${kg} kg`}</span>
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
      const r = calcPrepThreshold(prep, produitFinal);
      if (!r) return null;
      return (
        <div className="prep-calc">
          <div className="prep-calc-header">
            <span>Pour {r.pf} mg</span>
            <span>{prep.duree || "Bolus"}</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prendre</span>
            <span className="prep-calc-val prep-highlight">
              {r.ampCount} ampoules soit {r.vol} mL
            </span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Injecter</span>
            <span className="prep-calc-val prep-highlight prep-inject">{r.injectMl} mL</span>
          </div>
        </div>
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
    if (!r) return null;
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

  const previewMode = isPreview();
  const prepCalcBlock = renderPrepCalc();
  const prepCalcV2Block = renderPrepCalcV2();
  const pedTableBlock = prep.pedTable
    ? (() => {
        const r = calcPedTable(prep, weight);
        return (
          <div className="prep-calc-box" style={{ marginTop: 8, borderColor: "#ec4899" }}>
            <div className="prep-calc-header" style={{ color: "#ec4899" }}>
              <PrepIcon />
              {prep.pedTable.titre}
            </div>
            {prep.pedTable.description && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-dim)",
                  marginBottom: 6,
                  lineHeight: 1.4,
                }}
              >
                {prep.pedTable.description}
              </div>
            )}
            {!validKg && (
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>
                Saisir le poids de l'enfant ci-dessus pour calculer.
              </div>
            )}
            {validKg && !r && (
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }}>
                Hors plage de la table — utiliser la posologie adulte.
              </div>
            )}
            {validKg && r && (
              <>
                <div className="prep-calc-row">
                  <span className="prep-calc-step">Préparation</span>
                  <span className="prep-calc-val" style={{ textAlign: "right", fontSize: 12 }}>
                    {r.preparation}
                  </span>
                </div>
                {r.mode === "inject" && (
                  <div className="prep-calc-row">
                    <span className="prep-calc-step">Volume à injecter ({r.kg} kg)</span>
                    <span
                      className="prep-calc-val prep-calc-highlight"
                      style={{ color: "#60a5fa", fontWeight: 800 }}
                    >
                      {r.vol_inject} mL
                    </span>
                  </div>
                )}
                {r.mode === "dilute" && (
                  <>
                    <div className="prep-calc-row">
                      <span className="prep-calc-step">Volume médicament ({r.kg} kg)</span>
                      <span className="prep-calc-val prep-calc-highlight">{r.vol_med} mL</span>
                    </div>
                    <div className="prep-calc-row">
                      <span className="prep-calc-step">Compléter avec {r.solvant}</span>
                      <span className="prep-calc-val prep-calc-highlight">{r.vol_solvant} mL</span>
                    </div>
                    <div className="prep-calc-row">
                      <span className="prep-calc-step">Volume final</span>
                      <span
                        className="prep-calc-val prep-calc-highlight"
                        style={{ color: "#60a5fa", fontWeight: 800 }}
                      >
                        {r.volume_final} mL
                      </span>
                    </div>
                    {r.admin && (
                      <div className="prep-calc-row">
                        <span className="prep-calc-step">Administration</span>
                        <span className="prep-calc-val">{r.admin}</span>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        );
      })()
    : null;
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

  if (previewMode) {
    const tags = [prep.solvant, prep.conc_finale, prep.duree, prep.stabilite, prep.debit].filter(
      Boolean
    );

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

        <div className={`prep-body ${prepCalcV2Block ? "" : "prep-body-single"}`}>
          {prepCalcV2Block}

          <div>
            {prep.etapes && prep.etapes.length > 0 && (
              <div className="prep-steps">
                {prep.etapes.map((e: string, i: number) => (
                  <div key={i} className="prep-step">
                    <span className="prep-step-num">{i + 1}</span>
                    <span className="prep-step-text">{e}</span>
                  </div>
                ))}
              </div>
            )}

            {prep.notes && prep.notes.length > 0 && (
              <div className="prep-alerts">
                {prep.notes.map((n: string, i: number) => (
                  <div key={i} className="prep-alert">
                    <span aria-hidden="true">⚠</span>
                    <span>{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {(pedTableBlock || prepTableBlock || doseLibreBlock) && (
          <div className="prep-v2-extra">
            {pedTableBlock}
            {prepTableBlock}
            {doseLibreBlock}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="prep-block">
      <div className="prep-header">
        <PrepIcon />
        <span>Préparation</span>
        <span className="prep-solvant-tag">{prep.solvant}</span>
      </div>

      <div className="prep-meta-row">
        {prep.duree && <span className="prep-meta-chip">{prep.duree}</span>}
        {prep.stabilite && <span className="prep-meta-chip prep-chip-stab">{prep.stabilite}</span>}
        {prep.debit && <span className="prep-meta-chip prep-chip-debit">{prep.debit}</span>}
        {prep.conc_finale && (
          <span className="prep-meta-chip prep-chip-conc">{prep.conc_finale}</span>
        )}
      </div>

      {prep.etapes && prep.etapes.length > 0 && (
        <ol className="prep-etapes">
          {prep.etapes.map((e: string, i: number) => (
            <li key={i} className="prep-etape">
              {e}
            </li>
          ))}
        </ol>
      )}

      {prepCalcBlock}
      {pedTableBlock}
      {prepTableBlock}
      {doseLibreBlock}

      {prep.notes && prep.notes.length > 0 && (
        <ul className="prep-notes">
          {prep.notes.map((n: string, i: number) => (
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
