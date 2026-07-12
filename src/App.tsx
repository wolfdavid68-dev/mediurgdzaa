import { lazy, Suspense, useMemo, useState, useEffect, useDeferredValue, useCallback } from "react";
import { DRUGS } from "./data/drugs";
import AppHeader from "./components/AppHeader";
import BottomNav from "./components/BottomNav";
import MedicamentsPage from "./pages/MedicamentsPage";
import OfflineBanner from "./components/OfflineBanner";
import PatientWeightBanner from "./components/PatientWeightBanner";
import TestVersionBanner from "./components/TestVersionBanner";
import CharterModal from "./components/CharterModal";
import { useCharterFlow } from "./lib/useCharterFlow";
import { useAnnounceFlow } from "./lib/useAnnounceFlow";
import { APP_VERSION } from "./data/appVersion";
import {
  pushNav,
  replaceNav,
  useBackNavigation,
  type ExitToastVariant,
} from "./lib/useBackNavigation";
import { usePersistentStorage } from "./lib/usePersistentStorage";
import { useLongPress } from "./lib/useLongPress";
import { useWakeLock } from "./lib/useWakeLock";
import { usePatientWeight } from "./lib/usePatientWeight";
import { getPreviewAccessMode } from "./lib/access";
import { isMedicalFunction } from "./lib/auth";
import { isPreview } from "./lib/featureFlags";
import { useAuthProfile } from "./lib/authProfile";
import { initializeDeviceSync } from "./lib/deviceSync";
import { openTutoratWithCurrentSession, shouldOpenTutoratFromLogin } from "./lib/tutorat";
import { filterDrugs as searchDrugs, getRecentDrugs as readRecentDrugs } from "./lib/drugSearch";
import { resolveDeepLink } from "./lib/deepLink";
import { safeGetItem, safeGetJson, safeSetItem, safeSetJson } from "./lib/safeStorage";
import { STORAGE_KEYS } from "./lib/storageKeys";

const CATEGORIES = ["Tout", ...Array.from(new Set(DRUGS.map((d) => d.cat)))];
const SERVICES = ["Tout", "SMUR", "SAU"];
const ALL_PAGES = ["medicaments", "protocoles", "echelles"];
const MEDICAMENTS_ONLY_PAGES = ["medicaments"];

const AcrModeModal = lazy(() => import("./components/AcrModeModal"));
const ProtocolesPage = lazy(() => import("./pages/ProtocolesPage"));
const EchellesPage = lazy(() => import("./pages/EchellesPage"));
const ChangelogModal = lazy(() => import("./components/ChangelogModal"));
const NotesBackupModal = lazy(() => import("./components/NotesBackupModal"));
const AnnounceModal = lazy(() => import("./components/AnnounceModal"));

const LazyFallback = () => (
  <div className="empty" role="status" aria-live="polite">
    Chargement…
  </div>
);

const openTutorat = () => {
  void openTutoratWithCurrentSession();
};

const TutoratOnlyView = () => (
  <main className="main-content main-content-tutorat-only">
    <section className="tutorat-only" aria-labelledby="tutorat-only-title">
      <img src="/logo-sau.png" alt="Urgences Mulhouse" draggable={false} />
      <p className="tutorat-only-kicker">Tutorat dédié</p>
      <h1 id="tutorat-only-title">Tutorat SAU Mulhouse</h1>
      <p>Ton profil MediURG ouvre directement le compagnon de tutorat AS / IFSI.</p>
      <button type="button" className="tutorat-only-btn" onClick={openTutorat}>
        Ouvrir le tutorat ↗
      </button>
    </section>
  </main>
);

const App = () => {
  const authProfile = useAuthProfile();
  const previewMode = isPreview();
  const accessMode = getPreviewAccessMode(authProfile, previewMode);
  const hasFullAppAccess = accessMode === "full";
  const isMedicalProfile = authProfile ? isMedicalFunction(authProfile.fonction) : false;
  const showTutoratAccess = hasFullAppAccess && !isMedicalProfile;
  const allowedPages = hasFullAppAccess ? ALL_PAGES : MEDICAMENTS_ONLY_PAGES;
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
    return safeGetItem(STORAGE_KEYS.theme) || "dark";
  });
  const [bigFont, setBigFont] = useState(() => {
    return safeGetItem(STORAGE_KEYS.bigFont) === "1";
  });
  // Accès caché à la console admin : appui long (~600 ms) sur le logo
  // émet un event intercepté par AuthGate (qui ne l'honore que pour un
  // compte admin). Remplace l'ancienne roue crantée flottante, gênante
  // car superposée au contenu.
  const adminLongPress = useLongPress(() => window.dispatchEvent(new Event("mediurg:open-admin")));

  const [favorites, setFavorites] = useState<Set<number>>(() => {
    return new Set<number>(safeGetJson<number[]>(STORAGE_KEYS.favorites, []));
  });
  const [history, setHistory] = useState(() => {
    return safeGetJson<number[]>(STORAGE_KEYS.history, []);
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  // IDs des fiches médicament actuellement déployées. Tant qu'au moins une
  // est ouverte, on masque la barre de recherche + filtres dans le header
  // (il ne reste que le bandeau logo + boutons thème/police) pour maximiser
  // la place de lecture de la fiche. La callback est stable (useCallback []) →
  // pas de churn de l'effet onOpenChange dans DrugCard.
  const [openDrugs, setOpenDrugs] = useState<Set<string>>(new Set());
  const handleDrugOpenChange = useCallback((key: string, open: boolean) => {
    setOpenDrugs((prev) => {
      if (open === prev.has(key)) return prev;
      const next = new Set(prev);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const anyDrugOpen = openDrugs.size > 0;

  // Auto-ouverture one-shot pilotée par deep link (?med=…, ?kit=…). L'id reste
  // posé jusqu'à ce que la carte cible signale l'ouverture (onAutoOpen), puis
  // il est remis à null pour que l'utilisateur reprenne la main (fermer la
  // fiche, chercher autre chose) sans que le lien se rejoue.
  const [autoOpenDrugId, setAutoOpenDrugId] = useState<number | null>(null);
  const [autoOpenKitId, setAutoOpenKitId] = useState<string | null>(null);
  const [autoOpenKitTab, setAutoOpenKitTab] = useState<string | null>(null);
  const [autoOpenProtocolId, setAutoOpenProtocolId] = useState<number | null>(null);
  const [autoOpenScaleId, setAutoOpenScaleId] = useState<string | null>(null);
  const [incompatPair, setIncompatPair] = useState<[string, string] | null>(null);
  const [incompatFocus, setIncompatFocus] = useState<string | null>(null);
  const consumeAutoOpenDrug = useCallback(() => setAutoOpenDrugId(null), []);
  const consumeAutoOpenKit = useCallback(() => {
    setAutoOpenKitId(null);
    setAutoOpenKitTab(null);
  }, []);
  const consumeAutoOpenProtocol = useCallback(() => setAutoOpenProtocolId(null), []);
  const consumeAutoOpenScale = useCallback(() => setAutoOpenScaleId(null), []);
  const consumeIncompatTarget = useCallback(() => {
    setIncompatPair(null);
    setIncompatFocus(null);
  }, []);

  // Poids patient partagé entre toutes les fiches (poso, prep, PSE). Persisté
  // en localStorage avec auto-expiration 3 h — cf. usePatientWeight.
  // Tant qu'au moins une fiche est déployée, on tient un wake lock écran
  // (procédure en cours → ne pas verrouiller mains gantées).
  const [patientWeight, setPatientWeight] = usePatientWeight();
  const [prepPopulation, setPrepPopulation] = useState<"adulte" | "enfant" | null>(null);
  const patientWeightNumber = Number.parseFloat(patientWeight);
  const effectivePrepPopulation =
    prepPopulation ||
    (Number.isFinite(patientWeightNumber) && patientWeightNumber > 0 && patientWeightNumber <= 300
      ? patientWeightNumber < 30
        ? "enfant"
        : "adulte"
      : null);
  useWakeLock(anyDrugOpen);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showChangelog, setShowChangelog] = useState(false);
  const [showAcr, setShowAcr] = useState(false);
  const [showNotesBackup, setShowNotesBackup] = useState(false);
  // null | "default" | "firefox-no-exit" — null = caché ; sinon affiche le toast
  // avec le bon message (variante Firefox PWA = ne peut pas quitter via back).
  const [exitToast, setExitToast] = useState<ExitToastVariant | null>(null);

  const [showCharter, acceptCharter] = useCharterFlow();
  const [showAnnounce, dismissAnnounce] = useAnnounceFlow();

  useEffect(() => {
    if (!authProfile || !shouldOpenTutoratFromLogin()) return;
    void openTutoratWithCurrentSession();
  }, [authProfile]);

  useEffect(() => initializeDeviceSync(), []);

  useEffect(() => {
    if (accessMode === "full") return;
    if (page !== "medicaments") {
      replaceNav({ page: "medicaments", modal: null });
      setPage("medicaments");
    }
    setShowAcr(false);
  }, [accessMode, page]);

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

  // Lecture des query params au mount — raccourcis manifest (long-press de
  // l'icône Android), raccourcis Siri / routines Assistant et liens externes.
  // Paramètres supportés et règles de consommation : voir lib/deepLink.ts
  // (?mode=acr, ?page, ?tab, ?kit=ktc, ?med=<nom|id>, ?poids=<kg>). Une fois
  // appliqués, les params consommés sont retirés de l'URL via replaceState
  // pour éviter qu'un refresh reproduise le raccourci ; ceux qui attendent
  // l'accès complet restent en place et sont rejoués quand l'accès arrive.
  useEffect(() => {
    let active = true;
    void resolveDeepLink(window.location.search, hasFullAppAccess).then((link) => {
      if (!active || !link.dirty) return;
      if (link.showAcr) setShowAcr(true);
      if (link.page) setPage(link.page);
      if (link.protoCategory) setProtoCategory(link.protoCategory);
      if (link.search !== undefined) setSearch(link.search);
      if (link.autoOpenDrugId !== undefined) setAutoOpenDrugId(link.autoOpenDrugId);
      if (link.autoOpenKitId !== undefined) setAutoOpenKitId(link.autoOpenKitId);
      if (link.autoOpenKitTab !== undefined) setAutoOpenKitTab(link.autoOpenKitTab);
      if (link.autoOpenProtocolId !== undefined) setAutoOpenProtocolId(link.autoOpenProtocolId);
      if (link.autoOpenScaleId !== undefined) setAutoOpenScaleId(link.autoOpenScaleId);
      if (link.incompatPair !== undefined) setIncompatPair(link.incompatPair);
      if (link.incompatFocus !== undefined) setIncompatFocus(link.incompatFocus);
      if (link.patientWeight !== undefined) setPatientWeight(link.patientWeight);
      try {
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname + (link.cleanedSearch ? `?${link.cleanedSearch}` : "")
        );
      } catch {}
    });
    return () => {
      active = false;
    };
  }, [hasFullAppAccess, setPatientWeight]);

  const toggleFavorite = (id: number) => {
    setFavorites((prev: Set<number>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      safeSetJson(STORAGE_KEYS.favorites, [...next]);
      return next;
    });
  };

  const addToHistory = (id: number) => {
    setHistory((prev: number[]) => {
      const next = [id, ...prev.filter((x: number) => x !== id)].slice(0, 5);
      safeSetJson(STORAGE_KEYS.history, next);
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    safeSetItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-fontsize", bigFont ? "large" : "normal");
    safeSetItem(STORAGE_KEYS.bigFont, bigFont ? "1" : "0");
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
    if (!allowedPages.includes(newPage)) newPage = "medicaments";
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
    if (!hasFullAppAccess) return;
    if (newCat === protoCategory) return;
    replaceNav({ protoCategory: newCat });
    withTransition(() => setProtoCategory(newCat));
  };

  const openChangelog = () => {
    pushNav({ modal: "changelog" });
    setShowChangelog(true);
  };
  const openAcr = () => {
    if (!hasFullAppAccess) return;
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
    return searchDrugs({
      search: deferredSearch,
      cat,
      svc,
      showFavoritesOnly,
      favorites,
    });
  }, [deferredSearch, cat, svc, showFavoritesOnly, favorites]);

  const recentDrugs = useMemo(() => {
    if (deferredSearch.trim() || cat !== "Tout" || svc !== "Tout" || showFavoritesOnly) return [];
    return readRecentDrugs(history);
  }, [history, deferredSearch, cat, svc, showFavoritesOnly]);

  // React 19 : <title> rendu dans le tree est hissé automatiquement dans <head>.
  // Onglet navigateur et listes de tâches récentes Android affichent un titre
  // contextuel au lieu du nom statique → un user qui a 3 onglets MediURG ouverts
  // (rare mais possible en SAU avec un poste partagé) distingue Médicaments,
  // Protocoles, et la recherche en cours.
  const docTitle = (() => {
    if (accessMode === "tutorat") return "MediURG — Tutorat";
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
      {accessMode === "tutorat" ? (
        <TutoratOnlyView />
      ) : (
        <>
          <AppHeader
            isOnline={isOnline}
            theme={theme}
            bigFont={bigFont}
            adminLongPress={adminLongPress}
            onOpenNotesBackup={openNotesBackup}
            onToggleFont={toggleFont}
            onToggleTheme={toggleTheme}
            showTutorat={showTutoratAccess}
          >
            {page === "medicaments" && (
              <div className="search-row">
                {!anyDrugOpen && (
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
                      aria-label="Rechercher un médicament"
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
                )}
                <PatientWeightBanner
                  weight={patientWeight}
                  onChange={setPatientWeight}
                  population={prepPopulation}
                  onPopulationChange={setPrepPopulation}
                />
              </div>
            )}
            {page === "medicaments" && !anyDrugOpen && (
              <div className="filters">
                <div className="filter-group">
                  <span className="filter-label">CAT</span>
                  <div className="filter-chips" aria-label="Filtres par catégorie">
                    <button
                      type="button"
                      className={`chip chip-fav ${showFavoritesOnly ? "chip-active" : ""}`}
                      onClick={() => setShowFavoritesOnly((v) => !v)}
                      aria-pressed={showFavoritesOnly}
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
                        type="button"
                        data-cat={c}
                        className={`chip ${cat === c ? "chip-active" : ""}`}
                        onClick={() => setCat(c)}
                        aria-pressed={cat === c}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filter-group">
                  <span className="filter-label">SVC</span>
                  <div className="filter-chips" aria-label="Filtres par service">
                    {SERVICES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`chip chip-svc ${svc === s ? "chip-active" : ""}`}
                        onClick={() => setSvc(s)}
                        aria-pressed={svc === s}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <span className="result-count" role="status" aria-live="polite">
                    {filtered.length} méd.
                  </span>
                </div>
              </div>
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
                patientWeight={patientWeight}
                prepPopulation={effectivePrepPopulation}
                prepV25Enabled
                autoOpenDrugId={autoOpenDrugId}
                onAutoOpenDrug={consumeAutoOpenDrug}
                onToggleFavorite={toggleFavorite}
                onOpen={addToHistory}
                onOpenChange={handleDrugOpenChange}
                onProtocolOpen={hasFullAppAccess ? () => navigateTo("protocoles") : undefined}
              />
            )}

            <Suspense fallback={<LazyFallback />}>
              {hasFullAppAccess && page === "protocoles" && (
                <ProtocolesPage
                  protoCategory={protoCategory}
                  changeProtoCategory={changeProtoCategory}
                  autoOpenKitId={autoOpenKitId}
                  autoOpenKitTab={autoOpenKitTab}
                  onAutoOpenKit={consumeAutoOpenKit}
                  autoOpenProtocolId={autoOpenProtocolId}
                  onAutoOpenProtocol={consumeAutoOpenProtocol}
                  incompatPair={incompatPair}
                  incompatFocus={incompatFocus}
                  onIncompatConsumed={consumeIncompatTarget}
                  onDrugSearch={(name: string) => {
                    navigateTo("medicaments");
                    setSearch(name);
                  }}
                />
              )}

              {hasFullAppAccess && page === "echelles" && (
                <EchellesPage
                  autoOpenScaleId={autoOpenScaleId}
                  onAutoOpenScale={consumeAutoOpenScale}
                />
              )}
            </Suspense>
          </main>

          <BottomNav
            page={page}
            version={APP_VERSION}
            allowedPages={allowedPages}
            showUrgence={hasFullAppAccess}
            onNavigate={navigateTo}
            onOpenChangelog={openChangelog}
            onOpenAcr={openAcr}
          />

          <Suspense fallback={null}>
            {showAcr && (
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
            )}
            {showChangelog && <ChangelogModal open={showChangelog} onClose={closeOverlay} />}
            {showNotesBackup && <NotesBackupModal open={showNotesBackup} onClose={closeOverlay} />}
          </Suspense>

          {exitToast && (
            <div className="exit-toast" role="status" aria-live="polite">
              {exitToast === "firefox-no-exit"
                ? "Sur Firefox Android, utilisez le bouton app récente pour fermer MediURG."
                : "Appuyez à nouveau sur retour pour quitter"}
            </div>
          )}
          {showCharter && (
            <CharterModal
              open={showCharter}
              requireAccept
              onAccept={acceptCharter}
              onClose={acceptCharter}
            />
          )}
          {!showCharter && showAnnounce && showTutoratAccess && (
            <Suspense fallback={null}>
              <AnnounceModal open={showAnnounce} onClose={dismissAnnounce} />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
};

export default App;
