// Déclarations ambiantes pour des APIs web encore expérimentales ou propriétaires
// qui ne figurent pas dans les types DOM standard fournis par TypeScript.

declare global {
  interface CloseWatcher extends EventTarget {
    requestClose(): void;
    close(): void;
    destroy(): void;
    oncancel: ((this: CloseWatcher, ev: Event) => unknown) | null;
    onclose: ((this: CloseWatcher, ev: Event) => unknown) | null;
  }

  interface CloseWatcherConstructor {
    new (options?: { signal?: AbortSignal }): CloseWatcher;
    readonly prototype: CloseWatcher;
  }

  interface Window {
    /** API CloseWatcher (Chrome 120+, Firefox 149+, opt-in iOS) — intercepte les close requests
     *  comme le bouton retour Android ou ESC. cf. src/App.tsx pour usage. */
    CloseWatcher?: CloseWatcherConstructor;
    /** Préfixe Safari historique du Web Audio. Toujours utilisé en fallback dans AcrTimer.tsx
     *  pour Safari < 14 qui n'exposait que webkitAudioContext. */
    webkitAudioContext?: typeof AudioContext;
  }

  interface Navigator {
    /** iOS Safari : true quand l'app est ouverte depuis l'écran d'accueil (mode standalone PWA).
     *  Non standard — l'équivalent web standard est window.matchMedia("(display-mode: standalone)"). */
    standalone?: boolean;
  }
}

// Indispensable pour transformer ce fichier en module ambient (sinon il pollue le scope global)
export {};
