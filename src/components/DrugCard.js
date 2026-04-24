import React, { useState, useEffect } from "react";

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
    if (key === "ci")    return renderList(drug.ci);
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
        if (!prep || !prep.dose_kg || !validKg) return null;
        const dose = prep.dose_kg * kg;
        const doseMax = prep.dose_max_kg ? prep.dose_max_kg * kg : null;
        const volMin = prep.conc_produit ? +(dose / prep.conc_produit).toFixed(1) : null;
        const volMax = doseMax && prep.conc_produit ? +(doseMax / prep.conc_produit).toFixed(1) : null;
        if (!volMin) return null;
        const volLabel = volMax && volMax !== volMin ? `${volMin}–${volMax} mL` : `${volMin} mL`;
        const doseLabel = doseMax ? `${+dose.toFixed(1)}–${+doseMax.toFixed(1)} ${prep.unite}` : `${+dose.toFixed(1)} ${prep.unite}`;
        const solvantVol = prep.volume_final ? prep.volume_final - volMin : null;
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
              <span className="prep-calc-val prep-calc-highlight">{volLabel} du produit</span>
            </div>
            {solvantVol !== null && (
              <div className="prep-calc-row">
                <span className="prep-calc-step">Compléter à</span>
                <span className="prep-calc-val prep-calc-highlight">{prep.volume_final} mL avec {prep.solvant}</span>
              </div>
            )}
          </div>
        );
      };

      return (
        <>
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
