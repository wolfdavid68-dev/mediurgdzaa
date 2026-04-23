import React, { useMemo, useState, useEffect } from "react";
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
  const [page, setPage] = useState("medicaments");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Tout");
  const [svc, setSvc] = useState("Tout");
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("mediurg-theme") || "dark"; } catch { return "dark"; }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("mediurg-theme", theme); } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

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
    <div className="app" data-testid="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo-row">
            <div className="logo">
              <div className="logo-mark">✚</div>
              <div className="logo-text">
                <h1>MediURG</h1>
                <p>Pharmacologie d'urgence · SAUV · SMUR · SAU</p>
              </div>
            </div>
            <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}>
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>

          {page === "medicaments" && (
            <>
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
            </>
          )}
        </div>
      </header>

      <main className="main-content">
        {page === "medicaments" && (
          filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <p>Aucun médicament trouvé</p>
              <small>Essayez un autre terme ou réinitialisez les filtres</small>
            </div>
          ) : (
            <DrugList drugs={filtered} />
          )
        )}
        {page === "protocoles" && (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <p>Protocoles</p>
            <small>Cette section est en cours de construction</small>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button
          className={`bottom-tab ${page === "medicaments" ? "bottom-tab-active" : ""}`}
          onClick={() => setPage("medicaments")}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
          </svg>
          <span>Médicaments</span>
        </button>
        <button
          className={`bottom-tab ${page === "protocoles" ? "bottom-tab-active" : ""}`}
          onClick={() => setPage("protocoles")}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="13" y2="16" />
          </svg>
          <span>Protocoles</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
