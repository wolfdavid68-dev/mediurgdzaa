import { useMemo, useState, useEffect, useDeferredValue, lazy, Suspense } from "react";
import { DRUGS } from "./data/drugs";
import { ALIASES } from "./data/aliases";
import { normalize } from "./lib/normalize";
import { fuzzyIncludes } from "./lib/fuzzy";
import AppHeader from "./components/AppHeader";
import BottomNav from "./components/BottomNav";
import MedicamentsPage from "./pages/MedicamentsPage";
import OfflineBanner from "./components/OfflineBanner";
import TestVersionBanner from "./components/TestVersionBanner";
import UpdatePrompt from "./components/UpdatePrompt";
import { APP_VERSION } from "./data/changelog";
import {
  pushNav,
  replaceNav,
  useBackNavigation,
  type ExitToastVariant,
} from "./lib/useBackNavigation";
import { usePersistentStorage } from "./lib/usePersistentStorage";
import { useLongPress } from "./lib/useLongPress";

// Code-splitting : les modales (ACR, changelog) sont importées à la demande,
// et la page Protocoles entière (avec ses data PROTOCOLS + PREP_KITS et ses
// sous-onglets IncompatibilityList + PrepKitCard) est lazy aussi. Tout ce
// poids sort du bundle initial → premier paint plus rapide.
const AcrModeModal = lazy(() => import("./components/AcrModeModal"));
const ChangelogModal = lazy(() => import("./components/ChangelogModal"));
const NotesBackupModal = lazy(() => import("./components/NotesBackupModal"));
const CharterModal = lazy(() => import("./components/CharterModal"));
const ProtocolesPage = lazy(() => import("./pages/ProtocolesPage"));
const EchellesPage = lazy(() => import("./pages/EchellesPage"));

// Cf. CharterModal.tsx — version stockée en localStorage pour pouvoir
// forcer une re-acceptation si la charte change matériellement.
const CHARTER_VERSION = "1.0";
const CHARTER_LS_KEY = "mediurg-charter-accepted";

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
  // Accès caché à la console admin : appui long (~600 ms) sur le logo
  // émet un event intercepté par AuthGate (qui ne l'honore que pour un
  // compte admin). Remplace l'ancienne roue crantée flottante, gênante
  // car superposée au contenu.
  const adminLongPress = useLongPress(() => window.dispatchEvent(new Event("mediurg:open-admin")));

  const [favorites, setFavorites] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem("mediurg-favorites");
      return raw ? new Set<number>(JSON.parse(raw)) : new Set<number>();
    } catch {
      return new Set<number>();
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
  const [showNotesBackup, setShowNotesBackup] = useState(false);
  // null | "default" | "firefox-no-exit" — null = caché ; sinon affiche le toast
  // avec le bon message (variante Firefox PWA = ne peut pas quitter via back).
  const [exitToast, setExitToast] = useState<ExitToastVariant | null>(null);

  // Charte d'utilisation : ouverte automatiquement au premier lancement
  // (et après chaque bump de CHARTER_VERSION). Acceptation persistée en
  // localStorage avec date pour audit éventuel. Mode `requireAccept` →
  // pas de × ni ESC tant que l'utilisateur n'a pas cliqué « J'accepte ».
  const [showCharter, setShowCharter] = useState(() => {
    try {
      const raw = localStorage.getItem(CHARTER_LS_KEY) ?? "";
      return !raw.startsWith(CHARTER_VERSION);
    } catch {
      return true;
    }
  });
  const acceptCharter = () => {
    try {
      localStorage.setItem(CHARTER_LS_KEY, `${CHARTER_VERSION}|${new Date().toISOString()}`);
    } catch {}
    setShowCharter(false);
  };

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
    if (tab === "incompatibilites" || tab === "kits" || tab === "PISU" || tab === "ecg") {
      setProtoCategory(tab);
      dirty = true;
    }
    if (dirty) {
      try {
        window.history.replaceState(window.history.state, "", window.location.pathname);
      } catch {}
    }
  }, []);

  const toggleFavorite = (id: number) => {
    setFavorites((prev: Set<number>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("mediurg-favorites", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  const addToHistory = (id: number) => {
    setHistory((prev: number[]) => {
      const next = [id, ...prev.filter((x: number) => x !== id)].slice(0, 5);
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

  useBackNavigation({
    setPage,
    setProtoCategory,
    setShowChangelog,
    setShowAcr,
    setShowNotesBackup,
    setExitToast,
  });

  // Demande au navigateur de garantir le précache PWA contre l'éviction
  // automatique en cas de pression disque. Critique offline (SAU/SMUR).
  usePersistentStorage();

  // View Transitions API (Chrome 111+, Safari 18+) : enveloppe les changements
  // de page/sous-onglet pour que le navigateur produise un cross-fade fluide
  // entre l'ancienne et la nouvelle vue. Fallback silencieux sur les browsers
  // qui n'exposent pas startViewTransition (tout se passe instantanément, comme avant).
  const withTransition = (mutator: () => void) => {
    if (typeof document.startViewTransition !== "function") return mutator();
    document.startViewTransition(mutator);
  };

  // Changements de PAGE (Médicaments ↔ Protocoles) entrent dans le back stack
  // → 1er back retourne à la page précédente, conformément aux attentes natives.
  // Changements de SOUS-ONGLET (PISU / Incompat / Kits) restent en replaceNav
  // (les tabs ne sont pas typiquement dans le back stack natif Android).
  // Le rapid-double-back dans le popstate handler (<1s) court-circuite cette
  // navigation pour permettre un exit rapide quand l'user mash le bouton.
  const navigateTo = (newPage: string) => {
    if (newPage === page && !showAcr && !showChangelog && !showNotesBackup) return;
    pushNav({ page: newPage, modal: null });
    withTransition(() => {
      setPage(newPage);
      setShowAcr(false);
      setShowChangelog(false);
      setShowNotesBackup(false);
    });
  };

  const changeProtoCategory = (newCat: string) => {
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
  const openNotesBackup = () => {
    pushNav({ modal: "notesBackup" });
    setShowNotesBackup(true);
  };
  const closeOverlay = () => {
    try {
      window.history.back();
    } catch {
      setShowChangelog(false);
      setShowAcr(false);
      setShowNotesBackup(false);
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
    return history.map((id: number) => DRUGS.find((d: any) => d.id === id)).filter(Boolean);
  }, [history, deferredSearch, cat, svc, showFavoritesOnly]);

  // React 19 : <title> rendu dans le tree est hissé automatiquement dans <head>.
  // Onglet navigateur et listes de tâches récentes Android affichent un titre
  // contextuel au lieu du nom statique → un user qui a 3 onglets MediURG ouverts
  // (rare mais possible en SAU avec un poste partagé) distingue Médicaments,
  // Protocoles, et la recherche en cours.
  const docTitle = (() => {
    if (showAcr) return "MediURG — URGENCE ACR";
    if (showChangelog) return "MediURG — Notes de version";
    if (showNotesBackup) return "MediURG — Sauvegarde des notes";
    if (page === "echelles") return "MediURG — Échelles cliniques";
    if (page === "protocoles") {
      if (protoCategory === "incompatibilites") return "MediURG — Incompatibilités";
      if (protoCategory === "ecg") return "MediURG — ECG";
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
      <TestVersionBanner />
      <AppHeader
        isOnline={isOnline}
        theme={theme}
        bigFont={bigFont}
        adminLongPress={adminLongPress}
        onOpenNotesBackup={openNotesBackup}
        onToggleFont={toggleFont}
        onToggleTheme={toggleTheme}
      >
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
      </AppHeader>

      <OfflineBanner isOnline={isOnline} />

      <main className="main-content">
        {page === "medicaments" && (
          <MedicamentsPage
            filtered={filtered}
            recentDrugs={recentDrugs}
            favorites={favorites}
            showFavoritesOnly={showFavoritesOnly}
            onToggleFavorite={toggleFavorite}
            onOpen={addToHistory}
            onProtocolOpen={() => navigateTo("protocoles")}
          />
        )}

        {page === "protocoles" && (
          <Suspense fallback={null}>
            <ProtocolesPage
              protoCategory={protoCategory}
              changeProtoCategory={changeProtoCategory}
              onDrugSearch={(name: string) => {
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

      <BottomNav
        page={page}
        version={APP_VERSION}
        onNavigate={navigateTo}
        onOpenChangelog={openChangelog}
        onOpenAcr={openAcr}
      />

      {/* Modales lazy-loadées : l'import ne déclenche que quand showXxx passe
          à true pour la 1ère fois — pas inclus dans le bundle initial. */}
      {showAcr && (
        <Suspense fallback={null}>
          <AcrModeModal
            open={showAcr}
            onClose={closeOverlay}
            onOpenDrug={(name: string) => {
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
      {showNotesBackup && (
        <Suspense fallback={null}>
          <NotesBackupModal open={showNotesBackup} onClose={closeOverlay} />
        </Suspense>
      )}

      {exitToast && (
        <div className="exit-toast" role="status" aria-live="polite">
          {exitToast === "firefox-no-exit"
            ? "Sur Firefox Android, utilisez le bouton app récente pour fermer MediURG."
            : "Appuyez à nouveau sur retour pour quitter"}
        </div>
      )}
      {showCharter && (
        <Suspense fallback={null}>
          <CharterModal
            open={showCharter}
            requireAccept
            onAccept={acceptCharter}
            onClose={acceptCharter}
          />
        </Suspense>
      )}
      <UpdatePrompt />
    </div>
  );
};

export default App;
