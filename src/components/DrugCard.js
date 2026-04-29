import React, { useState, useEffect } from "react";
import { calcDose, ciSeverity } from "../lib/calc";
import DrugNote from "./DrugNote";
import PrepBlock from "./PrepBlock";
import PseBlock from "./PseBlock";

const TABS = [
  { key: "poso",  label: "Posologie",           type: "poso" },
  { key: "indic", label: "Indications",         type: "info" },
  { key: "ci",    label: "Contre-ind.",         type: "ci" },
  { key: "ei",    label: "Effets indés.",       type: "danger" },
  { key: "cond",  label: "Conditionnements",    type: "neutral" },
];

const DrugCard = ({ drug, isFavorite, onToggleFavorite, onOpen }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [hasNote, setHasNote] = useState(false);
  const [weight, setWeight] = useState("");
  const [produitFinal, setProduitFinal] = useState("");

  useEffect(() => {
    if (open) {
      setActiveTab("poso");
      if (onOpen) onOpen(drug.id);
    }
  }, [open, drug.id, onOpen]);

  const toggleTab = (key) => setActiveTab(activeTab === key ? null : key);

  const renderList = (items) => {
    if (!items || items.length === 0) return <span className="na">Non renseigné</span>;
    return (
      <ul className="item-list">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    );
  };

  const renderPosoTab = () => {
    const prep = drug.prep || null;

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

        <PrepBlock drug={drug} weight={weight} produitFinal={produitFinal} />
        <PseBlock drug={drug} weight={weight} />
        <DrugNote drugId={drug.id} onChange={setHasNote} />
      </>
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
                    {sev === "abs" ? "Absolue" : sev === "rel" ? "Relative" : "Précaution"}
                  </span>
                )}
                <span className="ci-text">{it}</span>
              </li>
            );
          })}
        </ul>
      );
    }
    if (key === "ei") return renderList(drug.ei);
    if (key === "cond") {
      if (!drug.cond || drug.cond.length === 0) return <span className="na">Non renseigné</span>;
      return (
        <div className="cond-list">
          {drug.cond.map((c, i) => <span key={i} className="cond-tag">{c}</span>)}
        </div>
      );
    }
    if (key === "poso") return renderPosoTab();
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
            {hasNote && <span className="note-indicator" title="Note personnelle ajoutée">✎</span>}
          </div>
          <div className="drug-subtitle">
            <span className="badge badge-cat" data-cat={drug.cat}>{drug.cat}</span>
            {drug.svc.map((s) => <span key={s} className="badge badge-svc">{s}</span>)}
            <span className="drug-classe">{drug.classe}</span>
          </div>
        </div>
        {onToggleFavorite && (
          <span
            role="button"
            tabIndex={0}
            className={`drug-favorite ${isFavorite ? "drug-favorite-active" : ""}`}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(drug.id); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onToggleFavorite(drug.id); } }}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {isFavorite ? "★" : "☆"}
          </span>
        )}
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
