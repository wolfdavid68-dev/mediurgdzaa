import React, { useState } from "react";
import { INCOMPATIBILITIES } from "../data/incompatibilities";

const TYPE_META = {
  precipitation: { label: "Précipitation",         short: "P",   color: "#ef4444" },
  inactivation:  { label: "Inactivation",           short: "I",   color: "#f97316" },
  incompatible:  { label: "Incompatible",           short: "✕",   color: "#6b7280" },
  pH:            { label: "Incompatibilité pH",     short: "pH",  color: "#a855f7" },
  compatible:    { label: "Compatible validé",      short: "✓",   color: "#16a34a" },
};

const IncompatibilityList = () => {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = INCOMPATIBILITIES.filter(d =>
    d.drug.toLowerCase().includes(search.toLowerCase()) ||
    d.short.toLowerCase().includes(search.toLowerCase())
  );

  const entry = selected ? INCOMPATIBILITIES.find(d => d.drug === selected) : null;

  return (
    <div className="incompat-wrap">

      {/* Légende */}
      <div className="incompat-legend">
        {Object.entries(TYPE_META).map(([k, m]) => (
          <span key={k} className="incompat-legend-item">
            <span className="incompat-cell-badge" style={{ background: m.color + "28", color: m.color, borderColor: m.color + "55" }}>
              {m.short}
            </span>
            {m.label}
          </span>
        ))}
      </div>

      {/* Recherche */}
      <div className="incompat-search-wrap">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" className="incompat-search-icon">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="incompat-search"
          type="text"
          placeholder="Rechercher un médicament…"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(null); }}
        />
        {search && (
          <button className="incompat-search-clear" onClick={() => setSearch("")}>×</button>
        )}
      </div>

      {/* Grille de pills */}
      <div className="incompat-pill-grid">
        {filtered.map(d => (
          <button
            key={d.drug}
            className={`incompat-pill ${selected === d.drug ? "incompat-pill-active" : ""}`}
            style={{
              borderColor: d.color,
              background: selected === d.drug ? d.color + "30" : "transparent",
              color: selected === d.drug ? d.color : "var(--text)",
            }}
            onClick={() => setSelected(selected === d.drug ? null : d.drug)}
          >
            <span className="incompat-pill-dot" style={{ background: d.color }} />
            {d.short}
            {d.items.length > 0 && (
              <span className="incompat-pill-count" style={{ background: d.color + "30", color: d.color }}>
                {d.items.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panneau de détail */}
      {entry && (
        <div className="incompat-panel">
          <div className="incompat-panel-header" style={{ borderLeftColor: entry.color }}>
            <div className="incompat-panel-name">{entry.drug}</div>
            {entry.exclusif && <span className="incompat-excl-badge">voie excl.</span>}
            <button className="incompat-panel-close" onClick={() => setSelected(null)}>✕</button>
          </div>

          {/* Solvant */}
          <div className="incompat-solvant-row">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Solvant : <strong>{entry.solvant}</strong></span>
          </div>

          {/* Incompatibilités */}
          {entry.items.length > 0 && (
            <div className="incompat-section">
              <div className="incompat-section-title">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Incompatibilités ({entry.items.length})
              </div>
              <div className="incompat-items-list">
                {entry.items.map((item, i) => {
                  const meta = TYPE_META[item.type] || TYPE_META.incompatible;
                  return (
                    <div key={i} className="incompat-item-card" style={{ borderLeftColor: meta.color, background: meta.color + "0d" }}>
                      <span className="incompat-cell-badge" style={{ background: meta.color + "28", color: meta.color, borderColor: meta.color + "55" }}>
                        {meta.short}
                      </span>
                      <div className="incompat-item-body">
                        <div className="incompat-item-drug">{item.with}</div>
                        <div className="incompat-item-type" style={{ color: meta.color }}>{meta.label}</div>
                        {item.note && <div className="incompat-item-note">{item.note}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compatibilités validées */}
          {entry.compatibleWith && entry.compatibleWith.length > 0 && (
            <div className="incompat-section">
              <div className="incompat-section-title incompat-section-title-compat">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Compatibilités validées
              </div>
              <div className="incompat-items-list">
                {entry.compatibleWith.map((name, i) => (
                  <div key={i} className="incompat-item-card" style={{ borderLeftColor: "#16a34a", background: "#16a34a0d" }}>
                    <span className="incompat-cell-badge" style={{ background: "#16a34a28", color: "#16a34a", borderColor: "#16a34a55" }}>✓</span>
                    <div className="incompat-item-body">
                      <div className="incompat-item-drug">{name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {entry.items.length === 0 && (!entry.compatibleWith || entry.compatibleWith.length === 0) && (
            <div className="incompat-nodata">Aucune donnée d'incompatibilité répertoriée</div>
          )}
        </div>
      )}

      {!entry && (
        <div className="incompat-hint">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Sélectionnez un médicament pour afficher ses incompatibilités
        </div>
      )}
    </div>
  );
};

export default IncompatibilityList;
