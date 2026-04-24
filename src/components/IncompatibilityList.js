import React, { useState } from "react";
import { INCOMPATIBILITIES } from "../data/incompatibilities";

const TYPE_META = {
  precipitation: { label: "Précipitation",  color: "#ef4444" },
  inactivation:  { label: "Inactivation",   color: "#f97316" },
  incompatible:  { label: "Incompatible",   color: "#6b7280" },
};

const IncompatibilityList = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);

  const q = search.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const filtered = INCOMPATIBILITIES.filter(entry => {
    if (!q) return true;
    const hay = (entry.drug + entry.items.map(i => i.with).join(" "))
      .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return hay.includes(q);
  });

  return (
    <div className="incompat-list">
      <div className="incompat-search">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Rechercher un médicament…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoComplete="off"
          spellCheck="false"
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch("")} aria-label="Effacer">×</button>
        )}
      </div>

      <div className="incompat-legend">
        {Object.entries(TYPE_META).map(([k, m]) => (
          <span key={k} className="incompat-legend-item">
            <span className="incompat-badge" style={{ background: m.color + "22", color: m.color, border: `1px solid ${m.color}55` }}>{m.label}</span>
          </span>
        ))}
      </div>

      {filtered.map(entry => {
        const isOpen = open === entry.id;
        return (
          <div key={entry.id} className={`incompat-card ${isOpen ? "incompat-card-open" : ""}`}>
            <button className="incompat-header" onClick={() => setOpen(isOpen ? null : entry.id)}>
              <span className="incompat-dot" style={{ background: entry.color }} />
              <span className="incompat-drug-name">{entry.drug}</span>
              <span className="incompat-count">{entry.items.length} incompatibilité{entry.items.length > 1 ? "s" : ""}</span>
              <svg className={`chevron ${isOpen ? "chevron-open" : ""}`}
                viewBox="0 0 24 24" width="16" height="16"
                fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isOpen && (
              <div className="incompat-body">
                <ul className="incompat-items">
                  {entry.items.map((item, i) => {
                    const meta = TYPE_META[item.type] || TYPE_META.incompatible;
                    return (
                      <li key={i} className="incompat-item">
                        <span className="incompat-badge" style={{ background: meta.color + "22", color: meta.color, border: `1px solid ${meta.color}55` }}>
                          {meta.label}
                        </span>
                        <div className="incompat-item-text">
                          <strong>{item.with}</strong>
                          {item.note && <span className="incompat-note"> — {item.note}</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {entry.compatible && (
                  <div className="incompat-compatible">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#16a34a" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{entry.compatible}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <p>Aucun médicament trouvé</p>
        </div>
      )}
    </div>
  );
};

export default IncompatibilityList;
