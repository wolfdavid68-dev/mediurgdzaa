import { useState } from "react";
import { ANNOUNCE_VERSION, ANNOUNCE_LS_KEY } from "./announceConfig";
import { safeGetItem, safeSetItem } from "./safeStorage";

// Annonce ponctuelle (ex : nouvel outil ECG) — vue une seule fois par
// appareil. Versionnée pour pouvoir ré-annoncer en bumpant ANNOUNCE_VERSION.
// App.tsx décide de l'afficher seulement APRÈS la charte (pour ne pas
// empiler deux modales bloquantes).
export const useAnnounceFlow = (): [boolean, () => void] => {
  const [open, setOpen] = useState(() => {
    return safeGetItem(ANNOUNCE_LS_KEY) !== ANNOUNCE_VERSION;
  });
  const dismiss = () => {
    safeSetItem(ANNOUNCE_LS_KEY, ANNOUNCE_VERSION);
    setOpen(false);
  };
  return [open, dismiss];
};
