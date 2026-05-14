import { useEffect, useRef } from "react";

// Navigation par couches alignée sur l'historique navigateur (Android back).
// Chaque ouverture de modale, changement de sous-onglet ou de page pousse une
// entrée. 1er back ferme la modale → sous-onglet précédent → page précédente
// → toast d'exit. 2 backs <1 s = exit immédiat.
//
// Architecture popstate-first (depuis v59) :
//   - Pour TOUS les browsers sauf Firefox Android, on laisse les backs popper
//     naturellement via popstate (modales, pages, sentinelle).
//   - Pour Firefox Android, popstate ne fire pas de manière fiable sur PWA
//     installée → CloseWatcher.preventDefault bloque tout exit (cf. bug Mozilla
//     1742059) et on demande à l'user d'utiliser l'app récente.
//   - Pour Chrome/Samsung Internet en PWA standalone, popstate ne fire PAS
//     pour le back-at-root → CloseWatcher additionnel pour intercepter ce cas.

type NavState = {
  page: string;
  protoCategory: string;
  modal: string | null;
  sentinel?: boolean;
};

type NavPatch = Partial<NavState>;

export type ExitToastVariant = "default" | "firefox-no-exit";

type Callbacks = {
  setPage: (p: string) => void;
  setProtoCategory: (c: string) => void;
  setShowChangelog: (v: boolean) => void;
  setShowAcr: (v: boolean) => void;
  setShowNotesBackup: (v: boolean) => void;
  setExitToast: (v: ExitToastVariant | null) => void;
};

const DEFAULT_STATE: NavState = {
  page: "medicaments",
  protoCategory: "PISU",
  modal: null,
};

const readState = (): NavState => {
  try {
    return (window.history.state?.mediurg as NavState) || DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
};

export const pushNav = (patch: NavPatch) => {
  const next = { ...readState(), ...patch };
  try {
    window.history.pushState({ mediurg: next }, "");
  } catch {}
};

export const replaceNav = (patch: NavPatch) => {
  const next = { ...readState(), ...patch };
  try {
    window.history.replaceState({ mediurg: next }, "");
  } catch {}
};

export const useBackNavigation = (cb: Callbacks) => {
  // Capture le dernier `cb` dans un ref pour que l'effet d'install puisse rester
  // monté/démonté une seule fois sans devenir incohérent si App re-render avec
  // un nouvel objet `cb`. Sans ce ref, soit on relance les handlers à chaque
  // render (et on perd lastBackAt/timer), soit on désactive exhaustive-deps.
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    // Setup de l'history a déjà été fait dans un <script> inline d'index.html
    // (sentinelle + état actif), AVANT le mount React. Filet de sécurité si
    // jamais ce script a été bypassé (ouverture directe via un outil de test,
    // etc.) — on s'assure qu'on a au moins notre clé mediurg dans le state.
    try {
      if (!window.history.state?.mediurg) {
        const here = window.location.href;
        window.history.replaceState({ mediurg: { ...DEFAULT_STATE, sentinel: true } }, "", here);
        window.history.pushState({ mediurg: { ...DEFAULT_STATE } }, "", here);
      }
    } catch {}

    let lastBackAt = 0;
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    // Firefox Android : popstate n'est pas fire de manière fiable sur hardware
    // back en PWA installée → on tombe sur des écrans morts (noir/rouge puis
    // gris/rouge). On bloque tout exit via back avec CloseWatcher (qui fire
    // bien) et on redirige vers l'app récente Android pour fermer proprement.
    const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
    const isFirefoxAndroid = /Firefox/i.test(ua) && /Android/i.test(ua);

    const showExitToast = (variant: ExitToastVariant) => {
      cbRef.current.setExitToast(variant);
      if (toastTimer) clearTimeout(toastTimer);
      // 4 s pour le toast d'exit standard (était 2 s, trop court : l'user
      // avait l'impression que le 1er back ne faisait rien et retapait dans
      // la foulée → exit imprévu via la fenêtre rapid-double <1 s).
      toastTimer = setTimeout(() => cbRef.current.setExitToast(null), 4000);
    };

    // Architecture popstate-first :
    //   - 1 back = retour à l'écran précédent (modal → page précédente, page
    //     → page précédente, page racine → toast).
    //   - 2 backs dans 1 s = exit.
    const onPopState = (e: PopStateEvent) => {
      const s = (e.state?.mediurg as NavState | undefined) ?? null;
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
          window.history.pushState({ mediurg: { ...DEFAULT_STATE } }, "", window.location.href);
        } catch {}
        showExitToast("default");
        cbRef.current.setPage("medicaments");
        cbRef.current.setProtoCategory("PISU");
        cbRef.current.setShowChangelog(false);
        cbRef.current.setShowAcr(false);
        cbRef.current.setShowNotesBackup(false);
        return;
      }

      // Nav interne (modal close, page change). State restauré depuis l'history.
      cbRef.current.setPage(s.page || "medicaments");
      cbRef.current.setProtoCategory(s.protoCategory || "PISU");
      cbRef.current.setShowChangelog(s.modal === "changelog");
      cbRef.current.setShowAcr(s.modal === "acr");
      cbRef.current.setShowNotesBackup(s.modal === "notesBackup");
    };
    window.addEventListener("popstate", onPopState);

    // CloseWatcher : uniquement pour Firefox Android où popstate ne suffit pas.
    let watcher: CloseWatcher | null = null;
    if (isFirefoxAndroid && typeof window.CloseWatcher === "function") {
      try {
        watcher = new window.CloseWatcher();
        watcher.addEventListener("cancel", (e: Event) => {
          e.preventDefault();
          showExitToast("firefox-no-exit");
        });
      } catch {}
    }

    // Chrome / Samsung Internet en PWA installée (display-mode: standalone) :
    // popstate ne fire PAS pour le back-at-root → Chrome ferme la PWA direct
    // sans qu'on puisse afficher le toast d'exit. Le mode browser tab marche
    // bien (popstate fire normalement). Détecté en standalone, on installe un
    // CloseWatcher pour intercepter le back :
    //   - Modal/page profonde : preventDefault + history.back() → popstate
    //     existant gère le retour
    //   - À la racine, 1er back : preventDefault + toast (reste dans l'app)
    //   - À la racine, 2e back <1s : ne preventDefault PAS → Chrome ferme la
    //     PWA via son flux natif
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

    let pwaWatcher: CloseWatcher | null = null;
    const setupPwaWatcher = () => {
      if (!isStandalonePWA) return;
      if (isFirefoxAndroid) return; // déjà géré au-dessus
      if (typeof window.CloseWatcher !== "function") return;
      try {
        pwaWatcher = new window.CloseWatcher();
        pwaWatcher.addEventListener("cancel", (e: Event) => {
          const s = (window.history.state?.mediurg as NavState | undefined) ?? null;
          const now = Date.now();
          const isRapidDouble = now - lastBackAt < 1000;

          // Modal ouverte → on délègue à popstate via history.back()
          if (s?.modal === "acr" || s?.modal === "changelog" || s?.modal === "notesBackup") {
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
    // Effet d'install pur : tous les setters sont lus via cbRef.current,
    // donc aucune dépendance réactive. Mount/unmount une seule fois.
  }, []);
};
