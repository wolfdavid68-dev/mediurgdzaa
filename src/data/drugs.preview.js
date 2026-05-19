/**
 * Overlay « preview » des fiches médicaments (champ `prep` surtout).
 *
 * Visible UNIQUEMENT en preview unifiée (URL `?auth=preview` /
 * `?author=preview` / `?preview=preview`, cf. featureFlags → isPreview).
 * Jamais exposé au public tant qu'on est hors preview.
 *
 * Indexé par drug id. La valeur fusionne (spread) PAR-DESSUS l'entrée
 * publique de drugs.js : on ne met ici que les champs qui changent
 * (typiquement `prep`). DrugCard applique l'override au point unique
 * `const prep = ...` (cf. DrugCard.tsx). Même contrat que pse.preview.js.
 *
 * Workflow : tester via …/?auth=preview ; une fois validé sur le
 * terrain, reporter le champ dans drugs.js et retirer l'entrée d'ici.
 *
 * ── Sufentanil (id 5) ──────────────────────────────────────────
 * Ancienne fiche : table de dilution Vi/Vf ADAPTÉE AU POIDS
 * (sufenta_table → ex. 80 kg : Vi 5 mL, Vf 31 mL). Nouveau MEMO
 * service : dilution FIXE — 1 ampoule 250 µg/5 mL qsp 50 mL NaCl
 * 0,9% → 5 µg/mL. Plus de Vi/Vf par poids ; le débit se lit
 * directement (mL/h = dose µg/kg/h × poids ÷ 5), cohérent avec la
 * fiche PSE preview (pse.preview.js id 5).
 */
export const DRUGS_PREVIEW = {
  5: {
    prep: {
      solvant: "NaCl 0,9%",
      conc_finale: "5 µg/mL",
      unite: "µg",
      duree: "IVSE 0,2 à 2 µg/kg/h",
      stabilite: "24h à 25°C",
      etapes: [
        "Ampoule 250 µg/5 mL (50 µg/mL)",
        "Diluer 1 ampoule entière (250 µg / 5 mL) qsp 50 mL NaCl 0,9% → 5 µg/mL",
        "Débit IVSE (mL/h) = dose (µg/kg/h) × poids ÷ 5",
        "Posologie : 0,2 à 2 µg/kg/h",
      ],
      notes: [
        "Nouvelle préparation service (MEMO PSE) — dilution FIXE 5 µg/mL (remplace la table Vi/Vf adaptée au poids)",
        "Stupéfiant : tracer dans le cahier — ne pas jeter les ampoules",
        "Dépression respiratoire dose-dépendante",
        "Antidote : Naloxone",
      ],
    },
  },
};
