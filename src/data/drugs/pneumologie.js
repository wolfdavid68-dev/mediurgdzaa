// ============================================================
// MediURG — Catégorie : Pneumologie
// 3 médicaments.
// Auto-extrait de drugs.js (split par catégorie).
// ============================================================

export const DRUGS_PNEUMOLOGIE = [
  {
    id: 44,
    nom: "VENTOLINE",
    commercial: "Salbutamol",
    dci: "Salbutamol",
    classe: "β2-mimétique bronchodilatateur",
    cat: "Pneumologie",
    svc: ["SAUV", "SMUR", "SAU"],
    couleur: "#64D2FF",
    icon: "🫁",
    desc: "Bronchodilatateur β2-agoniste sélectif. En IV : traitement des bronchospasmes réfractaires. Surveillance hémodynamique rapprochée.",
    indic: [
      "Asthme aigu grave",
      "BPCO exacerbée avec bronchospasme",
      "Bronchospasme per-anesthésique",
      "Hyperkaliémie (transfert intracellulaire K+)",
    ],
    ci: ["Tachycardie sévère (relative)", "Thyrotoxicose (relative)"],
    ei: ["Tachycardie, palpitations", "Tremblements", "Hypokaliémie (nébulisations répétées)"],
    cond: ["Ampoule 5 mg/5 mL"],
    poso: {
      a: [
        "PSE : 1 ampoule dans 50 mL (soit 0,1 mg/mL)",
        "Débit : 0,1-0,2 µg/kg/min",
        "Asthme aigu : 5 mg nébulisé /20 min × 3",
        "Voies : VVP ou VVC",
      ],
      p: ["2,5-5 mg nébulisé selon poids", "PSE : 0,1-0,3 µg/kg/min"],
    },
  },
  {
    id: 74,
    nom: "BRICANYL",
    commercial: "Terbutaline",
    dci: "Terbutaline sulfate",
    classe: "β2-mimétique bronchodilatateur",
    cat: "Pneumologie",
    svc: ["SAUV", "SMUR", "SAU"],
    couleur: "#64D2FF",
    icon: "🫁",
    desc: "Bronchodilatateur β2-agoniste sélectif. Utilisé en nébulisation pour l'asthme aigu et l'exacerbation de BPCO. Administrer sous oxygène 6 L/min. À associer à l'ipratropium.",
    indic: [
      "Asthme aigu grave (nébulisation)",
      "Exacerbation sévère de BPCO",
      "Bronchospasme réfractaire",
    ],
    ci: ["Allergie aux β2-agonistes (rare)", "Tachycardie sévère (relative)"],
    ei: [
      "Tachycardie, palpitations",
      "Tremblements fins des extrémités",
      "Hypokaliémie (nébulisations répétées)",
      "Céphalées",
    ],
    cond: ["Ampoule 5 mg/2 mL (solution pour nébulisation)", "Ampoule 2,5 mg/2,5 mL (pédiatrique)"],
    poso: {
      a: [
        "Nébulisation : 5 mg + Ipratropium 0,5 mg + NaCl 0,9 % QSP 5 mL sous O₂ 6 L/min",
        "À renouveler 1 fois en l'absence d'amélioration",
        "Voie : nébulisation sous O₂",
      ],
      p: [
        "< 6 ans : 2,5 mg en nébulisation + Ipratropium 0,25 mg",
        "≥ 6 ans : 5 mg en nébulisation + Ipratropium 0,5 mg",
        "À renouveler selon l'âge si pas d'amélioration",
      ],
    },
  },
  {
    id: 75,
    nom: "ATROVENT",
    commercial: "Ipratropium",
    dci: "Bromure d'ipratropium",
    classe: "Anticholinergique bronchodilatateur",
    cat: "Pneumologie",
    svc: ["SAUV", "SMUR", "SAU"],
    couleur: "#64D2FF",
    icon: "🫁",
    desc: "Bronchodilatateur anticholinergique. Bloque les récepteurs muscariniques bronchiques. Synergie avec les β2-agonistes. Début d'action plus lent (15-30 min) mais durée plus longue (4-6h).",
    indic: [
      "Asthme aigu (en association avec β2-agoniste)",
      "Exacerbation sévère de BPCO",
      "Bronchospasme chez le sujet âgé ou BPCO",
    ],
    ci: [
      "Glaucome à angle fermé (relative — nébulisation)",
      "Rétention urinaire sur adénome prostatique (relative)",
    ],
    ei: [
      "Sécheresse buccale",
      "Tachycardie sinusale",
      "Vision trouble si contact oculaire (protéger les yeux)",
    ],
    cond: [
      "Ampoule 0,5 mg/2 mL (adulte — solution pour nébulisation)",
      "Ampoule 0,25 mg/1 mL (enfant — solution pour nébulisation)",
    ],
    poso: {
      a: [
        "Nébulisation : 0,5 mg + Terbutaline 5 mg + NaCl 0,9 % QSP 5 mL sous O₂ 6 L/min",
        "Voie : nébulisation sous O₂",
      ],
      p: ["< 6 ans : 0,25 mg en nébulisation", "≥ 6 ans : 0,5 mg en nébulisation"],
    },
  },
];
