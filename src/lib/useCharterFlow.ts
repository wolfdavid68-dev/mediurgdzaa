import { useState } from "react";
import { CHARTER_VERSION, CHARTER_LS_KEY } from "../components/CharterModal";

// Flux d'acceptation de la charte d'utilisation : ouverte au premier
// lancement (et après chaque bump de CHARTER_VERSION), persistée en
// localStorage avec horodatage pour audit éventuel. Mode `requireAccept`
// → pas de × ni ESC tant que l'utilisateur n'a pas cliqué « J'accepte ».
export const useCharterFlow = (): [boolean, () => void] => {
  const [open, setOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(CHARTER_LS_KEY) ?? "";
      return !raw.startsWith(CHARTER_VERSION);
    } catch {
      return true;
    }
  });
  const accept = () => {
    try {
      localStorage.setItem(CHARTER_LS_KEY, `${CHARTER_VERSION}|${new Date().toISOString()}`);
    } catch {
      /* quota / navigation privée : on accepte en mémoire de toute façon */
    }
    setOpen(false);
  };
  return [open, accept];
};
