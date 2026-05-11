// Version courante de l'application (affichée en bas de la nav — clic = patch notes)
// Convention : on aligne sur la version du service worker (CACHE_NAME dans public/service-worker.js).
export const APP_VERSION = "v36";

// Historique des versions — entrée la plus récente en premier.
// Chaque entrée : { version, date (AAAA-MM-JJ), titre?, changes: [{ type, text }] }
// type ∈ "feat" | "fix" | "chore" | "refactor" | "docs"
export const CHANGELOG = [
  {
    version: "v36",
    date: "2026-05-11",
    titre: "[DIAG TEMP] Badge popstate visible pour debug Firefox PWA",
    changes: [
      { type: "chore", text: "Version diagnostique temporaire : un petit badge jaune en haut à gauche affiche init/pop/sent/null = compteurs des events popstate captés. Permet de confirmer si Firefox PWA Android les fire réellement ou les bypasse. Sera retiré à la prochaine version une fois la cause identifiée." },
    ],
  },
  {
    version: "v35",
    date: "2026-05-11",
    titre: "Garde 2× retour : robustesse Firefox PWA Android",
    changes: [
      { type: "fix", text: "Le setup history (sentinelle + état actif) s'exécute désormais dans un script inline d'index.html AVANT le mount React, pour que la pile soit en place même si l'user tape retour pendant le chargement initial." },
      { type: "fix", text: "Le handler popstate intercepte aussi le cas où e.state est null (et pas seulement la sentinelle explicite). Firefox PWA Android peut perdre notre state custom lors d'un retour ; on traite ce cas comme « veut quitter » → toast au 1er tap, fermeture au 2e dans les 2 s." },
    ],
  },
  {
    version: "v34",
    date: "2026-05-11",
    titre: "Garde 2× retour pour quitter — Firefox onglet inclus",
    changes: [
      { type: "feat", text: "Le toast « Appuyez à nouveau sur retour pour quitter » s'affiche désormais aussi en mode onglet navigateur (Firefox, Chrome tab), plus seulement en PWA standalone. Le 1er retour reste dans l'app, le 2e (dans les 2 s) ferme proprement. Évite de quitter MediURG par accident en cours de réa." },
      { type: "fix", text: "Plus d'écran vide sous Firefox mobile au 1er retour : le re-pushState de l'état actif s'exécute maintenant AVANT tout setState React dans le handler popstate, pour que la pile history soit en état valide instantanément. URL explicite passée à pushState/replaceState (window.location.href) au lieu de \"\" — certaines versions de Firefox mobile mishandlent l'URL vide." },
    ],
  },
  {
    version: "v33",
    date: "2026-05-10",
    titre: "Chrono ACR : passage de cycle automatique à 2 min",
    changes: [
      { type: "feat", text: "Plus besoin de cliquer « Passer au cycle X+1 → » : à 2 min de RCP réelle (phase actions), le timer archive le cycle, incrémente le compteur et bascule en analyse pour le rythme suivant — pile dans le tempo ACLS. Le bouton manuel reste dispo pour avancer plus tôt si tout est coché." },
      { type: "fix", text: "Ancrage du chrono 2 min repositionné sur la reprise du MCE (= choix du rythme), pas sur le clic « cycle suivant » manuel. Garantit pile 2 min de massage entre 2 analyses, même si le médecin met 20 s à décider du rythme." },
      { type: "feat", text: "Zoom T-15s et annonces vocales s'affichent désormais aussi pendant la phase actions (où l'user passe l'essentiel du cycle), pas uniquement en phase rcp pure." },
    ],
  },
  {
    version: "v31",
    date: "2026-05-10",
    titre: "Chrono ACR : prompt analyse au démarrage + cycle 2 min relatif",
    changes: [
      { type: "feat", text: "Au tout 1er Démarrer (pas une reprise après pause), le chrono bascule directement en phase analyse pour le rythme initial — workflow ACLS standard (pads collés → analyse). Le bouton Reprendre conserve la phase courante." },
      { type: "fix", text: "Le cycle 2 min de RCP est désormais ancré sur le début du cycle courant (mis à jour à chaque « Passer au cycle suivant »), pas sur l'elapsed absolu. Avant : si tu mettais 30 s à choisir le rythme + cocher les actions, la RCP du cycle suivant n'avait que 1:30 réelle. Maintenant : pile 2 min de massage entre 2 analyses, peu importe le temps passé en analyse/actions." },
      { type: "fix", text: "Le zoom T-15s et les annonces vocales se calent automatiquement sur le bon moment du cycle courant (clé voicedRef = cycleStartedAt)." },
    ],
  },
  {
    version: "v30",
    date: "2026-05-10",
    titre: "Fix critique chrono ACR : phase ne flippait plus dès la 1re seconde",
    changes: [
      { type: "fix", text: "Bug pré-existant depuis le mode URGENCE ACR initial : à elapsed=1s, la garde de passage de cycle (analyseIdx > -1) était trop laxe et basculait immédiatement la phase en « analyse » 1 seconde après Démarrer. Conséquences invisibles si on tapait choquable/non choquable tout de suite, mais le zoom T-15s ACLS ajouté en v29 ne s'affichait jamais et le passage auto de cycle à 2:00 paraissait inactif. Garde alignée sur celle de l'adrénaline (analyseIdx >= 1)." },
    ],
  },
  {
    version: "v29",
    date: "2026-05-10",
    titre: "Coach RCP 3 modes + zoom préparation DSA (ACLS)",
    changes: [
      { type: "feat", text: "Coach RCP 3 modes cyclables persistés : 🔊 Complet (visuel + bips + voix française), 👁 Visuel (visuel + bips, voix coupée — sweet spot SAUV bruyante), 🔇 Muet (aucun feedback). Picto pill libellé en haut à droite du chrono, mémorisé entre sessions." },
      { type: "feat", text: "Zoom plein cadre 15 secondes avant l'analyse rythme : compte à rebours géant (blanc → orange ≤10s → rouge ≤5s → GO), checklist ACLS High-Performance CPR à 4 étapes — charger défib pendant compressions, relève masseur, « on s'écarte » + arrêt MCE, analyse ≤ 10 s + reprise MCE immédiate." },
      { type: "feat", text: "Annonces vocales fr-FR aux moments critiques (mode 🔊) : « Préparation analyse, charger le défibrillateur sans arrêter le massage » à T-15s, « On s'écarte » à T-5s, « Analyser le rythme » à T-0, « Prochaine adrénaline » au cycle 4 min." },
      { type: "feat", text: "Bips countdown discrets T-5 → T-1 + vibration mobile pour repérer la pause coordonnée sans regarder l'écran." },
    ],
  },
  {
    version: "v24",
    date: "2026-05-09",
    titre: "Quitter l'app : appuyer 2× sur retour",
    changes: [
      { type: "fix", text: "Plus d'écran vide gris/rouge persistant en quittant la PWA Android : le 1er appui sur retour à la racine affiche un toast \"Appuyez à nouveau sur retour pour quitter\", le 2e appui dans les 2 secondes ferme proprement la fenêtre. Évite la fenêtre standalone vide laissée par Chrome / Samsung Internet." },
    ],
  },
  {
    version: "v23",
    date: "2026-05-09",
    titre: "Bouton retour Android + flash gris au lancement",
    changes: [
      { type: "feat", text: "Bouton retour Android (et geste retour iOS) : ferme d'abord la modale ouverte (URGENCE ACR, notes de version), puis revient au sous-onglet précédent (PISU / Incompatibilités / Kits), puis à la page précédente — l'app se quitte uniquement à la racine." },
      { type: "fix", text: "Plus d'écran gris/blanc au lancement de la PWA : le fond sombre est maintenant peint dès le HTML, avant le chargement du bundle React (status bar iOS également alignée sur le thème)." },
    ],
  },
  {
    version: "v21",
    date: "2026-05-07",
    titre: "Mode URGENCE ACR",
    changes: [
      { type: "feat", text: "Bouton flottant 🚨 URGENCE accessible partout — ouvre le mode ACR plein écran (sélecteur Adulte / Enfant)." },
      { type: "feat", text: "Chrono RCP guidé : cycles 2 min (analyse DSA) et 4 min (adrénaline) avec bips d'alerte, suggestions ERC selon le rythme choisi (choquable / non choquable)." },
      { type: "feat", text: "Métronome MCE 100-120/min synchronisé sur la cadence ERC pour le massage cardiaque." },
      { type: "feat", text: "Doses de référence Adré / Cordarone toujours visibles + clic = ouverture de la fiche complète Médicaments." },
      { type: "feat", text: "Compteurs modifiables (chocs / adré / cordarone déjà donnés) — utile à l'arrivée si le DSA grand-public a déjà choqué." },
      { type: "feat", text: "Bilan de fin de séance copiable (durée totale, totaux, détail des cycles) pour transmission." },
    ],
  },
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
