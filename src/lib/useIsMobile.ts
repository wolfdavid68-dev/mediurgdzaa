import { useEffect, useState } from "react";

// Détecte le viewport mobile pour basculer entre les écrans d'auth desktop
// (split-screen) et le design mobile dédié du design_handoff_sau_mulhouse
// (hero plein écran, tab bar flottante, bottom sheets).
//
// Règle : « un téléphone reste un téléphone, même en paysage ». Un téléphone
// a toujours son côté le plus court ≤ 600px (la largeur en portrait, la
// hauteur en paysage). D'où la requête en deux branches :
//   - (max-width: 600px)            → portrait étroit (tout device)
//   - (max-height: 600px) + coarse  → paysage court SUR écran tactile
// Le `pointer: coarse` empêche une fenêtre d'ordi peu haute (souris) de
// basculer en mobile par erreur. Une tablette (côté court ≥ 768px) reste en
// desktop. matchMedia + listener → réactif à la rotation / au resize.

const MOBILE_QUERY = "(max-width: 600px), (max-height: 600px) and (pointer: coarse)";

const getMatch = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(MOBILE_QUERY).matches
    : false;

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
};
