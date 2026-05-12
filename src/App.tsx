import { useMemo, useState, useEffect, useDeferredValue, lazy, Suspense } from "react";
import { DRUGS } from "./data/drugs";
import { ALIASES } from "./data/aliases";
import { normalize } from "./lib/normalize";
import { fuzzyIncludes } from "./lib/fuzzy";
import DrugList from "./components/DrugList";
import UpdatePrompt from "./components/UpdatePrompt";
import { APP_VERSION } from "./data/changelog";

// Code-splitting : les modales (ACR, changelog) sont importées à la demande,
// et la page Protocoles entière (avec ses data PROTOCOLS + PREP_KITS et ses
// sous-onglets IncompatibilityList + PrepKitCard) est lazy aussi. Tout ce
// poids sort du bundle initial → premier paint plus rapide.
const AcrModeModal = lazy(() => import("./components/AcrModeModal"));
const ChangelogModal = lazy(() => import("./components/ChangelogModal"));
const ProtocolesPage = lazy(() => import("./pages/ProtocolesPage"));
const EchellesPage = lazy(() => import("./pages/EchellesPage"));

const CATEGORIES = ["Tout", ...Array.from(new Set(DRUGS.map((d) => d.cat)))];
const SERVICES = ["Tout", "SAUV", "SMUR", "SAU", "REA"];

const App = () => {
  const [page, setPage] = useState("medicaments");
  const [search, setSearch] = useState("");
  // useDeferredValue : l'input reste réactif à 60 fps (priorité urgente)
  // pendant que le filtrage de DRUGS sur la valeur différée reste en arrière-plan
  // (priorité non urgente, interruptible). Sur smartphones lents (SAMU, vieux
  // Android), évite que la frappe rapide ne lag pendant que useMemo recalcule.
  const deferredSearch = useDeferredValue(search);
  const [cat, setCat] = useState("Tout");
  const [svc, setSvc] = useState("Tout");
  // protoFilter (filtre Adulte/Enfant) est maintenant géré en interne par
  // ProtocolesPage. App garde uniquement protoCategory parce qu'il est dans
  // l'historique navigateur (pushNav { protoCategory: ... }).
  const [protoCategory, setProtoCategory] = useState("PISU");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("mediurg-theme") || "dark";
    } catch {
      return "dark";
    }
  });
  const [bigFont, setBigFont] = useState(() => {
    try {
      return localStorage.getItem("mediurg-bigfont") === "1";
    } catch {
      return false;
    }
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem("mediurg-favorites");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("mediurg-history");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
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

  // Lecture des query params au mount pour les raccourcis manifest (long-press
  // de l'icône Android). ?mode=acr ouvre direct la modale URGENCE, ?page +
  // ?tab basculent sur Protocoles + sous-onglet. Une fois appliqué, on nettoie
  // l'URL via replaceState pour éviter qu'un refresh reproduise le raccourci.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const pageParam = params.get("page");
    const tab = params.get("tab");
    let dirty = false;
    if (mode === "acr") {
      setShowAcr(true);
      dirty = true;
    }
    if (pageParam === "protocoles") {
      setPage("protocoles");
      dirty = true;
    }
    if (pageParam === "echelles") {
      setPage("echelles");
      dirty = true;
    }
    if (tab === "incompatibilites" || tab === "kits" || tab === "PISU") {
      setProtoCategory(tab);
      dirty = true;
    }
    if (dirty) {
      try {
        window.history.replaceState(window.history.state, "", window.location.pathname);
      } catch {}
    }
  }, []);

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("mediurg-favorites", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const addToHistory = (id) => {
    setHistory((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 5);
      try {
        localStorage.setItem("mediurg-history", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("mediurg-theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-fontsize", bigFont ? "large" : "normal");
    try {
      localStorage.setItem("mediurg-bigfont", bigFont ? "1" : "0");
    } catch {}
  }, [bigFont]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const toggleFont = () => setBigFont((f) => !f);

  // === Navigation par couches alignée sur l'historique navigateur ===
  // Chaque ouverture de modale, changement de sous-onglet ou de page pousse une entrée.
  // Bouton retour Android : 1er appui ferme la modale → sous-onglet précédent → page précédente → quitter.
  const pushNav = (patch) => {
    const current = window.history.state?.mediurg || {
      page: "medicaments",
      protoCategory: "PISU",
      modal: null,
    };
    const next = { ...current, ...patch };
    try {
      window.history.pushState({ mediurg: next }, "");
    } catch {}
  };
  const replaceNav = (patch) => {
    const current = window.history.state?.mediurg || {
      page: "medicaments",
      protoCategory: "PISU",
      modal: null,
    };
    const next = { ...current, ...patch };
    try {
      window.history.replaceState({ mediurg: next }, "");
    } catch {}
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

    // Firefox Android : popstate n'est pas fire de manière fiable sur hardware
    // back en PWA installée → on tombe sur des écrans morts (noir/rouge puis
    // gris/rouge). On bloque tout exit via back avec CloseWatcher (qui fire bien)
    // et on redirige vers l'app récente Android pour fermer proprement.
    const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
    const isFirefoxAndroid = /Firefox/i.test(ua) && /Android/i.test(ua);

    const showExitToast = (variant) => {
      setExitToast(variant);
      if (toastTimer) clearTimeout(toastTimer);
      // 4 s pour le toast d'exit standard (était 2 s, trop court : l'user
      // avait l'impression que le 1er back ne faisait rien et retapait dans
      // la foulée → exit imprévu via la fenêtre rapid-double <1 s).
      toastTimer = setTimeout(
        () => setExitToast(null),
        variant === "firefox-no-exit" ? 4000 : 4000
      );
    };

    // Architecture popstate-first (depuis v59) :
    //   - Pour TOUS les browsers sauf Firefox Android, on laisse les backs popper
    //     naturellement via popstate (modales, pages, sentinelle).
    //   - Une garde « rapid double-back » de moins d'1 s court-circuite la sentinelle
    //     toast pour permettre un exit immédiat quand l'user mash le bouton retour.
    //   - 1 back = retour à l'écran précédent (modal → page précédente, page → page
    //     précédente, page racine → toast). 2 backs dans 1 s = exit.
    //   - Pour Firefox Android, CloseWatcher.preventDefault bloque tout exit (cf.
    //     bug Mozilla 1742059) et on demande à l'user d'utiliser l'app récente.
    const onPopState = (e) => {
      const s = e.state?.mediurg;
      const now = Date.now();
      const isRapidDouble = now - lastBackAt < 1000;
      lastBackAt = now;

      if (!s || s.sentinel) {
        // Sentinelle = tentative de sortie de l'app
        if (isRapidDouble) {
          // 2e back rapide → on laisse vraiment partir
          try {
            window.history.back();
          } catch {}
          return;
        }
        // 1er back à la racine → toast + re-push pour rester dans l'app
        try {
          window.history.pushState(
            { mediurg: { page: "medicaments", protoCategory: "PISU", modal: null } },
            "",
            window.location.href
          );
        } catch {}
        showExitToast("default");
        setPage("medicaments");
        setProtoCategory("PISU");
        setShowChangelog(false);
        setShowAcr(false);
        return;
      }

      // Nav interne (modal close, page change). State restoré depuis l'history.
      setPage(s.page || "medicaments");
      setProtoCategory(s.protoCategory || "PISU");
      setShowChangelog(s.modal === "changelog");
      setShowAcr(s.modal === "acr");
    };
    window.addEventListener("popstate", onPopState);

    // CloseWatcher : uniquement pour Firefox Android où popstate ne suffit pas.
    let watcher = null;
    if (isFirefoxAndroid && typeof window.CloseWatcher === "function") {
      try {
        watcher = new window.CloseWatcher();
        watcher.addEventListener("cancel", (e) => {
          e.preventDefault();
          showExitToast("firefox-no-exit");
        });
      } catch {}
    }

    // Chrome / Samsung Internet en PWA installée (display-mode: standalone) :
    // popstate ne fire PAS pour le back-at-root → Chrome ferme la PWA direct
    // sans qu'on puisse afficher le toast d'exit. Le mode browser tab marche
    // bien (popstate fire normalement). Détecté en standalone, on installe
    // un CloseWatcher pour intercepter le back :
    //   - Modal/page profonde : preventDefault + history.back() → popstate
    //     existant gère le retour
    //   - À la racine, 1er back : preventDefault + toast (reste dans l'app)
    //   - À la racine, 2e back <1s : ne preventDefault PAS → Chrome ferme
    //     la PWA via son flux natif
    const isStandalonePWA = (() => {
      try {
        if (typeof window === "undefined" || !window.matchMedia) return false;
        return (
          window.matchMedia("(display-mode: standalone)").matches ||
          window.matchMedia("(display-mode: fullscreen)").matches ||
          window.matchMedia("(display-mode: minimal-ui)").matches ||
          window.navigator.standalone === true // iOS
        );
      } catch {
        return false;
      }
    })();

    let pwaWatcher = null;
    const setupPwaWatcher = () => {
      if (!isStandalonePWA) return;
      if (isFirefoxAndroid) return; // déjà géré au-dessus
      if (typeof window.CloseWatcher !== "function") return;
      try {
        pwaWatcher = new window.CloseWatcher();
        pwaWatcher.addEventListener("cancel", (e) => {
          const s = window.history.state?.mediurg;
          const now = Date.now();
          const isRapidDouble = now - lastBackAt < 1000;

          // Modal ouverte → on délègue à popstate via history.back()
          if (s?.modal === "acr" || s?.modal === "changelog") {
            e.preventDefault();
            lastBackAt = now;
            try {
              window.history.back();
            } catch {}
            setupPwaWatcher();
            return;
          }

          // Page profonde (Protocoles, Échelles) → idem, on délègue
          if (s?.page && s.page !== "medicaments") {
            e.preventDefault();
            lastBackAt = now;
            try {
              window.history.back();
            } catch {}
            setupPwaWatcher();
            return;
          }

          // À la racine
          if (isRapidDouble) {
            // 2e back rapide → on laisse la PWA se fermer (pas de preventDefault)
            // → le watcher s'auto-détruit, le close action procède
            lastBackAt = now;
            return;
          }

          // 1er back à la racine → toast + bloquer l'exit + recréer le watcher
          e.preventDefault();
          lastBackAt = now;
          showExitToast("default");
          setupPwaWatcher();
        });
      } catch {}
    };
    setupPwaWatcher();

    return () => {
      window.removeEventListener("popstate", onPopState);
      if (watcher) {
        try {
          watcher.destroy();
        } catch {}
      }
      if (pwaWatcher) {
        try {
          pwaWatcher.destroy();
        } catch {}
      }
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  // View Transitions API (Chrome 111+, Safari 18+) : enveloppe les changements
  // de page/sous-onglet pour que le navigateur produise un cross-fade fluide
  // entre l'ancienne et la nouvelle vue. Fallback silencieux sur les browsers
  // qui n'exposent pas startViewTransition (tout se passe instantanément, comme avant).
  const withTransition = (mutator) => {
    if (typeof document.startViewTransition !== "function") return mutator();
    document.startViewTransition(mutator);
  };

  // Changements de PAGE (Médicaments ↔ Protocoles) entrent dans le back stack
  // → 1er back retourne à la page précédente, conformément aux attentes natives.
  // Changements de SOUS-ONGLET (PISU / Incompat / Kits) restent en replaceNav
  // (les tabs ne sont pas typiquement dans le back stack natif Android).
  // Le rapid-double-back dans le popstate handler (<1s) court-circuite cette
  // navigation pour permettre un exit rapide quand l'user mash le bouton.
  const navigateTo = (newPage) => {
    if (newPage === page && !showAcr && !showChangelog) return;
    pushNav({ page: newPage, modal: null });
    withTransition(() => {
      setPage(newPage);
      setShowAcr(false);
      setShowChangelog(false);
    });
  };

  const changeProtoCategory = (newCat) => {
    if (newCat === protoCategory) return;
    replaceNav({ protoCategory: newCat });
    withTransition(() => setProtoCategory(newCat));
  };

  const openChangelog = () => {
    pushNav({ modal: "changelog" });
    setShowChangelog(true);
  };
  const openAcr = () => {
    pushNav({ modal: "acr" });
    setShowAcr(true);
  };
  const closeOverlay = () => {
    try {
      window.history.back();
    } catch {
      setShowChangelog(false);
      setShowAcr(false);
    }
  };

  const filtered = useMemo(() => {
    const q = normalize(deferredSearch.trim());

    // Trouve toutes les cibles d'alias dont la clé contient (ou est contenue dans) la requête
    const aliasTargets = q
      ? Object.entries(ALIASES)
          .filter(([alias]) => {
            const a = normalize(alias);
            return a.includes(q) || q.includes(a);
          })
          .map(([, target]) => normalize(target))
      : [];

    return DRUGS.filter((d) => {
      const fields = [d.nom, d.commercial, d.dci, d.classe].map(normalize);
      // fuzzyIncludes : substring d'abord (rapide), Levenshtein en fallback
      // pour les requêtes ≥ 4 chars. Tolère « amidaron » → amiodarone.
      const matchDirect = !q || fields.some((f) => fuzzyIncludes(f, q));
      const matchAlias = aliasTargets.some((t) => fields.some((f) => fuzzyIncludes(f, t)));
      const matchQ = matchDirect || matchAlias;
      const matchC = cat === "Tout" || d.cat === cat;
      const matchS = svc === "Tout" || d.svc.includes(svc);
      const matchF = !showFavoritesOnly || favorites.has(d.id);
      return matchQ && matchC && matchS && matchF;
    }).sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
  }, [deferredSearch, cat, svc, showFavoritesOnly, favorites]);

  const recentDrugs = useMemo(() => {
    if (deferredSearch.trim() || cat !== "Tout" || svc !== "Tout" || showFavoritesOnly) return [];
    return history.map((id) => DRUGS.find((d) => d.id === id)).filter(Boolean);
  }, [history, deferredSearch, cat, svc, showFavoritesOnly]);

  // React 19 : <title> rendu dans le tree est hissé automatiquement dans <head>.
  // Onglet navigateur et listes de tâches récentes Android affichent un titre
  // contextuel au lieu du nom statique → un user qui a 3 onglets MediURG ouverts
  // (rare mais possible en SAU avec un poste partagé) distingue Médicaments,
  // Protocoles, et la recherche en cours.
  const docTitle = (() => {
    if (showAcr) return "MediURG — URGENCE ACR";
    if (showChangelog) return "MediURG — Notes de version";
    if (page === "echelles") return "MediURG — Échelles cliniques";
    if (page === "protocoles") {
      if (protoCategory === "incompatibilites") return "MediURG — Incompatibilités";
      if (protoCategory === "kits") return "MediURG — Kits de préparation";
      return "MediURG — Protocoles PISU";
    }
    const q = deferredSearch.trim();
    if (q) return `MediURG — « ${q} »`;
    return "MediURG — Pharmacologie d'urgence";
  })();

  return (
    <div className="app" data-testid="app">
      <title>{docTitle}</title>
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
            <button
              className={`font-toggle ${bigFont ? "font-toggle-active" : ""}`}
              onClick={toggleFont}
              aria-label={bigFont ? "Réduire la police" : "Agrandir la police"}
            >
              A+
            </button>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
            >
              {theme === "dark" ? (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>

          {page === "medicaments" && (
            <>
              <div className="search-bar">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
                  <button
                    className="search-clear"
                    onClick={() => setSearch("")}
                    aria-label="Effacer"
                  >
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
                      onClick={() => setShowFavoritesOnly((v) => !v)}
                      title={
                        showFavoritesOnly
                          ? "Désactiver le filtre favoris"
                          : "Afficher seulement les favoris"
                      }
                    >
                      ★ Favoris{" "}
                      {favorites.size > 0 && <span className="chip-count">{favorites.size}</span>}
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
        {page === "medicaments" &&
          (filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <p>Aucun médicament trouvé</p>
              <small>
                {showFavoritesOnly
                  ? "Aucun favori — étoilez un médicament avec ☆"
                  : "Essayez un autre terme ou réinitialisez les filtres"}
              </small>
            </div>
          ) : (
            <>
              {recentDrugs.length > 0 && (
                <div className="recent-section">
                  <div className="recent-header">
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Récents</span>
                  </div>
                  <DrugList
                    drugs={recentDrugs}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    onOpen={addToHistory}
                    onProtocolOpen={() => navigateTo("protocoles")}
                  />
                </div>
              )}
              <DrugList
                drugs={filtered}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onOpen={addToHistory}
                onProtocolOpen={() => navigateTo("protocoles")}
              />
            </>
          ))}

        {page === "protocoles" && (
          <Suspense fallback={null}>
            <ProtocolesPage
              protoCategory={protoCategory}
              changeProtoCategory={changeProtoCategory}
              onDrugSearch={(name) => {
                navigateTo("medicaments");
                setSearch(name);
              }}
            />
          </Suspense>
        )}

        {page === "echelles" && (
          <Suspense fallback={null}>
            <EchellesPage />
          </Suspense>
        )}
      </main>

      <nav className="bottom-nav">
        <div className="bottom-nav-row">
          <button
            className={`bottom-tab ${page === "medicaments" ? "bottom-tab-active" : ""}`}
            onClick={() => navigateTo("medicaments")}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
            </svg>
            <span>Médicaments</span>
          </button>
          <button
            className={`bottom-tab ${page === "protocoles" ? "bottom-tab-active" : ""}`}
            onClick={() => navigateTo("protocoles")}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
            <span>Protocoles</span>
          </button>
          <button
            className={`bottom-tab ${page === "echelles" ? "bottom-tab-active" : ""}`}
            onClick={() => navigateTo("echelles")}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <circle cx="9" cy="6" r="1.5" fill="currentColor" />
              <circle cx="15" cy="12" r="1.5" fill="currentColor" />
              <circle cx="7" cy="18" r="1.5" fill="currentColor" />
            </svg>
            <span>Échelles</span>
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
        <span className="urgence-fab-icon" aria-hidden="true">
          🚨
        </span>
        <span className="urgence-fab-label">URGENCE</span>
      </button>

      {/* Modales lazy-loadées : l'import ne déclenche que quand showXxx passe
          à true pour la 1ère fois — pas inclus dans le bundle initial. */}
      {showAcr && (
        <Suspense fallback={null}>
          <AcrModeModal
            open={showAcr}
            onClose={closeOverlay}
            onOpenDrug={(name) => {
              replaceNav({ page: "medicaments", modal: null });
              setShowAcr(false);
              setPage("medicaments");
              setSearch(name);
            }}
          />
        </Suspense>
      )}
      {showChangelog && (
        <Suspense fallback={null}>
          <ChangelogModal open={showChangelog} onClose={closeOverlay} />
        </Suspense>
      )}

      {exitToast && (
        <div className="exit-toast" role="status" aria-live="polite">
          {exitToast === "firefox-no-exit"
            ? "Sur Firefox Android, utilisez le bouton app récente pour fermer MediURG."
            : "Appuyez à nouveau sur retour pour quitter"}
        </div>
      )}
      <UpdatePrompt />
    </div>
  );
};

export default App;
