/**
 * Overlay « preview » des fiches médicaments (champ `prep`).
 *
 * Visible UNIQUEMENT en preview unifiée (URL `?author=preview`,
 * cf. featureFlags → isPreview).
 * Jamais exposé au public tant qu'on est hors preview.
 *
 * Indexé par drug id. La valeur `prep` REMPLACE celle de drugs.js.
 * PrepBlock applique l'override (cf. PrepBlock.tsx → resolvePrep),
 * même contrat que pse.preview.js. Public (drugs.js) inchangé.
 *
 * Workflow : tester via …/?author=preview ; une fois validé sur le
 * terrain, reporter le `prep` dans drugs.js et retirer l'entrée d'ici.
 *
 * ── Nouvelle préparation des médicaments en PSE (MEMO service +
 *    Google Sheet de dilution) ───────────────────────────────────
 * Carte « Préparation » revue : dilution FIXE unique (plus de table
 * Vi/Vf par poids). On CONSERVE la boîte bleue « Pour X kg » via
 * `fixed_dilution:true` — recette fixe SEULEMENT (pas de ligne débit :
 * géré par le bloc « Débit PSE » dédié, on ne le duplique pas) :
 *   fd_prelever  : ce qu'on prélève
 *   volume_final : volume final seringue · solvant : diluant
 */
export const DRUGS_PREVIEW = {
  13: {
    prep: {
      solvant: "G5%",
      conc_finale: "0,2 mg/mL (200 µg/mL)",
      unite: "µg",
      duree: "Continu IVSE",
      stabilite: "24h à 25°C",
      preparations: [
        {
          titre: "IVD ACR",
          mode: "bolus",
          tag: "1 mg/mL pur",
          prelever: "2 ampoules d'adrénaline 5 mg/5 mL (= 10 mg/10 mL)",
          concentration: "1 mg/mL",
          etapes: [
            "Ampoules 5 mg/5 mL (1 mg/mL)",
            "Préparer 2 ampoules (= 10 mg/10 mL) — utiliser pur",
            "ACR adulte : injecter 1 mL (= 1 mg) IV/IO toutes les 3-5 min",
          ],
          notes: [
            "Voie veineuse ou intra-osseuse — rincer après injection",
            "Surveillance cardiaque continue",
          ],
        },
        {
          titre: "IM anaphylaxie",
          mode: "im",
          tag: "1 mg/mL pur",
          prelever: "0,5 mL d'adrénaline 1 mg/1 mL (= 0,5 mg)",
          concentration: "1 mg/mL",
          etapes: [
            "Ampoule 1 mg/1 mL (1 mg/mL)",
            "Prélever 0,5 mL (= 0,5 mg)",
            "Injecter IM face antérieure de cuisse",
          ],
          notes: [
            "Anaphylaxie adulte : 0,5 mg IM",
            "Injection IM pure — ne pas diluer",
            "Surveillance cardiaque rapprochée",
          ],
        },
        {
          titre: "PSE",
          mode: "pse",
          tag: "0,2 mg/mL",
          prelever: "2 ampoules 5 mg/5 mL (= 10 mg)",
          completer: "50 mL avec G5%",
          concentration: "0,2 mg/mL (200 µg/mL)",
          etapes: [
            "Ampoule 5 mg/5 mL (1 mg/mL)",
            "PSE : 2 ampoules (10 mg) qsp 50 mL G5% → 0,2 mg/mL",
            "Débit selon µg/kg/min — voir bloc « Débit PSE »",
          ],
          notes: [
            "Administrer toujours au plus proche du patient",
            "IVSE : débit constant — pas de bolus sur cette voie",
            "Voie centrale proximale idéale en PSE",
            "Surveillance cardiaque rapprochée + état cutané",
          ],
        },
      ],
      fixed_dilution: true,
      fd_prelever: "2 ampoules 5 mg (10 mL)",
      volume_final: 50,
      etapes: [
        "Ampoule 5 mg/5 mL (1 mg/mL)",
        "PSE : 2 ampoules (10 mg) qsp 50 mL G5% → 0,2 mg/mL",
        "Débit selon µg/kg/min — voir bloc « Débit PSE »",
      ],
      notes: [
        "Administrer toujours au plus proche du patient",
        "IVSE : débit constant — pas de bolus sur cette voie",
        "Voie centrale proximale idéale en PSE",
        "Surveillance cardiaque rapprochée + état cutané",
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
      fixed_dilution: true,
      fd_prelever: "2 ampoules 8 mg (8 mL)",
      volume_final: 48,
      etapes: [
        "Ampoule 8 mg/4 mL (2 mg/mL)",
        "PSE : 2 ampoules (16 mg) qsp 48 mL G5% → 0,33 mg/mL",
        "Démarrer à 0,1-0,2 µg/kg/min, titrer selon PAM cible",
      ],
      notes: [
        "Nouvelle préparation service — dilution FIXE 0,33 mg/mL",
        "Objectif : PAM cible à atteindre — si PAM trop basse, augmenter le débit",
        "Voie dédiée — VVC conseillée. Pas de bolus, débit constant",
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
      fixed_dilution: true,
      fd_prelever: "1 flacon 250 mg",
      volume_final: 50,
      etapes: [
        "Flacon 250 mg/25 mL (10 mg/mL)",
        "PSE : 1 flacon 250 mg qsp 50 mL G5% → 5 mg/mL",
        "Débit selon µg/kg/min — voir bloc « Débit PSE »",
      ],
      notes: [
        "Nouvelle préparation service — dilution FIXE 5 mg/mL",
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
      fixed_dilution: true,
      fd_prelever: "5 ampoules 0,2 mg (10 mL)",
      volume_final: 50,
      etapes: [
        "Ampoule 0,2 mg/2 mL",
        "PSE : 5 ampoules (1 mg) qsp 50 mL G5% → 0,02 mg/mL = 20 µg/mL",
        "Débit selon µg/kg/min — voir bloc « Débit PSE »",
      ],
      notes: [
        "Nouvelle préparation service — dilution FIXE 20 µg/mL",
        "À l'abri de la lumière — tubulure opaque",
        "Ne se conserve plus au réfrigérateur",
      ],
    },
  },
};
