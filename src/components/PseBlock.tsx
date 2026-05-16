import { useState } from "react";
import { PSE } from "../data/pse";
import { PSE_PREVIEW } from "../data/pse.preview";
import { isPsePreview } from "../lib/featureFlags";
import { calcDebit, calcDoseFromRate } from "../lib/calc";

// PSE public, ou PSE + overlay preview si ?pse=preview (cf. featureFlags).
// L'overlay remplace/ajoute par drug id ; le public ne voit jamais
// pse.preview.js tant que le flag PSE_PREVIEW reste false.
const resolvePse = (): Record<number, any> =>
  isPsePreview() ? { ...PSE, ...PSE_PREVIEW } : (PSE as Record<number, any>);

// Bloc PSE (pousse-seringue électrique) : input dose cible + calcul mL/h
// + table des paliers. Gère le mode "extra" (héparine UI/24h en plus).
type PseBlockProps = { drug: any; weight: string };

const PseBlock = ({ drug, weight }: PseBlockProps) => {
  const [pseTarget, setPseTarget] = useState("");
  const [pseTarget2, setPseTarget2] = useState("");
  const [pseRate, setPseRate] = useState("");
  const [dilIdx, setDilIdx] = useState(0);
  const pseRaw = resolvePse()[drug.id];
  if (!pseRaw) return null;

  // Sélecteur de dilution : si l'entrée propose plusieurs préparations
  // (`dilutions: [{ label, conc, detail? }]`), l'utilisateur choisit
  // celle posée → on substitue `conc` (la dose cible reste pondérale,
  // donc min/max/steps/unite inchangés). Entrée sans `dilutions` :
  // comportement strictement identique à avant (rétro-compatible).
  const dilutions: any[] | null = Array.isArray(pseRaw.dilutions) ? pseRaw.dilutions : null;
  const sel = dilutions ? Math.min(dilIdx, dilutions.length - 1) : 0;
  const pse = dilutions ? { ...pseRaw, conc: dilutions[sel].conc } : pseRaw;

  const kg = parseFloat(weight);
  const validKg = kg > 0 && kg <= 300;

  // Mode "mlh" : la saisie est le débit réglé sur la PSE (mL/h) + le
  // poids → on déduit la dose (µg/kg/min…). Sinon mode classique
  // (saisie dose → mL/h). Choisi par `inputMode: "mlh"` sur l'entrée.
  const reverse = pse.inputMode === "mlh";
  const mlhSteps: number[] = Array.isArray(pse.mlhSteps)
    ? pse.mlhSteps
    : [1, 2, 3, 5, 8, 10, 15, 20];

  const debit = calcDebit(pse, pseTarget, weight);
  const outRange = debit && (parseFloat(pseTarget) < pse.min || parseFloat(pseTarget) > pse.max);

  const dose = reverse ? calcDoseFromRate(pse, pseRate, weight) : null;
  const doseOut = dose != null && (dose < pse.min || dose > pse.max);

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
          {dilutions
            ? dilutions[sel].detail || `${pse.conc} µg/mL · seringue`
            : pse.tag
              ? pse.tag
              : `${pse.conc}${pse.unite.includes("mg") ? " mg" : pse.unite.includes("UI") ? " UI" : " µg"}/mL · seringue`}
        </span>
      </div>
      <div className="pse-body">
        {dilutions && (
          <div className="pse-dilution-row">
            <span className="pse-input-label">Dilution</span>
            {dilutions.map((d, i) => (
              <button
                key={d.label}
                type="button"
                className={`pse-dil-btn ${i === sel ? "pse-dil-active" : ""}`}
                onClick={() => setDilIdx(i)}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
        {pse.note && <div className="pse-note">{pse.note}</div>}

        {!pse.extra && reverse && (
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
                <span className="pse-result-value">{dose}</span>
                <span className="pse-result-unit">{pse.unite}</span>
                {doseOut && <span className="pse-range-warn">⚠ hors plage</span>}
              </div>
            )}
            <span className="pse-input-label">
              plage thérapeutique {pse.min}–{pse.max} {pse.unite}
            </span>
          </>
        )}

        {!pse.extra && !reverse && (
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
          <table className="pse-table">
            <thead>
              <tr>
                <th>mL/h</th>
                <th>Dose ({pse.unite})</th>
              </tr>
            </thead>
            <tbody>
              {mlhSteps.map((step: number) => {
                const dv = calcDoseFromRate(pse, step, weight);
                const isActive = parseFloat(pseRate) === step;
                return (
                  <tr key={step} className={isActive ? "pse-row-active" : ""}>
                    <td>{step}</td>
                    <td>{dv}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (validKg || pse.unite === "mg/h") && !reverse ? (
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
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <div className="pse-input-row">
                <span className="pse-input-label">Dose cible</span>
                <input
                  className="pse-input"
                  type="number"
                  min="0"
                  step="500"
                  placeholder={pse.extra.min}
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
            </div>
          );
        })()}
    </div>
  );
};

export default PseBlock;
