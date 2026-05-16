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
 *
 * Exemple (à dé-commenter / adapter) :
 *   80: { // Nalbuphine — exemple : 20 mg qsp 20 mL → 1 mg/mL
 *     conc: 1, unite: "mg/kg/h", min: 0.1, max: 0.4,
 *     steps: [0.1, 0.2, 0.3, 0.4],
 *   },
 */
export const PSE_PREVIEW = {
  // (vide) — ajouter ici les protocoles PSE en preview
};
