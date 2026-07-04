/**
 * Overlay « preview » des fiches médicaments (champ `prep`).
 *
 * Visible UNIQUEMENT en preview unifiée (URL `?author=preview`,
 * cf. featureFlags → isPreview).
 * Jamais exposé au public tant qu'on est hors preview.
 *
 * Indexé par drug id. Le `prep` de l'override est FUSIONNÉ champ à champ
 * par-dessus celui de drugs.js (resolvePrep → { ...public, ...override }),
 * pas un remplacement : les champs non redéfinis (pedTable, conc_finale,
 * display_below_kg…) survivent. Un override minimal { prep: { preparations } }
 * suffit donc. Public (drugs.js) inchangé.
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
  45: {
    prep: {
      solvant: "NaCl 0,9%",
      volume_final: 100,
      conc_finale: "Variable",
      conc_produit: null,
      unite: "mg",
      dose_kg: 2,
      duree: "20-30 min",
      stabilite: "Stable 24h à 25°C",
      preparations: [
        {
          titre: "IV",
          mode: "bolus",
          tag: "dose saisie",
          dose_input_label: "Dose à préparer",
          dose_input_unit: "mg",
          dose_input_default: 120,
          dose_input_min: 1,
          dose_input_step: 1,
          dose_based_dilution: {
            threshold: 120,
            label: "Diluer",
            source: "dose_input",
            below_or_equal: "IVD : reconstituer avec 2 mL EPPI puis diluer qsp 10 mL NaCl 0,9%",
            above: "IVL : dans 100 mL NaCl 0,9%",
          },
          rows: [{ label: "Perfuser", value: "20-30 min" }],
          hide_final: true,
          etapes: [
            "Reconstituer le flacon avec le solvant fourni",
            "≤ 120 mg : reconstituer avec 2 mL EPPI, diluer qsp 10 mL NaCl 0,9%",
            "> 120 mg : diluer dans 100 mL NaCl 0,9%",
            "Perfuser sur 20-30 min",
          ],
        },
      ],
      etapes: [
        "Flacon poudre 40 mg, 120 mg, 500 mg ou 1 g — reconstituer avec le solvant fourni",
        "≤ 120 mg : reconstituer avec 2 mL EPPI, diluer qsp 10 mL NaCl 0,9%",
        "> 120 mg : diluer dans 100 mL NaCl 0,9%",
        "Perfusion 20-30 min",
      ],
      notes: [
        "Hyperglycémie — surveillance glycémique",
        "Risque infection opportuniste en cas de cure prolongée",
      ],
      duplicate_posology: [
        "IVD (dose ≤ 120 mg) : reconstituer avec 2 mL EPPI, dilué qsp 10 mL NaCl 0,9%",
        "IVL (dose > 120 mg) : 100 mL NaCl 0,9%",
      ],
    },
  },
  47: {
    prep: {
      solvant: "NaCl 0,9%",
      volume_final: 100,
      conc_finale: "0,8 mg/mL (bolus) / 1,67 mg/mL (PSE)",
      conc_produit: 40,
      unite: "mg",
      hide_poso_when_prepared: true,
      duree: "Bolus 20-30 min puis IVSE 72h",
      debit: "PSE : 5 mL/h (8 mg/h) = 200 mg/24h",
      stabilite: "Stable 12h maximum",
      preparations: [
        {
          titre: "Bolus IVL",
          mode: "bolus",
          population: "adulte",
          tag: "20-30 min",
          prelever: "1-2 flacons 40 mg",
          completer: "dans 100 mL NaCl 0,9%",
          rows: [
            { label: "Dose", value: "40-80 mg", highlight: true },
            { label: "Perfuser", value: "20-30 min" },
            { label: "Final", value: "0,4-0,8 mg/mL" },
          ],
          etapes: [
            "Reconstituer le flacon poudre 40 mg",
            "Bolus : 40-80 mg dans 100 mL NaCl 0,9%",
            "Perfuser sur 20-30 min",
          ],
        },
        {
          titre: "PSE entretien",
          mode: "pse",
          population: "adulte",
          tag: "5 mL/h",
          prelever: "2 flacons 40 mg (= 80 mg)",
          completer: "à 48 mL avec NaCl 0,9%",
          rows: [
            { label: "Débit", value: "5 mL/h", highlight: true },
            { label: "Dose", value: "8 mg/h = 200 mg/24h", highlight: true },
            { label: "Final", value: "1,67 mg/mL" },
          ],
          etapes: [
            "PSE : 80 mg/48 mL NaCl 0,9%",
            "Débit : 5 mL/h (= 8 mg/h)",
            "Changer toutes les 12h maximum",
          ],
        },
        {
          titre: "IVL enfant",
          mode: "ped",
          population: "enfant",
          tag: "1 mg/kg /12h",
          hide_phase_volume: true,
          phase_doses: [{ label: "Dose à préparer", dose_kg: 1, unit: "mg", max: 40 }],
          rows: [
            { label: "Prélever", value: "uniquement la dose calculée ci-dessus", highlight: true },
            { label: "Diluer", value: "dans 100 mL NaCl 0,9%" },
            { label: "Rythme", value: "toutes les 12h" },
            { label: "Perfuser", value: "20-30 min" },
            { label: "Max", value: "40 mg/dose" },
          ],
          hide_final: true,
          etapes: [
            "Dose enfant : 1 mg/kg IV /12h, max 40 mg/dose",
            "Prélever uniquement la dose calculée",
            "Diluer la dose calculée dans 100 mL NaCl 0,9%",
          ],
        },
      ],
      etapes: [
        "Flacon poudre 40 mg — reconstituer",
        "Bolus : 40-80 mg dans 100 mL NaCl 0,9% — perfusion 20-30 min",
        "PSE entretien : 80 mg/48 mL NaCl 0,9% → 1,67 mg/mL → débit 5 mL/h",
      ],
      notes: [
        "Stabilité 12h MAXIMUM — changer toutes les 12h",
        "Malaise vagal et hypotension possible",
      ],
    },
  },
  49: {
    prep: {
      solvant: "Pur",
      volume_final: null,
      conc_finale: "2 mg/mL",
      conc_produit: 2,
      unite: "mg",
      dose_kg: 0.1,
      duree: "IVD",
      stabilite: "Utiliser immédiatement après ouverture",
      preparations: [
        {
          titre: "IVD adulte",
          mode: "bolus",
          population: "adulte",
          tag: "4-8 mg",
          phase_doses: [{ label: "Dose", dose_fixed: 4, dose_max_fixed: 8, unit: "mg" }],
          rows: [{ label: "Voie", value: "administrer pur" }],
          etapes: [
            "Ampoule 4 mg/2 mL ou 8 mg/4 mL (2 mg/mL)",
            "Adulte : 4-8 mg IV /8h",
            "Administrer pur",
          ],
        },
        {
          titre: "IVD enfant",
          mode: "bolus",
          population: "enfant",
          tag: "0,1 mg/kg max 4 mg",
          phase_doses: [{ label: "Dose", dose_kg: 0.1, max: 4, unit: "mg" }],
          rows: [{ label: "Voie", value: "administrer pur" }],
          etapes: [
            "Ampoule 4 mg/2 mL ou 8 mg/4 mL (2 mg/mL)",
            "Pédiatrie : 0,1 mg/kg IV (max 4 mg)",
            "Administrer pur",
          ],
        },
      ],
      etapes: [
        "Ampoule 4 mg/2 mL ou 8 mg/4 mL (2 mg/mL)",
        "Administrer pur",
        "Adulte : 4-8 mg IV /8h",
        "Pédiatrie : 0,1 mg/kg IV (max 4 mg)",
      ],
      notes: ["Surveiller allongement QT, surtout sujet âgé"],
    },
  },
  52: {
    prep: {
      solvant: "G5% (adulte) — NaCl 0,9% ou G5% (pédiatrie)",
      volume_final: 250,
      conc_finale: "Variable selon dose",
      conc_produit: 250,
      unite: "mg",
      dose_kg: 20,
      dose_max_kg: 30,
      duree: "30 min (adulte) / 30-60 min (pédiatrie)",
      stabilite: "Stable 24h à 25°C",
      preparations: [
        {
          titre: "IVL adulte",
          mode: "bolus",
          population: "adulte",
          tag: "20-30 mg/kg",
          solvant: "G5%",
          conc_finale: "Variable selon dose",
          duree: "30 min",
          stabilite: "Stable 24h à 25°C",
          phase_doses: [{ label: "Dose", dose_kg: 20, dose_max_kg: 30, unit: "mg" }],
          hide_phase_volume: true,
          amiklin_adult: true,
          dose_based_dilution: {
            threshold: 1500,
            label: "Compléter",
            below_or_equal: "à 250 mL avec G5%",
            above: "à 500 mL avec G5%",
          },
          rows: [{ label: "Perfuser", value: "30 min" }],
          hide_final: true,
          etapes: [
            "Flacon 500 mg ou 1 g",
            "Adulte : dose < 1500 mg → diluer dans 250 mL G5%",
            "Adulte : dose > 1500 mg → diluer dans 500 mL G5%",
            "Utiliser les flacons 1 g et 500 mg : flacons pleins puis appoint à la seringue de 5 mL jusqu'à la dose finale",
            "Perfuser en 30 min",
          ],
        },
        {
          titre: "IVL enfant",
          mode: "bolus",
          population: "enfant",
          tag: "15-20 mg/kg",
          solvant: "NaCl 0,9% ou G5%",
          conc_finale: "≤ 5 mg/mL",
          duree: "30-60 min",
          stabilite: "Stable 24h à 25°C",
          phase_doses: [{ label: "Dose", dose_kg: 15, dose_max_kg: 20, unit: "mg" }],
          hide_phase_volume: true,
          completer: "NaCl 0,9% ou G5% — concentration max 5 mg/mL",
          rows: [{ label: "Perfuser", value: "mini-perfusion 30-60 min" }],
          hide_final: true,
          etapes: [
            "Flacon 500 mg ou 1 g",
            "Pédiatrie : dilution NaCl 0,9% ou G5%",
            "Respecter une concentration max 5 mg/mL",
            "Perfuser en mini-perfusion sur 30-60 min",
          ],
        },
      ],
      etapes: [
        "Flacon 500 mg ou 1 g",
        "ADULTE — dose < 1500 mg : diluer dans 250 mL G5%",
        "ADULTE — dose > 1500 mg : diluer dans 500 mL G5%",
        "PÉDIATRIE : dilution NaCl 0,9% ou G5% — conc max 5 mg/mL, mini-perf 30-60 min",
        "Perfusion IV en 30 min (adulte)",
      ],
      notes: [
        "Néphrotoxique et ototoxique — surveillance créatinine",
        "Pic sérique > 64 mg/L (efficacité) — résiduelle < 2,5 mg/L (sécurité)",
        "Deux concentrations différentes : vérifier le flacon",
        "Dose unique journalière en monoprise",
      ],
      duplicate_posology: [
        "Dose < 1500 mg → 250 mL G5%",
        "Dose > 1500 mg → 500 mL G5%",
        "PÉDIATRIE : dilution NaCl 0,9% ou G5% — conc max 5 mg/mL, mini-perf 30-60 min",
      ],
    },
  },
  54: {
    prep: {
      solvant: "NaCl 0,9%",
      volume_final: 100,
      conc_finale: "10 mg/mL",
      conc_produit: 10,
      unite: "g",
      dose_kg: 0.1,
      dose_max_kg: 0.3,
      duree: "20-30 min",
      stabilite: "Stable 8h à 25°C",
      preparations: [
        {
          titre: "IVL standard",
          mode: "bolus",
          population: "adulte",
          tag: "1 g/100 mL",
          solvant: "NaCl 0,9%",
          conc_finale: "10 mg/mL",
          duree: "20-30 min",
          stabilite: "Stable 8h à 25°C",
          prelever: "1 g",
          completer: "100 mL avec NaCl 0,9%",
          rows: [{ label: "Perfuser", value: "20-30 min" }],
          hide_final: true,
          etapes: [
            "Flacon poudre 1 g — reconstituer avec 10 mL eau PPI",
            "Diluer qsp 100 mL NaCl 0,9%",
            "Perfuser sur 20-30 min",
          ],
        },
        {
          titre: "Dose méningée pompe",
          mode: "pse",
          population: "adulte",
          tag: "6-18 g/j",
          solvant: "NaCl 0,9%",
          conc_finale: "20 mg/mL",
          duree: "Pompe continue",
          stabilite: "Stable 8h à 25°C",
          dose_input_label: "Dose/j",
          dose_input_unit: "g/j",
          dose_input_default: 12,
          dose_input_min: 6,
          dose_input_max: 18,
          dose_input_step: 2,
          amoxicilline_meningee_pump: true,
          hide_final: true,
          etapes: [
            "Dose méningée sur pompe",
            "6 g/j : 2 g/100 mL à 12 mL/h",
            "8 g/j : 2 g/100 mL à 17 mL/h",
            "10-18 g/j : 5 g/250 mL selon débit affiché",
          ],
          notes: ["Vérifier la prescription et la stabilité locale avant préparation"],
        },
        {
          titre: "IVL enfant",
          mode: "ped",
          population: "enfant",
          tag: "50-200 mg/kg/j",
          solvant: "NaCl 0,9%",
          conc_finale: "selon prescription",
          duree: "20-30 min",
          stabilite: "Stable 8h à 25°C",
          phase_doses: [{ label: "Dose/j", dose_kg: 50, dose_max_kg: 200, unit: "mg" }],
          hide_phase_volume: true,
          rows: [
            { label: "Diluer", value: "dans NaCl 0,9%" },
            { label: "Perfuser", value: "20-30 min" },
            { label: "Fractionner", value: "selon prescription" },
          ],
          hide_final: true,
          etapes: [
            "Calculer la dose pédiatrique : 50-200 mg/kg/j selon indication",
            "Préparer uniquement la dose prescrite",
            "Diluer dans NaCl 0,9%",
            "Perfuser sur 20-30 min",
          ],
          notes: ["Dose quotidienne à fractionner selon indication et prescription"],
        },
      ],
      etapes: [
        "Flacon poudre 1 g — reconstituer avec 10 mL eau PPI",
        "Diluer qsp 100 mL NaCl 0,9% — perfusion 20-30 min",
        "Dose méningée : 300 mg/kg/j en 6 injections IV",
      ],
      notes: ["Dose méningée très élevée (jusqu'à 24 g/j adulte) — vérifier la prescription"],
      duplicate_posology: ["Dilution : NaCl 0,9%", "1 g dans 100 mL", "Perfusion sur 20-30 min"],
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
      preparations: [
        {
          titre: "PSE",
          mode: "pse",
          tag: "5 mg/mL",
          prelever: "1 flacon 250 mg/25 mL (10 mg/mL)",
          completer: "50 mL avec G5%",
          concentration: "5 mg/mL",
          etapes: [
            "Flacon 250 mg/25 mL (10 mg/mL)",
            "PSE : 1 flacon 250 mg qsp 50 mL G5% → 5 mg/mL",
            "Débit selon µg/kg/min — voir bloc « Débit PSE »",
          ],
          notes: [
            "Surveillance cardiaque continue",
            "Débit constant — pas de bolus sur cette voie",
          ],
        },
      ],
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
      preparations: [
        {
          titre: "PSE",
          mode: "pse",
          tag: "20 µg/mL",
          prelever: "5 ampoules 0,2 mg/2 mL (= 1 mg)",
          completer: "50 mL avec G5%",
          concentration: "0,02 mg/mL (20 µg/mL)",
          etapes: [
            "Ampoule 0,2 mg/2 mL",
            "PSE : 5 ampoules (1 mg) qsp 50 mL G5% → 0,02 mg/mL = 20 µg/mL",
            "Débit selon µg/kg/min — voir bloc « Débit PSE »",
          ],
          notes: [
            "À l'abri de la lumière — tubulure opaque",
            "Ne se conserve plus au réfrigérateur",
          ],
        },
      ],
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

  // ── Conversions v2 — formes dose_kg simples + fixed_dilution (Lot 2) ──
  // Overrides fusionnés par-dessus le prep public (resolvePrep) : ne portent
  // que `preparations[]`. Textes repris verbatim de src/data/drugs/*.js.

  // HYPNOTIQUES
  1: {
    prep: {
      preparations: [
        {
          titre: "Induction",
          mode: "bolus",
          population: "adulte",
          tag: "PUR",
          prelever: "Ampoule 200 mg/20 mL (10 mg/mL) — utiliser pure",
          concentration: "10 mg/mL",
          phase_doses: [{ label: "Induction", dose_kg: 1, dose_max_kg: 2.5, unit: "mg" }],
          rows: [{ label: "Sédation procédurale", value: "0,5-1 mg/kg IV en titration" }],
          hide_final: true,
          etapes: [
            "Ampoule 200 mg/20 mL (10 mg/mL) — utiliser pure",
            "Induction : 1–2,5 mg/kg IV titration lente",
            "Sédation procédurale : 0,5–1 mg/kg IV en titration — surveillance capno",
          ],
          notes: [
            "Attention : 2 concentrations (10 mg/mL et 20 mg/mL)",
            "Apnée par myorelaxation : subluxation mandibulaire en 1ère intention",
          ],
        },
        {
          titre: "Induction enfant",
          mode: "bolus",
          population: "enfant",
          tag: "PUR",
          prelever: "Ampoule 200 mg/20 mL (10 mg/mL) — utiliser pure",
          concentration: "10 mg/mL",
          phase_doses: [{ label: "Induction", dose_kg: 2.5, dose_max_kg: 3.5, unit: "mg" }],
          rows: [{ label: "Sédation procédurale", value: "1 mg/kg IV" }],
          hide_final: true,
          etapes: [
            "Ampoule 200 mg/20 mL (10 mg/mL) — utiliser pure",
            "Induction enfant : 2,5–3,5 mg/kg IV",
            "Sédation procédurale enfant : 1 mg/kg IV",
          ],
          notes: ["Surveillance capno pendant sédation procédurale"],
        },
      ],
    },
  },
  2: {
    prep: {
      preparations: [
        {
          titre: "ISR",
          mode: "bolus",
          tag: "PUR",
          prelever: "Ampoule 20 mg/10 mL (2 mg/mL) — administrer pur",
          concentration: "2 mg/mL",
          phase_doses: [{ label: "ISR", dose_kg: 0.3, unit: "mg" }],
          rows: [{ label: "Sujet âgé", value: "0,2 mg/kg" }],
          hide_final: true,
          etapes: [
            "Ampoule 20 mg/10 mL (2 mg/mL)",
            "Administrer pur",
            "ISR : 0,3 mg/kg IV en 30-60 sec",
            "Sujet âgé : 0,2 mg/kg",
          ],
          notes: ["Surveiller myoclonies, hypotension et insuffisance surrénale transitoire"],
        },
      ],
    },
  },
  3: {
    prep: {
      preparations: [
        {
          titre: "Bolus titré",
          mode: "bolus",
          population: "adulte",
          tag: "1 mg/mL pur",
          prelever: "Ampoule 5 mg/5 mL (1 mg/mL) — utiliser pure",
          concentration: "1 mg/mL",
          rows: [
            { label: "Sédation", value: "titration par bolus de 1-3 mg", highlight: true },
            { label: "EME", value: "10 mg IM ou IN (5 mg par narine)" },
          ],
          hide_final: true,
          etapes: [
            "Bolus titrés : ampoule 5 mg/5 mL (1 mg/mL) utilisée pure — pas de préparation",
            "EME : 10 mg IM ou IN : 5 mg dans chaque narine",
          ],
          notes: [
            "Dépression respiratoire dose-dépendante — avoir matériel IOT à portée",
            "Antagoniste : Flumazénil",
          ],
        },
        {
          titre: "PSE",
          mode: "pse",
          population: "adulte",
          tag: "1 mg/mL",
          prelever: "1 ampoule 50 mg/10 mL",
          completer: "50 mL avec NaCl 0,9%",
          concentration: "1 mg/mL",
          etapes: [
            "Ampoule 50 mg/10 mL (5 mg/mL)",
            "PSE : ampoule 50 mg/10 mL qsp 50 mL NaCl 0,9% → 1 mg/mL",
            "Débit 0,02-0,2 mg/kg/h — voir bloc « Débit PSE »",
          ],
          notes: ["Dépression respiratoire dose-dépendante — avoir matériel IOT à portée"],
        },
        {
          titre: "Enfant",
          mode: "ped",
          population: "enfant",
          tag: "IM / IN / IV",
          prelever: "Ampoule 5 mg/5 mL (1 mg/mL)",
          concentration: "1 mg/mL",
          phase_doses: [
            { label: "EME (IM)", dose_kg: 0.2, max: 10, unit: "mg", suffix: " IM" },
            { label: "Sédation (IV)", dose_kg: 0.05, dose_max_kg: 0.1, max: 6, unit: "mg" },
          ],
          hide_final: true,
          etapes: [
            "EME : 0,2 mg/kg IM (max 10 mg) ou 0,3 mg/kg IN",
            "Sédation : 0,05-0,1 mg/kg IV (max 6 mg)",
          ],
          notes: ["Dépression respiratoire dose-dépendante — avoir matériel IOT à portée"],
        },
      ],
    },
  },

  // CURARES
  9: {
    prep: {
      preparations: [
        {
          titre: "ISR adulte",
          mode: "bolus",
          population: "adulte",
          tag: "10 mg/mL",
          prelever: "2 mL d'ampoule 100 mg/2 mL (50 mg/mL)",
          completer: "10 mL avec NaCl 0,9%",
          concentration: "10 mg/mL",
          phase_doses: [{ label: "ISR", dose_kg: 1, unit: "mg" }],
          etapes: [
            "Ampoule 100 mg/2 mL (50 mg/mL)",
            "Diluer : 2 mL d'ampoule qsp 10 mL NaCl 0,9% → 10 mg/mL",
            "Posologie : 1 mg/kg IV bolus strict",
          ],
          notes: [
            "CI absolue : hyperkaliémie, brûlures > J3, para/tétraplégie",
            "Risque choc anaphylactique — avoir adrénaline à portée",
          ],
        },
        {
          titre: "ISR enfant",
          mode: "bolus",
          population: "enfant",
          tag: "10 mg/mL",
          prelever: "2 mL d'ampoule 100 mg/2 mL (50 mg/mL)",
          completer: "10 mL avec NaCl 0,9%",
          concentration: "10 mg/mL",
          phase_doses: [{ label: "ISR", dose_kg: 1.5, dose_max_kg: 2, unit: "mg" }],
          rows: [{ label: "Laryngospasme", value: "4 mg/kg IM (ampoule pure 50 mg/mL)" }],
          etapes: [
            "Ampoule 100 mg/2 mL (50 mg/mL)",
            "ISR : 1,5-2 mg/kg IV (dilué à 10 mg/mL)",
            "Laryngospasme : 4 mg/kg IM (produit pur)",
          ],
          notes: ["Risque choc anaphylactique — avoir adrénaline à portée"],
        },
      ],
    },
  },
  10: {
    prep: {
      preparations: [
        {
          titre: "ISR",
          mode: "bolus",
          tag: "10 mg/mL pur",
          prelever: "Ampoule 50 mg/5 mL (10 mg/mL) — administrer pure",
          concentration: "10 mg/mL",
          phase_doses: [{ label: "ISR", dose_kg: 1.2, unit: "mg" }],
          rows: [{ label: "Standard", value: "0,6 mg/kg IV" }],
          etapes: [
            "Ampoule 50 mg/5 mL (10 mg/mL) — administrer pure",
            "ISR : 1,2 mg/kg IV bolus strict",
            "Standard : 0,6 mg/kg IV",
          ],
          notes: [
            "TOUJOURS avoir Sugammadex disponible avant injection",
            "Conserver au réfrigérateur — ne pas secouer",
          ],
        },
      ],
    },
  },
  11: {
    prep: {
      preparations: [
        {
          titre: "Bolus adulte",
          mode: "bolus",
          population: "adulte",
          tag: "1 mg/mL",
          prelever: "10 mL d'ampoule 20 mg/10 mL (2 mg/mL)",
          completer: "20 mL avec NaCl 0,9%",
          concentration: "1 mg/mL",
          phase_doses: [{ label: "Bolus initial", dose_kg: 0.15, unit: "mg" }],
          etapes: [
            "Ampoule 20 mg/10 mL (2 mg/mL)",
            "Diluer : 10 mL d'ampoule qsp 20 mL NaCl 0,9% → 1 mg/mL",
            "Bolus initial : 0,15 mg/kg IV",
          ],
          notes: [
            "Pas d'hyperkaliémie",
            "Indication ≠ Célocurine : entretien de curarisation, pas l'ISR",
          ],
        },
        {
          titre: "Bolus enfant",
          mode: "bolus",
          population: "enfant",
          tag: "1 mg/mL",
          prelever: "10 mL d'ampoule 20 mg/10 mL (2 mg/mL)",
          completer: "20 mL avec NaCl 0,9%",
          concentration: "1 mg/mL",
          phase_doses: [{ label: "Bolus", dose_kg: 0.1, unit: "mg" }],
          etapes: [
            "Ampoule 20 mg/10 mL (2 mg/mL)",
            "Diluer : 10 mL d'ampoule qsp 20 mL NaCl 0,9% → 1 mg/mL",
            "Bolus enfant : 0,1 mg/kg IV",
          ],
          notes: ["Pas d'hyperkaliémie"],
        },
      ],
    },
  },

  // ANTIDOTES
  12: {
    prep: {
      preparations: [
        {
          titre: "CICO adulte",
          mode: "bolus",
          population: "adulte",
          tag: "100 mg/mL pur",
          prelever: "Flacon 200 mg/2 mL ou 500 mg/5 mL (100 mg/mL) — pur",
          concentration: "100 mg/mL",
          phase_doses: [{ label: "Urgence CICO", dose_kg: 16, unit: "mg" }],
          etapes: [
            "Flacon 200 mg/2 mL ou 500 mg/5 mL (100 mg/mL)",
            "Administrer pur en IVD",
            "Urgence CICO : 16 mg/kg",
          ],
          notes: ["Surveiller anaphylaxie, bradycardie et recurarisation si dose insuffisante"],
        },
        {
          titre: "Décurarisation enfant",
          mode: "bolus",
          population: "enfant",
          tag: "100 mg/mL pur",
          prelever: "Flacon 200 mg/2 mL ou 500 mg/5 mL (100 mg/mL) — pur",
          concentration: "100 mg/mL",
          phase_doses: [{ label: "Selon bloc", dose_kg: 4, dose_max_kg: 16, unit: "mg" }],
          etapes: [
            "Flacon 200 mg/2 mL ou 500 mg/5 mL (100 mg/mL)",
            "Pédiatrie : 4-16 mg/kg IV selon profondeur du bloc",
          ],
          notes: ["Surveiller anaphylaxie, bradycardie et recurarisation si dose insuffisante"],
        },
      ],
    },
  },

  // ANTIBIOTIQUES
  55: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "≥ 1h STRICT",
          phase_doses: [{ label: "Dose", dose_kg: 10, dose_max_kg: 15, unit: "mg" }],
          hide_phase_volume: true,
          dose_based_dilution: {
            threshold: 500,
            label: "Diluer",
            source: "phase",
            below_or_equal: "dans 100 mL NaCl 0,9%",
            above: "dans 250 mL NaCl 0,9%",
          },
          rows: [
            { label: "Reconstituer", value: "250 mg avec 10 mL EPPI ou NaCl 0,9%" },
            {
              label: "Perfuser",
              value: "≥ 1h STRICTEMENT (cristallurie si rapide)",
              highlight: true,
            },
          ],
          hide_final: true,
          etapes: [
            "Flacon poudre 250 mg — reconstituer avec 10 mL EPPI ou NaCl 0,9%",
            "Dose : 10-15 mg/kg /8h",
            "≤ 500 mg → 100 mL / > 500 mg → 250 mL NaCl 0,9%",
            "Perfuser en ≥ 1h STRICTEMENT",
          ],
          notes: [
            "PASSER SEUL — incompatible avec la plupart des médicaments",
            "Hydratation obligatoire pour prévenir la cristallurie rénale",
          ],
        },
        {
          titre: "IVL enfant",
          mode: "ped",
          population: "enfant",
          tag: "10-20 mg/kg /8h",
          phase_doses: [{ label: "Dose", dose_kg: 10, dose_max_kg: 20, unit: "mg" }],
          hide_phase_volume: true,
          dose_based_dilution: {
            threshold: 500,
            label: "Diluer",
            source: "phase",
            below_or_equal: "dans 100 mL NaCl 0,9%",
            above: "dans 250 mL NaCl 0,9%",
          },
          rows: [{ label: "Perfuser", value: "≥ 1h STRICTEMENT", highlight: true }],
          hide_final: true,
          etapes: [
            "Encéphalite : 10-20 mg/kg /8h",
            "Reconstituer 250 mg avec 10 mL EPPI ou NaCl 0,9%",
            "Perfuser en ≥ 1h STRICTEMENT",
          ],
          notes: [
            "PASSER SEUL — incompatible avec la plupart des médicaments",
            "Neurotoxicité si insuffisance rénale — adapter la dose",
          ],
        },
      ],
    },
  },
  56: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "20-30 min",
          rows: [
            { label: "1 g", value: "→ 50 mL NaCl 0,9%", highlight: true },
            { label: "2 g", value: "→ 100 mL NaCl 0,9%", highlight: true },
            { label: "Perfuser", value: "20-30 min" },
            { label: "Dose méningée", value: "200-300 mg/kg/j en 4-6 injections" },
          ],
          hide_final: true,
          etapes: [
            "Flacon poudre 1 g ou 2 g",
            "1 g dans 50 mL / 2 g dans 100 mL NaCl 0,9% — perfusion 20-30 min",
            "Dose méningée : 200-300 mg/kg/j en 4-6 injections",
          ],
          notes: ["Attention : risque d'arythmie si administration rapide sur cathéter central"],
        },
        {
          titre: "Dose méningée PSE",
          mode: "pse",
          population: "adulte",
          tag: "200-300 mg/kg/j",
          solvant: "NaCl 0,9%",
          duree: "PSE continu",
          stabilite: "Stable 24h à 25°C",
          phase_doses: [{ label: "Dose méningée/j", dose_kg: 0.2, dose_max_kg: 0.3, unit: "g" }],
          hide_phase_volume: true,
          rows: [
            { label: "6 g/j", value: "2 g/48 mL → 6 mL/h", highlight: true },
            { label: "12 g/j", value: "3 g/48 mL → 8 mL/h", highlight: true },
            { label: "14 g/j", value: "3 g/48 mL → 9,3 mL/h", highlight: true },
            { label: "16 g/j", value: "4 g/48 mL → 8 mL/h", highlight: true },
            { label: "20 g/j", value: "5 g/48 mL → 8 mL/h", highlight: true },
            { label: "24 g/j", value: "6 g/250 mL → 8 mL/h", highlight: true },
            { label: "Maximum", value: "6 g/48 mL" },
          ],
          hide_final: true,
          etapes: [
            "Dose méningée : 200-300 mg/kg/j (dose/j calculée ci-dessus selon le poids)",
            "Choisir la ligne g/j la plus proche pour la dilution et le débit",
            "6 g/j : 2 g/48 mL à 6 mL/h",
            "12 g/j : 3 g/48 mL à 8 mL/h",
            "14 g/j : 3 g/48 mL à 9,3 mL/h",
            "16 g/j : 4 g/48 mL à 8 mL/h",
            "20 g/j : 5 g/48 mL à 8 mL/h",
            "24 g/j : 6 g/250 mL à 8 mL/h — maximum 6 g/48 mL",
          ],
          notes: ["Vérifier la prescription et la stabilité locale avant préparation"],
        },
        {
          titre: "Dose/j enfant",
          mode: "ped",
          population: "enfant",
          tag: "50-300 mg/kg/j",
          phase_doses: [{ label: "Dose/j", dose_kg: 50, dose_max_kg: 300, unit: "mg" }],
          hide_phase_volume: true,
          rows: [
            { label: "Diluer", value: "dans NaCl 0,9%" },
            { label: "Perfuser", value: "20-30 min" },
            { label: "Fractionner", value: "4-6 injections/j" },
          ],
          hide_final: true,
          etapes: [
            "Dose pédiatrique : 50-300 mg/kg/j selon indication",
            "Diluer dans NaCl 0,9% — perfusion 20-30 min",
          ],
          notes: ["Attention : risque d'arythmie si administration rapide sur cathéter central"],
        },
      ],
    },
  },
  57: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "30 min",
          prelever: "1 à 2 g",
          completer: "100 mL avec NaCl 0,9% ou G5%",
          rows: [
            { label: "Perfuser", value: "en 30 min", highlight: true },
            { label: "Dose méningée", value: "2 g /12h" },
          ],
          hide_final: true,
          etapes: [
            "Flacon poudre 1 g ou 2 g — reconstituer puis diluer dans 100 mL NaCl/G5%",
            "Perfusion 30 min",
            "Dose méningée : 2 g /12h",
          ],
          notes: [
            "NE PAS PASSER avec une perfusion calcium IV (même ligne) — précipitation",
            "Stable seulement 3h après reconstitution",
          ],
        },
        {
          titre: "Enfant",
          mode: "ped",
          population: "enfant",
          tag: "selon indication",
          phase_doses: [
            { label: "Méningite — dose/j", dose_kg: 100, max: 4000, unit: "mg" },
            { label: "Inf. courantes — dose/j", dose_kg: 50, dose_max_kg: 75, unit: "mg" },
          ],
          hide_phase_volume: true,
          rows: [{ label: "Perfuser", value: "en 30 min", highlight: true }],
          hide_final: true,
          etapes: [
            "Méningite : 100 mg/kg/j en 1-2 injections (max 4 g/j)",
            "Infections courantes : 50-75 mg/kg/j",
            "Diluer dans 100 mL NaCl 0,9% ou G5% — perfusion 30 min",
          ],
          notes: ["NE PAS PASSER avec une perfusion calcium IV (même ligne) — précipitation"],
        },
      ],
    },
  },
  58: {
    prep: {
      preparations: [
        {
          titre: "Dose/j adulte",
          mode: "ivl",
          population: "adulte",
          tag: "dose unique/j",
          phase_doses: [{ label: "Dose/j", dose_kg: 5, dose_max_kg: 8, unit: "mg" }],
          hide_phase_volume: true,
          dose_based_dilution: {
            threshold: 500,
            label: "Diluer",
            source: "phase",
            below_or_equal: "dans 50 mL NaCl 0,9% ou G5%",
            above: "dans 100 mL (Cmax 10 mg/mL)",
          },
          rows: [{ label: "Perfuser", value: "en 30 min", highlight: true }],
          hide_final: true,
          etapes: [
            "Flacon 40 mg, 80 mg ou 160 mg",
            "Dose : 5-8 mg/kg/j IV (dose unique)",
            "≤ 500 mg → 50 mL / > 500 mg → 100 mL — perfusion 30 min",
          ],
          notes: [
            "Néphrotoxique et ototoxique — surveillance créatinine",
            "Pic sérique > 10 mg/L (efficacité) — résiduelle non détectable (sécurité)",
          ],
        },
        {
          titre: "Dose/j enfant",
          mode: "ped",
          population: "enfant",
          tag: "dose unique/j",
          phase_doses: [{ label: "Dose/j", dose_kg: 4, dose_max_kg: 7, unit: "mg" }],
          hide_phase_volume: true,
          dose_based_dilution: {
            threshold: 500,
            label: "Diluer",
            source: "phase",
            below_or_equal: "dans 50 mL NaCl 0,9% ou G5%",
            above: "dans 100 mL (Cmax 10 mg/mL)",
          },
          rows: [{ label: "Perfuser", value: "en 30 min", highlight: true }],
          hide_final: true,
          etapes: [
            "Dose enfant : 4-7 mg/kg/j IV (dose unique)",
            "Diluer selon dose — perfusion 30 min",
          ],
          notes: ["Néphrotoxique et ototoxique — surveillance créatinine"],
        },
      ],
    },
  },
  63: {
    prep: {
      preparations: [
        {
          titre: "Charge adulte",
          mode: "ivl",
          population: "adulte",
          tag: "≥ 2h",
          phase_doses: [{ label: "Charge", dose_kg: 25, dose_max_kg: 30, unit: "mg" }],
          hide_phase_volume: true,
          rows: [
            { label: "Entretien", value: "15-20 mg/kg /8-12h (cible AUC)" },
            { label: "500 mg", value: "→ 100 mL", highlight: true },
            { label: "1 g", value: "→ 250 mL (100 mL sur KTC)", highlight: true },
            { label: "Perfuser", value: "charge ≥ 2h, entretien 60 min mini" },
          ],
          hide_final: true,
          etapes: [
            "Flacon poudre 500 mg ou 1 g",
            "Charge : 25-30 mg/kg IV sur 2-3h",
            "500 mg → 100 mL / 1 g → 250 mL NaCl 0,9% ou G5% (100 mL sur KTC)",
            "Entretien : 15-20 mg/kg /8-12h",
          ],
          notes: [
            "Injecter lentement — Red Man Syndrome si trop rapide",
            "Monitorage TDM obligatoire : résiduelle 15-25 mg/L",
          ],
        },
        {
          titre: "Enfant",
          mode: "ped",
          population: "enfant",
          tag: "15 mg/kg /6h",
          phase_doses: [{ label: "Dose", dose_kg: 15, unit: "mg" }],
          hide_phase_volume: true,
          rows: [{ label: "Perfuser", value: "sur 60 min", highlight: true }],
          hide_final: true,
          etapes: [
            "Dose enfant : 15 mg/kg /6h IV sur 60 min",
            "Diluer selon dose (500 mg → 100 mL, 1 g → 250 mL)",
          ],
          notes: ["Injecter lentement — Red Man Syndrome si trop rapide"],
        },
      ],
    },
  },

  // ── Conversions v2 — formes « etapes seules » (Lot 3) ──────────────
  // Recettes statiques : rows/prelever/completer repris verbatim des etapes
  // source. Split adulte/enfant uniquement si la source distingue.

  // ANALGÉSIE
  7: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "15-20 min",
          prelever: "1 ampoule 20 mg/2 mL (10 mg/mL)",
          completer: "100 mL avec G5% (privilégié) ou NaCl 0,9%",
          rows: [
            { label: "Perfuser", value: "sur 15-20 min", highlight: true },
            { label: "Répéter", value: "/4-6h (max 120 mg/j)" },
          ],
          hide_final: true,
          etapes: [
            "Ampoule 20 mg/2 mL (10 mg/mL)",
            "Diluer 1 ampoule dans 100 mL G5% ou NaCl 0,9%",
            "Perfuser sur 15-20 min",
            "Répéter /4-6h si besoin (max 120 mg/j)",
          ],
          notes: ["Privilégier G5% si possible", "Surveiller tachycardie, HTA, nausées"],
        },
        {
          titre: "Enfant",
          population: "enfant",
          empty: true,
          tag: "—",
          note: "Non recommandé < 15 ans",
        },
      ],
    },
  },

  // ANTIDOTES
  30: {
    prep: {
      preparations: [
        {
          titre: "PSE adulte",
          mode: "pse",
          population: "adulte",
          tag: "1-5 mg/h",
          prelever: "Nombre d'ampoules pour 4h (1 mg lyophilisé chacune)",
          completer: "24 mL avec G5%",
          rows: [
            {
              label: "Débit usuel",
              value: "1 à 5 mg/h (4 à 20 ampoules/seringue)",
              highlight: true,
            },
            { label: "Hypoglycémie", value: "1 mg SC ou IM" },
          ],
          hide_final: true,
          etapes: [
            "Flacon 1 mg poudre + seringue solvant 1 mL EPPI — reconstituer extemporanément",
            "Intox bêtabloquants : bolus 1-5 mg IV lent",
            "PSE : ampoules qsp 24 mL G5% (1-5 mg/h)",
          ],
          notes: [
            "Reconstitution obligatoire extemporanée — ne pas préparer à l'avance",
            "Conserver au réfrigérateur (boîte déchocage)",
          ],
        },
        {
          titre: "Hypoglycémie enfant",
          mode: "ped",
          population: "enfant",
          tag: "SC / IM",
          rows: [
            { label: "< 25 kg", value: "0,5 mg SC/IM", highlight: true },
            { label: "≥ 25 kg", value: "1 mg SC/IM", highlight: true },
          ],
          hide_final: true,
          etapes: [
            "Flacon 1 mg poudre — reconstituer avec le solvant fourni",
            "< 25 kg : 0,5 mg SC/IM",
            "≥ 25 kg : 1 mg SC/IM",
          ],
          notes: ["Reconstitution obligatoire extemporanée — ne pas préparer à l'avance"],
        },
      ],
    },
  },

  // NEUROLOGIE
  33: {
    prep: {
      preparations: [
        {
          titre: "IVD adulte",
          mode: "bolus",
          population: "adulte",
          tag: "1-2 mg",
          prelever: "Ampoule 1 mg/1 mL — à reconstituer avec son solvant",
          rows: [
            { label: "Injecter", value: "1-2 mg IV lente sur 2 min", highlight: true },
            { label: "Voie", value: "IM possible selon indication" },
          ],
          hide_final: true,
          etapes: [
            "Ampoule 1 mg/1 mL",
            "Reconstituer avec le solvant fourni",
            "Adulte : 1-2 mg IV lente sur 2 min",
          ],
          notes: [
            "Ne pas administrer sans reconstitution par son solvant",
            "Surveiller dépression respiratoire",
          ],
        },
        {
          titre: "IVD enfant",
          mode: "bolus",
          population: "enfant",
          tag: "0,05-0,1 mg/kg max 1 mg",
          prelever: "Ampoule 1 mg/1 mL — à reconstituer avec son solvant",
          concentration: "1 mg/mL",
          phase_doses: [{ label: "Injecter", dose_kg: 0.05, dose_max_kg: 0.1, max: 1, unit: "mg" }],
          hide_final: true,
          etapes: [
            "Ampoule 1 mg/1 mL — reconstituer avec le solvant fourni",
            "Enfant : 0,05-0,1 mg/kg IV lente (max 1 mg/dose)",
          ],
          notes: ["Surveiller dépression respiratoire"],
        },
      ],
    },
  },

  // ÉLECTROLYTES
  38: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "10 min",
          prelever: "1 ampoule 1 g/10 mL (10%)",
          completer: "50 ou 100 mL avec NaCl 0,9%",
          rows: [{ label: "Perfuser", value: "sur 10 min sous scope", highlight: true }],
          hide_final: true,
          etapes: [
            "Ampoule 1 g/10 mL à 10%",
            "Reconstituer dans 50 mL ou 100 mL NaCl 0,9%",
            "Perfuser en 10 min IV lent sous scope",
          ],
          notes: [
            "Ne pas mélanger avec bicarbonates (précipitation)",
            "Surveillance scope : bradycardie si injection trop rapide",
          ],
        },
        {
          titre: "IVL enfant",
          mode: "ped",
          population: "enfant",
          tag: "100 mg/kg",
          phase_doses: [{ label: "Dose", dose_kg: 100, unit: "mg" }],
          hide_phase_volume: true,
          completer: "50 ou 100 mL avec NaCl 0,9%",
          rows: [{ label: "Perfuser", value: "IV lente sous scope", highlight: true }],
          hide_final: true,
          etapes: [
            "Ampoule 1 g/10 mL à 10%",
            "Enfant : 100 mg/kg IV lente",
            "Diluer dans NaCl 0,9% — perfusion lente sous scope",
          ],
          notes: [
            "Ne pas mélanger avec bicarbonates (précipitation)",
            "Surveillance scope : bradycardie si injection trop rapide",
          ],
        },
      ],
    },
  },

  // MÉTABOLIQUE
  46: {
    prep: {
      preparations: [
        {
          titre: "IVD adulte",
          mode: "bolus",
          population: "adulte",
          tag: "PUR",
          prelever: "1 à 2 ampoules 3 g/10 mL (= 3-6 g)",
          rows: [
            { label: "Administrer", value: "pur en bolus IV lent", highlight: true },
            { label: "Contrôle", value: "glycémie à 15 min" },
            { label: "Rincer", value: "après injection (veinotoxique)" },
          ],
          hide_final: true,
          etapes: [
            "Ampoule 10 mL à 30% = 3 g glucose",
            "Adulte : prélever 1–2 ampoules (10–20 mL) et administrer pur",
            "Contrôler glycémie à 15 min — bien rincer après injection",
          ],
          notes: [
            "Veinotoxique : bien rincer après injection",
            "Extravasation : nécrose tissulaire — s'assurer de l'accès veineux",
          ],
        },
        {
          titre: "Enfant",
          mode: "ped",
          population: "enfant",
          tag: "0,3-0,5 g/kg",
          rows: [
            { label: "Dose", value: "0,3-0,5 g/kg IV (G10% ou G30% dilué)", highlight: true },
            { label: "Nourrisson", value: "G10% 2-5 mL/kg" },
          ],
          hide_final: true,
          etapes: [
            "Enfant : 0,3-0,5 g/kg IV (G10% ou G30% dilué)",
            "Nourrisson : G10% 2-5 mL/kg",
            "Enfant : diluer à G10% (1 vol G30% + 2 vol eau PPI)",
          ],
          notes: ["Veinotoxique : bien rincer après injection"],
        },
      ],
    },
  },
  48: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "10 mg /8h",
          prelever: "1 ampoule 10 mg/2 mL — administrer pur",
          hide_final: true,
          etapes: [
            "Ampoule 10 mg/2 mL",
            "Administrer pur en IV lente",
            "Peut se diluer qsp 10 mL NaCl 0,9%",
            "10 mg IV lente /8h",
          ],
          notes: ["Surveiller syndrome extrapyramidal et somnolence"],
        },
        {
          titre: "Enfant",
          population: "enfant",
          empty: true,
          tag: "—",
          note: "Non recommandé < 18 ans",
        },
      ],
    },
  },

  // ANTIBIOTIQUES
  53: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "30-60 min (max 1h)",
          prelever: "1 à 2 g (amoxicilline)",
          completer: "100 mL avec NaCl 0,9% STRICT",
          rows: [{ label: "Perfuser", value: "30-60 min — NE PAS DÉPASSER 1h", highlight: true }],
          hide_final: true,
          etapes: [
            "Flacon poudre IV 1 g amoxicilline/200 mg clavulanate",
            "1-2 g dans 100 mL NaCl 0,9% STRICT — perfusion 30-60 min",
          ],
          notes: [
            "NaCl 0,9% UNIQUEMENT — incompatible G5%",
            "Ne pas dépasser 1h de perfusion (problème de stabilité)",
          ],
        },
        {
          titre: "Dose/j enfant",
          mode: "ped",
          population: "enfant",
          tag: "30 mg/kg/j",
          phase_doses: [{ label: "Dose/j", dose_kg: 30, unit: "mg" }],
          hide_phase_volume: true,
          rows: [
            { label: "Fractionner", value: "3 injections IV/j", highlight: true },
            { label: "Diluer", value: "NaCl 0,9% STRICT" },
          ],
          hide_final: true,
          etapes: [
            "Enfant : 30 mg/kg/j en 3 injections IV",
            "Diluer dans NaCl 0,9% STRICT — perfusion 30-60 min",
          ],
          notes: ["NaCl 0,9% UNIQUEMENT — incompatible G5%"],
        },
      ],
    },
  },
  59: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "flacon prêt",
          rows: [
            { label: "250 mg/50 mL", value: "→ perfusion 30 min", highlight: true },
            { label: "500 mg/100 mL", value: "→ perfusion 60 min", highlight: true },
            { label: "Dose", value: "500 mg /24h ou /12h selon indication" },
          ],
          hide_final: true,
          etapes: [
            "Flacon prêt 250 mg/50 mL ou 500 mg/100 mL — ne pas diluer davantage",
            "Perfusion 30 min (250 mg) ou 60 min (500 mg)",
            "Ne pas mélanger avec d'autres médicaments",
          ],
          notes: [
            "Allongement QTc — ECG si facteur de risque",
            "Tendinopathie et rupture tendineuse — arrêter au moindre signe",
          ],
        },
        {
          titre: "Enfant",
          population: "enfant",
          empty: true,
          tag: "—",
          note: "Non recommandé < 18 ans (tendinopathie)",
        },
      ],
    },
  },
  60: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "500 mg /8h",
          rows: [
            { label: "Flacon prêt", value: "500 mg/100 mL", highlight: true },
            { label: "Perfuser", value: "30-60 min" },
          ],
          hide_final: true,
          etapes: [
            "Flacon prêt 500 mg/100 mL — ne pas diluer davantage",
            "Perfusion 30 min",
            "Dose : 500 mg /8h — à l'abri de la lumière",
          ],
          notes: [
            "Réaction antabuse si alcool — prévenir le patient",
            "Goût métallique : informer le patient (normal)",
          ],
        },
        {
          titre: "Dose enfant",
          mode: "ped",
          population: "enfant",
          tag: "7,5 mg/kg /8h",
          phase_doses: [{ label: "Dose", dose_kg: 7.5, max: 500, unit: "mg" }],
          hide_phase_volume: true,
          rows: [{ label: "Rythme", value: "/8h (max 500 mg/dose)", highlight: true }],
          hide_final: true,
          etapes: ["Enfant : 7,5 mg/kg IV /8h (max 500 mg/dose)", "Flacon prêt 500 mg/100 mL"],
          notes: ["Réaction antabuse si alcool — prévenir le patient"],
        },
      ],
    },
  },
  61: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "4 g /6-8h",
          prelever: "Flacon 4 g pip/500 mg tazo — dissoudre avec 20 mL EPPI",
          completer: "100 mL avec NaCl 0,9%",
          rows: [
            {
              label: "Perfuser",
              value: "30-60 min (4h prolongée si Pseudomonas)",
              highlight: true,
            },
          ],
          hide_final: true,
          etapes: [
            "Flacon poudre 4 g pip/500 mg tazo",
            "Reconstituer avec 20 mL EPPI puis diluer dans 100 mL NaCl 0,9%",
            "Perfusion 30-60 min (ou perfusion prolongée 4h si Pseudomonas)",
          ],
          notes: [
            "Hypokaliémie possible (apport sodé) — surveiller ionogramme",
            "Incompatibilités nombreuses — rincer la ligne avant/après",
          ],
        },
        {
          titre: "Dose/j enfant",
          mode: "ped",
          population: "enfant",
          tag: "100 mg/kg/j (pip)",
          phase_doses: [{ label: "Dose/j pip", dose_kg: 100, unit: "mg" }],
          hide_phase_volume: true,
          rows: [{ label: "Fractionner", value: "3-4 injections/j", highlight: true }],
          hide_final: true,
          etapes: [
            "Enfant : 100 mg/kg/j de pipéracilline en 3-4 injections",
            "Reconstituer puis diluer dans NaCl 0,9%",
          ],
          notes: ["Incompatibilités nombreuses — rincer la ligne avant/après"],
        },
      ],
    },
  },
  62: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "60 min",
          rows: [
            { label: "1,5 MUI", value: "→ 100 mL G5% STRICT", highlight: true },
            { label: "3 MUI", value: "→ 250 mL G5% STRICT", highlight: true },
            { label: "Perfuser", value: "60 min" },
          ],
          hide_final: true,
          etapes: [
            "Flacon poudre 1,5 MUI ou 3 MUI",
            "Reconstituer puis diluer dans 100 mL (1,5 MUI) ou 250 mL (3 MUI) G5% STRICT",
            "Perfusion 60 min — NE PAS UTILISER NaCl 0,9%",
          ],
          notes: [
            "G5% STRICT — incompatible NaCl 0,9%",
            "Utilisation immédiate après reconstitution",
          ],
        },
        {
          titre: "Dose/j enfant",
          mode: "ped",
          population: "enfant",
          tag: "150 000 UI/kg/j",
          phase_doses: [{ label: "Dose/j", dose_kg: 150000, unit: "UI" }],
          rows: [{ label: "Fractionner", value: "2-3 injections/j", highlight: true }],
          hide_final: true,
          etapes: [
            "Enfant : 150 000 UI/kg/j en 2-3 injections",
            "Diluer dans G5% STRICT — perfusion 60 min",
          ],
          notes: ["G5% STRICT — incompatible NaCl 0,9%"],
        },
      ],
    },
  },

  // PNEUMOLOGIE (nébulisation — distinction par âge)
  74: {
    prep: {
      preparations: [
        {
          titre: "Nébulisation adulte",
          mode: "ivl",
          population: "adulte",
          tag: "5 mg",
          prelever: "1 ampoule 5 mg/2 mL",
          completer: "qsp 5 mL avec NaCl 0,9% + Ipratropium 0,5 mg",
          rows: [
            { label: "Administrer", value: "nébulisé sous O₂ 6 L/min", highlight: true },
            { label: "Renouveler", value: "1 fois si pas d'amélioration" },
          ],
          hide_final: true,
          etapes: [
            "Ampoule 5 mg/2 mL solution pour nébulisation",
            "Associer Ipratropium 0,5 mg — compléter qsp 5 mL avec NaCl 0,9%",
            "Nébuliser sous O₂ 6 L/min",
          ],
          notes: [
            "À renouveler 1 fois en l'absence d'amélioration",
            "Surveiller tachycardie et hypokaliémie",
          ],
        },
        {
          titre: "Nébulisation enfant",
          mode: "ped",
          population: "enfant",
          tag: "selon âge",
          rows: [
            { label: "< 6 ans", value: "2,5 mg + Ipratropium 0,25 mg", highlight: true },
            { label: "≥ 6 ans", value: "5 mg + Ipratropium 0,5 mg", highlight: true },
            { label: "Administrer", value: "nébulisé sous O₂ 6 L/min" },
          ],
          hide_final: true,
          etapes: [
            "< 6 ans : 2,5 mg en nébulisation + Ipratropium 0,25 mg",
            "≥ 6 ans : 5 mg en nébulisation + Ipratropium 0,5 mg",
            "Nébuliser sous O₂ 6 L/min",
          ],
          notes: ["À renouveler selon l'âge si pas d'amélioration"],
        },
      ],
    },
  },
  75: {
    prep: {
      preparations: [
        {
          titre: "Nébulisation adulte",
          mode: "ivl",
          population: "adulte",
          tag: "0,5 mg",
          prelever: "1 ampoule 0,5 mg/2 mL",
          completer: "qsp 5 mL avec NaCl 0,9% + Terbutaline 5 mg",
          rows: [{ label: "Administrer", value: "nébulisé sous O₂ 6 L/min", highlight: true }],
          hide_final: true,
          etapes: [
            "Ampoule 0,5 mg/2 mL solution pour nébulisation",
            "Associer Terbutaline 5 mg — compléter qsp 5 mL avec NaCl 0,9%",
            "Nébuliser sous O₂ 6 L/min",
          ],
          notes: [
            "Voie nébulisation à privilégier",
            "Protéger les yeux si risque de contact oculaire",
          ],
        },
        {
          titre: "Nébulisation enfant",
          mode: "ped",
          population: "enfant",
          tag: "selon âge",
          rows: [
            { label: "< 6 ans", value: "0,25 mg en nébulisation", highlight: true },
            { label: "≥ 6 ans", value: "0,5 mg en nébulisation", highlight: true },
            { label: "Administrer", value: "nébulisé sous O₂ 6 L/min" },
          ],
          hide_final: true,
          etapes: [
            "< 6 ans : 0,25 mg en nébulisation",
            "≥ 6 ans : 0,5 mg en nébulisation",
            "Nébuliser sous O₂ 6 L/min",
          ],
          notes: ["Protéger les yeux si risque de contact oculaire"],
        },
      ],
    },
  },

  // PRODUITS SANGUINS
  72: {
    prep: {
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "flacon prêt",
          rows: [
            { label: "PBS", value: "1,5 g/kg albumine 20% J1, puis 1 g/kg J3", highlight: true },
            { label: "Cirrhotique", value: "1 g/kg/j albumine 20%", highlight: true },
            { label: "Appel d'air", value: "obligatoire (flacon en verre)" },
          ],
          hide_final: true,
          etapes: [
            "Flacon prêt à l'emploi (4% 250 mL ou 20% 50/100 mL)",
            "Appel d'air obligatoire (flacon en verre)",
            "PBS : 1,5 g/kg albumine 20% J1, puis 1 g/kg J3",
            "Cirrhotique : 1 g/kg/j albumine 20%",
          ],
          notes: [
            "Médicament dérivé du sang : traçabilité obligatoire",
            "Surveiller surcharge volémique",
          ],
        },
        {
          titre: "Enfant",
          mode: "ped",
          population: "enfant",
          tag: "0,5-1 g/kg",
          rows: [
            { label: "Dose", value: "0,5-1 g/kg IV selon indication", highlight: true },
            { label: "Appel d'air", value: "obligatoire (flacon en verre)" },
          ],
          hide_final: true,
          etapes: [
            "Flacon prêt à l'emploi",
            "Enfant : 0,5-1 g/kg IV selon indication",
            "Appel d'air obligatoire (flacon en verre)",
          ],
          notes: ["Médicament dérivé du sang : traçabilité obligatoire"],
        },
      ],
    },
  },

  // ── Conversions v2 — cas particuliers (Lot 4) ──────────────────────

  // MANNITOL 20% — pur 0,2 g/mL ; volume calculé via unit "g" (extension calc).
  68: {
    prep: {
      conc_produit: 0.2,
      preparations: [
        {
          titre: "IVL adulte",
          mode: "ivl",
          population: "adulte",
          tag: "PUR 0,2 g/mL",
          prelever: "Flacon mannitol 20% (0,2 g/mL) — administrer pur",
          concentration: "0,2 g/mL",
          phase_doses: [{ label: "HTIC", dose_kg: 0.25, dose_max_kg: 1, unit: "g" }],
          rows: [
            { label: "Perfuser", value: "sur 20-30 min", highlight: true },
            { label: "Engagement", value: "1 g/kg IV rapide" },
          ],
          hide_final: true,
          etapes: [
            "Flacon de mannitol 20% = 0,2 g/mL — administrer pur par voie IV",
            "HTIC : 0,25-1 g/kg sur 20-30 min",
            "Engagement cérébral : 1 g/kg IV rapide",
          ],
          notes: [
            "Surveiller diurèse, osmolalité et fonction rénale",
            "Éviter si osmolalité > 320 mosmol/kg",
          ],
        },
        {
          titre: "IVL enfant",
          mode: "ped",
          population: "enfant",
          tag: "0,5-1 g/kg",
          prelever: "Flacon mannitol 20% (0,2 g/mL) — administrer pur",
          concentration: "0,2 g/mL",
          phase_doses: [{ label: "Dose", dose_kg: 0.5, dose_max_kg: 1, unit: "g" }],
          rows: [{ label: "Perfuser", value: "sur 20-30 min", highlight: true }],
          hide_final: true,
          etapes: ["Flacon de mannitol 20% = 0,2 g/mL", "Enfant : 0,5-1 g/kg IV sur 20-30 min"],
          notes: ["Surveiller diurèse, osmolalité et fonction rénale"],
        },
      ],
    },
  },

  // OCTAPLEX (CCP) — PSE débit-volume ; doses UI/kg par INR (commune adulte/enfant).
  73: {
    prep: {
      preparations: [
        {
          titre: "PSE — reconstitué",
          mode: "pse",
          tag: "UI/kg selon INR",
          prelever: "Flacon lyophilisé + solvant fourni — reconstituer",
          phase_doses: [
            { label: "AVK · INR 2-3,9", dose_kg: 25, unit: "UI" },
            { label: "AVK · INR 4-6", dose_kg: 35, unit: "UI" },
            { label: "AVK · INR > 6", dose_kg: 50, max: 3000, unit: "UI" },
            { label: "AOD", dose_kg: 50, unit: "UI" },
          ],
          rows: [
            {
              label: "Débit PSE",
              value: "0,12 mL/kg/min · max 8 mL/min (480 mL/h)",
              highlight: true,
            },
            { label: "Si AVK", value: "associer Vitamine K1 10 mg IV" },
          ],
          hide_final: true,
          etapes: [
            "Flacon lyophilisé + solvant fourni — reconstituer la poudre",
            "Administrer en PSE",
            "AVK INR 2-3,9 : 25 UI/kg ; INR 4-6 : 35 UI/kg ; INR > 6 : 50 UI/kg (max 3000 UI)",
            "AOD : 50 UI/kg",
          ],
          notes: [
            "Traçabilité obligatoire — documents à envoyer à la pharmacie",
            "Débit PSE : 0,12 mL/kg/min, maximum 8 mL/min (480 mL/h)",
            "Si AVK : associer Vitamine K1 10 mg IV",
          ],
        },
      ],
    },
  },

  // NALBUPHINE — recette adulte (solution diluée 1 mg/mL) ; enfant = pedTable
  // pédiatrique (survit à la fusion). conc_produit override = 1 (solution diluée).
  80: {
    prep: {
      conc_produit: 1,
      preparations: [
        {
          titre: "IVL adulte",
          mode: "bolus",
          population: "adulte",
          tag: "0,2 mg/kg",
          prelever: "1 ampoule 20 mg/2 mL",
          completer: "20 mL avec NaCl 0,9%",
          concentration: "1 mg/mL",
          phase_doses: [{ label: "Injecter", dose_kg: 0.2, unit: "mg" }],
          rows: [
            { label: "Durée", value: "IVL sur 2-3 min", highlight: true },
            { label: "Répéter", value: "/4-6h si besoin (max 160 mg/j)" },
          ],
          hide_final: true,
          etapes: [
            "Ampoule 20 mg/2 mL (10 mg/mL)",
            "Dilution : 1 ampoule 20 mg qsp 20 mL NaCl 0,9% → 1 mg/mL",
            "Injecter 0,2 mg/kg IVL sur 2-3 min",
          ],
          notes: [
            "NON stupéfiant (liste I) — pas de cahier des stups",
            "Effet plafond : ne pas associer à un agoniste µ pur (antagonisme)",
            "Antagoniste : Naloxone",
          ],
        },
      ],
    },
  },
};
