import type { ReactNode } from "react";

// Aide visuelle pour les scores d'intubation (Mallampati, Cormack-Lehane).
// Schémas SVG simplifiés — repère visuel, la légende texte porte le sens
// clinique. Le niveau sélectionné est mis en évidence (bordure couleur kit).
//
// ⚠ Schémas volontairement simplifiés : aide-mémoire, pas un atlas. La
// classification de référence reste celle du protocole / de l'enseignement.

const ROMANS = ["I", "II", "III", "IV"];

// ── Mallampati : bouche ouverte, langue tirée (ce qu'on voit) ──────────
// Base commune : ouverture buccale + langue. Chaque classe ajoute/retire
// les structures visibles (voile, luette, piliers).
const mallampatiBase = (extra: ReactNode) => (
  <svg viewBox="0 0 60 66" width="100%" height="auto" aria-hidden="true">
    <ellipse
      cx="30"
      cy="30"
      rx="20"
      ry="26"
      fill="var(--bg)"
      stroke="currentColor"
      strokeWidth="2"
    />
    <ellipse cx="30" cy="24" rx="12" ry="15" fill="currentColor" opacity="0.12" />
    <path d="M11 43 Q30 62 49 43 Q30 53 11 43 Z" fill="currentColor" opacity="0.28" />
    {extra}
  </svg>
);

const MALLAMPATI = [
  {
    caption: "Voile, luette ET piliers visibles",
    svg: mallampatiBase(
      <>
        <path d="M17 17 Q30 9 43 17" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M21 19 Q23 31 25 39" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M39 19 Q37 31 35 39" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <line x1="30" y1="16" x2="30" y2="30" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="30" cy="31" r="2" fill="currentColor" />
      </>
    ),
  },
  {
    caption: "Voile et luette visibles (piliers masqués)",
    svg: mallampatiBase(
      <>
        <path d="M17 17 Q30 9 43 17" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <line x1="30" y1="16" x2="30" y2="29" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="30" cy="30" r="2" fill="currentColor" />
      </>
    ),
  },
  {
    caption: "Voile et base de la luette",
    svg: mallampatiBase(
      <>
        <path d="M17 18 Q30 11 43 18" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <line x1="30" y1="18" x2="30" y2="23" stroke="currentColor" strokeWidth="1.8" />
      </>
    ),
  },
  {
    caption: "Voile non visible (palais dur seul)",
    svg: mallampatiBase(
      <path
        d="M18 20 Q30 15 42 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="2 2"
      />
    ),
  },
];

// ── Cormack-Lehane : vue laryngoscopique (cercle) ─────────────────────
const cormackBase = (extra: ReactNode) => (
  <svg viewBox="0 0 60 66" width="100%" height="auto" aria-hidden="true">
    <circle cx="30" cy="32" r="25" fill="var(--bg)" stroke="currentColor" strokeWidth="2" />
    {extra}
  </svg>
);

const CORMACK = [
  {
    caption: "Glotte entièrement visible",
    svg: cormackBase(
      <>
        <path d="M16 16 Q30 11 44 16" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M30 18 L23 48 Q30 52 37 48 Z" fill="currentColor" opacity="0.7" />
        <line x1="26" y1="20" x2="24" y2="47" stroke="var(--bg)" strokeWidth="1.4" />
        <line x1="34" y1="20" x2="36" y2="47" stroke="var(--bg)" strokeWidth="1.4" />
      </>
    ),
  },
  {
    caption: "Partie postérieure / aryténoïdes",
    svg: cormackBase(
      <>
        <path d="M16 16 Q30 11 44 16" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M24 40 Q30 36 36 40 Q30 50 24 40 Z" fill="currentColor" opacity="0.7" />
      </>
    ),
  },
  {
    caption: "Épiglotte seule visible",
    svg: cormackBase(
      <path d="M16 30 Q30 18 44 30 Q30 40 16 30 Z" fill="currentColor" opacity="0.45" />
    ),
  },
  {
    caption: "Ni glotte ni épiglotte",
    svg: cormackBase(
      <line
        x1="16"
        y1="34"
        x2="44"
        y2="34"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="3 3"
      />
    ),
  },
];

type Props = {
  scale: "mallampati" | "cormack";
  selected?: string;
  couleur: string;
};

const KitScaleIllustration = ({ scale, selected, couleur }: Props) => {
  const set = scale === "mallampati" ? MALLAMPATI : CORMACK;
  return (
    <div className="kit-scale">
      {set.map((item, i) => {
        const roman = ROMANS[i];
        const active = selected === roman;
        return (
          <div
            key={roman}
            className={`kit-scale-cell ${active ? "kit-scale-cell-active" : ""}`}
            style={active ? { borderColor: couleur, color: couleur } : {}}
          >
            <div className="kit-scale-svg">{item.svg}</div>
            <div className="kit-scale-roman">{roman}</div>
            <div className="kit-scale-caption">{item.caption}</div>
          </div>
        );
      })}
    </div>
  );
};

export default KitScaleIllustration;
