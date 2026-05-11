import React, { useMemo, useState, useEffect, useRef } from "react";
import { DRUGS } from "./data/drugs";
import { PROTOCOLS } from "./data/protocols";
import { PREP_KITS } from "./data/prepKits";
import { ALIASES } from "./data/aliases";
import { normalize } from "./lib/normalize";
import DrugList from "./components/DrugList";
import ProtocolCard from "./components/ProtocolCard";
import IncompatibilityList from "./components/IncompatibilityList";
import PrepKitCard from "./components/PrepKitCard";
import ChangelogModal from "./components/ChangelogModal";
import AcrModeModal from "./components/AcrModeModal";
import { APP_VERSION } from "./data/changelog";

const CATEGORIES = ["Tout", ...Array.from(new Set(DRUGS.map((d) => d.cat)))];
const SERVICES = ["Tout", "SAUV", "SMUR", "SAU", "REA"];

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
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showChangelog, setShowChangelog] = useState(false);
  const [showAcr, setShowAcr] = useState(false);
  // null | "default" | "firefox-no-exit" — null = caché ; sinon affiche le toast
  // avec le bon message (variante Firefox PWA = ne peut pas quitter via back).
  const [exitToast, setExitToast] = useState(null);

  // Refs miroirs pour que le handler CloseWatcher (closure attachée 1 seule fois
  // au mount) lise la dernière valeur — sinon il garde la valeur initiale (false).
  const showAcrRef = useRef(showAcr);
  const showChangelogRef = useRef(showChangelog);
  useEffect(() => { showAcrRef.current = showAcr; }, [showAcr]);
  useEffect(() => { showChangelogRef.current = showChangelog; }, [showChangelog]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

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

  // === Navigation par couches alignée sur l'historique navigateur ===
  // Chaque ouverture de modale, changement de sous-onglet ou de page pousse une entrée.
  // Bouton retour Android : 1er appui ferme la modale → sous-onglet précédent → page précédente → quitter.
  const pushNav = (patch) => {
    const current = window.history.state?.mediurg
      || { page: "medicaments", protoCategory: "PISU", modal: null };
    const next = { ...current, ...patch };
    try { window.history.pushState({ mediurg: next }, ""); } catch {}
  };
  const replaceNav = (patch) => {
    const current = window.history.state?.mediurg
      || { page: "medicaments", protoCategory: "PISU", modal: null };
    const next = { ...current, ...patch };
    try { window.history.replaceState({ mediurg: next }, ""); } catch {}
  };

  useEffect(() => {
    // Setup de l'history a déjà été fait dans un <script> inline d'index.html
    // (sentinelle + état actif), AVANT le mount React. Filet de sécurité si
    // jamais ce script a été bypassé (ouverture directe via un outil de test,
    // etc.) — on s'assure qu'on a au moins notre clé mediurg dans le state.
    try {
      if (!window.history.state?.mediurg) {
        const here = window.location.href;
        window.history.replaceState(
          { mediurg: { page: "medicaments", protoCategory: "PISU", modal: null, sentinel: true } },
          "",
          here
        );
        window.history.pushState(
          { mediurg: { page: "medicaments", protoCategory: "PISU", modal: null } },
          "",
          here
        );
      }
    } catch {}

    let lastBackAt = 0;
    let toastTimer = null;

    // Détection Firefox Android : sur cette config, le 2e back qui laisse la
    // navigation proceeder aboutit à des écrans morts (noir/rouge puis gris/rouge),
    // qu'on soit en PWA installée ou en onglet — Firefox Android ne sait pas
    // fermer proprement sa surface via hardware back une fois l'history vidée.
    // On bloque donc aussi le 2e back et on redirige vers l'app récente Android.
    // (Le check display-mode: standalone était trop restrictif — Firefox ne se
    // déclare pas toujours en standalone même quand l'app est ajoutée à l'écran
    // d'accueil. Couvre les deux cas ici.)
    const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
    const isFirefoxAndroid = /Firefox/i.test(ua) && /Android/i.test(ua);

    const showExitToast = (variant) => {
      setExitToast(variant);
      if (toastTimer) clearTimeout(toastTimer);
      // Le message Firefox est plus long → laisser plus de temps
      toastTimer = setTimeout(() => setExitToast(null), variant === "firefox-no-exit" ? 3500 : 2000);
    };

    // popstate gère :
    //   - la nav interne (modales, sous-onglets, page changes) — toujours
    //   - le fallback « garde 2× retour pour quitter » via sentinelle — uniquement
    //     pour les navigateurs sans CloseWatcher. Quand CloseWatcher est dispo,
    //     elle intercepte AVANT popstate, donc cette branche ne s'exécute pas.
    const onPopState = (e) => {
      const s = e.state?.mediurg;
      if (!s || s.sentinel) {
        const now = Date.now();
        if (now - lastBackAt < 2000) {
          try { window.history.back(); } catch {}
          return;
        }
        try {
          window.history.pushState(
            { mediurg: { page: "medicaments", protoCategory: "PISU", modal: null } },
            "",
            window.location.href
          );
        } catch {}
        lastBackAt = now;
        showExitToast("default");
        setPage("medicaments");
        setProtoCategory("PISU");
        setShowChangelog(false);
        setShowAcr(false);
        return;
      }
      setPage(s.page || "medicaments");
      setProtoCategory(s.protoCategory || "PISU");
      setShowChangelog(s.modal === "changelog");
      setShowAcr(s.modal === "acr");
    };
    window.addEventListener("popstate", onPopState);

    // CloseWatcher (Chrome 120+, Firefox 149+) — API conçue spécifiquement
    // pour intercepter les « close requests » (Esc Windows, geste retour iOS,
    // bouton retour Android). preventDefault sur l'event 'cancel' rejette le
    // close. Plus fiable que Navigation API pour ce cas.
    //
    // Note importante : quand cancel n'est PAS preventDefault, l'event close
    // fire mais le navigateur ne déclenche PAS automatiquement l'action de
    // fermeture suivante (au moins sur Chrome PWA Android). Il faut donc
    // appeler window.history.back() manuellement pour enchaîner vers
    // l'exit (popstate avec sentinel → 2nd history.back → quitte la PWA).
    let watcher = null;
    let watcherDestroyed = false;
    let pendingExit = false; // 2e retour validé, exit à enchaîner dans 'close'

    const setupWatcher = () => {
      if (watcherDestroyed) return;
      if (typeof window.CloseWatcher !== "function") return;
      try {
        watcher = new window.CloseWatcher();
      } catch { return; }

      watcher.addEventListener("cancel", (e) => {
        // En modal/sous-écran : laisser le close passer pour que popstate
        // ferme le modal via history.
        const inDeepState = showAcrRef.current || showChangelogRef.current;
        if (inDeepState) return;

        const now = Date.now();
        if (now - lastBackAt < 2000) {
          // 2e retour dans 2 s
          if (isFirefoxAndroid) {
            // Sur Firefox Android (PWA ou onglet), laisser le close fire ou
            // history.back manuel = écrans morts (noir/rouge puis gris/rouge).
            // On bloque aussi le 2e back et on redirige vers l'app récente.
            e.preventDefault();
            lastBackAt = now;
            showExitToast("firefox-no-exit");
            return;
          }
          // Autres navigateurs : on flag pour exit dans le handler close
          pendingExit = true;
          return;
        }
        // 1er retour : toast standard
        e.preventDefault();
        lastBackAt = now;
        showExitToast("default");
      });
      watcher.addEventListener("close", () => {
        watcher = null;
        if (pendingExit) {
          // 2e retour : on enchaîne manuellement l'exit. Le navigateur ne
          // le fait pas automatiquement après close non-préventé.
          pendingExit = false;
          watcherDestroyed = true; // empêche le recreate juste avant l'exit
          try { window.history.back(); } catch {}
          return;
        }
        // close fire à cause d'une nav interne (modal qui ferme via history.back).
        // Recreate pour catcher le prochain retour.
        Promise.resolve().then(setupWatcher);
      });
    };
    setupWatcher();

    return () => {
      window.removeEventListener("popstate", onPopState);
      watcherDestroyed = true;
      if (watcher) { try { watcher.destroy(); } catch {} }
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  const navigateTo = (newPage) => {
    if (newPage === page && !showAcr && !showChangelog) return;
    pushNav({ page: newPage, modal: null });
    setPage(newPage);
    setShowAcr(false);
    setShowChangelog(false);
  };

  const changeProtoCategory = (newCat) => {
    if (newCat === protoCategory) return;
    pushNav({ protoCategory: newCat });
    setProtoCategory(newCat);
  };

  const openChangelog = () => { pushNav({ modal: "changelog" }); setShowChangelog(true); };
  const openAcr = () => { pushNav({ modal: "acr" }); setShowAcr(true); };
  const closeOverlay = () => {
    try { window.history.back(); }
    catch { setShowChangelog(false); setShowAcr(false); }
  };

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
            <span
              className={`net-status ${isOnline ? "net-status-online" : "net-status-offline"}`}
              aria-live="polite"
              title={isOnline ? "Connecté au réseau" : "Hors ligne — données en cache"}
            >
              <span className="net-status-dot" aria-hidden="true" />
              {isOnline ? "Online" : "Offline"}
            </span>
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
                onClick={() => changeProtoCategory("PISU")}
              >
                PISU
                <span className="proto-category-count">{filteredProtocols.length}</span>
              </button>
              <button
                className={`proto-category-tab ${protoCategory === "incompatibilites" ? "proto-category-active" : ""}`}
                onClick={() => changeProtoCategory("incompatibilites")}
              >
                Incompatibilité Médicamenteuse
              </button>
              <button
                className={`proto-category-tab ${protoCategory === "kits" ? "proto-category-active" : ""}`}
                onClick={() => changeProtoCategory("kits")}
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
                      onDrugSearch={(name) => { navigateTo("medicaments"); setSearch(name); }}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav-row">
          <button
            className={`bottom-tab ${page === "medicaments" ? "bottom-tab-active" : ""}`}
            onClick={() => navigateTo("medicaments")}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
            </svg>
            <span>Médicaments</span>
          </button>
          <button
            className={`bottom-tab ${page === "protocoles" ? "bottom-tab-active" : ""}`}
            onClick={() => navigateTo("protocoles")}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
            <span>Protocoles</span>
          </button>
        </div>
        <button
          type="button"
          className="version-badge-nav"
          onClick={openChangelog}
          title="Voir les notes de version"
          aria-label={`Version ${APP_VERSION} — voir les notes de version`}
        >
          {APP_VERSION}
        </button>
      </nav>

      <button
        type="button"
        className="urgence-fab"
        onClick={openAcr}
        aria-label="Ouvrir le mode urgence ACR"
      >
        <span className="urgence-fab-icon" aria-hidden="true">🚨</span>
        <span className="urgence-fab-label">URGENCE</span>
      </button>

      <AcrModeModal
        open={showAcr}
        onClose={closeOverlay}
        onOpenDrug={(name) => {
          // On remplace l'entrée d'historique de l'ACR par la nouvelle vue
          // → bouton retour ramène à l'écran d'avant l'ouverture du mode urgence (pas dans la modale).
          replaceNav({ page: "medicaments", modal: null });
          setShowAcr(false);
          setPage("medicaments");
          setSearch(name);
        }}
      />
      <ChangelogModal open={showChangelog} onClose={closeOverlay} />

      {exitToast && (
        <div className="exit-toast" role="status" aria-live="polite">
          {exitToast === "firefox-no-exit"
            ? "Sur Firefox Android, utilisez le bouton app récente pour fermer MediURG."
            : "Appuyez à nouveau sur retour pour quitter"}
        </div>
      )}
    </div>
  );
};

export default App;
