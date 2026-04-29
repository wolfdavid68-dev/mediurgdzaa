import React, { useState } from "react";
import {
  calcPrepThreshold,
  calcPrepSufentaTable,
  calcPrepPhases,
  calcPrepDoseKg,
} from "../lib/calc";

const PrepIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// Bloc Préparation : étapes + calculateur (4 variantes selon la shape de prep).
// produitFinal vient du parent car son input vit au-dessus du bloc poso (input swap).
const PrepBlock = ({ drug, weight, produitFinal }) => {
  const [doseLibre, setDoseLibre] = useState("");
  const prep = drug.prep;
  if (!prep) return null;

  const kg = parseFloat(weight);
  const validKg = kg && kg > 0 && kg <= 300;

  const renderPrepCalc = () => {
    if (!validKg) return null;

    if (prep.dose_threshold !== undefined) {
      const r = calcPrepThreshold(prep, produitFinal);
      if (!r) return null;
      return (
        <div className="prep-calc-box">
          <div className="prep-calc-header"><PrepIcon /> Pour {r.pf} mg</div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Prendre</span>
            <span className="prep-calc-val prep-calc-highlight">{r.ampCount} ampoules soit {r.vol} mL</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Injecter</span>
            <span className="prep-calc-val prep-calc-highlight" style={{color:"#60a5fa",fontWeight:800}}>{r.injectMl} mL</span>
          </div>
        </div>
      );
    }

    if (prep.sufenta_table) {
      const r = calcPrepSufentaTable(weight);
      if (!r) return null;
      return (
        <div className="prep-calc-box">
          <div className="prep-calc-header"><PrepIcon /> Pour {r.kg} kg</div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Vi (prélever)</span>
            <span className="prep-calc-val prep-calc-highlight">{r.vi} mL d'ampoule pure</span>
          </div>
          <div className="prep-calc-row">
            <span className="prep-calc-step">Vf (diluer à)</span>
            <span className="prep-calc-val prep-calc-highlight" style={{color:"#60a5fa",fontWeight:800}}>{r.vf} mL dans la seringue</span>
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
          <div className="prep-calc-header"><PrepIcon /> Pour {kg} kg</div>
          {phases.map((phase, i) => (
            <div key={i} style={{marginTop: i > 0 ? 8 : 0, paddingTop: i > 0 ? 8 : 0, borderTop: i > 0 ? "1px solid var(--border)" : "none"}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--text-dim)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{phase.label} — {phase.duree}</div>
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
                <span className="prep-calc-val prep-calc-highlight" style={{color:"#60a5fa",fontWeight:800}}>{phase.solvantVol} mL G5%</span>
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
    const solvantVol = !prep.prelever_total && prep.volume_final ? prep.volume_final - volMin : null;
    return (
      <div className="prep-calc-box">
        <div className="prep-calc-header"><PrepIcon /> Pour {kg} kg</div>
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
          <div className="prep-calc-header"><InfoIcon /> Calcul dose libre</div>
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
  );
};

export default PrepBlock;
