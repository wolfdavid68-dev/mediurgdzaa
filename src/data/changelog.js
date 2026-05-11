// Version courante de l'application (affichée en bas de la nav — clic = patch notes)
// Convention : on aligne sur la version du service worker (CACHE_NAME dans public/service-worker.js).
export const APP_VERSION = "v54";

// Historique des versions — entrée la plus récente en premier.
// Chaque entrée : { version, date (AAAA-MM-JJ), titre?, changes: [{ type, text }] }
// type ∈ "feat" | "fix" | "chore" | "refactor" | "docs"
export const CHANGELOG = [
  {
    version: "v54",
    date: "2026-05-11",
    titre: "Retrait pattern \"dopamine\" sans drug correspondant",
    changes: [
      { type: "fix", text: "« dopamine » figurait dans DRUG_PATTERNS (ProtocolCard.tsx — liste des mots-clés cliquables dans les protocoles) sans entrée correspondante dans drugs.js. Conséquence : si un protocole mentionnait « dopamine », le mot devenait théoriquement cliquable mais ne menait à rien. Retrait du pattern. Effet bonus : le test data.test.js d'intégrité passe maintenant à 121/121 (vs 120/121 jusqu'ici)." },
    ],
  },
  {
    version: "v53",
    date: "2026-05-11",
    titre: "Migration TypeScript (mode pragmatique loose)",
    changes: [
      { type: "chore", text: "Mise en place de TypeScript en mode pragmatique : tsconfig.json avec strict: false, allowJs: true, noImplicitAny: false. Tous les composants React passent de .jsx à .tsx (15 fichiers : 13 composants + index + App + ProtocolesPage). Tous les modules lib/ passent de .js à .ts (calc, normalize, protocolText). Les data files (drugs, protocols, prepKits, etc.) restent en .js — ce sont des lookup tables denses qui n'ont pas besoin d'être annotées une à une. allowJs leur permet de coexister." },
      { type: "chore", text: "src/global.d.ts pour les APIs non standardisées (CloseWatcher, webkitAudioContext). vite.config.js → vite.config.ts. ESLint étendu avec typescript-eslint plugin. Scripts npm : nouveau `npm run typecheck` (tsc --noEmit). Lint et format reconnaissent désormais .ts/.tsx." },
      { type: "chore", text: "Zéro erreur tsc. Aucune migration UI, comportement identique en prod. Le bénéfice se manifestera progressivement : auto-complétion IDE, refacto safe, et tightening incrémental des types (sur les schémas Drug, Protocol, et les calculatrices ACR) dans les versions futures." },
    ],
  },
  {
    version: "v52",
    date: "2026-05-11",
    titre: "Setup ESLint + extraction ProtocolesPage (data splitting)",
    changes: [
      { type: "chore", text: "ESLint 9 flat config + plugins (react, react-hooks, jsx-a11y) + Prettier 3 + eslint-config-prettier. Le repo n'avait aucun lint depuis la migration Vite. npm run lint et npm run format dispos. 0 erreur, 10 warnings restants (a11y sur backdrops <dialog> qui sont gérés autrement, unused vars dans tests). Nettoyage : suppression de tous les import React inutiles (React 19 JSX transform les rend obsolètes — 13 fichiers concernés). StrictMode activé dans index.jsx (sécurise le dev, no-op en prod)." },
      { type: "feat", text: "Page Protocoles extraite dans src/pages/ProtocolesPage.jsx et lazy-loadée via React.lazy. Les imports PROTOCOLS, PREP_KITS, INCOMPATIBILITIES sont désormais à l'intérieur de cette page (et des sous-composants lazy IncompatibilityList, PrepKitCard) → toutes ces data sortent du bundle initial. Le filtre Adulte/Enfant est maintenant géré en interne par ProtocolesPage." },
      { type: "chore", text: "Bundle initial allégé : 412 kB → 351 kB (gzip 124 → 107 kB, soit -14 %). ProtocolesPage est maintenant un chunk de 63 kB / 19 kB gzip téléchargé seulement quand l'utilisateur visite l'onglet Protocoles. Premier paint plus rapide sur mobile, surtout pour qui ne va jamais sur Protocoles." },
    ],
  },
  {
    version: "v51",
    date: "2026-05-11",
    titre: "Accessibilité : audit + fixes ciblés (WCAG AA)",
    changes: [
      { type: "fix", text: "Aria-labels ajoutés sur 4 boutons icône-seul qui n'en avaient pas (× effacer dose, × effacer poids, ✕ fermer détail incompatibilité, × effacer dose libre kit). Les lecteurs d'écran annoncent maintenant l'action de chaque bouton." },
      { type: "fix", text: "prefers-reduced-motion : bloc global qui respecte le réglage système des utilisateurs sensibles au mouvement. Réduit toutes les transitions/animations à 0.01 ms, coupe les animations infinies (pulse, alert-flash, métronome battant), désactive les View Transitions et les @starting-style. L'info reste véhiculée par les couleurs et les changements de texte." },
      { type: "fix", text: "Contraste WCAG AA : --text-mute échouait sur les deux thèmes (3.4-3.5:1, besoin 4.5:1). Dark theme passé de #65657a à #8a8aa0 (~4.8:1), light theme de #84849c à #5e5e74 (~6:1)." },
      { type: "fix", text: "Outline focus-visible global sur tous les contrôles interactifs (button, a, input, textarea, select, [tabindex]). Les utilisateurs navigant au clavier voient maintenant clairement où ils sont — invisible à la souris grâce à :focus-visible (vs :focus)." },
      { type: "fix", text: "Tap targets agrandis pour WCAG 2.5.5 (44×44 px) : .poso-calc-clear (20×20 visuel mais hit area étendue via pseudo-élément), .incompat-detail-close (min-width/height 44px)." },
    ],
  },
  {
    version: "v50",
    date: "2026-05-11",
    titre: "Modernisation visuelle : View Transitions, <dialog> natif, @starting-style, @layer, oklch()",
    changes: [
      { type: "feat", text: "View Transitions API (Chrome 111+, Safari 18+, Firefox 142+) : les changements de page (Médicaments ↔ Protocoles) et de sous-onglet (PISU / Incompat / Kits) sont désormais cross-fadés par le navigateur. Fallback silencieux instantané sur les browsers sans support." },
      { type: "feat", text: "Modales en élément <dialog> natif (AcrModeModal + ChangelogModal) : focus trap, gestion ESC, scroll lock, backdrop click — tout géré par le navigateur sans useEffect custom. Le ::backdrop est animé via @starting-style. ~50 lignes de boilerplate retirées des deux composants." },
      { type: "feat", text: "Animations d'entrée déclaratives via CSS @starting-style (Chrome 117+, Safari 17.5+, Firefox 129+) sur les toasts (exit, update prompt) et les modales — plus de @keyframes JS à orchestrer, juste une transition CSS qui s'amorce à l'insertion DOM." },
      { type: "chore", text: "Déclaration @layer reset, base, components, utilities, overrides en tête de style.css : la précédence de cascade est maintenant explicite et documentée. Rétrocompatible (les règles non-wrapped restent au sommet de la cascade)." },
      { type: "chore", text: "Palette de thèmes en oklch() avec fallback hex pour Safari < 15.4. Luminance perceptuelle uniforme entre danger/success/info/warn/accent → les variantes (bordures, fonds 16 %, ombres) gardent une parité visuelle propre. Modifier le hue d'une couleur met à jour cohéremment toutes ses dérivées." },
      { type: "chore", text: "Container queries (container-type: inline-size) sur DrugCard : la carte est désormais responsive à son conteneur (liste étroite vs détail large), pas au viewport. Infrastructure prête pour un futur split-pane tablette sans toucher au composant." },
    ],
  },
  {
    version: "v49",
    date: "2026-05-11",
    titre: "Service worker artisanal → Workbox via vite-plugin-pwa",
    changes: [
      { type: "chore", text: "Remplacement de notre service-worker.js hand-rolled (~160 lignes : install + activate + 3 fetch handlers + asset-manifest custom) par vite-plugin-pwa avec Workbox sous le capot. La liste de précache est régénérée automatiquement à chaque build avec les hashes Vite — fini les soucis de cache désaligné entre versions (v32 vs v44, etc.). cleanupOutdatedCaches: true purge les anciens caches au passage." },
      { type: "feat", text: "Notification de mise à jour : quand un nouveau service worker est prêt, un petit bandeau « Nouvelle version disponible · Mettre à jour » apparaît en bas. Un clic recharge proprement sur la dernière version. registerType: 'autoUpdate' fait que le nouveau SW skip waiting + claim immédiatement, donc le passage à la nouvelle version est instantané dès qu'on accepte." },
      { type: "feat", text: "Vérification d'update toutes les heures pour les sessions longues (entre 2 réas, le tel reste sur l'app). Sans ça il fallait que l'utilisateur ferme/rouvre la PWA pour récupérer le nouveau contenu." },
      { type: "chore", text: "Nettoyage : suppression de public/service-worker.js, public/manifest.json (le plugin génère manifest.webmanifest depuis vite.config.js), scripts/generate-asset-manifest.cjs (plus utile). Le script check-versions.cjs ne vérifie plus que l'alignement APP_VERSION / CHANGELOG[0].version (Workbox gère le versioning du SW)." },
    ],
  },
  {
    version: "v48",
    date: "2026-05-11",
    titre: "Code splitting : modales et sous-onglets chargés à la demande",
    changes: [
      { type: "feat", text: "AcrModeModal (23 kB), IncompatibilityList (19 kB), PrepKitCard (5 kB) et ChangelogModal (2 kB) passent en React.lazy + Suspense. Leur JS n'est plus dans le bundle initial — il se télécharge en arrière-plan dès que l'utilisateur clique URGENCE, ouvre le sous-onglet Incompatibilités/Kits, ou affiche les notes de version. Bundle de démarrage allégé de 454 kB à 407 kB (gzip 131 → 122 kB) : premier paint plus rapide, surtout sur mobile bas-de-gamme." },
    ],
  },
  {
    version: "v47",
    date: "2026-05-11",
    titre: "Nettoyage post-Vite : 13 composants .js → .jsx",
    changes: [
      { type: "chore", text: "Tous les fichiers React contenant du JSX (App + 12 composants + entrypoint index) renommés en .jsx. vite.config.js simplifié — suppression du hack esbuild loader 'jsx' pour les .js qui n'est plus nécessaire. Aucun changement runtime, juste de l'hygiène : Vite a maintenant la convention propre attendue, et les outils tiers (eslint, IDE, code-splitters) détectent correctement les fichiers JSX par extension." },
    ],
  },
  {
    version: "v46",
    date: "2026-05-11",
    titre: "Migration CRA → Vite + upgrade React 19",
    changes: [
      { type: "chore", text: "Build chain remplacé : Create React App (déprécié depuis février 2023) → Vite 6. Le build de production passe de ~30 s à <1 s, le HMR en dev est instantané, et le bundle final est de taille équivalente. node_modules ~10× plus petit (159 packages au lieu de ~1500). React 18 → React 19 (aucun breaking visible côté MediURG : pas de propTypes, defaultProps, forwardRef ou class components dans le code). lucide-react retiré (n'était importée nulle part)." },
      { type: "chore", text: "Layout de sortie identique à CRA (build/static/js + build/static/css + build/asset-manifest.json) pour ne rien casser côté service worker ni Vercel. Script post-build dédié (scripts/generate-asset-manifest.cjs) produit le manifest au format CRA attendu par le SW pour le précache offline." },
    ],
  },
  {
    version: "v45",
    date: "2026-05-11",
    titre: "Chrono ACR : écran maintenu allumé pendant la RCP (Wake Lock)",
    changes: [
      { type: "feat", text: "Tant que le chrono ACR tourne, le tel/tablette ne s'éteint plus tout seul — Wake Lock API activée pendant que le chrono est en marche, relâchée à la pause ou à la fermeture du mode urgence. Évite l'écran noir au milieu d'un cycle de 2 min de RCP quand personne n'a touché l'écran. Le verrou est ré-acquis automatiquement si l'app passe en arrière-plan puis revient au premier plan. Supporté Chrome 84+, Safari 16.4+, Firefox 126+ ; ignoré silencieusement sur navigateurs plus anciens." },
    ],
  },
  {
    version: "v44",
    date: "2026-05-11",
    titre: "Garde « 2× retour pour quitter »",
    changes: [
      { type: "feat", text: "Le 1er appui sur le bouton retour (Android, geste retour iOS, Esc clavier) affiche un toast en bas d'écran « Appuyez à nouveau sur retour pour quitter » et garde l'app active. Le 2e appui dans les 2 s ferme proprement. Évite de quitter MediURG par accident en cours de réa." },
      { type: "feat", text: "Implémentation universelle : CloseWatcher API en primaire (Chrome 120+, Firefox 149+, l'API conçue exactement pour ce cas), fallback popstate avec sentinelle d'history pour les navigateurs plus anciens. Fonctionne en Chrome PWA installée, Chrome onglet, Firefox onglet, Safari onglet." },
      { type: "fix", text: "Limitation Firefox Android (PWA ou onglet) : la fermeture programmatique via hardware back enchaîne des écrans morts intermédiaires (bug Mozilla 1742059 / 1745793, non corrigé à ce jour). Sur cette config, le 2e back affiche un toast spécifique « Utilisez le bouton app récente Android pour fermer MediURG » au lieu de tenter une fermeture qui casserait l'affichage. Fermeture propre par le multitâche Android." },
      { type: "chore", text: "Itérations diagnostiques v34→v43 fusionnées dans cette entrée pour clarté de l'historique." },
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
