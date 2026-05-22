import type { ReactNode } from "react";

// Aide visuelle pour les scores d'intubation (Mallampati, Cormack-Lehane).
// Schémas SVG : formes pleines (lisibles en petit), niveau sélectionné mis en
// évidence (bordure couleur kit). La légende texte porte le sens clinique.
//
// ⚠ Aide-mémoire schématique, pas un atlas. La classification de référence
// reste celle du protocole / de l'enseignement.

const ROMANS = ["I", "II", "III", "IV"];

// Contour de bouche (Mallampati) — réutilisé pour le clip + le tracé des lèvres.
const LIPS = "M30 6 C45 6 53 19 53 35 C53 51 43 64 30 64 C17 64 7 51 7 35 C7 19 15 6 30 6 Z";

const wrap = (children: ReactNode) => (
  <svg viewBox="0 0 60 70" width="100%" height="auto" aria-hidden="true">
    {children}
  </svg>
);

// Langue : forme pleine qui remonte (top variable) → masque progressivement
// le fond de gorge, exactement la logique de la classification.
const tongue = (top: number) => (
  <path
    d={`M2 72 C2 ${top + 14} 16 ${top} 30 ${top} C44 ${top} 58 ${top + 14} 58 72 Z`}
    fill="currentColor"
    opacity="0.32"
  />
);

const softPalate = (
  <path
    d="M14 20 Q30 12 46 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  />
);
const uvulaLong = (
  <path
    d="M30 16 C26.8 16 25.8 21 28 26 C29 28.4 31 28.4 32 26 C34.2 21 33.2 16 30 16 Z"
    fill="currentColor"
  />
);
const uvulaShort = (
  <path
    d="M30 17 C28.3 17 27.8 20 29 22.7 C29.6 24 30.4 24 31 22.7 C32.2 20 31.7 17 30 17 Z"
    fill="currentColor"
  />
);
const pillars = (
  <>
    <path
      d="M19 22 Q21 34 24 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M41 22 Q39 34 36 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </>
);

const renderMallampati = (idx: number) => {
  const cid = `mlp-${idx}`;
  let structures: ReactNode;
  let top: number;
  if (idx === 0) {
    structures = (
      <>
        {softPalate}
        {pillars}
        {uvulaLong}
      </>
    );
    top = 47;
  } else if (idx === 1) {
    structures = (
      <>
        {softPalate}
        {uvulaLong}
      </>
    );
    top = 43;
  } else if (idx === 2) {
    structures = (
      <>
        {softPalate}
        {uvulaShort}
      </>
    );
    top = 37;
  } else {
    structures = (
      <path
        d="M16 23 Q30 17 44 23"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    );
    top = 29;
  }
  return wrap(
    <>
      <defs>
        <clipPath id={cid}>
          <path d={LIPS} />
        </clipPath>
      </defs>
      <path d={LIPS} fill="var(--bg)" />
      <g clipPath={`url(#${cid})`}>
        <ellipse cx="30" cy="29" rx="16" ry="20" fill="currentColor" opacity="0.13" />
        {structures}
        {tongue(top)}
      </g>
      <path d={LIPS} fill="none" stroke="currentColor" strokeWidth="2.5" />
    </>
  );
};

const renderCormack = (idx: number) => {
  const cid = `crm-${idx}`;
  let structures: ReactNode;
  if (idx === 0) {
    // Glotte complète : épiglotte + cordes (bandes claires en V) + aryténoïdes
    structures = (
      <>
        <path d="M15 14 Q30 9 45 14 Q30 19 15 14 Z" fill="currentColor" opacity="0.45" />
        <path
          d="M30 21 L24 47"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M30 21 L36 47"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.3"
        />
        <circle cx="25" cy="48" r="2.6" fill="currentColor" opacity="0.6" />
        <circle cx="35" cy="48" r="2.6" fill="currentColor" opacity="0.6" />
      </>
    );
  } else if (idx === 1) {
    // Partie postérieure : épiglotte recouvre le haut, seuls aryténoïdes +
    // base des cordes visibles.
    structures = (
      <>
        <path d="M13 23 Q30 12 47 23 Q30 31 13 23 Z" fill="currentColor" opacity="0.5" />
        <path
          d="M30 34 L26 47"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M30 34 L34 47"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.3"
        />
        <circle cx="26" cy="48" r="2.6" fill="currentColor" opacity="0.6" />
        <circle cx="34" cy="48" r="2.6" fill="currentColor" opacity="0.6" />
      </>
    );
  } else if (idx === 2) {
    // Épiglotte seule : grand volet, pas de glotte.
    structures = <path d="M12 27 Q30 14 48 27 Q30 42 12 27 Z" fill="currentColor" opacity="0.5" />;
  } else {
    // Rien : base de langue / tissu mou, aucune structure laryngée.
    structures = <path d="M10 40 Q30 33 50 40 Q30 47 10 40 Z" fill="currentColor" opacity="0.3" />;
  }
  return wrap(
    <>
      <defs>
        <clipPath id={cid}>
          <circle cx="30" cy="33" r="25" />
        </clipPath>
      </defs>
      <circle cx="30" cy="33" r="25" fill="var(--bg)" />
      <g clipPath={`url(#${cid})`}>{structures}</g>
      <circle cx="30" cy="33" r="25" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </>
  );
};

const CAPTIONS: Record<"mallampati" | "cormack", string[]> = {
  mallampati: [
    "Voile, luette ET piliers visibles",
    "Voile et luette visibles (piliers masqués)",
    "Voile et base de la luette",
    "Voile non visible (palais dur seul)",
  ],
  cormack: [
    "Glotte entièrement visible",
    "Partie postérieure / aryténoïdes",
    "Épiglotte seule visible",
    "Ni glotte ni épiglotte",
  ],
};

type Props = {
  scale: "mallampati" | "cormack";
  selected?: string;
  couleur: string;
};

const KitScaleIllustration = ({ scale, selected, couleur }: Props) => {
  const captions = CAPTIONS[scale];
  const render = scale === "mallampati" ? renderMallampati : renderCormack;
  return (
    <div className="kit-scale">
      {captions.map((caption, i) => {
        const roman = ROMANS[i];
        const active = selected === roman;
        return (
          <div
            key={roman}
            className={`kit-scale-cell ${active ? "kit-scale-cell-active" : ""}`}
            style={active ? { borderColor: couleur, color: couleur } : {}}
          >
            <div className="kit-scale-svg">{render(i)}</div>
            <div className="kit-scale-roman">{roman}</div>
            <div className="kit-scale-caption">{caption}</div>
          </div>
        );
      })}
    </div>
  );
};

export default KitScaleIllustration;
