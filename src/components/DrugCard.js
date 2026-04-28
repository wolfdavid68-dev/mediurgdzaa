import React, { useState, useEffect } from "react";
import { PSE } from "../data/pse";

const TABS = [
  { key: "poso",  label: "Posologie",           type: "poso" },
  { key: "indic", label: "Indications",         type: "info" },
  { key: "ci",    label: "Contre-ind.",         type: "ci" },
  { key: "ei",    label: "Effets indés.",       type: "danger" },
  { key: "cond",  label: "Conditionnements",    type: "neutral" },
];

const DrugCard = ({ drug }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    if (open) setActiveTab("poso");
  }, [open]);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [weight, setWeight] = useState("");
  const [pseTarget, setPseTarget] = useState("");
  const [pseTarget2, setPseTarget2] = useState("");
  const [produitFinal, setProduitFinal] = useState("");
  const [doseLibre, setDoseLibre] = useState("");

  // Charger la note depuis localStorage au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mediurg-note-${drug.id}`);
      if (saved) setNote(saved);
    } catch (err) {
      // localStorage peut être indisponible (mode privé, restrictions)
    }
  }, [drug.id]);

  // Sauvegarder la note à chaque changement + feedback visuel
  const handleNoteChange = (e) => {
    const value = e.target.value;
    setNote(value);
    try {
      if (value.trim()) {
        localStorage.setItem(`mediurg-note-${drug.id}`, value);
      } else {
        localStorage.removeItem(`mediurg-note-${drug.id}`);
      }
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 1500);
    } catch (err) {
      // ignore
    }
  };

  const toggleTab = (key) => setActiveTab(activeTab === key ? null : key);

  const calcDose = (text, w) => {
    const kg = parseFloat(w);
    if (!kg || kg <= 0 || kg > 300) return null;

    const match = text.match(
      /(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(mg|µg|mcg|mL|ml|g|UI|U|mmol|mEq)\/kg(?:\/(min|h|j|24h))?/i
    );
    if (!match) return null;

    const min  = parseFloat(match[1].replace(",", "."));
    const max  = match[2] ? parseFloat(match[2].replace(",", ".")) : null;
    const unit = match[3];
    const per  = match[4] ? `/${match[4]}` : "";

    let doseMin = +(min * kg).toFixed(2);
    let doseMax = max ? +(max * kg).toFixed(2) : null;

    const maxMatch = text.match(/max\s+(\d+(?:[.,]\d+)?)\s*(mg|µg|mcg|mL|ml|g|UI|U|mmol|mEq)/i);
    if (maxMatch && maxMatch[2].toLowerCase() === unit.toLowerCase()) {
      const cap = parseFloat(maxMatch[1].replace(",", "."));
      const capped = doseMin > cap || (doseMax && doseMax > cap);
      if (doseMin > cap) doseMin = cap;
      if (doseMax && doseMax > cap) doseMax = cap;
      if (capped) return { value: (doseMax ? `${doseMin}–${doseMax}` : `${doseMin}`) + ` ${unit}${per}`, capped: true };
    }
    return { value: (doseMax ? `${doseMin}–${doseMax}` : `${doseMin}`) + ` ${unit}${per}`, capped: false };
  };

  const ciSeverity = (text) => {
    const t = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (/\brelative\b/.test(t)) return "rel";
    if (/allergi|hypersensibil|\bimao\b|porphyri|myastheni|hyperkalie|insuffisance surrenal|brulures etendues|para.{0,3}tetrapleg|myopathi|pseudocholinesteras|epilepsie non|nouveau.ne|nourrisson|depression respiratoire sev/.test(t)) return "abs";
    return null;
  };

  const calcDebit = (pse, dose, kg) => {
    const d = parseFloat(dose);
    if (!d || d <= 0) return null;
    if (pse.unite === "mg/h") return +(d / pse.conc).toFixed(2);
    if (pse.unite === "UI/24h") return +(d / (pse.conc * 24)).toFixed(2);
    const w = parseFloat(kg);
    if (!w || w <= 0) return null;
    if (pse.unite === "µg/kg/min") return +((d * w * 60) / pse.conc).toFixed(2);
    return +((d * w) / pse.conc).toFixed(2);
  };

  const renderList = (items) => {
    if (!items || items.length === 0) return <span className="na">Non renseigné</span>;
    return (
      <ul className="item-list">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    );
  };

  const renderContent = (key) => {
    if (key === "indic") return renderList(drug.indic);
    if (key === "ci") {
      if (!drug.ci || drug.ci.length === 0) return <span className="na">Non renseigné</span>;
      return (
        <ul className="ci-list">
          {drug.ci.map((it, i) => {
            const sev = ciSeverity(it);
            return (
              <li key={i} className={`ci-item ${sev ? `ci-item-${sev}` : ""}`}>
                {sev && (
                  <span className={`ci-badge ci-badge-${sev}`}>
                    {sev === "abs" ? "Absolue" : "Relative"}
                  </span>
                )}
                <span className="ci-text">{it}</span>
              </li>
            );
          })}
        </ul>
      );
    }
    if (key === "ei")    return renderList(drug.ei);
    if (key === "cond") {
      if (!drug.cond || drug.cond.length === 0) return <span className="na">Non renseigné</span>;
      return (
        <div className="cond-list">
          {drug.cond.map((c, i) => <span key={i} className="cond-tag">{c}</span>)}
        </div>
      );
    }
    if (key === "poso") {
      const prep = drug.prep || null;
      const kg = parseFloat(weight);
      const validKg = kg && kg > 0 && kg <= 300;

      const renderPrepCalc = () => {
        if (!prep || !validKg) return null;

        // Préparation par saisie directe du produit final (ex : Anexate)
        if (prep.dose_threshold !== undefined) {
          const pf = parseFloat(produitFinal);
          if (!pf || pf <= 0) return null;
          const isHigh   = pf >= prep.dose_threshold;
          const ampCount = isHigh ? prep.amp_high : prep.amp_low;
          const vol      = isHigh ? prep.vol_high  : prep.vol_low;
          const injectMl = +(pf * 10).toFixed(1);
          return (
            <div className="prep-calc-box">
              <div className="prep-calc-header">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>
                Pour {pf} mg
              </div>
              <div className="prep-calc-row">
                <span className="prep-calc-step">Prendre</span>
                <span className="prep-calc-val prep-calc-highlight">{ampCount} ampoules soit {vol} mL</span>
              </div>
              <div className="prep-calc-row">
                <span className="prep-calc-step">Injecter</span>
                <span className="prep-calc-val prep-calc-highlight" style={{color:"#60a5fa",fontWeight:800}}>{injectMl} mL</span>
              </div>
            </div>
          );
        }

        // Préparation multi-phases (ex : Hidonac)
        if (prep.phases && prep.phases.length > 0) {
          return (
            <div className="prep-calc-box">
              <div className="prep-calc-header">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>
                Pour {kg} kg
              </div>
              {prep.phases.map((phase, i) => {
                const dose   = +(phase.dose_kg * kg).toFixed(0);
                const vol    = prep.conc_produit ? +(dose / prep.conc_produit).toFixed(1) : null;
                return (
                  <div key={i} style={{marginTop: i > 0 ? 8 : 0, paddingTop: i > 0 ? 8 : 0, borderTop: i > 0 ? "1px solid var(--border)" : "none"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{phase.label} — {phase.duree}</div>
                    <div className="prep-calc-row">
                      <span className="prep-calc-step">Dose</span>
                      <span className="prep-calc-val">{dose} mg</span>
                    </div>
                    {vol !== null && (
                      <div className="prep-calc-row">
                        <span className="prep-calc-step">Prélever</span>
                        <span className="prep-calc-val prep-calc-highlight">{vol} mL</span>
                      </div>
                    )}
                    <div className="prep-calc-row">
                      <span className="prep-calc-step">Diluer dans</span>
                      <span className="prep-calc-val prep-calc-highlight" style={{color:"#60a5fa",fontWeight:800}}>{phase.solvant_vol} mL G5%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        if (!prep.dose_kg) return null;
        const dose = prep.dose_kg * kg;
        const doseMax = prep.dose_max_kg ? prep.dose_max_kg * kg : null;
        const volMin = prep.conc_produit ? +(dose / prep.conc_produit).toFixed(1) : null;
        const volMax = doseMax && prep.conc_produit ? +(doseMax / prep.conc_produit).toFixed(1) : null;
        if (!volMin) return null;
        const volLabel = volMax && volMax !== volMin ? `${volMin}–${volMax} mL` : `${volMin} mL`;
        const doseLabel = doseMax ? `${+dose.toFixed(1)}–${+doseMax.toFixed(1)} ${prep.unite}` : `${+dose.toFixed(1)} ${prep.unite}`;
        const solvantVol = !prep.prelever_total && prep.volume_final ? prep.volume_final - volMin : null;
        return (
          <div className="prep-calc-box">
            <div className="prep-calc-header">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>
              Pour {kg} kg
            </div>
            <div className="prep-calc-row">
              <span className="prep-calc-step">Dose</span>
              <span className="prep-calc-val">{doseLabel}</span>
            </div>
            <div className="prep-calc-row">
              <span className="prep-calc-step">Prélever</span>
              <span className="prep-calc-val prep-calc-highlight">
                {prep.prelever_total ? `${prep.prelever_vol ?? prep.volume_final} mL du produit` : `${volLabel} du produit`}
              </span>
            </div>
            {prep.prelever_total && (
              <div className="prep-calc-row">
                <span className="prep-calc-step">Compléter à</span>
                <span className="prep-calc-val prep-calc-highlight">{prep.volume_final} mL avec {prep.solvant}</span>
              </div>
            )}
            {solvantVol !== null && (
              <div className="prep-calc-row">
                <span className="prep-calc-step">Compléter à</span>
                <span className="prep-calc-val prep-calc-highlight">{prep.volume_final} mL avec {prep.solvant}</span>
              </div>
            )}
            {prep.prelever_total && (
              <div className="prep-calc-row">
                <span className="prep-calc-step">Injecter</span>
                <span className="prep-calc-val prep-calc-highlight" style={{color:"#60a5fa",fontWeight:800}}>{volLabel}</span>
              </div>
            )}
          </div>
        );
      };

      return (
        <>
          {prep?.dose_threshold !== undefined ? (
            <div className="poso-calc">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="poso-calc-label">Produit final</span>
              <input
                className="poso-calc-input"
                type="number"
                min="0"
                step="0.1"
                placeholder="mg"
                value={produitFinal}
                onChange={e => setProduitFinal(e.target.value)}
              />
              <span className="poso-calc-unit">mg</span>
              {produitFinal && (
                <button className="poso-calc-clear" onClick={() => setProduitFinal("")}>×</button>
              )}
            </div>
          ) : (
            <div className="poso-calc">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="poso-calc-label">Poids patient</span>
              <input
                className="poso-calc-input"
                type="number"
                min="1"
                max="300"
                placeholder="kg"
                value={weight}
                onChange={e => setWeight(e.target.value)}
              />
              <span className="poso-calc-unit">kg</span>
              {weight && (
                <button className="poso-calc-clear" onClick={() => setWeight("")}>×</button>
              )}
            </div>
          )}

          <div className="poso-grid">
            <div className="poso-box">
              <div className="poso-title">Adulte</div>
              {drug.poso.a && drug.poso.a.length
                ? drug.poso.a.map((p, i) => {
                    const res = calcDose(p, weight);
                    return (
                      <div key={i} className="poso-item">
                        {p}
                        {res && <span className={`calc-result ${res.capped ? "calc-over" : "calc-ok"}`}>{res.value}{res.capped ? " ⚠ max" : ""}</span>}
                      </div>
                    );
                  })
                : <span className="na">Non renseigné</span>}
            </div>
            <div className="poso-box">
              <div className="poso-title">Pédiatrique</div>
              {drug.poso.p && drug.poso.p.length
                ? drug.poso.p.map((p, i) => {
                    const res = calcDose(p, weight);
                    return (
                      <div key={i} className="poso-item">
                        {p}
                        {res && <span className={`calc-result ${res.capped ? "calc-over" : "calc-ok"}`}>{res.value}{res.capped ? " ⚠ max" : ""}</span>}
                      </div>
                    );
                  })
                : <span className="na">Non renseigné</span>}
            </div>
          </div>

          {prep && (
            <div className="prep-block">
              <div className="prep-header">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>
                <span>Préparation</span>
                <span className="prep-solvant-tag">{prep.solvant}</span>
              </div>

              <div className="prep-meta-row">
                {prep.duree && <span className="prep-meta-chip">{prep.duree}</span>}
                {prep.stabilite && <span className="prep-meta-chip prep-chip-stab">{prep.stabilite}</span>}
                {prep.debit && <span className="prep-meta-chip prep-chip-debit">{prep.debit}</span>}
                {prep.conc_finale && <span className="prep-meta-chip prep-chip-conc">{prep.conc_finale}</span>}
              </div>

              {prep.etapes && prep.etapes.length > 0 && (
                <ol className="prep-etapes">
                  {prep.etapes.map((e, i) => <li key={i} className="prep-etape">{e}</li>)}
                </ol>
              )}

              {renderPrepCalc()}

              {prep.dose_calc && prep.conc_produit && (
                <div className="prep-calc-box" style={{marginTop: 8}}>
                  <div className="prep-calc-header">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Calcul dose libre
                  </div>
                  <div className="prep-calc-row" style={{alignItems:"center", gap:8}}>
                    <span className="prep-calc-step">Dose</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="mg"
                      value={doseLibre}
                      onChange={e => setDoseLibre(e.target.value)}
                      style={{width:80, padding:"3px 6px", borderRadius:6, border:"1px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:13}}
                    />
                    <span style={{fontSize:12, color:"var(--text-dim)"}}>mg</span>
                    {doseLibre && <button style={{background:"transparent",border:"none",color:"var(--text-dim)",cursor:"pointer",fontSize:14}} onClick={() => setDoseLibre("")}>×</button>}
                  </div>
                  {doseLibre && parseFloat(doseLibre) > 0 && (
                    <div className="prep-calc-row">
                      <span className="prep-calc-step">Prélever</span>
                      <span className="prep-calc-val prep-calc-highlight" style={{color:"#60a5fa",fontWeight:800}}>
                        {+(parseFloat(doseLibre) / prep.conc_produit).toFixed(2)} mL
                      </span>
                    </div>
                  )}
                </div>
              )}

              {prep.notes && prep.notes.length > 0 && (
                <ul className="prep-notes">
                  {prep.notes.map((n, i) => (
                    <li key={i} className="prep-note-item">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {PSE[drug.id] && (() => {
            const pse = PSE[drug.id];
            const kg = parseFloat(weight);
            const validKg = kg > 0 && kg <= 300;
            const debit = calcDebit(pse, pseTarget, weight);
            const inRange = debit && parseFloat(pseTarget) >= pse.min && parseFloat(pseTarget) <= pse.max;
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
                  const inRange2 = debit2 && parseFloat(pseTarget2) >= pse.extra.min && parseFloat(pseTarget2) <= pse.extra.max;
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
          })()}

          <div className="poso-note">
            <div className="poso-note-header">
              <div className="poso-note-label">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Note personnelle</span>
              </div>
              {noteSaved && <span className="note-saved">✓ Enregistré</span>}
            </div>
            <textarea
              className="poso-note-textarea"
              value={note}
              onChange={handleNoteChange}
              placeholder="Ajoutez une remarque, protocole local, rappel personnel…"
              rows={3}
            />
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div className={`drug-card ${open ? "drug-card-open" : ""}`}>
      <button className="drug-header" onClick={() => setOpen(!open)}>
        <div className="drug-color-bar" style={{ background: drug.couleur }} />
        <div className="drug-main">
          <div className="drug-title-row">
            <span className="drug-icon">{drug.icon}</span>
            <span className="drug-name">{drug.nom}</span>
            <span className="drug-commercial">{drug.commercial}</span>
            {note && <span className="note-indicator" title="Note personnelle ajoutée">✎</span>}
          </div>
          <div className="drug-subtitle">
            <span className="badge badge-cat" data-cat={drug.cat}>{drug.cat}</span>
            {drug.svc.map((s) => <span key={s} className="badge badge-svc">{s}</span>)}
            <span className="drug-classe">{drug.classe}</span>
          </div>
        </div>
        <svg
          className={`chevron ${open ? "chevron-open" : ""}`}
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="drug-body">
          <div className="drug-meta">
            <div>
              <strong>DCI</strong>
              <span>{drug.dci}</span>
            </div>
          </div>
          <p className="drug-desc">{drug.desc}</p>

          <div className="tabs-row">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const isCi = tab.key === "ci";
              const ciCount = isCi && drug.ci && drug.ci.length > 0 ? drug.ci.length : 0;
              return (
                <button
                  key={tab.key}
                  className={`tab-btn tab-${tab.type} ${isActive ? "tab-active" : ""}`}
                  style={tab.type === "poso" && isActive ? {
                    background: drug.couleur + "25",
                    borderColor: drug.couleur,
                    color: drug.couleur
                  } : {}}
                  onClick={() => toggleTab(tab.key)}
                >
                  {isCi ? (
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" className="tab-ci-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  ) : (
                    <span className={`dot dot-${tab.type}`} style={tab.type === "poso" ? { background: drug.couleur } : {}} />
                  )}
                  <span className="tab-label">{tab.label}</span>
                  {ciCount > 0 && (
                    <span className="tab-ci-badge">{ciCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          {activeTab && (
            <div className="tab-content">
              {renderContent(activeTab)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DrugCard;
