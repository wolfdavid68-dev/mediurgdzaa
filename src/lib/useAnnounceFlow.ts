import { useState } from "react";
import { ANNOUNCE_VERSION, ANNOUNCE_LS_KEY } from "../components/AnnounceModal";

// Annonce ponctuelle (ex : nouvel outil ECG) — vue une seule fois par
// appareil. Versionnée pour pouvoir ré-annoncer en bumpant ANNOUNCE_VERSION.
// App.tsx décide de l'afficher seulement APRÈS la charte (pour ne pas
// empiler deux modales bloquantes).
export const useAnnounceFlow = (): [boolean, () => void] => {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(ANNOUNCE_LS_KEY) !== ANNOUNCE_VERSION;
    } catch {
      return false;
    }
  });
  const dismiss = () => {
    try {
      localStorage.setItem(ANNOUNCE_LS_KEY, ANNOUNCE_VERSION);
    } catch {
      /* quota / navigation privée : on dismiss en mémoire de toute façon */
    }
    setOpen(false);
  };
  return [open, dismiss];
};
