import { useEffect, useState } from "react";

// Détecte le viewport mobile pour basculer entre les écrans d'auth desktop
// (split-screen) et le design mobile dédié du design_handoff_sau_mulhouse
// (hero plein écran, tab bar flottante, bottom sheets).
//
// Breakpoint 600px : aligné sur le `@media (max-width: 600px)` historique de
// auth.css. matchMedia + listener pour réagir à la rotation / resize.

const MOBILE_QUERY = "(max-width: 600px)";

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
