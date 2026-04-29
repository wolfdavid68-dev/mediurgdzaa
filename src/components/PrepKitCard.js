import React, { useState } from "react";
import { DRUGS } from "../data/drugs";

const buildPrepFromDrug = (drug) => {
  if (!drug) return null;
  const cond = drug.cond?.[0] || null;
  const etapes = drug.prep?.etapes || [];
  return { cond, etapes };
};

const PrepKitCard = ({ kit }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("drogues");

  return (
    <div className={`drug-card ${open ? "drug-card-open" : ""}`}>
      <button className="drug-header" onClick={() => setOpen(!open)}>
        <div className="drug-color-bar" style={{ background: kit.couleur }} />
        <div className="drug-main">
          <div className="drug-title-row">
            <span className="drug-icon">{kit.icon}</span>
            <span className="drug-name">{kit.nom}</span>
          </div>
          <div className="drug-subtitle">
            <span className="badge badge-cat">{kit.cat}</span>
            <span className="drug-classe">{kit.drogues.length} médicament{kit.drogues.length > 1 ? "s" : ""}</span>
          </div>
        </div>
        <svg className={`chevron ${open ? "chevron-open" : ""}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="drug-body">
          <p className="drug-desc">{kit.desc}</p>

          <div className="tabs-row">
            <button
              className={`tab-btn tab-poso ${activeTab === "drogues" ? "tab-active" : ""}`}
              style={activeTab === "drogues" ? { background: kit.couleur + "25", borderColor: kit.couleur, color: kit.couleur } : {}}
              onClick={() => setActiveTab("drogues")}
            >
              <span className="dot dot-poso" style={{ background: kit.couleur }} />
              <span className="tab-label">Médicaments</span>
            </button>
            <button
              className={`tab-btn tab-info ${activeTab === "materiel" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("materiel")}
            >
              <span className="dot dot-info" />
              <span className="tab-label">Matériel</span>
            </button>
            <button
              className={`tab-btn tab-neutral ${activeTab === "sequence" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("sequence")}
            >
              <span className="dot dot-neutral" />
              <span className="tab-label">Séquence</span>
            </button>
            {kit.notes && kit.notes.length > 0 && (
              <button
                className={`tab-btn tab-danger ${activeTab === "notes" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("notes")}
              >
                <span className="dot dot-danger" />
                <span className="tab-label">Notes</span>
              </button>
            )}
          </div>

          <div className="tab-content">
            {activeTab === "drogues" && (
              <div className="prepkit-drugs">
                {kit.drogues.map((d, i) => {
                  const drug = d.drugId ? DRUGS.find(x => x.id === d.drugId) : null;
                  const fromDrug = buildPrepFromDrug(drug);
                  const condText = fromDrug?.cond || null;
                  const etapes = (fromDrug?.etapes && fromDrug.etapes.length > 0) ? fromDrug.etapes : null;
                  const fallbackPrep = !etapes ? d.prep : null;
                  return (
                    <div key={i} className="prepkit-drug-card" style={{ borderLeftColor: kit.couleur }}>
                      <div className="prepkit-drug-name">{d.nom}</div>
                      <div className="prepkit-drug-role">{d.role}</div>
                      <div className="prepkit-drug-row">
                        <span className="prepkit-drug-label">Dose</span>
                        <span className="prepkit-drug-value">{d.dose}</span>
                      </div>
                      {condText && (
                        <div className="prepkit-drug-row">
                          <span className="prepkit-drug-label">Cond.</span>
                          <span className="prepkit-drug-value">{condText}</span>
                        </div>
                      )}
                      {etapes ? (
                        <div className="prepkit-drug-row">
                          <span className="prepkit-drug-label">Prép.</span>
                          <span className="prepkit-drug-value">
                            <ol style={{margin:0,paddingLeft:16}}>
                              {etapes.map((step, j) => <li key={j}>{step}</li>)}
                            </ol>
                          </span>
                        </div>
                      ) : fallbackPrep ? (
                        <div className="prepkit-drug-row">
                          <span className="prepkit-drug-label">Prép.</span>
                          <span className="prepkit-drug-value">{fallbackPrep}</span>
                        </div>
                      ) : null}
                      {d.note && (
                        <div className="prepkit-drug-note">
                          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          {d.note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "materiel" && (
              <ul className="item-list">
                {kit.materiel.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            )}

            {activeTab === "sequence" && (
              <ol className="prep-etapes">
                {kit.sequence.map((s, i) => <li key={i} className="prep-etape">{s}</li>)}
              </ol>
            )}

            {activeTab === "notes" && kit.notes && (
              <ul className="prep-notes">
                {kit.notes.map((n, i) => (
                  <li key={i} className="prep-note-item">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    {n}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrepKitCard;
