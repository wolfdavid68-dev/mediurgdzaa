/**
 * Overlay « preview » des fiches médicaments (champ `prep`).
 *
 * Visible UNIQUEMENT en preview unifiée (URL `?auth=preview` /
 * `?author=preview` / `?preview=preview`, cf. featureFlags → isPreview).
 * Jamais exposé au public tant qu'on est hors preview.
 *
 * Indexé par drug id. La valeur `prep` REMPLACE celle de drugs.js.
 * PrepBlock applique l'override (cf. PrepBlock.tsx → resolvePrep),
 * même contrat que pse.preview.js.
 *
 * Workflow : tester via …/?auth=preview ; une fois validé sur le
 * terrain, reporter le `prep` dans drugs.js et retirer l'entrée d'ici.
 *
 * ── Nouvelle préparation des médicaments en PSE (MEMO service +
 *    Google Sheet de dilution) ───────────────────────────────────
 * Carte « Préparation » revue en fonction de la NOUVELLE dilution
 * FIXE (unique, plus de table Vi/Vf adaptée au poids pour le
 * Sufentanil). L'adaptation au poids se fait via le bloc Débit PSE
 * (mL/h ↔ µg/kg/min, cf. pse.preview.js). Recette épurée : étapes +
 * chips (solvant / durée / stabilité / conc finale), pas de calcul
 * volumétrique par poids.
 *   Adrénaline   2 amp 5 mg qsp 50 mL G5%  → 0,2 mg/mL (200 µg/mL)
 *   Noradrénal.  2 amp 8 mg qsp 48 mL G5%  → 0,33 mg/mL
 *   Dobutamine   1 flacon 250 mg qsp 50 mL → 5 mg/mL
 *   Isoprénal.   5 amp 0,2 mg qsp 50 mL G5%→ 0,02 mg/mL (20 µg/mL)
 *   Sufentanil   1 amp 250 µg qsp 50 mL NaCl→ 5 µg/mL
 */
export const DRUGS_PREVIEW = {
  13: {
    prep: {
      solvant: "G5%",
      conc_finale: "0,2 mg/mL (200 µg/mL)",
      unite: "µg",
      duree: "Continu IVSE",
      stabilite: "24h à 25°C — à l'abri de la lumière",
      etapes: [
        "Ampoule 5 mg/5 mL (1 mg/mL)",
        "PSE : 2 ampoules (10 mg) qsp 50 mL G5% → 0,2 mg/mL",
        "Débit selon µg/kg/min — voir bloc « Débit PSE »",
      ],
      notes: [
        "Nouvelle préparation service (MEMO PSE) — dilution fixe 0,2 mg/mL",
        "Administrer au plus proche du patient — débit constant, pas de bolus sur cette voie",
        "À l'abri de la lumière — tubulure opaque",
      ],
    },
  },
  17: {
    prep: {
      solvant: "G5%",
      conc_finale: "0,33 mg/mL",
      unite: "µg",
      duree: "Continu IVSE sur voie dédiée",
      stabilite: "Stable 12h à 25°C à l'abri de la lumière",
      etapes: [
        "Ampoule 8 mg/4 mL (2 mg/mL)",
        "PSE : 2 ampoules (16 mg) qsp 48 mL G5% → 0,33 mg/mL",
        "Démarrer à 0,1-0,2 µg/kg/min, titrer selon PAM cible",
      ],
      notes: [
        "Nouvelle préparation service (MEMO PSE) — dilution fixe 0,33 mg/mL",
        "Objectif : PAM cible à atteindre — si PAM trop basse, augmenter le débit",
        "Voie dédiée — VVC conseillée. Pas de bolus, débit constant. Tubulure opaque",
      ],
    },
  },
  15: {
    prep: {
      solvant: "G5% ou NaCl 0,9%",
      conc_finale: "5 mg/mL",
      unite: "µg",
      duree: "Continu IVSE",
      stabilite: "Stable 6h à 25°C",
      etapes: [
        "Flacon 250 mg/25 mL (10 mg/mL)",
        "PSE : 1 flacon 250 mg qsp 50 mL G5% → 5 mg/mL",
        "Débit selon µg/kg/min — voir bloc « Débit PSE »",
      ],
      notes: [
        "Nouvelle préparation service (MEMO PSE) — dilution fixe 5 mg/mL",
        "Surveillance cardiaque continue",
        "Débit constant — pas de bolus sur cette voie",
      ],
    },
  },
  16: {
    prep: {
      solvant: "G5%",
      conc_finale: "0,02 mg/mL (20 µg/mL)",
      unite: "µg",
      duree: "Continu IVSE",
      stabilite: "Stable 6h — à l'abri de la lumière",
      etapes: [
        "Ampoule 0,2 mg/2 mL",
        "PSE : 5 ampoules (1 mg) qsp 50 mL G5% → 0,02 mg/mL = 20 µg/mL",
        "Débit selon µg/kg/min — voir bloc « Débit PSE »",
      ],
      notes: [
        "Nouvelle préparation service (MEMO PSE) — dilution fixe 20 µg/mL",
        "À l'abri de la lumière — tubulure opaque",
        "Ne se conserve plus au réfrigérateur",
      ],
    },
  },
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
