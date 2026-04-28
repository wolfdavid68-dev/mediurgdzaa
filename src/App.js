import React, { useMemo, useState, useEffect } from "react";
import { DRUGS } from "./data/drugs";
import { PROTOCOLS } from "./data/protocols";
import { PREP_KITS } from "./data/prepKits";
import { ALIASES } from "./data/aliases";
import DrugList from "./components/DrugList";
import ProtocolCard from "./components/ProtocolCard";
import IncompatibilityList from "./components/IncompatibilityList";
import PrepKitCard from "./components/PrepKitCard";

const CATEGORIES = ["Tout", ...Array.from(new Set(DRUGS.map((d) => d.cat)))];
const SERVICES = ["Tout", "SAUV", "SMUR", "SAU", "REA"];

const normalize = (str) =>
  str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const App = () => {
  const [page, setPage] = useState("medicaments");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Tout");
  const [svc, setSvc] = useState("Tout");
  const [protoFilter, setProtoFilter] = useState("Tout");
  const [protoCategory, setProtoCategory] = useState("PISU");
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("mediurg-theme") || "dark"; } catch { return "dark"; }
  });
  const [bigFont, setBigFont] = useState(() => {
    try { return localStorage.getItem("mediurg-bigfont") === "1"; } catch { return false; }
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem("mediurg-favorites");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("mediurg-history");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("mediurg-favorites", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const addToHistory = (id) => {
    setHistory(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, 5);
      try { localStorage.setItem("mediurg-history", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("mediurg-theme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-fontsize", bigFont ? "large" : "normal");
    try { localStorage.setItem("mediurg-bigfont", bigFont ? "1" : "0"); } catch {}
  }, [bigFont]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  const toggleFont = () => setBigFont(f => !f);

  const filteredProtocols = useMemo(() => {
    if (protoFilter === "Tout") return PROTOCOLS;
    return PROTOCOLS.filter(p => {
      const isEnfant = p.code.includes("ENF") || p.titre.includes("Enfant");
      const isAdulte = !isEnfant && p.titre.includes("Adulte");
      const isTous   = !isEnfant && !isAdulte;
      if (protoFilter === "Enfant") return isEnfant || isTous;
      if (protoFilter === "Adulte") return isAdulte || isTous;
      return true;
    });
  }, [protoFilter]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());

    // Trouve toutes les cibles d'alias dont la clé contient (ou est contenue dans) la requête
    const aliasTargets = q
      ? Object.entries(ALIASES)
          .filter(([alias]) => {
            const a = normalize(alias);
            return a.includes(q) || q.includes(a);
          })
          .map(([, target]) => normalize(target))
      : [];

    return DRUGS
      .filter((d) => {
        const fields = [d.nom, d.commercial, d.dci, d.classe].map(normalize);
        const matchDirect = !q || fields.some(f => f.includes(q));
        const matchAlias = aliasTargets.length > 0
          && aliasTargets.some(t => fields.some(f => f.includes(t)));
        const matchQ = matchDirect || matchAlias;
        const matchC = cat === "Tout" || d.cat === cat;
        const matchS = svc === "Tout" || d.svc.includes(svc);
        const matchF = !showFavoritesOnly || favorites.has(d.id);
        return matchQ && matchC && matchS && matchF;
      })
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
  }, [search, cat, svc, showFavoritesOnly, favorites]);

  const recentDrugs = useMemo(() => {
    if (search.trim() || cat !== "Tout" || svc !== "Tout" || showFavoritesOnly) return [];
    return history.map(id => DRUGS.find(d => d.id === id)).filter(Boolean);
  }, [history, search, cat, svc, showFavoritesOnly]);

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
            <button className={`font-toggle ${bigFont ? "font-toggle-active" : ""}`} onClick={toggleFont} aria-label={bigFont ? "Réduire la police" : "Agrandir la police"}>
              A+
            </button>
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
                    <button
                      className={`chip chip-fav ${showFavoritesOnly ? "chip-active" : ""}`}
                      onClick={() => setShowFavoritesOnly(v => !v)}
                      title={showFavoritesOnly ? "Désactiver le filtre favoris" : "Afficher seulement les favoris"}
                    >
                      ★ Favoris {favorites.size > 0 && <span className="chip-count">{favorites.size}</span>}
                    </button>
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        data-cat={c}
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
              <small>{showFavoritesOnly ? "Aucun favori — étoilez un médicament avec ☆" : "Essayez un autre terme ou réinitialisez les filtres"}</small>
            </div>
          ) : (
            <>
              {recentDrugs.length > 0 && (
                <div className="recent-section">
                  <div className="recent-header">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>Récents</span>
                  </div>
                  <DrugList
                    drugs={recentDrugs}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    onOpen={addToHistory}
                  />
                </div>
              )}
              <DrugList
                drugs={filtered}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onOpen={addToHistory}
              />
            </>
          )
        )}

        {page === "protocoles" && (
          <>
            <div className="proto-category-bar">
              <button
                className={`proto-category-tab ${protoCategory === "PISU" ? "proto-category-active" : ""}`}
                onClick={() => setProtoCategory("PISU")}
              >
                PISU
                <span className="proto-category-count">{filteredProtocols.length}</span>
              </button>
              <button
                className={`proto-category-tab ${protoCategory === "incompatibilites" ? "proto-category-active" : ""}`}
                onClick={() => setProtoCategory("incompatibilites")}
              >
                Incompatibilité Médicamenteuse
              </button>
              <button
                className={`proto-category-tab ${protoCategory === "kits" ? "proto-category-active" : ""}`}
                onClick={() => setProtoCategory("kits")}
              >
                Kits de préparation
                <span className="proto-category-count">{PREP_KITS.length}</span>
              </button>
            </div>

            {protoCategory === "incompatibilites" && <IncompatibilityList />}

            {protoCategory === "kits" && (
              <div className="protocol-list">
                {PREP_KITS.map(k => <PrepKitCard key={k.id} kit={k} />)}
              </div>
            )}

            {protoCategory === "PISU" && (
              <>
                <div className="proto-filter-bar">
                  {["Tout", "Adulte", "Enfant"].map(f => (
                    <button
                      key={f}
                      className={`proto-filter-chip ${protoFilter === f ? "proto-filter-active" : ""}`}
                      onClick={() => setProtoFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="protocol-list">
                  {filteredProtocols.map(p => (
                    <ProtocolCard
                      key={p.id}
                      protocol={p}
                      onDrugSearch={(name) => { setPage("medicaments"); setSearch(name); }}
                    />
                  ))}
                </div>
              </>
            )}
          </>
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
