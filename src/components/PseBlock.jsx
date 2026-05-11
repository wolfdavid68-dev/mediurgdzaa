import React, { useState } from "react";
import { PSE } from "../data/pse";
import { calcDebit } from "../lib/calc";

// Bloc PSE (pousse-seringue électrique) : input dose cible + calcul mL/h
// + table des paliers. Gère le mode "extra" (héparine UI/24h en plus).
const PseBlock = ({ drug, weight }) => {
  const [pseTarget, setPseTarget]   = useState("");
  const [pseTarget2, setPseTarget2] = useState("");
  const pse = PSE[drug.id];
  if (!pse) return null;

  const kg = parseFloat(weight);
  const validKg = kg > 0 && kg <= 300;
  const debit = calcDebit(pse, pseTarget, weight);
  const outRange = debit && (parseFloat(pseTarget) < pse.min || parseFloat(pseTarget) > pse.max);

  return (
    <div className="pse-block">
      <div className="pse-header">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        Débit PSE
        <span className="pse-conc-tag">{pse.conc}{pse.unite.includes("mg") ? " mg" : pse.unite.includes("UI") ? " UI" : " µg"}/mL · seringue</span>
      </div>
      <div className="pse-body">
        {!pse.extra && (
          <>
            <div className="pse-input-row">
              <span className="pse-input-label">Dose cible</span>
              <input
                className="pse-input"
                type="number"
                min="0"
                step="0.01"
                placeholder={pse.min}
                value={pseTarget}
                onChange={e => setPseTarget(e.target.value)}
              />
              <span className="pse-unit">{pse.unite}</span>
              <span className="pse-input-label" style={{marginLeft: 4}}>plage {pse.min}–{pse.max}</span>
            </div>
            {debit && (
              <div className="pse-result-box">
                <span className="pse-result-label">Débit</span>
                <span className="pse-result-value">{debit}</span>
                <span className="pse-result-unit">mL/h</span>
                {outRange && <span className="pse-range-warn">⚠ hors plage</span>}
              </div>
            )}
          </>
        )}

        {(validKg || pse.unite === "mg/h") ? (
          <table className="pse-table">
            <thead>
              <tr>
                <th>Dose ({pse.unite})</th>
                <th>mL/h</th>
                {pse.unite === "UI/kg/h" && <th>UI/24h</th>}
              </tr>
            </thead>
            <tbody>
              {pse.steps.map(step => {
                const d = calcDebit(pse, step, weight);
                const isActive = parseFloat(pseTarget) === step;
                return (
                  <tr key={step} className={isActive ? "pse-row-active" : ""}>
                    <td>{step}</td>
                    <td>{d}</td>
                    {pse.unite === "UI/kg/h" && <td>{Math.round(step * parseFloat(weight) * 24)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </div>

      {pse.extra && (() => {
        const ex = { unite: pse.extra.unite, conc: pse.conc };
        const debit2 = calcDebit(ex, pseTarget2, null);
        const outRange2 = debit2 && (parseFloat(pseTarget2) < pse.extra.min || parseFloat(pseTarget2) > pse.extra.max);
        return (
          <div style={{marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)"}}>
            <div className="pse-input-row">
              <span className="pse-input-label">Dose cible</span>
              <input
                className="pse-input"
                type="number"
                min="0"
                step="500"
                placeholder={pse.extra.min}
                value={pseTarget2}
                onChange={e => setPseTarget2(e.target.value)}
              />
              <span className="pse-unit">{pse.extra.unite}</span>
              <span className="pse-input-label" style={{marginLeft: 4}}>plage {pse.extra.min}–{pse.extra.max}</span>
            </div>
            {debit2 && (
              <div className="pse-result-box">
                <span className="pse-result-label">Débit</span>
                <span className="pse-result-value">{debit2}</span>
                <span className="pse-result-unit">mL/h</span>
                {outRange2 && <span className="pse-range-warn">⚠ hors plage</span>}
              </div>
            )}
            <table className="pse-table">
              <thead>
                <tr>
                  <th>Dose ({pse.extra.unite})</th>
                  <th>mL/h</th>
                </tr>
              </thead>
              <tbody>
                {pse.extra.steps.map(step => {
                  const d = calcDebit(ex, step, null);
                  const isActive = parseFloat(pseTarget2) === step;
                  return (
                    <tr key={step} className={isActive ? "pse-row-active" : ""}>
                      <td>{step.toLocaleString("fr-FR")}</td>
                      <td>{d}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
};

export default PseBlock;
