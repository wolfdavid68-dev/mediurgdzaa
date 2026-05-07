// Version courante de l'application (affichée en bas de la nav — clic = patch notes)
// Convention : on aligne sur la version du service worker (CACHE_NAME dans public/service-worker.js).
export const APP_VERSION = "v20";

// Historique des versions — entrée la plus récente en premier.
// Chaque entrée : { version, date (AAAA-MM-JJ), titre?, changes: [{ type, text }] }
// type ∈ "feat" | "fix" | "chore" | "refactor" | "docs"
export const CHANGELOG = [
  {
    version: "v20",
    date: "2026-05-07",
    titre: "Numéro de version + notes",
    changes: [
      { type: "feat", text: "Numéro de version cliquable sous la barre de navigation — ouvre les notes de version (ce que tu lis)." },
    ],
  },
  {
    version: "v19",
    date: "2026-05-07",
    titre: "Badge état réseau",
    changes: [
      { type: "feat", text: "Badge état réseau Online/Offline en header (vert/rouge) au lieu du bandeau plein écran." },
    ],
  },
  {
    version: "v18",
    date: "2026-05-06",
    titre: "Propofol — surveillance capno (préparation)",
    changes: [
      { type: "fix", text: "Propofol : remise de la note « surveillance capno » dans le bloc préparation." },
    ],
  },
  {
    version: "v17",
    date: "2026-05-06",
    titre: "Propofol — surveillance capno (sédation procédurale)",
    changes: [
      { type: "fix", text: "Propofol : surveillance capno ajoutée à la ligne sédation procédurale (poso adulte)." },
      { type: "fix", text: "Retrait de la note de préparation redondante." },
    ],
  },
  {
    version: "v16",
    date: "2026-05-05",
    titre: "Revue clinique batch",
    changes: [
      { type: "fix", text: "Revue clinique : Propofol, Etomidate, Midazolam, Kétamine, Cordarone, Octaplex, Striadyne, etc." },
    ],
  },
  {
    version: "v15",
    date: "2026-05-04",
    titre: "Renommage KÉTALAR → KÉTAMINE",
    changes: [
      { type: "chore", text: "KÉTALAR renommé en KÉTAMINE (DCI)." },
    ],
  },
  {
    version: "v14",
    date: "2026-05-03",
    titre: "Tables de dilution pédiatrique ACR",
    changes: [
      { type: "feat", text: "Tables de dilution pédiatrique pour ACR : Adrénaline, Cordarone, Morphine." },
    ],
  },
  {
    version: "v13",
    date: "2026-05-02",
    titre: "Kits — affichage contextuel",
    changes: [
      { type: "fix", text: "Kits : afficher uniquement la préparation du contexte du kit (pas tous les usages du drug)." },
    ],
  },
  {
    version: "v12",
    date: "2026-05-01",
    titre: "Nouveaux kits",
    changes: [
      { type: "feat", text: "Ajout des kits VNI et Réchauffeur-Accélérateur (transfusion massive)." },
    ],
  },
  {
    version: "v11",
    date: "2026-04-30",
    titre: "Refactor & tests",
    changes: [
      { type: "refactor", text: "Extraction des composants DrugNote, PrepBlock, PseBlock + utilitaires (normalize, protocolText) + tests." },
      { type: "refactor", text: "Extraction des calculateurs DrugCard → src/lib/calc + tests Jest." },
      { type: "refactor", text: "Kits de préparation utilisent les vraies données prep depuis drugs.js (par drugId)." },
    ],
  },
  {
    version: "v10",
    date: "2026-04-29",
    titre: "Favoris, historique & alias",
    changes: [
      { type: "feat", text: "Recherche : alias / synonymes (FR + EN + noms commerciaux alternatifs)." },
      { type: "feat", text: "Favoris (étoile + filtre) + historique des 5 derniers médicaments consultés." },
      { type: "feat", text: "Mode hors-ligne complet : précache exhaustif (icônes/JS/CSS)." },
      { type: "feat", text: "Contre-indications : 3 niveaux de sévérité (Absolue / Relative / Précaution)." },
      { type: "feat", text: "Layout 2-3 colonnes sur tablette paysage / desktop." },
      { type: "fix", text: "Navigation Médicaments ↔ Protocoles synchronisée avec l'historique navigateur (back button)." },
    ],
  },
];
