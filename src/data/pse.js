/**
 * Données PSE (Pousse-Seringue Électrique) par drug id.
 * conc  : concentration de la seringue préparée
 *         → en µg/mL pour les unités µg/kg/min et µg/kg/h
 *         → en mg/mL pour les unités mg/kg/h
 * unite : unité de la dose cible
 * min / max : plage thérapeutique usuelle
 * steps : paliers de référence rapide (dose → mL/h)
 *
 * Formules :
 *   µg/kg/min → mL/h = dose × poids × 60 / conc(µg/mL)
 *   mg/kg/h   → mL/h = dose × poids       / conc(mg/mL)
 *   µg/kg/h   → mL/h = dose × poids       / conc(µg/mL)
 */
export const PSE = {
  // ── CATÉCHOLAMINES ────────────────────────────────────────
  13: { // Adrénaline — 2 amp 5 mg/5 mL qsp 50 mL G5% → 200 µg/mL
    conc: 200, unite: "µg/kg/min", min: 0.05, max: 1,
    steps: [0.1, 0.2, 0.3, 0.5, 1],
  },
  17: { // Noradrénaline — 2 amp 8 mg/4 mL qsp 48 mL G5% → 333 µg/mL
    conc: 333, unite: "µg/kg/min", min: 0.05, max: 2,
    steps: [0.1, 0.2, 0.3, 0.5, 1],
  },
  15: { // Dobutamine — 1 flacon 250 mg qsp 50 mL → 5 000 µg/mL
    conc: 5000, unite: "µg/kg/min", min: 2, max: 20,
    steps: [5, 10, 15, 20],
  },
  18: { // Dopamine — 1 amp 200 mg qsp 50 mL → 4 000 µg/mL
    conc: 4000, unite: "µg/kg/min", min: 3, max: 20,
    steps: [5, 10, 15, 20],
  },
  16: { // Isuprel — 5 amp 0,2 mg qsp 50 mL G5% → 20 µg/mL
    conc: 20, unite: "µg/kg/min", min: 0.01, max: 0.1,
    steps: [0.02, 0.05, 0.08, 0.1],
  },

  // ── HYPNOTIQUES / SÉDATION ────────────────────────────────
  1: { // Propofol — amp 200 mg/20 mL (10 mg/mL) pur
    conc: 10, unite: "mg/kg/h", min: 0.5, max: 4,
    steps: [1, 2, 3, 4],
  },
  3: { // Midazolam — 50 mg qsp 50 mL NaCl → 1 mg/mL
    conc: 1, unite: "mg/kg/h", min: 0.02, max: 0.2,
    steps: [0.05, 0.1, 0.15, 0.2],
  },
  4: { // Kétamine — dilué 50 mg/5 mL NaCl → 10 mg/mL
    conc: 10, unite: "mg/kg/h", min: 0.1, max: 0.5,
    steps: [0.1, 0.2, 0.3, 0.5],
  },

  // ── MORPHINIQUES ─────────────────────────────────────────
  5: { // Sufentanil — table de dilution adaptée au poids : 1 mL/h = 0,1 µg/kg/h ⇒ mL/h = dose × 10
    conc: 1, unite: "µg/kg/h", min: 0.2, max: 2, factor: 10,
    steps: [0.2, 0.5, 1, 1.5, 2],
  },
  6: { // Morphine — 10 mg qsp 10 mL NaCl → 1 mg/mL
    conc: 1, unite: "mg/kg/h", min: 0.01, max: 0.05,
    steps: [0.02, 0.03, 0.04, 0.05],
  },

  // ── ANTICOAGULANTS ────────────────────────────────────────
  42: { // Héparine — 4 mL HNF 5000 UI/mL + 44 mL NaCl 0,9% → 20 000 UI / 48 mL = 416,7 UI/mL
    conc: 416.7, unite: "UI/kg/h", min: 15, max: 25,
    steps: [15, 18, 20, 22, 25],
    extra: { unite: "UI/24h", min: 10000, max: 40000, steps: [10000, 15000, 20000, 25000, 30000, 35000, 40000] },
  },

  // ── ANTIDOTES ─────────────────────────────────────────────
  29: { // Anexate — ampoule pure 0,5 mg/5 mL = 0,1 mg/mL ; débit sans facteur poids
    conc: 0.1, unite: "mg/h", min: 0.1, max: 1,
    steps: [0.1, 0.2, 0.3, 0.5, 1],
  },
};
