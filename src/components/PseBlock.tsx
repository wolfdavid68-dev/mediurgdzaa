import { useState } from "react";
import { calcDebit, calcDoseFromRate } from "../lib/calc";
import { computeEffectivePse } from "./PseBlock.parts";
import type { Drug } from "../types/data";
import { useResolvedDrugPse } from "./useResolvedPreparation";

// Bloc PSE (pousse-seringue électrique) : input dose cible + calcul mL/h
// + table des paliers. Gère le mode "extra" (héparine UI/24h en plus).
type PseBlockProps = { drug: Drug; weight: string };

type PseBlockDataProps = PseBlockProps & { includePreviewOverrides?: boolean };

const PseBlock = ({ drug, weight, includePreviewOverrides = true }: PseBlockDataProps) => {
  const [pseTarget, setPseTarget] = useState("");
  const [pseTarget2, setPseTarget2] = useState("");
  const [pseRate, setPseRate] = useState("");
  const { pse } = useResolvedDrugPse(drug.id, includePreviewOverrides);
  if (!pse) return null;
  if (pse.hideBlock) return null;

  const kg = parseFloat(weight);
  const validKg = kg > 0 && kg <= 300;

  // Mode "mlh" : la saisie est le débit réglé sur la PSE (mL/h) + le
  // poids → on déduit la dose (µg/kg/min…). Sinon mode classique
  // (saisie dose → mL/h). Choisi par `inputMode: "mlh"` sur l'entrée.
  const reverse = pse.inputMode === "mlh";
  const effectiveMode = pse.inputMode === "effectiveDose";
  const effectiveFraction = pse.effectiveFraction ?? 2 / 3;
  const effectiveInput = parseFloat(pseTarget);
  // Calcul « dose efficace → débit » extrait dans PseBlock.parts (testé).
  const effective = computeEffectivePse(pse, pseTarget);
  const effectiveHourlyDose = effective?.hourlyDose ?? null;
  const effectiveDebit = effective?.debit ?? null;
  const mlhSteps: number[] = Array.isArray(pse.mlhSteps)
    ? pse.mlhSteps
    : [1, 2, 3, 5, 8, 10, 15, 20];

  const debit = effectiveMode ? null : calcDebit(pse, pseTarget, weight);
  const outRange =
    !effectiveMode && debit && (parseFloat(pseTarget) < pse.min || parseFloat(pseTarget) > pse.max);
  const effectiveOutRange =
    effectiveMode &&
    effectiveDebit !== null &&
    (effectiveInput < pse.min || effectiveInput > pse.max);

  // Précision d'affichage de la dose (nb de décimales) par médicament.
  const dosePrec: number = Number.isInteger(pse.dosePrecision) ? Number(pse.dosePrecision) : 3;
  // Virgule décimale FR (convention clinique du projet) : « 6,0 » pas « 6.0 ».
  const fmtDose = (v: number | null): string | null =>
    v == null ? null : v.toFixed(dosePrec).replace(".", ",");

  const dose = reverse ? calcDoseFromRate(pse, pseRate, weight, dosePrec) : null;
  const doseOut = dose != null && (dose < pse.min || dose > pse.max);
  const patientTableTitle = validKg ? `Pour ${kg} kg — ${kg < 30 ? "enfant" : "adulte"}` : null;
  const referenceTablesForWeight = validKg ? undefined : pse.referenceTables;
  const referenceTables =
    referenceTablesForWeight && referenceTablesForWeight.length > 0 ? (
      <details className="pse-table-details">
        <summary>
          <span>Repères de débit</span>
          <small>poids exemples</small>
        </summary>
        <div className="pse-reference-list" aria-label="Repères PSE">
          {referenceTablesForWeight.map((table) => (
            <div key={`${table.title}-${table.weightKg}`} className="pse-reference-item">
              <div className="pse-reference-title">
                <span>{table.title}</span>
                <strong>{table.subtitle || `${table.weightKg} kg`}</strong>
              </div>
              <table className="pse-table pse-reference-table">
                <thead>
                  <tr>
                    <th>Dose</th>
                    <th>mL/h</th>
                  </tr>
                </thead>
                <tbody>
                  {(table.steps || pse.steps).map((step: number) => (
                    <tr key={step}>
                      <td>
                        {step} {pse.unite}
                      </td>
                      <td>{calcDebit(pse, step, table.weightKg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </details>
    ) : null;

  return (
    <div className="pse-block">
      <div className="pse-header">
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        Débit PSE
        <span className="pse-conc-tag">
          {pse.tag
            ? pse.tag
            : `${pse.conc}${pse.unite.includes("mg") ? " mg" : pse.unite.includes("UI") ? " UI" : " µg"}/mL · seringue`}
        </span>
      </div>
      <div className="pse-body">
        {pse.note && <div className="pse-note">{pse.note}</div>}
        {referenceTables}

        {reverse && (
          <>
            <div className="pse-input-row">
              <span className="pse-input-label">Débit réglé</span>
              <input
                className="pse-input"
                type="number"
                min="0"
                step="0.1"
                placeholder="mL/h"
                value={pseRate}
                onChange={(e) => setPseRate(e.target.value)}
              />
              <span className="pse-unit">mL/h</span>
            </div>
            {dose != null && (
              <div className="pse-result-box">
                <span className="pse-result-label">Dose</span>
                <span className="pse-result-value">{fmtDose(dose)}</span>
                <span className="pse-result-unit">{pse.unite}</span>
                {doseOut && <span className="pse-range-warn">⚠ hors plage</span>}
              </div>
            )}
            <span className="pse-input-label">
              plage thérapeutique {pse.min}–{pse.max} {pse.unite}
            </span>
          </>
        )}

        {effectiveMode && (
          <>
            {effectiveDebit !== null && (
              <div className="pse-result-box">
                <span className="pse-result-label">Débit PSE</span>
                <span className="pse-result-value">{effectiveDebit}</span>
                <span className="pse-result-unit">mL/h</span>
                <span className="pse-result-unit">
                  2/3 dose = {effectiveHourlyDose?.toString().replace(".", ",")} mg/h
                </span>
                {effectiveOutRange && <span className="pse-range-warn">⚠ hors plage</span>}
              </div>
            )}
          </>
        )}

        {!reverse && !effectiveMode && (
          <>
            <div className="pse-input-row">
              <span className="pse-input-label">Dose cible</span>
              <input
                className="pse-input"
                type="number"
                min="0"
                step="0.01"
                placeholder={String(pse.min)}
                value={pseTarget}
                onChange={(e) => setPseTarget(e.target.value)}
              />
              <span className="pse-unit">{pse.unite}</span>
              <span className="pse-input-label" style={{ marginLeft: 4 }}>
                plage {pse.min}–{pse.max}
              </span>
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

        {validKg && reverse ? (
          <>
            {patientTableTitle && <div className="pse-current-title">{patientTableTitle}</div>}
            <details className="pse-table-details">
              <summary>
                <span>Repères de débit</span>
                <small>{kg < 30 ? "enfant" : "adulte"}</small>
              </summary>
              <table className="pse-table">
                <thead>
                  <tr>
                    <th>mL/h</th>
                    <th>Dose ({pse.unite})</th>
                  </tr>
                </thead>
                <tbody>
                  {mlhSteps.map((step: number) => {
                    const dv = calcDoseFromRate(pse, step, weight, dosePrec);
                    const isActive = parseFloat(pseRate) === step;
                    return (
                      <tr key={step} className={isActive ? "pse-row-active" : ""}>
                        <td>{step}</td>
                        <td>{fmtDose(dv)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </details>
          </>
        ) : effectiveMode ? (
          <details className="pse-table-details">
            <summary>
              <span>Repères de débit</span>
              <small>dose efficace</small>
            </summary>
            <table className="pse-table">
              <thead>
                <tr>
                  <th>Dose efficace ({pse.effectiveInputUnit || "mg"})</th>
                  <th>Débit PSE</th>
                </tr>
              </thead>
              <tbody>
                {pse.steps.map((step: number) => {
                  const hourly = step * (pse.effectiveInputConc ?? 1) * effectiveFraction;
                  const rate = +(hourly / pse.conc).toFixed(2);
                  const isActive = parseFloat(pseTarget) === step;
                  return (
                    <tr key={step} className={isActive ? "pse-row-active" : ""}>
                      <td>{step}</td>
                      <td>{rate} mL/h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        ) : (validKg || pse.unite === "mg/h") && !reverse ? (
          <>
            {patientTableTitle && <div className="pse-current-title">{patientTableTitle}</div>}
            <details className="pse-table-details">
              <summary>
                <span>Repères de débit</span>
                <small>{kg < 30 ? "enfant" : "adulte"}</small>
              </summary>
              <table className="pse-table">
                <thead>
                  <tr>
                    <th>Dose ({pse.unite})</th>
                    <th>mL/h</th>
                    {pse.unite === "UI/kg/h" && <th>UI/24h</th>}
                  </tr>
                </thead>
                <tbody>
                  {pse.steps.map((step: number) => {
                    const d = calcDebit(pse, step, weight);
                    const isActive = parseFloat(pseTarget) === step;
                    return (
                      <tr key={step} className={isActive ? "pse-row-active" : ""}>
                        <td>{step}</td>
                        <td>{d}</td>
                        {pse.unite === "UI/kg/h" && (
                          <td>{Math.round(step * parseFloat(weight) * 24)}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </details>
          </>
        ) : null}
      </div>

      {pse.extra &&
        (() => {
          const ex = { unite: pse.extra.unite, conc: pse.conc };
          const debit2 = calcDebit(ex, pseTarget2, "");
          const outRange2 =
            debit2 &&
            (parseFloat(pseTarget2) < pse.extra.min || parseFloat(pseTarget2) > pse.extra.max);
          return (
            <div className="pse-extra-converter">
              <div className="pse-input-row">
                <span className="pse-input-label">Dose cible</span>
                <input
                  className="pse-input"
                  type="number"
                  min="0"
                  step="500"
                  placeholder={String(pse.extra.min)}
                  value={pseTarget2}
                  onChange={(e) => setPseTarget2(e.target.value)}
                />
                <span className="pse-unit">{pse.extra.unite}</span>
                <span className="pse-input-label" style={{ marginLeft: 4 }}>
                  plage {pse.extra.min}–{pse.extra.max}
                </span>
              </div>
              {debit2 && (
                <div className="pse-result-box">
                  <span className="pse-result-label">Débit</span>
                  <span className="pse-result-value">{debit2}</span>
                  <span className="pse-result-unit">mL/h</span>
                  {outRange2 && <span className="pse-range-warn">⚠ hors plage</span>}
                </div>
              )}
              <details className="pse-table-details">
                <summary>
                  <span>Repères UI/24h</span>
                  <small>conversion</small>
                </summary>
                <table className="pse-table">
                  <thead>
                    <tr>
                      <th>Dose ({pse.extra.unite})</th>
                      <th>mL/h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pse.extra.steps.map((step: number) => {
                      const d = calcDebit(ex, step, "");
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
              </details>
            </div>
          );
        })()}
    </div>
  );
};

export default PseBlock;
