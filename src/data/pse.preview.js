/**
 * Overlay PSE « preview » — protocoles PSE en attente de validation.
 *
 * Visible UNIQUEMENT en mode preview unifié (URL `?author=preview`, cf.
 * src/lib/featureFlags.ts → isPsePreview). La même preview active aussi
 * le login. Jamais exposé au public tant que le flag reste false.
 *
 * Fusionné PAR-DESSUS src/data/pse.js (spread) : une clé présente ici
 * REMPLACE l'entrée publique du même drug id. Même forme que pse.js
 * (indexé par drug id) — voir l'en-tête de pse.js pour les unités,
 * concentrations et formules.
 *
 * Champs spécifiques preview gérés par PseBlock :
 *  - `inputMode: "mlh"` → la saisie est le débit réglé (mL/h) + poids,
 *     on déduit la dose (calcul inverse). `mlhSteps` = paliers mL/h.
 *  - `note` → bandeau d'information clinique affiché dans le bloc PSE.
 *  - `tag` → libellé de la dilution affiché en en-tête.
 *
 * UNE SEULE dilution par médicament (celle du Google Sheet service) :
 *  Adrénaline 0,2 mg/mL · Noradrénaline 0,33 mg/mL · Dobutamine
 *  5 mg/mL · Isoprénaline 20 µg/mL · Sufentanil 5 µg/mL. Pas
 *  d'alternative. conc en µg/mL pour µg/kg/min, en µg/mL pour µg/kg/h.
 *
 * Workflow : tester via …/?author=preview (collant pour l'onglet) ; une
 * fois validé, déplacer l'entrée vers pse.js et retirer d'ici.
 */
export const PSE_PREVIEW = {
  // LOXEN : la seringue est pure à 1 mg/mL, donc le bloc débit PSE
  // duplique strictement la préparation (mg/h = mL/h). Masqué en preview.
  26: undefined,
  // RISORDAN : meme logique, la PSE pure a 1 mg/mL est deja dans la preparation v2.
  28: undefined,

  // Saisie = débit réglé sur la PSE (mL/h) + poids → dose déduite.
  13: {
    // Adrénaline — Amp 5 mg/5 mL ; 2 amp qsp 50 mL → 0,2 mg/mL
    conc: 200,
    unite: "µg/kg/min",
    min: 0.05,
    max: 1,
    inputMode: "mlh",
    dosePrecision: 2, // centième
    mlhSteps: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
    steps: [0.1, 0.2, 0.3, 0.5, 1],
    tag: "2 amp 5 mg qsp 50 mL G5% → 0,2 mg/mL",
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
  17: {
    // Noradrénaline — Amp 8 mg/4 mL ; 2 amp qsp 48 mL → 0,33 mg/mL
    conc: 333,
    unite: "µg/kg/min",
    min: 0.05,
    max: 2,
    inputMode: "mlh",
    dosePrecision: 2, // centième
    mlhSteps: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
    steps: [0.1, 0.2, 0.3, 0.5, 1],
    tag: "2 amp 8 mg qsp 48 mL G5% → 0,33 mg/mL",
    note: "Objectif : PAM cible à atteindre (selon prescription, souvent ≥ 65 mmHg). Si PAM trop basse → augmenter le débit.",
  },
  15: {
    // Dobutamine — Flac 250 mg/25 mL ; 1 flacon qsp 50 mL → 5 mg/mL
    conc: 5000,
    unite: "µg/kg/min",
    min: 2,
    max: 20,
    inputMode: "mlh",
    dosePrecision: 1, // dixième
    mlhSteps: [1, 2, 3, 5, 8, 10, 15, 20],
    steps: [5, 10, 15, 20],
    tag: "1 flacon 250 mg qsp 50 mL G5% → 5 mg/mL",
  },
  16: {
    // Isoprénaline générique — solution à 0,2 mg/mL ; 5 mL qsp 50 mL → 20 µg/mL
    conc: 20,
    unite: "µg/kg/min",
    min: 0.01,
    max: 0.1,
    inputMode: "mlh",
    dosePrecision: 3, // millième
    mlhSteps: [1, 2, 3, 5, 8, 10, 15],
    steps: [0.02, 0.05, 0.08, 0.1],
    tag: "5 mL à 0,2 mg/mL qsp 50 mL G5% → 20 µg/mL",
  },
  5: {
    // Sufentanil — Amp 250 µg/5 mL ; 1 amp qsp 50 mL NaCl 0,9% → 5 µg/mL
    conc: 5,
    unite: "µg/kg/h",
    min: 0.2,
    max: 2,
    inputMode: "mlh",
    dosePrecision: 2, // centième
    mlhSteps: [1, 2, 3, 5, 8, 10, 15, 20],
    steps: [0.2, 0.5, 1, 1.5, 2],
    tag: "1 amp 250 µg qsp 50 mL NaCl 0,9% → 5 µg/mL",
  },
};
