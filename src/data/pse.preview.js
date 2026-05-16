/**
 * Overlay PSE « preview » — protocoles PSE en attente de validation.
 *
 * Visible UNIQUEMENT en mode preview (URL `?pse=preview`, cf.
 * src/lib/featureFlags.ts → isPsePreview). Jamais exposé au public
 * tant que le flag PSE_PREVIEW reste false.
 *
 * Fusionné PAR-DESSUS src/data/pse.js (spread) : une clé présente ici
 * REMPLACE l'entrée publique du même drug id ; une nouvelle clé AJOUTE
 * une fiche PSE. Même forme exacte que pse.js (indexé par drug id) —
 * voir l'en-tête de pse.js pour les unités, concentrations et formules.
 *
 * Workflow :
 *  1. Ajouter / corriger une entrée ci-dessous (clé = drug id de drugs.js).
 *  2. Tester sur la prod live via …/?pse=preview (collant pour l'onglet).
 *  3. Une fois validé : déplacer l'entrée vers pse.js, retirer d'ici,
 *     commit/push. Le public la voit alors normalement.
 */
export const PSE_PREVIEW = {
  // ── Sélecteur de dilution (MEMO : préparations alternatives) ──
  // Champ `dilutions: [{ label, conc, detail }]` → PseBlock affiche
  // des boutons ; la conc choisie alimente le calcul (dose cible
  // reste pondérale, donc min/max/steps inchangés). 1ʳᵉ = défaut.
  // conc TOUJOURS en µg/mL ici (unité µg/kg/min, cf. en-tête pse.js).
  13: {
    // Adrénaline — Amp 5 mg/5 mL
    unite: "µg/kg/min",
    min: 0.05,
    max: 1,
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
    steps: [0.1, 0.2, 0.3, 0.5, 1],
    dilutions: [
      { label: "2 amp / 48 mL", conc: 333, detail: "2 amp qsp 48 mL G5% → 0,33 mg/mL" },
      { label: "6 amp / 48 mL", conc: 1000, detail: "6 amp qsp 48 mL G5% → 1 mg/mL" },
      { label: "Pure", conc: 2000, detail: "Pure → 2 mg/mL" },
    ],
  },

  // ── MEMO « nouvelle préparation des médicaments en PSE » ──────
  // Source : memo papier service + Google Sheet de dilution (réf.
  // patient 70 kg). Adré/Nora/Dobu/Isuprel/Héparine : la nouvelle
  // prépa correspond DÉJÀ à pse.js (aucune modif de calcul).
  //
  // Sufentanil — SEUL changement réel. Ancienne fiche : table de
  // dilution adaptée au poids (1 mL/h = 0,1 µg/kg/h, factor 10).
  // Nouvelle prépa MEMO : dilution FIXE 1 ampoule 250 µg qsp 50 mL
  // NaCl 0,9% → 5 µg/mL. Calcul standard µg/kg/h : mL/h = dose × kg
  // / 5. Vérifié sur le Sheet (patient 70 kg) : 1 mL/h ≈ 0,07 µg/kg/h.
  5: {
    conc: 5,
    unite: "µg/kg/h",
    min: 0.2,
    max: 2,
    steps: [0.2, 0.5, 1, 1.5, 2],
  },
};
