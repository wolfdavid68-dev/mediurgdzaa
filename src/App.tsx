import { useMemo, useState, useEffect, useDeferredValue, useCallback } from "react";
import { DRUGS } from "./data/drugs";
import { ALIASES } from "./data/aliases";
import { normalize } from "./lib/normalize";
import { fuzzyIncludes } from "./lib/fuzzy";
import AppHeader from "./components/AppHeader";
import BottomNav from "./components/BottomNav";
import MedicamentsPage from "./pages/MedicamentsPage";
import OfflineBanner from "./components/OfflineBanner";
import PatientWeightBanner from "./components/PatientWeightBanner";
import TestVersionBanner from "./components/TestVersionBanner";
import UpdatePrompt from "./components/UpdatePrompt";
// Tout en import STATIQUE (PAS de lazy). Un chunk lazy peut échouer à charger
// hors-ligne si le hash demandé ne matche pas le précache du service worker
// (décalage inévitable à chaque mise à jour en mode 'prompt') → « Failed to
// fetch dynamically imported module » → crash. L'app est offline-first :
// chaque écran DOIT marcher hors-ligne, donc tout vit dans le bundle principal,
// chargé avec index.html, toujours cohérent, aucun fetch séparé possible. Le
// surcoût de poids initial est précaché de toute façon. Cf. RootErrorFallback.
import AcrModeModal from "./components/AcrModeModal";
import ProtocolesPage from "./pages/ProtocolesPage";
import EchellesPage from "./pages/EchellesPage";
import ChangelogModal from "./components/ChangelogModal";
import NotesBackupModal from "./components/NotesBackupModal";
import CharterModal from "./components/CharterModal";
import AnnounceModal from "./components/AnnounceModal";
import { useCharterFlow } from "./lib/useCharterFlow";
import { useAnnounceFlow } from "./lib/useAnnounceFlow";
import { APP_VERSION } from "./data/changelog";
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
import { isPreview } from "./lib/featureFlags";
import { useAuthProfile } from "./lib/authProfile";
import { TUTORAT_URL } from "./lib/tutorat";

const CATEGORIES = ["Tout", ...Array.from(new Set(DRUGS.map((d) => d.cat)))];
const SERVICES = ["Tout", "SMUR", "SAU"];
const ALL_PAGES = ["medicaments", "protocoles", "echelles"];
const MEDICAMENTS_ONLY_PAGES = ["medicaments"];

const TutoratOnlyView = () => (
  <main className="main-content main-content-tutorat-only">
    <section className="tutorat-only" aria-labelledby="tutorat-only-title">
      <img src="/logo-sau.png" alt="Urgences Mulhouse" draggable={false} />
      <p className="tutorat-only-kicker">Accès preview dédié</p>
      <h1 id="tutorat-only-title">Tutorat SAU Mulhouse</h1>
      <p>Ton profil ouvre directement le compagnon de tutorat ESI/AS.</p>
      <a className="tutorat-only-btn" href={TUTORAT_URL}>
        Ouvrir le tutorat ↗
      </a>
    </section>
  </main>
);

const App = () => {
  const authProfile = useAuthProfile();
  const accessMode = getPreviewAccessMode(authProfile, isPreview());
  const hasFullAppAccess = accessMode === "full";
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

  // Poids patient partagé entre toutes les fiches (poso, prep, PSE). Persisté
  // en localStorage avec auto-expiration 3 h — cf. usePatientWeight.
  // Tant qu'au moins une fiche est déployée, on tient un wake lock écran
  // (procédure en cours → ne pas verrouiller mains gantées).
  const [patientWeight, setPatientWeight] = usePatientWeight();
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
    if (hasFullAppAccess && mode === "acr") {
      setShowAcr(true);
      dirty = true;
    }
    if (hasFullAppAccess && pageParam === "protocoles") {
      setPage("protocoles");
      dirty = true;
    }
    if (hasFullAppAccess && pageParam === "echelles") {
      setPage("echelles");
      dirty = true;
    }
    if (
      hasFullAppAccess &&
      (tab === "incompatibilites" || tab === "kits" || tab === "PISU" || tab === "ecg")
    ) {
      setProtoCategory(tab);
      dirty = true;
    }
    if (dirty) {
      try {
        window.history.replaceState(window.history.state, "", window.location.pathname);
      } catch {}
    }
  }, [hasFullAppAccess]);

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
        <>
          <TutoratOnlyView />
          <UpdatePrompt />
        </>
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
            showTutorat={hasFullAppAccess && isPreview()}
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
                <PatientWeightBanner weight={patientWeight} onChange={setPatientWeight} />
              </div>
            )}
            {page === "medicaments" && !anyDrugOpen && (
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
                  <span className="result-count">{filtered.length} méd.</span>
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
                onToggleFavorite={toggleFavorite}
                onOpen={addToHistory}
                onOpenChange={handleDrugOpenChange}
                onProtocolOpen={hasFullAppAccess ? () => navigateTo("protocoles") : undefined}
              />
            )}

            {hasFullAppAccess && page === "protocoles" && (
              <ProtocolesPage
                protoCategory={protoCategory}
                changeProtoCategory={changeProtoCategory}
                onDrugSearch={(name: string) => {
                  navigateTo("medicaments");
                  setSearch(name);
                }}
              />
            )}

            {hasFullAppAccess && page === "echelles" && <EchellesPage />}
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

          {/* Modales montées à la demande (showXxx) mais importées en statique →
          aucun fetch réseau, fonctionnent hors-ligne sans risque de chunk
          manquant. */}
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
          {!showCharter && showAnnounce && (
            <AnnounceModal open={showAnnounce} onClose={dismissAnnounce} />
          )}
          <UpdatePrompt />
        </>
      )}
    </div>
  );
};

export default App;
