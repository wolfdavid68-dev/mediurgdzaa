// Échelles cliniques d'évaluation utilisées en SAU / réa.
//
// Chaque échelle a un `type` :
// - "sum"         : plusieurs items, chaque item a des options scorées, total = somme
// - "single-pick" : une seule sélection sur une échelle (ex: RASS = un seul niveau)
//
// `interpret(total)` retourne { severity, color } pour afficher un badge de
// gravité à côté du score total.

export const SCALES = [
  {
    id: "glasgow",
    nom: "Glasgow Coma Scale (GCS)",
    icon: "🧠",
    description:
      "Évaluation du niveau de conscience. Total 3-15 — un score ≤ 8 définit le coma et indique souvent une protection des voies aériennes.",
    type: "sum",
    items: [
      {
        label: "Ouverture des yeux (E)",
        options: [
          { score: 4, label: "Spontanée" },
          { score: 3, label: "Au bruit" },
          { score: 2, label: "À la douleur" },
          { score: 1, label: "Aucune" },
        ],
      },
      {
        label: "Réponse verbale (V)",
        options: [
          { score: 5, label: "Orientée" },
          { score: 4, label: "Confuse" },
          { score: 3, label: "Mots inappropriés" },
          { score: 2, label: "Sons incompréhensibles" },
          { score: 1, label: "Aucune" },
        ],
      },
      {
        label: "Réponse motrice (M)",
        options: [
          { score: 6, label: "Aux ordres" },
          { score: 5, label: "Orientée à la douleur" },
          { score: 4, label: "Évitement" },
          { score: 3, label: "Décortication (flexion)" },
          { score: 2, label: "Décérébration (extension)" },
          { score: 1, label: "Aucune" },
        ],
      },
    ],
    interpret: (total) => {
      if (total >= 13) return { severity: "Mineur (13-15)", color: "#16a34a" };
      if (total >= 9) return { severity: "Modéré (9-12)", color: "#f97316" };
      return { severity: "Sévère / Coma (3-8)", color: "#dc2626" };
    },
  },

  {
    id: "rass",
    nom: "RASS (Richmond Agitation-Sedation Scale)",
    icon: "🛌",
    description:
      "Évaluation du niveau de sédation et d'agitation. Une seule valeur de -5 à +4. Objectif typique en réa : -2 à 0.",
    type: "single-pick",
    options: [
      { score: 4, label: "Combatif", description: "Violent, dangereux immédiat pour le personnel" },
      { score: 3, label: "Très agité", description: "Tire ou arrache cathéters/sondes, agressif" },
      {
        score: 2,
        label: "Agité",
        description: "Mouvements fréquents non orientés, lutte avec le respirateur",
      },
      {
        score: 1,
        label: "Anxieux",
        description: "Anxieux mais sans mouvements agressifs ou vigoureux",
      },
      { score: 0, label: "Éveillé, calme" },
      {
        score: -1,
        label: "Somnolent",
        description: "S'éveille à l'appel >10s, contact visuel maintenu",
      },
      { score: -2, label: "Sédation légère", description: "S'éveille brièvement <10s à l'appel" },
      {
        score: -3,
        label: "Sédation modérée",
        description: "Mouvement ou ouverture des yeux à l'appel (pas de contact visuel)",
      },
      {
        score: -4,
        label: "Sédation profonde",
        description: "Aucune réponse à la voix, mais mouvement au stimulus physique",
      },
      {
        score: -5,
        label: "Non réveillable",
        description: "Aucune réponse à la voix ni au stimulus physique",
      },
    ],
    interpret: (val) => {
      if (val === null) return { severity: "—", color: "#888" };
      const abs = Math.abs(val);
      if (abs === 0) return { severity: "Cible idéale", color: "#16a34a" };
      if (abs <= 2) return { severity: "Acceptable", color: "#f97316" };
      return { severity: "Hors cible", color: "#dc2626" };
    },
  },

  {
    id: "ramsay",
    nom: "Échelle de Ramsay",
    icon: "💤",
    description:
      "Évaluation du niveau de sédation. Une seule valeur de 1 à 6. Cible habituelle pour patient ventilé : 2-4. Référence historique pour le suivi de la sédation en réanimation.",
    type: "single-pick",
    options: [
      {
        score: 1,
        label: "Anxieux, agité, impatient",
        description: "Sous-sédation — patient inconfortable",
      },
      {
        score: 2,
        label: "Coopérant, orienté, tranquille",
        description: "Éveillé, calme, communique",
      },
      {
        score: 3,
        label: "Réveillé, répond aux ordres",
        description: "Endormi mais répond aux ordres verbaux",
      },
      {
        score: 4,
        label: "Endormi, réponse vive",
        description: "Réponse vive à percussion glabelle ou bruit fort",
      },
      {
        score: 5,
        label: "Endormi, réponse lente",
        description: "Réponse lente à percussion glabelle ou bruit fort",
      },
      {
        score: 6,
        label: "Aucune réponse",
        description: "Aucune réponse à percussion glabelle ou bruit fort — sédation profonde",
      },
    ],
    interpret: (val) => {
      if (val === null) return { severity: "—", color: "#888" };
      if (val === 1) return { severity: "Sous-sédaté", color: "#dc2626" };
      if (val <= 3) return { severity: "Cible idéale", color: "#16a34a" };
      if (val <= 4) return { severity: "Sédation adaptée (ventilé)", color: "#f97316" };
      return { severity: "Sédation profonde", color: "#dc2626" };
    },
  },

  {
    id: "cushman",
    nom: "Score de Cushman",
    icon: "🍺",
    description:
      "Détermine la nécessité de l'adjonction d'une benzodiazépine et sa posologie chez un patient en sevrage alcoolique. Cochez l'item correspondant à la situation. Interprétation : < 7 état clinique contrôlé · 7-14 sevrage modéré · > 14 sevrage sévère.",
    type: "sum",
    items: [
      {
        label: "Pouls (bpm/min)",
        options: [
          { score: 0, label: "< 80" },
          { score: 1, label: "81-100" },
          { score: 2, label: "101-120" },
          { score: 3, label: "> 120" },
        ],
      },
      {
        // Les bornes de PA dépendent de l'âge du patient : on demande de
        // choisir la tranche en premier (les chips d'âge en haut), puis les
        // options affichées correspondent au barème de cette tranche.
        label: "PA systolique (mmHg)",
        variants: [
          {
            id: "18-30",
            label: "18-30 ans",
            options: [
              { score: 0, label: "< 125" },
              { score: 1, label: "126-135" },
              { score: 2, label: "136-145" },
              { score: 3, label: "> 145" },
            ],
          },
          {
            id: "31-50",
            label: "31-50 ans",
            options: [
              { score: 0, label: "< 135" },
              { score: 1, label: "136-145" },
              { score: 2, label: "146-155" },
              { score: 3, label: "> 155" },
            ],
          },
          {
            id: ">50",
            label: "> 50 ans",
            options: [
              { score: 0, label: "< 145" },
              { score: 1, label: "146-155" },
              { score: 2, label: "156-165" },
              { score: 3, label: "> 165" },
            ],
          },
        ],
      },
      {
        label: "Fréquence respiratoire",
        options: [
          { score: 0, label: "< 16" },
          { score: 1, label: "16-25" },
          { score: 2, label: "26-35" },
          { score: 3, label: "> 35" },
        ],
      },
      {
        label: "Agitation",
        options: [
          { score: 0, label: "Aucune" },
          { score: 1, label: "Discrète" },
          { score: 2, label: "Généralisée / contrôlable" },
          { score: 3, label: "Généralisée / incontrôlable" },
        ],
      },
      {
        label: "Sueurs",
        options: [
          { score: 0, label: "Aucune" },
          { score: 1, label: "Paumes" },
          { score: 2, label: "Paumes et front" },
          { score: 3, label: "Généralisées" },
        ],
      },
      {
        label: "Troubles sensoriels",
        options: [
          { score: 0, label: "Aucun" },
          { score: 1, label: "Photo-/phonophobie, prurit" },
          { score: 2, label: "Hallucinations critiquées" },
          { score: 3, label: "Hallucinations non critiquées" },
        ],
      },
      {
        label: "Tremblements",
        options: [
          { score: 0, label: "Aucun" },
          { score: 1, label: "Main uniquement" },
          { score: 2, label: "Tout le membre supérieur" },
          { score: 3, label: "Généralisés" },
        ],
      },
    ],
    interpret: (total) => {
      if (total < 7) return { severity: "État clinique contrôlé (< 7)", color: "#16a34a" };
      if (total <= 14) return { severity: "Sevrage modéré (7-14)", color: "#f97316" };
      return { severity: "Sevrage sévère (> 14)", color: "#dc2626" };
    },
  },

  {
    id: "wallace",
    nom: "Règle des 9 de Wallace (surface brûlée)",
    icon: "🔥",
    description:
      "Estimation rapide de la surface cutanée brûlée (SCB) chez l'adulte. Indiquez l'atteinte de chaque région, le total s'exprime en % de surface corporelle. Repère d'appoint : la paume + doigts du patient ≈ 1 %. Une SCB ≥ 20 % impose un remplissage vasculaire (formule de Parkland) et oriente vers un centre de brûlés. Chez l'enfant, préférer la table de Lund-Browder (tête proportionnellement plus grande, membres inférieurs plus petits).",
    type: "sum",
    items: [
      {
        label: "Tête et cou (9 %)",
        options: [
          { score: 0, label: "Indemne" },
          { score: 4.5, label: "≈ moitié (4,5 %)" },
          { score: 9, label: "Totale (9 %)" },
        ],
      },
      {
        label: "Membre supérieur droit (9 %)",
        options: [
          { score: 0, label: "Indemne" },
          { score: 4.5, label: "≈ moitié (4,5 %)" },
          { score: 9, label: "Totale (9 %)" },
        ],
      },
      {
        label: "Membre supérieur gauche (9 %)",
        options: [
          { score: 0, label: "Indemne" },
          { score: 4.5, label: "≈ moitié (4,5 %)" },
          { score: 9, label: "Totale (9 %)" },
        ],
      },
      {
        label: "Tronc antérieur — thorax + abdomen (18 %)",
        options: [
          { score: 0, label: "Indemne" },
          { score: 9, label: "≈ moitié (9 %)" },
          { score: 18, label: "Total (18 %)" },
        ],
      },
      {
        label: "Tronc postérieur — dos (18 %)",
        options: [
          { score: 0, label: "Indemne" },
          { score: 9, label: "≈ moitié (9 %)" },
          { score: 18, label: "Total (18 %)" },
        ],
      },
      {
        label: "Membre inférieur droit (18 %)",
        options: [
          { score: 0, label: "Indemne" },
          { score: 9, label: "≈ moitié (9 %)" },
          { score: 18, label: "Total (18 %)" },
        ],
      },
      {
        label: "Membre inférieur gauche (18 %)",
        options: [
          { score: 0, label: "Indemne" },
          { score: 9, label: "≈ moitié (9 %)" },
          { score: 18, label: "Total (18 %)" },
        ],
      },
      {
        label: "Périnée / organes génitaux (1 %)",
        options: [
          { score: 0, label: "Indemne" },
          { score: 1, label: "Atteint (1 %)" },
        ],
      },
    ],
    interpret: (total) => {
      if (total < 10) return { severity: "Brûlure localisée (< 10 %)", color: "#16a34a" };
      if (total < 20) return { severity: "Brûlure étendue (10-19 %)", color: "#f97316" };
      return { severity: "Brûlure grave (≥ 20 %) — remplissage", color: "#dc2626" };
    },
  },
];
