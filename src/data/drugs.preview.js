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
  14: {
    prep: {
      solvant: "NaCl 0,9%",
      conc_finale: "3 mg/mL",
      unite: "mg",
      duree: "Bolus titré",
      stabilite: "Utiliser immédiatement",
      preparations: [
        {
          titre: "Bolus titré",
          mode: "bolus",
          tag: "3 mg/mL",
          prelever: "1 ampoule 30 mg/1 mL",
          completer: "10 mL avec NaCl 0,9%",
          concentration: "3 mg/mL",
          etapes: [
            "Ampoule 30 mg/1 mL (30 mg/mL)",
            "Diluer : 1 ampoule qsp 10 mL NaCl 0,9% → 3 mg/mL",
            "Injecter 1-2 mL par bolus selon PA cible",
          ],
          notes: [
            "Effet épuisable après 30 mg (tachyphylaxie)",
            "Passer au plus proche du patient",
          ],
        },
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
      preparations: [
        {
          titre: "PSE adulte",
          population: "adulte",
          mode: "pse",
          tag: "0,33 mg/mL",
          prelever: "2 ampoules 8 mg/4 mL (= 16 mg)",
          completer: "48 mL avec G5%",
          concentration: "0,33 mg/mL",
          etapes: [
            "Ampoule 8 mg/4 mL (2 mg/mL)",
            "PSE : 2 ampoules (16 mg) qsp 48 mL G5% → 0,33 mg/mL",
            "Adulte : démarrer à 0,1-0,2 µg/kg/min, titrer selon PAM cible",
          ],
          notes: [
            "Objectif : PAM cible à atteindre — si PAM trop basse, augmenter le débit",
            "Voie dédiée — VVC conseillée. Pas de bolus, débit constant",
          ],
        },
        {
          titre: "PSE enfant",
          population: "enfant",
          mode: "pse",
          tag: "0,33 mg/mL",
          prelever: "2 ampoules 8 mg/4 mL (= 16 mg)",
          completer: "48 mL avec G5%",
          concentration: "0,33 mg/mL",
          etapes: [
            "Ampoule 8 mg/4 mL (2 mg/mL)",
            "PSE : 2 ampoules (16 mg) qsp 48 mL G5% → 0,33 mg/mL",
            "Pédia : 0,05-2 µg/kg/min IVSE",
          ],
          notes: [
            "Objectif : PAM cible à atteindre — titrer selon prescription",
            "Voie dédiée — VVC conseillée. Pas de bolus, débit constant",
          ],
        },
      ],
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
  19: {
    prep: {
      solvant: "Pur (IVD)",
      conc_finale: "0,5 mg/mL",
      unite: "mg",
      duree: "Bolus IV lent",
      stabilite: "Utiliser immédiatement",
      preparations: [
        {
          titre: "IVD pur",
          mode: "bolus",
          tag: "0,5 mg/mL",
          prelever: "2 ampoules",
          phase_doses: [{ label: "Disponible", dose_fixed: 1 }],
          etapes: [
            "Ampoule 0,5 mg/1 mL — administrer pure",
            "Bradycardie : 0,5-1 mg IV, répéter toutes les 3-5 min (max 3 mg)",
            "Organophosphorés : 0,5-2 mg IV, répéter toutes les 5-10 min",
          ],
          notes: [
            "Dose min 0,1 mg (risque bradycardie paradoxale si < 0,1 mg)",
            "Max 3 mg en bradycardie — doses illimitées dans intoxication aux organophosphorés",
          ],
        },
      ],
    },
  },
  20: {
    prep: {
      solvant: "Pur",
      conc_finale: "10 mg/mL",
      conc_produit: 10,
      unite: "mg",
      duree: "Charge puis PSE",
      stabilite: "Utiliser immédiatement",
      preparations: [
        {
          titre: "Charge 1 min",
          mode: "bolus",
          tag: "0,5 mg/kg",
          prelever: "Ampoule 100 mg/10 mL (10 mg/mL)",
          phase_doses: [{ label: "Dose de charge", dose_kg: 0.5 }],
          etapes: [
            "Dose de charge : 0,5 mg/kg sur 1 min",
            "Administrer pur sur VVP de gros calibre",
          ],
          notes: [
            "Surveillance hémodynamique",
            "Surveiller bradycardie, hypotension et bronchospasme",
          ],
        },
        {
          titre: "PSE entretien",
          mode: "pse",
          tag: "50 µg/kg/min",
          prelever: "Ampoule 100 mg/10 mL (10 mg/mL) pure",
          concentration: "10 mg/mL",
          hide_final: true,
          phase_doses: [{ label: "PSE", dose_kg: 50, unit: "µg/min" }],
          etapes: [
            "Entretien PSE : 50 µg/kg/min",
            "Débit (mL/h) = dose (µg/kg/min) × poids × 60 ÷ 10 000",
          ],
          notes: ["Sur VVP de gros calibre", "Surveillance hémodynamique continue"],
        },
      ],
    },
  },
  21: {
    prep: {
      solvant: "G5% STRICT",
      conc_finale: "ACR pur / charge G5% / PSE G5%",
      conc_produit: 50,
      unite: "mg",
      duree: "Selon indication",
      stabilite: "Utiliser immédiatement",
      preparations: [
        {
          titre: "ACR",
          mode: "bolus",
          tag: "bolus pur",
          prelever: "Ampoule 150 mg/3 mL (50 mg/mL)",
          phase_doses: [
            { label: "3e CEE", dose_fixed: 300 },
            { label: "5e CEE", dose_fixed: 150 },
          ],
          etapes: [
            "ACR 3e CEE : 300 mg pur",
            "ACR 5e CEE : 150 mg pur",
            "Injecter en bolus IV",
            "Ne pas diluer dans NaCl 0,9%",
          ],
          notes: ["G5% STRICT si dilution nécessaire", "Changer les tubulures à chaque seringue"],
        },
        {
          titre: "IVL dose de charge",
          mode: "bolus",
          tag: "5 mg/kg",
          prelever: "Ampoule 150 mg/3 mL (50 mg/mL)",
          completer: "G5% STRICT sur 30 min",
          phase_doses: [{ label: "Dose", dose_kg: 5, max: 300 }],
          etapes: [
            "IVL : dose de charge 5 mg/kg dans G5% STRICT",
            "Administrer sur 30 min",
            "Pas de NaCl 0,9%",
            "Changer les tubulures à chaque seringue",
          ],
          notes: ["G5% STRICT — incompatible NaCl 0,9%", "Surveillance scope et tensionnelle"],
        },
        {
          titre: "PSE entretien",
          mode: "pse",
          tag: "600 mg/48 mL",
          prelever: "4 ampoules 150 mg/3 mL (= 600 mg/12 mL)",
          completer: "à 48 mL avec G5%",
          concentration: "12,5 mg/mL",
          etapes: [
            "PSE entretien : max 600 mg/48 mL G5%",
            "VVC recommandée pour PSE",
            "Changer les tubulures à chaque seringue",
          ],
          notes: [
            "G5% STRICT — incompatible NaCl 0,9%",
            "Phlébite sur VVP — VVC recommandée pour PSE",
            "Surveillance scope et tensionnelle",
          ],
        },
      ],
    },
  },
  22: {
    prep: {
      solvant: "NaCl 0,9%",
      volume_final: 100,
      conc_finale: "0,5 mg/100 mL = 5 µg/mL",
      conc_produit: 0.25,
      unite: "mg",
      duree: "IVL",
      stabilite: "Utiliser immédiatement",
      preparations: [
        {
          titre: "IVL",
          mode: "bolus",
          tag: "5 µg/mL",
          prelever: "1 ampoule 0,5 mg/2 mL",
          completer: "mini-flac 100 mL NaCl 0,9%",
          concentration: "0,5 mg/100 mL = 5 µg/mL",
          hide_final: true,
          etapes: [
            "Ampoule 0,5 mg/2 mL",
            "Diluer 1 ampoule dans un mini-flac de 100 mL NaCl 0,9%",
            "ECG obligatoire avant injection",
          ],
          notes: [
            "Marge thérapeutique étroite",
            "Surveiller bradycardie, blocs AV et signes de toxicité",
          ],
        },
      ],
    },
  },
  24: {
    prep: {
      solvant: "Solvant fourni",
      volume_final: 50,
      conc_finale: "1 mg/mL",
      conc_produit: 1,
      unite: "mg",
      duree: "PSE pour administration directe",
      stabilite: "Stable 8h à 25°C",
      preparations: [
        {
          titre: "IDM",
          mode: "pse",
          tag: "bolus puis 30 + 60 min",
          prelever: "Flacon reconstitué 50 mg/50 mL (= 1 mg/mL)",
          concentration: "1 mg/mL",
          hide_final: true,
          hide_phase_volume: true,
          phase_doses: [
            { label: "Bolus IV", dose_fixed: 15 },
            { label: "PSE 30 min", dose_kg: 0.75, duree: "30 min" },
            { label: "PSE 60 min", dose_kg: 0.5, duree: "60 min" },
          ],
          etapes: [
            "IDM : 15 mg bolus IV",
            "Puis 0,75 mg/kg sur 30 min",
            "Puis 0,5 mg/kg sur 60 min",
          ],
          notes: [
            "Administration directe en PSE après reconstitution",
            "Surveiller tout signe hémorragique",
          ],
        },
        {
          titre: "EP massive",
          mode: "pse",
          tag: "10 mg puis 90 mg/2h",
          prelever: "Flacon reconstitué 50 mg/50 mL (= 1 mg/mL)",
          concentration: "1 mg/mL",
          hide_final: true,
          hide_phase_volume: true,
          phase_doses: [
            { label: "IVL", dose_fixed: 10, duree: "1-2 min" },
            { label: "PSE", dose_fixed: 90, duree: "2 h" },
          ],
          etapes: ["EP massive : 10 mg IVL sur 1-2 min", "Puis 90 mg IV sur 2 h"],
          notes: [
            "Prévoir 2 flacons si dose totale 100 mg",
            "Surveillance hémodynamique rapprochée",
          ],
        },
        {
          titre: "AVC",
          mode: "pse",
          tag: "0,9 mg/kg",
          prelever: "Flacon reconstitué 50 mg/50 mL (= 1 mg/mL)",
          concentration: "1 mg/mL",
          hide_final: true,
          hide_phase_volume: true,
          phase_doses: [
            { label: "Dose totale", dose_kg: 0.9, max: 90 },
            { label: "Bolus 10%", dose_kg: 0.09, max: 9 },
            { label: "PSE 90%", dose_kg: 0.81, max: 81, duree: "60 min" },
          ],
          etapes: ["AVC : 0,9 mg/kg IV (max 90 mg)", "10% en bolus", "90% restant sur 60 min"],
          notes: [
            "Indication AVC uniquement si patient éligible",
            "Surveiller tout signe hémorragique",
          ],
        },
      ],
      etapes: [
        "Flacon 50 mg poudre + solvant 50 mL",
        "Reconstituer avec le solvant fourni",
        "Administration directe en PSE selon indication",
      ],
      notes: ["Surveillance hémodynamique", "Surveiller tout signe hémorragique"],
    },
  },
  25: {
    prep: {
      solvant: "EPPI fourni",
      volume_final: 10,
      conc_finale: "5 mg/mL",
      conc_produit: 5,
      unite: "mg",
      duree: "Bolus IV unique < 10 sec",
      stabilite: "Utiliser immediatement apres reconstitution",
      preparations: [
        {
          titre: "Bolus IV",
          mode: "bolus",
          tag: "dose poids",
          prelever: "Flacon reconstitue 50 mg/10 mL",
          concentration: "5 mg/mL",
          weight_bands: [
            { lt: 60, dose: 30 },
            { gte: 60, lt: 70, dose: 35 },
            { gte: 70, lt: 80, dose: 40 },
            { gte: 80, lt: 90, dose: 45 },
            { gte: 90, dose: 50 },
          ],
          etapes: [
            "Reconstituer le lyophilisat 10 000 UI (50 mg) avec les 10 mL EPPI fournis",
            "Prelever le volume calcule selon le poids",
            "Injection IV bolus unique strict < 10 sec - ne pas perfuser",
          ],
          notes: [
            "BOLUS UNIQUE - dose adaptee au poids",
            "Ne pas secouer le flacon lors de la reconstitution",
            "Ne pas melanger avec G5% dans la meme ligne",
            "Associer systematiquement anticoagulation (HNF)",
          ],
        },
      ],
      etapes: [
        "Reconstituer le lyophilisat 10 000 UI (50 mg) avec les 10 mL EPPI fournis",
        "Prelever le volume calcule selon le poids",
        "Injection IV bolus unique strict < 10 sec - ne pas perfuser",
      ],
      notes: [
        "BOLUS UNIQUE - dose adaptee au poids",
        "Ne pas secouer le flacon lors de la reconstitution",
        "Ne pas melanger avec G5% dans la meme ligne",
        "Associer systematiquement anticoagulation (HNF)",
      ],
    },
  },
  26: {
    prep: {
      solvant: "Pur (NaCl 0,9% si dilution)",
      volume_final: null,
      conc_finale: "1 mg/mL",
      conc_produit: 1,
      unite: "mg",
      duree: "Bolus puis IVSE",
      stabilite: "24h à 25°C",
      preparations: [
        {
          titre: "Bolus",
          mode: "bolus",
          tag: "pur 1 mg/mL",
          prelever: "1 ampoule 10 mg/10 mL",
          phase_doses: [{ label: "Bolus initial", dose_fixed: 1 }],
          etapes: [
            "Bolus initial : 1 mg IV (= 1 mL)",
            "Administrer pur (1 mg/mL)",
            "Surveillance hémodynamique rapprochée",
          ],
          notes: [
            "Conserver l'ampoule dans son emballage (photosensible)",
            "Titrer par paliers — ne pas dépasser baisse PA > 25% en 1h",
          ],
        },
        {
          titre: "PSE",
          mode: "pse",
          tag: "1-15 mg/h",
          prelever: "1 ampoule 10 mg/10 mL",
          concentration: "1 mg/mL",
          rate_label: "Débit usuel",
          rate_value: "1-15 mg/h = 1-15 mL/h",
          etapes: [
            "PSE : administrer PUR (1 mg/mL)",
            "Débit usuel : 1-15 mg/h selon TA cible",
            "Soit 1-15 mL/h avec ampoule pure",
          ],
          notes: [
            "Conserver l'ampoule dans son emballage (photosensible)",
            "Titrer par paliers — ne pas dépasser baisse PA > 25% en 1h",
          ],
        },
      ],
    },
  },
  27: {
    prep: {
      solvant: "NaCl 0,9%",
      volume_final: null,
      conc_finale: "5 mg/mL",
      conc_produit: 5,
      unite: "mg",
      duree: "PSE",
      stabilite: "24h à 25°C",
      preparations: [
        {
          titre: "PSE",
          mode: "pse",
          tag: "5 mg/mL",
          prelever: "Ampoule 25 mg/5 mL",
          concentration: "5 mg/mL",
          etapes: [
            "PSE : administrer PUR",
            "Dose usuelle : 5-30 mg/h selon TA cible",
            "Débit : 1-6 mL/h avec ampoule pure à 5 mg/mL",
          ],
          notes: [
            "Conserver l'ampoule dans son emballage à l'abri de la lumière",
            "Surveillance hémodynamique",
          ],
        },
      ],
    },
  },
  28: {
    prep: {
      solvant: "Pur (NaCl 0,9% si dilution)",
      volume_final: null,
      conc_finale: "1 mg/mL",
      conc_produit: 1,
      unite: "mg",
      duree: "Bolus puis IVSE",
      stabilite: "Utiliser immediatement",
      preparations: [
        {
          titre: "Bolus",
          mode: "bolus",
          tag: "pur 1 mg/mL",
          prelever: "Ampoule 10 mg/10 mL",
          concentration: "1 mg/mL",
          hide_final: true,
          etapes: [
            "IVD en bolus : administrer PUR",
            "Utiliser l'ampoule pure a 1 mg/mL",
            "Titrer selon PA cible",
          ],
          notes: [
            "CI absolue si inhibiteurs PDE5 < 48h (effondrement PA mortel)",
            "Surveiller PA en continu",
          ],
        },
        {
          titre: "PSE",
          mode: "pse",
          tag: "1-10 mg/h",
          prelever: "Ampoule 10 mg/10 mL",
          concentration: "1 mg/mL",
          rate_label: "Débit usuel",
          rate_value: "1-10 mg/h = 1-10 mL/h",
          etapes: [
            "PSE : administrer PUR (1 mg/mL)",
            "Debit usuel : 1-10 mg/h selon PA cible",
            "Soit 1-10 mL/h avec ampoule pure",
          ],
          notes: [
            "CI absolue si inhibiteurs PDE5 < 48h (effondrement PA mortel)",
            "Surveiller PA en continu",
          ],
        },
      ],
    },
  },
  81: {
    prep: {
      solvant: "NaCl 0,9%",
      volume_final: 10,
      conc_finale: "0,5 mg/mL",
      conc_produit: 0.5,
      unite: "mg",
      duree: "IVL en 2 à 3 min",
      stabilite: "Utiliser immédiatement",
      preparations: [
        {
          titre: "IVL",
          mode: "bolus",
          tag: "0,5 mg/mL",
          prelever: "1 ampoule 5 mg/2 mL",
          completer: "à 10 mL avec NaCl 0,9%",
          concentration: "0,5 mg/mL",
          phase_doses: [{ label: "Injecter", dose_kg: 0.075, dose_max_kg: 0.15, max: 10 }],
          etapes: [
            "Diluer 1 ampoule qsp 10 mL NaCl 0,9%",
            "Injecter lentement en 2 à 3 min",
            "Surveillance hémodynamique",
          ],
          notes: ["Non recommandé < 15 ans", "Surveillance hémodynamique"],
        },
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
