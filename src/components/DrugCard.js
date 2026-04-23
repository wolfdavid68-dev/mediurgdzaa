import React, { useState, useEffect } from "react";

const TABS = [
  { key: "indic", label: "Indications",         type: "info" },
  { key: "ci",    label: "Contre-indications",  type: "warn" },
  { key: "ei",    label: "Effets indésirables", type: "danger" },
  { key: "cond",  label: "Conditionnements",    type: "neutral" },
  { key: "poso",  label: "Posologie",           type: "poso" },
];

const DrugCard = ({ drug }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

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
      return (
        <>
          <div className="poso-grid">
            <div className="poso-box">
              <div className="poso-title">Adulte</div>
              {drug.poso.a && drug.poso.a.length
                ? drug.poso.a.map((p, i) => <div key={i} className="poso-item">{p}</div>)
                : <span className="na">Non renseigné</span>}
            </div>
            <div className="poso-box">
              <div className="poso-title">Pédiatrique</div>
              {drug.poso.p && drug.poso.p.length
                ? drug.poso.p.map((p, i) => <div key={i} className="poso-item">{p}</div>)
                : <span className="na">Non renseigné</span>}
            </div>
          </div>

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
            <span className="badge badge-cat">{drug.cat}</span>
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
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`tab-btn tab-${tab.type} ${activeTab === tab.key ? "tab-active" : ""}`}
                style={tab.type === "poso" && activeTab === tab.key ? {
                  background: drug.couleur + "25",
                  borderColor: drug.couleur,
                  color: drug.couleur
                } : {}}
                onClick={() => toggleTab(tab.key)}
              >
                <span className={`dot dot-${tab.type}`} style={tab.type === "poso" ? { background: drug.couleur } : {}} />
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
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
