import { useState } from "react";
import { CHARTER_VERSION, CHARTER_LS_KEY } from "../components/CharterModal";
import { safeGetItem, safeSetItem } from "./safeStorage";

// Flux d'acceptation de la charte d'utilisation : ouverte au premier
// lancement (et après chaque bump de CHARTER_VERSION), persistée en
// localStorage avec horodatage pour audit éventuel. Mode `requireAccept`
// → pas de × ni ESC tant que l'utilisateur n'a pas cliqué « J'accepte ».
export const useCharterFlow = (): [boolean, () => void] => {
  const [open, setOpen] = useState(() => {
    const raw = safeGetItem(CHARTER_LS_KEY) ?? "";
    return !raw.startsWith(CHARTER_VERSION);
  });
  const accept = () => {
    safeSetItem(CHARTER_LS_KEY, `${CHARTER_VERSION}|${new Date().toISOString()}`);
    setOpen(false);
  };
  return [open, accept];
};
