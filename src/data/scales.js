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
    id: "cushman",
    nom: "Score de Cushman",
    icon: "🍺",
    description:
      "Sévérité du syndrome de sevrage alcoolique. 7 items × 0-3 = total 0-21. Score ≥ 7 → benzodiazépine ; ≥ 15 → risque de delirium tremens, USI à envisager.",
    type: "sum",
    items: [
      {
        label: "Fréquence cardiaque (bpm)",
        options: [
          { score: 0, label: "< 80" },
          { score: 1, label: "80-100" },
          { score: 2, label: "101-120" },
          { score: 3, label: "> 120" },
        ],
      },
      {
        label: "PA systolique (mmHg)",
        options: [
          { score: 0, label: "< 135" },
          { score: 1, label: "135-145" },
          { score: 2, label: "146-155" },
          { score: 3, label: "> 155" },
        ],
      },
      {
        label: "Fréquence respiratoire (/min)",
        options: [
          { score: 0, label: "< 16" },
          { score: 1, label: "16-20" },
          { score: 2, label: "21-25" },
          { score: 3, label: "> 25" },
        ],
      },
      {
        label: "Tremblements",
        options: [
          { score: 0, label: "Absent" },
          { score: 1, label: "Mains" },
          { score: 2, label: "Membres supérieurs" },
          { score: 3, label: "Généralisés" },
        ],
      },
      {
        label: "Sueurs",
        options: [
          { score: 0, label: "Absentes" },
          { score: 1, label: "Paumes moites" },
          { score: 2, label: "Face / front" },
          { score: 3, label: "Profuses, généralisées" },
        ],
      },
      {
        label: "Agitation",
        options: [
          { score: 0, label: "Calme" },
          { score: 1, label: "Légère" },
          { score: 2, label: "Marquée" },
          { score: 3, label: "Incontrôlable" },
        ],
      },
      {
        label: "Troubles sensoriels / hallucinations",
        options: [
          { score: 0, label: "Absents" },
          { score: 1, label: "Doute, perceptions floues" },
          { score: 2, label: "Hallucinations nettes" },
          { score: 3, label: "Panique, hallucinations terrifiantes" },
        ],
      },
    ],
    interpret: (total) => {
      if (total <= 6) return { severity: "Mineur (≤ 6)", color: "#16a34a" };
      if (total <= 14) return { severity: "Modéré (7-14)", color: "#f97316" };
      return { severity: "Sévère / risque DT (≥ 15)", color: "#dc2626" };
    },
  },
];
