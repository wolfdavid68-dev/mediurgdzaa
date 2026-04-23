import React, { useMemo, useState } from "react";
import { DRUGS } from "./data/drugs";
import DrugList from "./components/DrugList";

const CATEGORIES = ["Tout", ...Array.from(new Set(DRUGS.map((d) => d.cat)))];
const SERVICES = ["Tout", "SAUV", "SMUR", "SAU"];

// Retire les accents et met en minuscules pour une recherche insensible aux diacritiques
const normalize = (str) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const App = () => {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Tout");
  const [svc, setSvc] = useState("Tout");

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return DRUGS
      .filter((d) => {
        const matchQ =
          !q ||
          normalize(d.nom).includes(q) ||
          normalize(d.commercial).includes(q) ||
          normalize(d.dci).includes(q) ||
          normalize(d.classe).includes(q);
        const matchC = cat === "Tout" || d.cat === cat;
        const matchS = svc === "Tout" || d.svc.includes(svc);
        return matchQ && matchC && matchS;
      })
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
  }, [search, cat, svc]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-mark">✚</div>
            <div className="logo-text">
              <h1>MediURG</h1>
              <p>Pharmacologie d'urgence · SAUV · SMUR · SAU</p>
            </div>
          </div>

          <div className="search-bar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un médicament, DCI, classe…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")} aria-label="Effacer">
                ×
              </button>
            )}
          </div>

          <div className="filters">
            <div className="filter-group">
              <span className="filter-label">CAT</span>
              <div className="filter-chips">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className={`chip ${cat === c ? "chip-active" : ""}`}
                    onClick={() => setCat(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <span className="filter-label">SVC</span>
              <div className="filter-chips">
                {SERVICES.map((s) => (
                  <button
                    key={s}
                    className={`chip chip-svc ${svc === s ? "chip-active" : ""}`}
                    onClick={() => setSvc(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="result-count">
            {filtered.length} médicament{filtered.length > 1 ? "s" : ""}
          </div>
        </div>
      </header>

      <main className="main-content">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔍</div>
            <p>Aucun médicament trouvé</p>
            <small>Essayez un autre terme ou réinitialisez les filtres</small>
          </div>
        ) : (
          <DrugList drugs={filtered} />
        )}
      </main>
    </div>
  );
};

export default App;
