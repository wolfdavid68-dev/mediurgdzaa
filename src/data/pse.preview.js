/**
 * Overlay PSE « preview » — protocoles PSE en attente de validation.
 *
 * Visible UNIQUEMENT en mode preview unifié (URL `?auth=preview`, cf.
 * src/lib/featureFlags.ts → isPsePreview). La même preview active aussi
 * le login. Jamais exposé au public tant que le flag reste false.
 *
 * Fusionné PAR-DESSUS src/data/pse.js (spread) : une clé présente ici
 * REMPLACE l'entrée publique du même drug id ; une nouvelle clé AJOUTE
 * une fiche PSE. Même forme que pse.js (indexé par drug id) — voir
 * l'en-tête de pse.js pour les unités, concentrations et formules.
 *
 * Champs spécifiques preview gérés par PseBlock :
 *  - `dilutions: [{ label, conc, detail }]` → boutons de choix de
 *     préparation ; la conc choisie alimente le calcul (1ʳᵉ = défaut).
 *  - `inputMode: "mlh"` → la saisie est le débit réglé (mL/h) + poids,
 *     on déduit la dose (calcul inverse). `mlhSteps` = paliers mL/h.
 *  - `note` → bandeau d'information clinique affiché dans le bloc PSE.
 *
 * Workflow : tester via …/?auth=preview (collant pour l'onglet) ; une
 * fois validé, déplacer l'entrée vers pse.js et retirer d'ici.
 */
export const PSE_PREVIEW = {
  // Saisie = débit réglé sur la PSE (mL/h) + poids → dose déduite,
  // recalculée selon la dilution choisie. conc en µg/mL (µg/kg/min).
  13: {
    // Adrénaline — Amp 5 mg/5 mL
    unite: "µg/kg/min",
    min: 0.05,
    max: 1,
    inputMode: "mlh",
    mlhSteps: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
    steps: [0.1, 0.2, 0.3, 0.5, 1],
    dilutions: [
      { label: "2 amp / 50 mL", conc: 200, detail: "2 amp qsp 50 mL G5% → 0,2 mg/mL" },
      { label: "Pure", conc: 1000, detail: "Pure → 1 mg/mL" },
    ],
  },
  17: {
    // Noradrénaline — Amp 8 mg/4 mL
    unite: "µg/kg/min",
    min: 0.05,
    max: 2,
    inputMode: "mlh",
    mlhSteps: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
    steps: [0.1, 0.2, 0.3, 0.5, 1],
    note: "Objectif : PAM cible à atteindre (selon prescription, souvent ≥ 65 mmHg). Si PAM trop basse → augmenter le débit.",
    dilutions: [
      { label: "2 amp / 48 mL", conc: 333, detail: "2 amp qsp 48 mL G5% → 0,33 mg/mL" },
      { label: "6 amp / 48 mL", conc: 1000, detail: "6 amp qsp 48 mL G5% → 1 mg/mL" },
      { label: "Pure", conc: 2000, detail: "Pure → 2 mg/mL" },
    ],
  },

  15: {
    // Dobutamine — Flac 250 mg/25 mL ; 1 flacon qsp 50 mL → 5 mg/mL
    conc: 5000,
    unite: "µg/kg/min",
    min: 2,
    max: 20,
    inputMode: "mlh",
    mlhSteps: [1, 2, 3, 5, 8, 10, 15, 20],
    steps: [5, 10, 15, 20],
    tag: "1 flacon 250 mg qsp 50 mL G5% → 5 mg/mL",
  },
  16: {
    // Isoprénaline (Isuprel) — Amp 0,2 mg/2 mL ; 5 amp qsp 50 mL → 20 µg/mL
    conc: 20,
    unite: "µg/kg/min",
    min: 0.01,
    max: 0.1,
    inputMode: "mlh",
    mlhSteps: [1, 2, 3, 5, 8, 10, 15],
    steps: [0.02, 0.05, 0.08, 0.1],
    tag: "5 amp 0,2 mg qsp 50 mL G5% → 20 µg/mL",
  },

  // ── MEMO « nouvelle préparation des médicaments en PSE » ──────
  // Source : memo papier service + Google Sheet de dilution (réf.
  // patient 70 kg). Adré/Nora/Dobu/Isuprel/Héparine : la nouvelle
  // prépa correspond DÉJÀ à pse.js (aucune modif de calcul).
  //
  // Sufentanil — SEUL changement réel. Ancienne fiche : table de
  // dilution adaptée au poids (1 mL/h = 0,1 µg/kg/h, factor 10).
  // Nouvelle prépa MEMO : dilution FIXE 1 ampoule 250 µg qsp 50 mL
  // NaCl 0,9% → 5 µg/mL. Saisie mL/h + poids → dose µg/kg/h déduite.
  // Vérifié sur le Sheet (patient 70 kg) : 1 mL/h ≈ 0,07 µg/kg/h.
  5: {
    conc: 5,
    unite: "µg/kg/h",
    min: 0.2,
    max: 2,
    inputMode: "mlh",
    mlhSteps: [1, 2, 3, 5, 8, 10, 15, 20],
    steps: [0.2, 0.5, 1, 1.5, 2],
  },
};
