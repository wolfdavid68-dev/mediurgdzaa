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
  8: { // Narcan — entrée = volume efficace du bolus IVD 0,04 mg/mL ; PSE 0,1 mg/mL
    conc: 0.1, unite: "mg/h", min: 1, max: 50,
    inputMode: "effectiveDose",
    effectiveInputLabel: "Dose efficace",
    effectiveInputUnit: "mL",
    effectiveInputConc: 0.04,
    effectiveFraction: 2 / 3,
    tag: "0,1 mg/mL · PSE",
    note: "Saisir le volume total efficace du bolus IVD (solution 0,04 mg/mL). Départ PSE = 2/3 de cette dose par heure.",
    steps: [1, 2, 3, 5, 10, 15, 20, 30, 40, 50],
  },
  // ── CATÉCHOLAMINES ────────────────────────────────────────
  13: { // Adrénaline — dilution Vi/Vf par poids : 1 mL/h = 0,1 µg/kg/min
    conc: 1, unite: "µg/kg/min", min: 0.125, max: 2, factor: 10,
    tag: "Dilution poids · 1 mL/h = 0,1 µg/kg/min",
    steps: [0.125, 0.2, 0.3, 0.5, 1, 2],
    referenceTables: [
      {
        title: "PSE adulte",
        subtitle: "Repère 70 kg",
        weightKg: 70,
        steps: [0.05, 0.1, 0.2, 0.3, 0.5, 1],
      },
      {
        title: "PSE enfant",
        subtitle: "Repère 20 kg",
        weightKg: 20,
        steps: [0.05, 0.1, 0.2, 0.3, 0.5, 1],
      },
    ],
  },
  17: { // Noradrénaline — dilution Vi/Vf par poids : 1 mL/h = 0,1 µg/kg/min
    conc: 1, unite: "µg/kg/min", min: 0.25, max: 2, factor: 10,
    tag: "Dilution poids · 1 mL/h = 0,1 µg/kg/min",
    steps: [0.25, 0.5, 1, 1.5, 2],
  },
  15: { // Dobutamine — dilution Vi/Vf par poids : 1 mL/h = 1 µg/kg/min
    conc: 1, unite: "µg/kg/min", min: 2.5, max: 20, factor: 1,
    tag: "Dilution poids · 1 mL/h = 1 µg/kg/min",
    steps: [2.5, 5, 10, 15, 20],
  },
  16: { // Isoprénaline — dilution Vi/Vf par poids : 1 mL/h = 0,01 µg/kg/min
    conc: 1, unite: "µg/kg/min", min: 0.01, max: 0.1, factor: 100,
    tag: "Dilution poids · 1 mL/h = 0,01 µg/kg/min",
    steps: [0.02, 0.05, 0.08, 0.1],
  },

  // ── HYPNOTIQUES / SÉDATION ────────────────────────────────
  1: { // Propofol — amp 200 mg/20 mL (10 mg/mL) pur
    conc: 10, unite: "mg/kg/h", min: 0.5, max: 4,
    steps: [1, 2, 3, 4],
  },
  3: { // Midazolam — ampoule 50 mg/10 mL qsp 50 mL NaCl → 1 mg/mL
    conc: 1, unite: "mg/kg/h", min: 0.02, max: 0.2,
    steps: [0.05, 0.1, 0.15, 0.2],
  },
  4: { // Kétamine — 2 ampoules 250 mg/5 mL qsp 50 mL NaCl → 10 mg/mL
    conc: 10, unite: "mg/kg/h", min: 0.5, max: 3,
    steps: [0.5, 1, 2, 3],
  },

  // ── MORPHINIQUES ─────────────────────────────────────────
  5: { // Sufentanil — table de dilution adaptée au poids : 1 mL/h = 0,1 µg/kg/h ⇒ mL/h = dose × 10
    conc: 1, unite: "µg/kg/h", min: 0.2, max: 2, factor: 10,
    tag: "Dilution poids · 1 mL/h = 0,1 µg/kg/h",
    steps: [0.2, 0.5, 1, 1.5, 2],
  },
  6: { // Morphine — 10 mg qsp 10 mL NaCl → 1 mg/mL
    conc: 1, unite: "mg/kg/h", min: 0.01, max: 0.05,
    steps: [0.02, 0.03, 0.04, 0.05],
  },

  // ── PNEUMOLOGIE ──────────────────────────────────────────
  44: { // Ventoline — 1 ampoule 5 mg/5 mL qsp 50 mL → 0,1 mg/mL = 100 µg/mL
    conc: 100, unite: "µg/kg/min", min: 0.1, max: 0.3,
    steps: [0.1, 0.2, 0.3],
  },

  // ── CARDIOLOGIE / VASODILATATEURS / ANTI-HTA ──────────────
  26: { // Loxen (nicardipine) — ampoule 10 mg/10 mL pure → 1 mg/mL
    conc: 1, unite: "mg/h", min: 1, max: 15,
    steps: [1, 3, 5, 10, 15],
  },
  28: { // Risordan (dinitrate isosorbide) — ampoule 10 mg/10 mL pure → 1 mg/mL
    conc: 1, unite: "mg/h", min: 1, max: 10,
    steps: [1, 2, 3, 5, 10],
  },
  50: { // Sandostatine — 6 ampoules 100 µg qsp 48 mL/24h → 12,5 µg/mL = 0,0125 mg/mL
    conc: 0.0125, unite: "mg/h", min: 0.025, max: 0.05,
    tag: "12,5 µg/mL · seringue",
    steps: [0.025, 0.05],
  },
  51: { // Nimotop — ampoule 10 mg/50 mL pure → 0,2 mg/mL
    conc: 0.2, unite: "mg/h", min: 1, max: 2,
    steps: [1, 2],
  },

  // ── ANTICOAGULANTS ────────────────────────────────────────
  42: { // Héparine — 4 mL HNF 5000 UI/mL + 44 mL NaCl 0,9% → 20 000 UI / 48 mL = 416,7 UI/mL
    conc: 416.7, unite: "UI/kg/h", min: 15, max: 25,
    steps: [15, 18, 20, 22, 25],
    extra: { unite: "UI/24h", min: 10000, max: 40000, steps: [10000, 15000, 20000, 25000, 30000, 35000, 40000] },
  },

  // ── DIURÉTIQUES / ÉLECTROLYTES ───────────────────────────
  36: { // Lasilix — ampoule 250 mg/25 mL pure → 10 mg/mL
    conc: 10, unite: "mg/h", min: 5, max: 20,
    steps: [5, 10, 15, 20],
    hideBlock: true,
  },

  // ── ANTIDOTES ─────────────────────────────────────────────
  29: { // Anexate — ampoule pure 0,5 mg/5 mL = 0,1 mg/mL ; débit sans facteur poids
    conc: 0.1, unite: "mg/h", min: 0.1, max: 1,
    inputMode: "mlh",
    tag: "0,1 mg/mL · entrée mL/h",
    mlhSteps: [1, 2, 5, 10, 12, 15, 20],
    steps: [0.1, 0.2, 0.3, 0.5, 1],
  },

  // ── PRODUITS SANGUINS / FACTEURS DE COAGULATION ───────────
  // Octaplex (CCP) — débit-volume direct (pas de concentration de substrat).
  // Recommandation ANSM/Vidal : 0,12 mL/kg/min (≈ 3 UI/kg/min), cap absolu
  // à 8 mL/min (≈ 210 UI/min) = 480 mL/h sur la PSE. Ex 70 kg :
  // 0,12 × 70 = 8,4 mL/min → plafonné à 8 mL/min = 480 mL/h.
  // L'unité « mL/kg/min » désactive la division par conc dans calcDebit ;
  // maxMlH applique le plafond ; tag remplace l'affichage de concentration
  // qui n'a pas de sens ici.
  73: {
    conc: 1, unite: "mL/kg/min", min: 0.05, max: 0.12,
    maxMlH: 480,
    tag: "0,12 mL/kg/min · max 8 mL/min (480 mL/h)",
    steps: [0.05, 0.08, 0.12],
  },
};
