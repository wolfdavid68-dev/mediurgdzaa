// Version courante de l'application (affichée en bas de la nav — clic = patch notes)
// Convention : on aligne sur la version du service worker (CACHE_NAME dans public/service-worker.js).
export const APP_VERSION = "v97";

// Historique des versions — entrée la plus récente en premier.
// Chaque entrée : { version, date (AAAA-MM-JJ), titre?, changes: [{ type, text }] }
// type ∈ "feat" | "fix" | "chore" | "refactor" | "docs"
export const CHANGELOG = [
  {
    version: "v97",
    date: "2026-05-16",
    titre: "Protocoles PSE en preview (non publics)",
    changes: [
      {
        type: "chore",
        text: "Nouveau mécanisme pour tester de nouveaux protocoles PSE (ou des corrections) directement sur la prod live sans les exposer au public. Les entrées en attente vivent dans src/data/pse.preview.js et ne sont fusionnées par-dessus PSE que si l'URL contient ?pse=preview (override collant pour la session d'onglet, même principe que ?auth=preview). Pour le public, aucun changement. Promotion d'un protocole validé : déplacer son entrée de pse.preview.js vers pse.js, commit/push.",
      },
    ],
  },
  {
    version: "v96",
    date: "2026-05-16",
    titre: "Médicaments · ajout de la Nalbuphine (Nubain) IV",
    changes: [
      {
        type: "feat",
        text: "Nouvelle fiche Nalbuphine (ex-Nubain) dans Analgésie. Opioïde agoniste-antagoniste (agoniste κ / antagoniste partiel µ) à effet PLAFOND sur la dépression respiratoire — avantage vs morphine — et NON stupéfiant (pas de cahier des stups). Posologie adulte (IVL 0,2 mg/kg) et pédiatrique avec voie intrarectale (0,4 mg/kg si pas de VVP), calculateur de préparation (dilution qsp 20 mL → 1 mg/mL) et table de dilution pédiatrique 1 mg/mL. Rappel : ne pas associer à un agoniste µ pur (antagonisme), antagoniste = Naloxone.",
      },
      {
        type: "chore",
        text: "Snapshot anti-renumérotation des id mis à jour (drug-ids.snapshot.json) : ajout de l'id 80 (Nalbuphine) pour protéger la clé localStorage `mediurg-note-{id}`.",
      },
    ],
  },
  {
    version: "v95",
    date: "2026-05-14",
    titre: "Sauvegarde / restauration des notes personnelles",
    changes: [
      {
        type: "feat",
        text: "Nouveau bouton 💾 dans l'en-tête (à côté de A+ et 🌓) qui ouvre une mini-modale « Mes notes personnelles ». Bouton « ⇩ Exporter » qui télécharge un fichier JSON avec toutes les notes saisies sur les médicaments, et « ⇧ Importer » qui les réinjecte. Utile pour migrer entre téléphones, faire un backup avant changement d'appareil, ou restaurer après un vidage de cache. À l'import, match prioritaire par id du médicament, fallback par nom si l'id a changé entre versions.",
      },
      {
        type: "chore",
        text: "Protection anti-renumération des id de médicaments en CI : nouveau snapshot src/data/drug-ids.snapshot.json (78 drugs) + 2 tests dans data.test.js qui échouent si quelqu'un renumère ou supprime un drug existant. Garantit que la clé localStorage `mediurg-note-{id}` ne pointe jamais silencieusement sur le mauvais médicament après une mise à jour.",
      },
    ],
  },
  {
    version: "v94",
    date: "2026-05-13",
    titre: "Octaplex · fiche PSE (0,12 mL/kg/min, cap 8 mL/min)",
    changes: [
      {
        type: "feat",
        text: "Octaplex (CCP) dispose désormais d'une fiche PSE selon les recommandations ANSM/Vidal : débit 0,12 mL/kg/min (≈ 3 UI/kg/min), avec cap absolu à 8 mL/min (≈ 210 UI/min) = 480 mL/h sur la PSE. Exemple 70 kg : 0,12 × 70 = 8,4 mL/min → plafonné à 8 mL/min = 480 mL/h. Nouvelle unité « mL/kg/min » et plafond `maxMlH` ajoutés au moteur de calcul PSE.",
      },
    ],
  },
  {
    version: "v93",
    date: "2026-05-13",
    titre: "Échelles · ajout de l'échelle de Ramsay",
    changes: [
      {
        type: "feat",
        text: "Nouvelle échelle de Ramsay (1-6) ajoutée dans Échelles, après RASS. Évalue le niveau de sédation : 1 anxieux/agité (sous-sédaté), 2-3 cible idéale, 4 sédation adaptée pour patient ventilé, 5-6 sédation profonde. Code couleur de gravité automatique selon le score.",
      },
    ],
  },
  {
    version: "v92",
    date: "2026-05-13",
    titre: "PISU + Kits · retour à la pile verticale unique",
    changes: [
      {
        type: "fix",
        text: "PISU et Kits repassent en pile verticale unique colonne sur toutes les tailles d'écran (au lieu de la grille 2-3 colonnes au desktop introduite en v91). La liste des médicaments conserve sa grille au desktop — seule la liste des protocoles est concernée.",
      },
    ],
  },
  {
    version: "v91",
    date: "2026-05-13",
    titre: "Onglets Protocoles · 4 tabs compacts + fix grille desktop",
    changes: [
      {
        type: "fix",
        text: "Onglets Protocoles : labels raccourcis (« Incompat. » et « Kits ») pour tenir à 4 onglets sur mobile sans chevaucher. Padding et taille de police adaptés (13 px sur mobile, 14 px à partir de 600 px).",
      },
      {
        type: "fix",
        text: "Liste des kits / protocoles en grille 2 colonnes à partir de 900 px et 3 colonnes à partir de 1280 px. Une règle CSS de pile verticale en arrivait plus tard dans le fichier et écrasait les règles @media — restreinte au mobile (max-width: 899 px) pour laisser la grille reprendre la main au desktop / tablette.",
      },
    ],
  },
  {
    version: "v90",
    date: "2026-05-13",
    titre: "Onglet ECG · sélecteur interactif + matrice SMUR Sélestat",
    changes: [
      {
        type: "feat",
        text: "Nouvel onglet « ECG » dans Protocoles, entre Incompatibilités et Kits. Sélecteur interactif en haut : 4 lignes de chips colorées (FC rouge / Rythme orange / QRS violet / Ondes P vert) — tapez vos 4 critères, le diagnostic apparaît dans un encadré vert en gros. Les lignes incompatibles du tableau s'estompent en parallèle, la ligne match s'illumine en vert.",
      },
      {
        type: "feat",
        text: "Tableau de référence fidèle au PDF SMUR Sélestat : matrice 9 colonnes (FC × Rythme × QRS × Ondes P) → Diagnostic. Croix colorées par catégorie (rouge/orange/violet/vert) pour le repérage au coup d'œil + séparateurs verticaux gras entre groupes de colonnes. Inclut les remarques sur flutter (toit d'usine) et BAV I/II/III.",
      },
    ],
  },
  {
    version: "v89",
    date: "2026-05-13",
    titre: "Splash GHR au lancement de l'app",
    changes: [
      {
        type: "feat",
        text: "Splash écran au lancement : logo GHR Mulhouse Sud-Alsace + « MediURG » sur fond blanc, affiché 1 s puis fade-out 300 ms. Géré inline dans index.html pour être visible dès le premier paint (avant l'hydratation React). Disparaît dès que React signale « ready » + minimum 1 s respecté.",
      },
      {
        type: "feat",
        text: "background_color du manifest PWA passé en blanc pour matcher le splash GHR — plus de flash sombre derrière le logo au lancement de la PWA installée. theme_color (bandeau status bar) reste rouge #FF3B30, conformément à l'identité visuelle d'urgence.",
      },
      {
        type: "chore",
        text: "Suppression de public/logo.svg (ancienne croix rouge) — les icônes PWA sont désormais générées depuis logo_urgences_mulhouse_HD_transparent.png.",
      },
    ],
  },
  {
    version: "v88",
    date: "2026-05-13",
    titre: "Logo Urgences Mulhouse · en-tête + icônes PWA",
    changes: [
      {
        type: "feat",
        text: "Logo Urgences Mulhouse (caduceus + ECG + « URGENCES + MULHOUSE ») remplace la croix « ✚ » dans l'en-tête de l'app. En mode dark, pastille blanche circulaire derrière le logo pour que les éléments noirs (caduceus, ECG, contour) restent lisibles.",
      },
      {
        type: "feat",
        text: "Icônes PWA régénérées depuis le nouveau logo : favicon, apple-touch-icon, pwa-64/192/512, maskable-icon-512. L'icône sur l'écran d'accueil iOS/Android et le favicon onglet navigateur affichent maintenant le logo Urgences Mulhouse.",
      },
    ],
  },
  {
    version: "v87",
    date: "2026-05-12",
    titre: "Mode ACR · Adré toutes les 4 min (aligné sur le cycle chrono)",
    changes: [
      {
        type: "fix",
        text: "Préparation Adrénaline adulte en mode ACR : « toutes les 3-5 min » remplacé par « toutes les 4 min ». S'aligne sur le cycle de rappel de 4 min déjà utilisé par le chrono (= tous les 2 cycles RCP de 2 min). Une seule cadence affichée dans le mode ACR → moins d'ambiguïté en stress.",
      },
    ],
  },
  {
    version: "v86",
    date: "2026-05-12",
    titre: "Préparation Adré ACR · conditionnement réel (2 amp 5 mg/5 mL)",
    changes: [
      {
        type: "fix",
        text: "Préparation Adrénaline adulte en mode ACR : remplacement de « 10 ampoules 1 mg/1 mL » par « 2 ampoules 5 mg/5 mL » — conditionnement effectivement utilisé en SAUV/SMUR. Concentration finale inchangée (10 mL = 10 mg = 1 mg/mL), 1 mL = 1 mg par dose, seringue prête = 10 doses d'avance.",
      },
    ],
  },
  {
    version: "v85",
    date: "2026-05-12",
    titre: "Bilan ACR · Cordarone en séquence brute (300 + 150 mg)",
    changes: [
      {
        type: "fix",
        text: "Format Cordarone dans le bilan : séquence brute des doses au lieu du total cumulé. 1 dose → « 300 mg », 2 doses → « 300 + 150 mg » (au lieu de « 450 mg (300 + 150) »). Plus lisible pour la transmission : on voit directement quelles doses ont été administrées sans calcul mental inverse.",
      },
    ],
  },
  {
    version: "v84",
    date: "2026-05-12",
    titre: "Préparation Adré seringue 10 mL + bilan en doses (mg)",
    changes: [
      {
        type: "feat",
        text: "Préparation Adrénaline adulte en mode ACR mise à jour : seringue de 10 mL = 10 mg (10 ampoules 1 mg/1 mL groupées) → concentration 1 mg/mL → injecter 1 mL = 1 mg par dose. Pratique SAUV/SMUR courante : seringue prête = 10 doses d'avance, soit ≈ 40 min de RCP.",
      },
      {
        type: "feat",
        text: "Bilan ACR affiche désormais les doses en milligrammes au lieu du compteur brut : « Adrénaline : 3 mg » (au lieu de « 3 »), « Cordarone : 300 + 150 mg » (au lieu de « 2 »). Pour le pédiatrique, conservation du format dose/kg car le total dépend du poids. Idem dans la stats grid et l'image partagée. Label tally Cordarone précis selon le rang : 1re dose = 300 mg, 2e = 150 mg.",
      },
    ],
  },
  {
    version: "v83",
    date: "2026-05-12",
    titre: "Bilan ACR · horodatage des transitions d'état (ROSC, re-arrêt, pause)",
    changes: [
      {
        type: "feat",
        text: "L'horodatage du bilan couvre maintenant TOUTES les actions importantes, pas seulement chocs / adré / cordarone : ROSC obtenu (❤️ vert), re-arrêt (↻ orange), début ACR (▶), pause (⏸) et reprise (⏯). Code couleur par type dans le bord gauche de chaque ligne, idem dans l'image partagée. Chronologie complète disponible pour la transmission et le dossier patient.",
      },
    ],
  },
  {
    version: "v82",
    date: "2026-05-12",
    titre: "Bilan ACR · 2 boutons distincts Partager + Télécharger",
    changes: [
      {
        type: "feat",
        text: "Split du bouton « Image » de v81 en deux actions claires : « 🖼 Partager » (vert plein) ouvre le menu de partage natif Android — Photos, WhatsApp, Drive — et « 📥 Télécharger » (vert outline) force le download direct dans Downloads/. Sur la plupart des téléphones (Samsung Gallery, MIUI, etc.), les apps galerie scannent automatiquement Downloads/ donc l'image y apparaît sans manipulation. Pratique quand le partage natif ne propose pas l'option « Photos » sur ton tél.",
      },
    ],
  },
  {
    version: "v81",
    date: "2026-05-12",
    titre: "Validation doses · split AcrTimer · export bilan en image · tests",
    changes: [
      {
        type: "feat",
        text: "Validation défensive des doses calculées : si une dose dépasse un seuil aberrant (typo de virgule dans drugs.js, erreur d'unité, min > max) ou est négative, la pastille passe en rouge pulsant avec « 🚨 vérifier ». Seuils larges (50 g d'une drogue, 500 mg de µg…) pour ne flag que les valeurs manifestement fausses. Évite l'erreur médicamenteuse silencieuse en pédiatrie. +9 tests sur validateDoseValue.",
      },
      {
        type: "feat",
        text: "Export du bilan ACR en image PNG via html-to-image (5 kB gzip). Nouveau bouton « 🖼 Image » dans la modale Bilan — tente d'abord le partage natif Android via Web Share API (WhatsApp / Drive / dossier patient en 1 tap), fallback en téléchargement direct si non supporté. Capture en 2× pour la qualité retina. Section « Pour transmission » exclue du rendu (data-export-ignore) pour ne pas doublonner le texte.",
      },
      {
        type: "refactor",
        text: "Split de AcrTimer.tsx (1643 → 1006 lignes, -39%) : constantes (PREP_CONTENT, HT_CAUSES, POST_ROSC_TARGETS, ACLS_PREP_STEPS, COACH_*) extraites dans AcrTimer.constants.ts ; fonctions pures (fmt, fmtWall, beep, speak, suggestActions, stepState, readCoach) dans AcrTimer.helpers.ts ; sous-composants AcrSummary et AcrPrepOverlay dans leurs propres fichiers. Code plus reviewable, helpers testables isolément.",
      },
      {
        type: "feat",
        text: "+22 tests sur la logique AcrTimer (fmt, fmtWall, stepState, suggestActions, readCoach). Couvre les cas critiques de protocole : 1er choc sans adré, 3e choc avec adré + amio 300, 5e choc avec amio 150, ACLS vs ERC (adré au 2e choc, palettes antéro-postérieur après 3 chocs), pédiatrique (doses adaptées). Total tests projet : 132 → 175 (+33%).",
      },
    ],
  },
  {
    version: "v80",
    date: "2026-05-12",
    titre: "Recherche tolérante aux fautes de frappe (Levenshtein)",
    changes: [
      {
        type: "feat",
        text: "La barre de recherche tolère désormais les typos. Substring exact d'abord (cas commun, rapide), puis fallback fuzzy avec distance de Levenshtein : 1 erreur autorisée pour 4-5 caractères, 2 erreurs au-delà. « amidaron » trouve amiodarone, « adrenalin » trouve adrenaline, « atrropin » trouve atropine. Critique en stress : pas besoin d'orthographier parfaitement. Pas de nouvelle dépendance, ~30 lignes dans src/lib/fuzzy.ts avec 12 tests.",
      },
    ],
  },
  {
    version: "v79",
    date: "2026-05-12",
    titre: "Fix · toast back en PWA standalone Chrome (CloseWatcher)",
    changes: [
      {
        type: "fix",
        text: "Sur Chrome/Samsung Internet en PWA installée (display-mode: standalone), popstate ne fire PAS pour le back depuis la racine — Chrome ferme la PWA directement sans event. Le mode navigateur (browser tab) marche bien car popstate y fire normalement. CloseWatcher étendu à toute PWA standalone (auparavant Firefox Android uniquement) : intercepte le back, délègue les nav internes (modales/pages) au popstate via history.back(), affiche le toast à la racine, et laisse le 2e back rapide fermer la PWA naturellement.",
      },
    ],
  },
  {
    version: "v78",
    date: "2026-05-12",
    titre: "Fix · toast d'exit plus long (4 s) + retrait instrumentation debug",
    changes: [
      {
        type: "fix",
        text: "Le toast « Appuyez à nouveau sur retour pour quitter » s'affichait bien au 1er back mais ne durait que 2 s — trop court pour être perçu clairement, surtout en situation de stress. Du coup l'utilisateur avait l'impression que le 1er back ne faisait rien et retapait dans la foulée, déclenchant l'exit imprévu via la fenêtre rapid-double (<1 s). Durée passée à 4 s pour laisser le temps de lire et de réagir.",
      },
      {
        type: "chore",
        text: "Retrait de l'instrumentation temporaire ?debug-back (overlay popstate/CloseWatcher des v75-v77). Le diagnostic a confirmé que popstate fire correctement sur Chrome Android et que le toast s'affiche bien — le problème était uniquement la durée.",
      },
    ],
  },
  {
    version: "v77",
    date: "2026-05-12",
    titre: "Debug temporaire (suite 2) · log showExitToast + toast 10s",
    changes: [
      {
        type: "chore",
        text: "Popstate fire bien (v76 a confirmé). Mais le toast d'exit ne s'affiche pas pour l'utilisateur — peut-être que showExitToast n'est pas appelé, ou que le rendu React ne suit pas. v77 log explicitement l'appel à showExitToast, ainsi que sa disparition par timer. En mode ?debug-back, le toast persiste 10s au lieu de 2s pour qu'on ait le temps de voir.",
      },
    ],
  },
  {
    version: "v76",
    date: "2026-05-12",
    titre: "Debug temporaire (suite) · log popstate uniquement",
    changes: [
      {
        type: "chore",
        text: "Le CloseWatcher passif de v75 consommait le back avant que popstate ne fire (Chrome traite l'event comme handled même sans preventDefault). Test isolé v76 : on log uniquement popstate via ?debug-back. Si popstate fire → bug ailleurs. Si toujours rien → confirmé que popstate ne fire pas en PWA Chrome, refactor CloseWatcher-first à faire.",
      },
    ],
  },
  {
    version: "v75",
    date: "2026-05-12",
    titre: "Debug temporaire · instrumentation du bouton retour Android",
    changes: [
      {
        type: "chore",
        text: "Diagnostic d'un bug où le 1er back ne déclenche pas le toast d'exit sur certains téléphones. Activable via l'URL ?debug-back — affiche un overlay vert en haut listant les events popstate et CloseWatcher en temps réel. Ne change pas le comportement actuel du bouton retour. Sera retiré une fois la cause identifiée.",
      },
    ],
  },
  {
    version: "v74",
    date: "2026-05-12",
    titre: "Fix · plus de zoom Android au tap Protocoles (vrai fix)",
    changes: [
      {
        type: "fix",
        text: "Cause réelle identifiée : la barre des 3 sous-onglets Protocoles (PISU / Incompatibilité Médicamenteuse / Kits de préparation) débordait la largeur du viewport sur petits écrans. Android Chrome détectait le contenu plus large que la fenêtre et appliquait le « Wide Viewport Adjustment » (zoom auto pour afficher tout le contenu). flex: 1 1 0 + min-width: 0 sur les onglets : les 3 se partagent équitablement la largeur disponible et les labels longs wrap en interne. Plus d'overflow, plus de zoom.",
      },
    ],
  },
  {
    version: "v73",
    date: "2026-05-12",
    titre: "Fix · plus de zoom Android au tap sur Protocoles",
    changes: [
      {
        type: "fix",
        text: "Sur téléphone Android, taper sur l'onglet Protocoles pouvait déclencher le double-tap-to-zoom du navigateur (chunk JS plus gros à charger, donc l'utilisateur retapait, et Chrome interprétait ça comme un double-tap). Ajout de touch-action: manipulation sur tous les boutons et tabs : le navigateur ne perd plus 300 ms à attendre un éventuel 2e tap. Le pinch-to-zoom reste actif pour l'accessibilité.",
      },
    ],
  },
  {
    version: "v72",
    date: "2026-05-12",
    titre: "Fix · BPM métronome lisible sur téléphone (sticky hover)",
    changes: [
      {
        type: "fix",
        text: "Mode ACR · sur téléphone, après avoir tapé un BPM (100/110/120), le chiffre devenait invisible (blanc sur blanc). Bug classique de « sticky hover » sur tactile : le :hover restait collé après le tap et écrasait la couleur du bouton actif (spécificité 0,2,0 > 0,1,0). Le :hover est désormais limité aux pointeurs fins (souris) via @media (hover: hover) and (pointer: fine). La pastille blanche est conservée.",
      },
    ],
  },
  {
    version: "v71",
    date: "2026-05-12",
    titre: "Mode ACR · bilan horodaté (heure téléphone + T+ depuis début RCP)",
    changes: [
      {
        type: "feat",
        text: "Chaque choc, dose d'adrénaline et dose de cordarone est désormais horodaté avec deux temps : l'heure murale du téléphone (HH:MM:SS) et le T+ depuis le démarrage du chrono RCP. Visible dans la modale Bilan dans une nouvelle section « Horodatage des actions » (4 colonnes : heure tel · T+ RCP · icône · libellé) avec un bord coloré par type (jaune choc, violet adré, bleu amio).",
      },
      {
        type: "feat",
        text: "Inclusion automatique dans le texte copiable de transmission. Exemple : « 14:32:18 · T+00:30 · Choc n°1 / 14:33:04 · T+01:16 · Adrénaline 1 mg IV ». Permet une transmission précise aux urgentistes / SMUR receveur avec la chronologie exacte des gestes.",
      },
      {
        type: "feat",
        text: "Tracking cohérent partout : cocher une action suggérée dans la phase actions ajoute un event, décocher le retire. Les boutons +/− du tally manuel (chocs DSA déjà donnés, adré/cordarone déjà reçue avant arrivée) ajoutent ou retirent aussi un event horodaté. Reset vide la liste.",
      },
    ],
  },
  {
    version: "v70",
    date: "2026-05-11",
    titre: "ACLS Focused Update 2024 — vector change + push-dose adré",
    changes: [
      {
        type: "feat",
        text: "Mode ACR · protocole ACLS aligné sur l'AHA Focused Update 2024 : en FV/TV réfractaire (après 3 chocs inefficaces), suggestion automatique de changer la position des palettes en antéro-postérieur — ou DSED (Double External Sequential Defibrillation, DOSE-VF trial 2022) si l'équipement le permet. Apparaît comme une action cochable au cycle 4+ uniquement en mode ACLS.",
      },
      {
        type: "feat",
        text: "Carte « Hémodynamique » de la phase post-ROSC enrichie : mention de la push-dose adrénaline 10-20 µg en bolus IV pour les hypotensions transitoires, en complément du remplissage et de la Noradré IVSE. Pratique standard moderne post-arrêt cardiaque.",
      },
      {
        type: "chore",
        text: "Label du picker mis à jour : « ACLS 2020 » → « ACLS 2024 ». Le hint d'écran d'accueil indique maintenant « AHA / ACLS — Focused Update 2024 » quand le mode ACLS est sélectionné.",
      },
    ],
  },
  {
    version: "v69",
    date: "2026-05-11",
    titre: "Mode ACR · ACLS, causes réversibles H&T, phase post-ROSC",
    changes: [
      {
        type: "feat",
        text: "Toggle ERC ↔ ACLS dans le picker du mode urgence ACR, au-dessus du choix Adulte/Enfant. Persiste en localStorage. La différence opérationnelle : en ACLS l'adrénaline est suggérée dès le 2e CEE (vs 3e en ERC). Un badge ERC/ACLS visible dans le chrono rappelle le protocole actif. Bouton « ↔ ACLS/ERC » à côté du « ↔ Adulte/Enfant » pour rebasculer en cours de session (confirmation requise, retour au picker).",
      },
      {
        type: "feat",
        text: "Checklist « Causes réversibles » dépliable dans la phase actions du chrono ACR — 4H/4T en ERC, 5H/5T en ACLS (split acidose et thromboses pulmonaire/coronaire). Chaque cause = bouton court qui révèle l'action ciblée (ex: « Pneumothorax suffocant → exsufflation 2e EIC LMC »). Compteur visible dans le toggle (X/8 ou X/10) et bouton check pour marquer vu/exclu, persistant sur toute la session.",
      },
      {
        type: "feat",
        text: "Nouvelle phase « ROSC » accessible depuis l'analyse rythme — 3e bouton à côté de Choquable/Non choquable. Bascule en écran post-réa avec 4 cartes compactes affichant les cibles chiffrées d'un coup d'œil : PAM ≥ 65 mmHg (Noradré), SpO₂ 94-98% + EtCO₂ 35-45 (éviter hyperO₂), T° ≤ 37,7 °C (contrôle ciblé), ECG 12 dériv + coro si STEMI. Bouton « Re-arrêt » pour relancer un cycle si re-ACR. Le chrono continue de tourner (utile pour timing TTM/coronarographie).",
      },
    ],
  },
  {
    version: "v68",
    date: "2026-05-11",
    titre: "Mode ACR · overlay préparation rapide (Adré / Cordarone)",
    changes: [
      {
        type: "fix",
        text: "Cliquer sur Adrénaline ou Cordarone pendant le mode ACR ne quitte plus le chrono. À la place, un overlay « Préparation rapide » s'affiche par-dessus le compte à rebours, avec la dose, la dilution (PUR pour adulte, table de dilution pour enfant) et les notes critiques (G5% strict pour la Cordarone, NaCl flush pour l'adrénaline). L'overlay s'adapte automatiquement au mode Adulte/Enfant choisi au démarrage. Bouton « Fiche complète ↗ » disponible si l'utilisateur veut vraiment quitter le mode ACR.",
      },
    ],
  },
  {
    version: "v67",
    date: "2026-05-11",
    titre: "Échelles dépliables + Cushman officiel (PA par tranche d'âge)",
    changes: [
      {
        type: "feat",
        text: "Chaque échelle de l'onglet Échelles est maintenant dépliable (clic sur le header). Quand collapsée, on voit titre + description courte + chevron. Quand un score est complété, un badge couleur s'affiche dans le header même replié → on voit le résultat sans déplier. Évite que 3 calculateurs entiers occupent tout l'écran en même temps.",
      },
      {
        type: "feat",
        text: "Score de Cushman repris à l'identique du document NPEM officiel (libellés exacts et bornes corrigées) : Pouls 81-100 au lieu de 80-100, FR 16-25/26-35/>35 au lieu de 16-20/21-25/>25, Agitation « Aucune/Discrète/Généralisée contrôlable/incontrôlable », Sueurs « Aucune/Paumes/Paumes et front/Généralisées », Troubles sensoriels « Photo-/phonophobie, prurit » et « Hallucinations critiquées/non critiquées », Tremblements « Main uniquement/Tout le membre supérieur/Généralisés ». Seuils d'interprétation alignés : < 7 état contrôlé, 7-14 sevrage modéré, > 14 sevrage sévère.",
      },
      {
        type: "feat",
        text: "PA systolique du Cushman maintenant ajustée par tranche d'âge : 3 chips (18-30 ans, 31-50 ans, > 50 ans) à choisir en premier, puis les 4 options de scoring s'adaptent automatiquement au barème de cette tranche (ex: 18-30 ans = < 125 / 126-135 / 136-145 / > 145, > 50 ans = < 145 / 146-155 / 156-165 / > 165). Le ScaleCard supporte génériquement les `variants` dans le data model pour réutiliser le pattern sur d'autres scores age-dépendants à l'avenir.",
      },
    ],
  },
  {
    version: "v66",
    date: "2026-05-11",
    titre: "Échelles cliniques (Glasgow / RASS / Cushman) + cross-ref drug → protocoles",
    changes: [
      {
        type: "feat",
        text: "Nouvel onglet « Échelles » dans la bottom-nav (3e tab à côté de Médicaments et Protocoles). Trois calculateurs interactifs : Glasgow Coma Scale (E+V+M, total 3-15 avec interprétation mineur/modéré/coma), RASS Richmond Agitation-Sedation Scale (-5 à +4, sélection unique avec description de chaque niveau), Score de Cushman (7 items × 0-3 pour le sevrage alcoolique, total 0-21 avec seuils benzo et risque DT). Chaque item se sélectionne d'un tap, le score total s'incrémente en direct et affiche un badge couleur de sévérité. État réinitialisé à chaque ouverture — un score n'est jamais associé à un patient précis.",
      },
      {
        type: "feat",
        text: "Cross-référence drug → protocoles sur chaque carte médicament. Quand la fiche est expandée, une section « Utilisée dans » liste les protocoles qui mentionnent la drogue, sous forme de chips cliquables qui basculent vers la page Protocoles. Le match est normalisé (insensible aux accents et à la casse). Index inversé mémoïsé au niveau module dans src/lib/crossref.js — le scan complet de PROTOCOLS ne se fait qu'une fois par drug pendant la session.",
      },
      {
        type: "chore",
        text: "+8 tests : 5 sur crossref.js (lookup vide, match insensible aux accents, structure du résultat), 3 sur AcrTimer (état initial 00:00 + cycle 1, bascule Démarrer→Pause au clic, advance timers + Date.now mocké → chrono affiche 00:05 après 5s simulées). Total 124 → 132 tests. Note : sur le test fake-timers d'AcrTimer, fireEvent (sync) au lieu d'userEvent (async) — le couple userEvent.setup({advanceTimers}) + happy-dom est connu pour se bloquer.",
      },
    ],
  },
  {
    version: "v65",
    date: "2026-05-11",
    titre: "Icônes thématiques sur les raccourcis Android",
    changes: [
      {
        type: "feat",
        text: "Chaque raccourci manifest a maintenant sa propre icône SVG 96×96 affichée dans le menu long-press de l'icône MediURG sur Android : croix blanche sur rouge plein pour URGENCE ACR (identité visuelle réa), deux cercles entrecroisés rouge+orange avec X pour Incompatibilités, fiole stylisée pour Kits, clipboard avec liste à puces pour PISU. Files sources dans public/shortcuts/ — précachées par Workbox automatiquement via globPatterns. À noter : Android lit le manifest au moment de l'install de la PWA, pas à chaque refresh. Pour voir les nouvelles icônes après cette version, il faut désinstaller/réinstaller la PWA depuis le browser.",
      },
    ],
  },
  {
    version: "v64",
    date: "2026-05-11",
    titre: "vite-plugin-checker — erreurs tsc + oxlint dans l'overlay dev",
    changes: [
      {
        type: "chore",
        text: "vite-plugin-checker ajouté : pendant `npm start`, les erreurs TypeScript et oxlint apparaissent directement dans l'overlay Vite (rond rouge en bas à droite du browser) au lieu de rester silencieuses dans le terminal. Plus besoin de garder 3 terminaux ouverts (vite + typecheck --watch + lint --watch) — un seul `npm start` suffit. Le checker tourne en worker thread, zéro impact sur le HMR. Combo choisi : tsc (full typecheck en arrière-plan) + oxlint (12 ms, donne un feedback quasi-instantané). ESLint complet reste sur le run manuel + le pre-commit hook, où ses règles type-aware (~2 s) ont leur place.",
      },
    ],
  },
  {
    version: "v63",
    date: "2026-05-11",
    titre: "Error boundaries par carte, testing-library, happy-dom, pre-commit auto",
    changes: [
      {
        type: "feat",
        text: "react-error-boundary : chaque DrugCard et ProtocolCard est isolée dans son propre ErrorBoundary. Cas d'usage : si une fiche crashe au render (data malformée, regex inattendue dans calcDose, parsing prep cassé), seule cette carte affiche un fallback « Fiche temporairement indisponible · Réessayer » ; toutes les autres restent fonctionnelles. En réa, c'est la différence entre « 1 médicament temporairement indisponible » et « l'app entière est dead ». Le fallback respecte la palette d'erreur (rouge MediURG #FF3B30).",
      },
      {
        type: "chore",
        text: "@testing-library/react + @testing-library/jest-dom + @testing-library/user-event ajoutés. Avant : 121 tests, tous sur fonctions pures (calc, normalize, protocolText, data integrity) — 0 test de composant. Maintenant : +3 tests de DrugList qui couvrent le pipeline de rendu (DrugCard reçoit les props, étoile favori déclenche onToggleFavorite avec le bon id, clic sur header expand la carte). Setup file src/test-setup.ts ajouté pour les matchers jest-dom (toBeInTheDocument, etc.).",
      },
      {
        type: "chore",
        text: "happy-dom remplace jsdom comme environnement vitest. Suite de tests passe de ~2,4 s à ~1,9 s (l'env DOM seul tombe de 4,3 s à 2,2 s — gain x2). happy-dom est écrit en TypeScript natif (vs jsdom en JS), spécifiquement conçu pour les tests rapides — APIs DOM standard 100% couvertes pour MediURG.",
      },
      {
        type: "chore",
        text: "husky + lint-staged : hook git pre-commit auto-créé. Sur chaque `git commit`, lint-staged lance oxlint puis prettier --write uniquement sur les fichiers stagés (.ts/.tsx/.js/.jsx/.css/.html/.json). Setup quasi-instantané (oxlint = 12 ms). Empêche les commits avec code lint-broken ou unformatted, sans ralentir le commit lui-même contrairement à un `npm test` complet.",
      },
      {
        type: "chore",
        text: "knip ajouté : détecteur de dead code (fichiers/exports/deps non utilisés). Premier run = 0 problème détecté — la codebase est genuinely propre après les ménages des v55, v60-v62. Whitelist minimale dans knip.json pour pwa-assets.config.ts (chargé via la convention pwaAssets:{config:true}). `npm run knip` à l'avenir avant chaque release majeure.",
      },
    ],
  },
  {
    version: "v62",
    date: "2026-05-11",
    titre: "Vite 8 + Rolldown — bundler Rust, builds plus rapides",
    changes: [
      {
        type: "chore",
        text: "Vite 7.3.3 → 8.0.12. Vite 8 embarque Rolldown (bundler Rust écrit par les auteurs de Rollup et Oxc) à la place de Rollup pour la production. Pour MediURG : build local passe de ~2,4 s à ~1,6 s avec React Compiler actif, et tombe à ~290 ms sans (référence interne). Bundle quasi-identique en taille — Rolldown produit du code équivalent. Compatibilité préservée via une couche qui auto-convertit rollupOptions → rolldownOptions ; aucun changement nécessaire à notre manualChunks.",
      },
      {
        type: "chore",
        text: "@vitejs/plugin-react 5.2.0 → 6.0.1. La v6 retire Babel du plugin (React Refresh utilise désormais Oxc directement, sans transform Babel). Conséquence : le React Compiler ne se configure plus via l'option `babel: { plugins: [...] }` retirée. Migration : @rolldown/plugin-babel ajouté en devDep + helper `reactCompilerPreset` exporté par plugin-react v6, qui inclut un filtre intelligent (ne babelifie que les fichiers contenant un composant majuscule ou un hook `use*`).",
      },
      {
        type: "chore",
        text: "0 vulnérabilité dans le package-lock après bump (les 5 modérées de v60 étaient déjà parties avec vitest 4 en v61 ; v62 ne réintroduit rien).",
      },
    ],
  },
  {
    version: "v61",
    date: "2026-05-11",
    titre: "Wake Lock ACR, raccourcis Android, partage protocoles, titres dynamiques",
    changes: [
      {
        type: "feat",
        text: "Wake Lock API : pendant que la modale URGENCE ACR est ouverte, l'écran reste allumé tout du long de la réa (10-30 min typique). Plus de verrouillage automatique après 30 s pendant qu'on suit le chrono compressions ou qu'on lit la dose adrénaline pédiatrique. Auto-release quand l'app passe en arrière-plan (sécurité du navigateur), re-acquire au retour. Support Chrome 84+, Edge 84+, Safari 16.4+, Firefox 126+. Fallback silencieux sur les vieux navigateurs.",
      },
      {
        type: "feat",
        text: "Raccourcis manifest PWA : long-press de l'icône MediURG sur Android affiche 4 raccourcis directs — URGENCE ACR (ouvre la modale chrono), Incompatibilités, Kits de préparation, Protocoles PISU. App.tsx lit ?mode / ?page / ?tab au mount et applique l'état correspondant. Cas SMUR : pendant qu'on court vers le patient, on long-press → URGENCE en 1 tap, sans attendre que l'app finisse de monter.",
      },
      {
        type: "feat",
        text: "Web Share API sur chaque carte protocole : bouton 🔗 dans le header du body — sur Android/iOS, ouvre la share sheet système (WhatsApp, SMS, Mail, etc.) avec titre + code + version du protocole. Sur desktop sans navigator.share, fallback presse-papier avec feedback « Copié ✓ ». Permet d'envoyer rapidement un protocole à un collègue ou de l'imprimer pour l'archiver.",
      },
      {
        type: "feat",
        text: "Titres d'onglet dynamiques via React 19 document metadata : le titre du tab navigateur (et le label dans la liste des tâches récentes Android) reflète maintenant la vue active — « MediURG — Protocoles PISU », « MediURG — Incompatibilités », « MediURG — « adrenaline » » pendant une recherche, « MediURG — URGENCE ACR » en mode urgence. Cas d'usage : poste partagé avec plusieurs onglets MediURG ouverts (rare mais possible en SAU).",
      },
      {
        type: "chore",
        text: "oxlint (linter Rust) ajouté à côté d'ESLint : `npm run lint:fast` passe sur les 31 fichiers en 12 ms vs ~2 s pour ESLint. Sert de check pré-commit rapide ; ESLint reste la source de vérité avec ses règles type-aware. oxlint a relevé un useless length check dans App.tsx (corrigé) que l'ESLint ne flagait pas.",
      },
      {
        type: "chore",
        text: "vitest 2.1.8 → 4.1.5 + jsdom 25 → 29. Vitest 4 requiert Vite 6+ (on est sur 7.3.3 depuis v60) et Node 20+. Aucun changement de config nécessaire : `globals: true` + `environment: 'jsdom'` toujours supportés. Bonus : 5 vulnérabilités modérées du package-lock disparues (étaient dans des deps transitives de vitest 2).",
      },
    ],
  },
  {
    version: "v60",
    date: "2026-05-11",
    titre: "Perf : useDeferredValue, bundle splitté, icônes auto-générées",
    changes: [
      {
        type: "feat",
        text: "useDeferredValue sur la barre de recherche Médicaments : la frappe reste prioritaire à 60 fps pendant que le filtrage des 73 drugs (normalize + alias + tri français) tourne en arrière-plan, interruptible. Sur smartphones bas-de-gamme (vieux Android utilisé en SMUR), plus de saccades à chaque caractère. Complémentaire au React Compiler ajouté en v57 : le compiler évite les recalculs redondants, useDeferredValue marque le calcul restant comme non urgent.",
      },
      {
        type: "chore",
        text: "Bundle splitté en 3 chunks via rollupOptions.manualChunks : vendor-react (60 kB gzip, React + scheduler), data-medic (28 kB gzip, drugs/pse/aliases) et index (24 kB gzip, App + composants). Avant : un seul chunk de 112 kB gzip ré-invalidé à chaque release, même pour un simple bump de poso. Maintenant : modifier une poso n'invalide que data-medic, modifier le code n'invalide que index. Bénéfice surtout pour les retours sur l'app installée (cache navigateur + précache SW).",
      },
      {
        type: "chore",
        text: "@vite-pwa/assets-generator ajouté : public/logo.svg devient l'unique source de vérité pour toutes les icônes PWA (favicon.ico, pwa-64/192/512, maskable-512, apple-touch-180). Le manifest est auto-injecté au build via pwaAssets.overrideManifestIcons. Plus de 6 PNG à éditer à la main quand on retouche le logo — un seul SVG suffit, et `npm run generate-pwa-assets` regénère le tout. Migration des filenames : icon-192.png → pwa-192x192.png etc. (Workbox précache le nouveau set au prochain SW update).",
      },
      {
        type: "chore",
        text: "Vite 6.0.7 → 7.3.3, @vitejs/plugin-react 4.3.4 → 5.2.0. Aucun breaking change pour MediURG (pas de Sass legacy, pas de splitVendorChunkPlugin). Build toujours ~2,4 s. Vite 7 prépare le terrain pour Rolldown (bundler Rust, build 3-10× plus rapide) qui arrive en preview avec Vite 8.",
      },
    ],
  },
  {
    version: "v59",
    date: "2026-05-11",
    titre: "Retour Android : 1 = page précédente, 2 rapides en moins d'1s = quitte",
    changes: [
      {
        type: "feat",
        text: "Nouveau comportement du bouton retour Android : un seul appui revient à la page précédente (Médicaments ↔ Protocoles, fermeture d'un modal), deux appuis rapides (moins d'1 seconde l'un après l'autre) court-circuitent la garde toast et ferment l'app immédiatement. Convention native Android où le double-tap rapide signifie « je veux vraiment quitter, ne demande pas ». Le toast classique « Appuyez à nouveau » s'affiche toujours pour un seul retour à la racine ; il n'est court-circuité que si l'user mash le bouton.",
      },
      {
        type: "chore",
        text: "Architecture back-handling refactorée et simplifiée d'environ 80 lignes : popstate-first pour tous les navigateurs, CloseWatcher conservé uniquement pour Firefox Android (cas où popstate ne fire pas sur hardware back). Plus de flags pendingExit/watcherDestroyed/setupWatcher recreate. Refs miroirs showAcrRef/showChangelogRef supprimés (plus nécessaires). Comportement Firefox Android préservé : retour bloqué + toast « Utilisez le bouton app récente ».",
      },
      {
        type: "chore",
        text: "Re-introduction de pushNav pour navigateTo (v58 l'avait passé en replaceNav, ce qui éliminait la navigation entre pages via back). Désormais : 1 back depuis Protocoles → retour à Médicaments. Les sous-onglets PISU/Incompat/Kits restent en replaceNav (convention Material : tabs not in back stack).",
      },
    ],
  },
  {
    version: "v58",
    date: "2026-05-11",
    titre: "Fix double-retour : ne plus traverser pages/sous-onglets",
    changes: [
      {
        type: "fix",
        text: "Le bouton retour Android traversait toutes les pages visitées (Médicaments ↔ Protocoles) et tous les sous-onglets (PISU/Incompat/Kits) avant d'atteindre la sentinelle de sortie. Conséquence : il fallait parfois 4-6 backs pour voir le toast, puis 2 de plus pour quitter. Convention Android moderne : les tabs et changements de page de premier niveau n'entrent pas dans le back stack. Maintenant : navigateTo() et changeProtoCategory() utilisent replaceNav() au lieu de pushNav() — seuls les modaux (URGENCE ACR, notes de version) créent une entrée d'historique. Depuis n'importe quelle vue non-modale, 1er back = toast, 2e dans 2 s = quitte. Le back dans un modal continue de fermer le modal.",
      },
    ],
  },
  {
    version: "v57",
    date: "2026-05-11",
    titre: "React Compiler 1.0 — auto-mémoïsation automatique",
    changes: [
      {
        type: "feat",
        text: "babel-plugin-react-compiler 1.0 (stable) ajouté à la chaîne Vite. Le compilateur React analyse chaque composant et insère automatiquement la mémoïsation (équivalent useMemo/useCallback) là où c'est sûr — sans avoir à le faire à la main. Bénéfice principal : pendant que l'user tape dans la search bar, App.jsx ne refait plus les filtres et tris coûteux sur les 73 drugs à chaque caractère. Plus réactif sur mobile bas-de-gamme.",
      },
      {
        type: "chore",
        text: "eslint-plugin-react-compiler ajouté à la config ESLint pour signaler les patterns que le compiler ne peut pas optimiser (mutations directes, fonctions non pures). Verdict actuel : 0 warning — tous nos composants sont déjà compiler-compatibles, donc le compiler les optimise tous.",
      },
      {
        type: "chore",
        text: "Coût bundle : +16 kB raw / +5 kB gzip (le code de mémoïsation inséré). Build local passe de ~800 ms à ~2.3 s (le Babel transform du compiler est plus lent), mais c'est invisible côté user.",
      },
    ],
  },
  {
    version: "v56",
    date: "2026-05-11",
    titre: "Fix toast « Mettre à jour » invisible (registerType prompt)",
    changes: [
      {
        type: "fix",
        text: "Le bouton « Nouvelle version disponible · Mettre à jour » ne s'affichait jamais en v49-v55 : vite-plugin-pwa était en registerType: 'autoUpdate' qui skip-waiting immédiatement. Du coup needRefresh ne fire que brièvement et le toast disparaît avant d'apparaître. Bascule en registerType: 'prompt' : le nouveau SW reste en waiting jusqu'à ce que l'user clique sur le toast → la mise à jour est explicite et contrôlée par l'utilisateur (jamais d'auto-update en plein milieu d'une réa). C'est désormais cette v56 et les suivantes qui déclencheront le toast chez les utilisateurs.",
      },
    ],
  },
  {
    version: "v55",
    date: "2026-05-11",
    titre: "Cleanup final : AcrSummary en <dialog>, dead CSS, 0 lint warning",
    changes: [
      {
        type: "fix",
        text: 'Migration de la modale Bilan ACR en <dialog> natif (était restée en div + role="dialog" custom depuis le début, oubliée lors de la migration v50 qui a fait les 2 autres modales). Maintenant : ESC ferme, focus trap natif, scroll lock auto, backdrop animé via @starting-style. Aligne le Bilan sur ChangelogModal et AcrModeModal.',
      },
      {
        type: "chore",
        text: "Retrait de la règle CSS .drug-card-grid qui était posée en v50 comme exemple d'usage des container queries mais qui n'était référencée par aucun JSX. Dead code en moins. Le container-type: inline-size sur .drug-card reste — infrastructure prête pour un futur layout tablette quand on s'en servira vraiment.",
      },
      {
        type: "chore",
        text: "Cleanup de 7 warnings ESLint : 4 try/catch (err) → try/catch sans paramètre, 1 eslint-disable inutile, 2 variables de test inutilisées. Les 3 derniers warnings (a11y sur onClick des <dialog>) supprimés via eslint-disable-next-line commenté (faux positifs : <dialog> a son propre support clavier ESC). Résultat : 0 warning lint.",
      },
    ],
  },
  {
    version: "v54",
    date: "2026-05-11",
    titre: 'Retrait pattern "dopamine" sans drug correspondant',
    changes: [
      {
        type: "fix",
        text: "« dopamine » figurait dans DRUG_PATTERNS (ProtocolCard.tsx — liste des mots-clés cliquables dans les protocoles) sans entrée correspondante dans drugs.js. Conséquence : si un protocole mentionnait « dopamine », le mot devenait théoriquement cliquable mais ne menait à rien. Retrait du pattern. Effet bonus : le test data.test.js d'intégrité passe maintenant à 121/121 (vs 120/121 jusqu'ici).",
      },
    ],
  },
  {
    version: "v53",
    date: "2026-05-11",
    titre: "Migration TypeScript (mode pragmatique loose)",
    changes: [
      {
        type: "chore",
        text: "Mise en place de TypeScript en mode pragmatique : tsconfig.json avec strict: false, allowJs: true, noImplicitAny: false. Tous les composants React passent de .jsx à .tsx (15 fichiers : 13 composants + index + App + ProtocolesPage). Tous les modules lib/ passent de .js à .ts (calc, normalize, protocolText). Les data files (drugs, protocols, prepKits, etc.) restent en .js — ce sont des lookup tables denses qui n'ont pas besoin d'être annotées une à une. allowJs leur permet de coexister.",
      },
      {
        type: "chore",
        text: "src/global.d.ts pour les APIs non standardisées (CloseWatcher, webkitAudioContext). vite.config.js → vite.config.ts. ESLint étendu avec typescript-eslint plugin. Scripts npm : nouveau `npm run typecheck` (tsc --noEmit). Lint et format reconnaissent désormais .ts/.tsx.",
      },
      {
        type: "chore",
        text: "Zéro erreur tsc. Aucune migration UI, comportement identique en prod. Le bénéfice se manifestera progressivement : auto-complétion IDE, refacto safe, et tightening incrémental des types (sur les schémas Drug, Protocol, et les calculatrices ACR) dans les versions futures.",
      },
    ],
  },
  {
    version: "v52",
    date: "2026-05-11",
    titre: "Setup ESLint + extraction ProtocolesPage (data splitting)",
    changes: [
      {
        type: "chore",
        text: "ESLint 9 flat config + plugins (react, react-hooks, jsx-a11y) + Prettier 3 + eslint-config-prettier. Le repo n'avait aucun lint depuis la migration Vite. npm run lint et npm run format dispos. 0 erreur, 10 warnings restants (a11y sur backdrops <dialog> qui sont gérés autrement, unused vars dans tests). Nettoyage : suppression de tous les import React inutiles (React 19 JSX transform les rend obsolètes — 13 fichiers concernés). StrictMode activé dans index.jsx (sécurise le dev, no-op en prod).",
      },
      {
        type: "feat",
        text: "Page Protocoles extraite dans src/pages/ProtocolesPage.jsx et lazy-loadée via React.lazy. Les imports PROTOCOLS, PREP_KITS, INCOMPATIBILITIES sont désormais à l'intérieur de cette page (et des sous-composants lazy IncompatibilityList, PrepKitCard) → toutes ces data sortent du bundle initial. Le filtre Adulte/Enfant est maintenant géré en interne par ProtocolesPage.",
      },
      {
        type: "chore",
        text: "Bundle initial allégé : 412 kB → 351 kB (gzip 124 → 107 kB, soit -14 %). ProtocolesPage est maintenant un chunk de 63 kB / 19 kB gzip téléchargé seulement quand l'utilisateur visite l'onglet Protocoles. Premier paint plus rapide sur mobile, surtout pour qui ne va jamais sur Protocoles.",
      },
    ],
  },
  {
    version: "v51",
    date: "2026-05-11",
    titre: "Accessibilité : audit + fixes ciblés (WCAG AA)",
    changes: [
      {
        type: "fix",
        text: "Aria-labels ajoutés sur 4 boutons icône-seul qui n'en avaient pas (× effacer dose, × effacer poids, ✕ fermer détail incompatibilité, × effacer dose libre kit). Les lecteurs d'écran annoncent maintenant l'action de chaque bouton.",
      },
      {
        type: "fix",
        text: "prefers-reduced-motion : bloc global qui respecte le réglage système des utilisateurs sensibles au mouvement. Réduit toutes les transitions/animations à 0.01 ms, coupe les animations infinies (pulse, alert-flash, métronome battant), désactive les View Transitions et les @starting-style. L'info reste véhiculée par les couleurs et les changements de texte.",
      },
      {
        type: "fix",
        text: "Contraste WCAG AA : --text-mute échouait sur les deux thèmes (3.4-3.5:1, besoin 4.5:1). Dark theme passé de #65657a à #8a8aa0 (~4.8:1), light theme de #84849c à #5e5e74 (~6:1).",
      },
      {
        type: "fix",
        text: "Outline focus-visible global sur tous les contrôles interactifs (button, a, input, textarea, select, [tabindex]). Les utilisateurs navigant au clavier voient maintenant clairement où ils sont — invisible à la souris grâce à :focus-visible (vs :focus).",
      },
      {
        type: "fix",
        text: "Tap targets agrandis pour WCAG 2.5.5 (44×44 px) : .poso-calc-clear (20×20 visuel mais hit area étendue via pseudo-élément), .incompat-detail-close (min-width/height 44px).",
      },
    ],
  },
  {
    version: "v50",
    date: "2026-05-11",
    titre:
      "Modernisation visuelle : View Transitions, <dialog> natif, @starting-style, @layer, oklch()",
    changes: [
      {
        type: "feat",
        text: "View Transitions API (Chrome 111+, Safari 18+, Firefox 142+) : les changements de page (Médicaments ↔ Protocoles) et de sous-onglet (PISU / Incompat / Kits) sont désormais cross-fadés par le navigateur. Fallback silencieux instantané sur les browsers sans support.",
      },
      {
        type: "feat",
        text: "Modales en élément <dialog> natif (AcrModeModal + ChangelogModal) : focus trap, gestion ESC, scroll lock, backdrop click — tout géré par le navigateur sans useEffect custom. Le ::backdrop est animé via @starting-style. ~50 lignes de boilerplate retirées des deux composants.",
      },
      {
        type: "feat",
        text: "Animations d'entrée déclaratives via CSS @starting-style (Chrome 117+, Safari 17.5+, Firefox 129+) sur les toasts (exit, update prompt) et les modales — plus de @keyframes JS à orchestrer, juste une transition CSS qui s'amorce à l'insertion DOM.",
      },
      {
        type: "chore",
        text: "Déclaration @layer reset, base, components, utilities, overrides en tête de style.css : la précédence de cascade est maintenant explicite et documentée. Rétrocompatible (les règles non-wrapped restent au sommet de la cascade).",
      },
      {
        type: "chore",
        text: "Palette de thèmes en oklch() avec fallback hex pour Safari < 15.4. Luminance perceptuelle uniforme entre danger/success/info/warn/accent → les variantes (bordures, fonds 16 %, ombres) gardent une parité visuelle propre. Modifier le hue d'une couleur met à jour cohéremment toutes ses dérivées.",
      },
      {
        type: "chore",
        text: "Container queries (container-type: inline-size) sur DrugCard : la carte est désormais responsive à son conteneur (liste étroite vs détail large), pas au viewport. Infrastructure prête pour un futur split-pane tablette sans toucher au composant.",
      },
    ],
  },
  {
    version: "v49",
    date: "2026-05-11",
    titre: "Service worker artisanal → Workbox via vite-plugin-pwa",
    changes: [
      {
        type: "chore",
        text: "Remplacement de notre service-worker.js hand-rolled (~160 lignes : install + activate + 3 fetch handlers + asset-manifest custom) par vite-plugin-pwa avec Workbox sous le capot. La liste de précache est régénérée automatiquement à chaque build avec les hashes Vite — fini les soucis de cache désaligné entre versions (v32 vs v44, etc.). cleanupOutdatedCaches: true purge les anciens caches au passage.",
      },
      {
        type: "feat",
        text: "Notification de mise à jour : quand un nouveau service worker est prêt, un petit bandeau « Nouvelle version disponible · Mettre à jour » apparaît en bas. Un clic recharge proprement sur la dernière version. registerType: 'autoUpdate' fait que le nouveau SW skip waiting + claim immédiatement, donc le passage à la nouvelle version est instantané dès qu'on accepte.",
      },
      {
        type: "feat",
        text: "Vérification d'update toutes les heures pour les sessions longues (entre 2 réas, le tel reste sur l'app). Sans ça il fallait que l'utilisateur ferme/rouvre la PWA pour récupérer le nouveau contenu.",
      },
      {
        type: "chore",
        text: "Nettoyage : suppression de public/service-worker.js, public/manifest.json (le plugin génère manifest.webmanifest depuis vite.config.js), scripts/generate-asset-manifest.cjs (plus utile). Le script check-versions.cjs ne vérifie plus que l'alignement APP_VERSION / CHANGELOG[0].version (Workbox gère le versioning du SW).",
      },
    ],
  },
  {
    version: "v48",
    date: "2026-05-11",
    titre: "Code splitting : modales et sous-onglets chargés à la demande",
    changes: [
      {
        type: "feat",
        text: "AcrModeModal (23 kB), IncompatibilityList (19 kB), PrepKitCard (5 kB) et ChangelogModal (2 kB) passent en React.lazy + Suspense. Leur JS n'est plus dans le bundle initial — il se télécharge en arrière-plan dès que l'utilisateur clique URGENCE, ouvre le sous-onglet Incompatibilités/Kits, ou affiche les notes de version. Bundle de démarrage allégé de 454 kB à 407 kB (gzip 131 → 122 kB) : premier paint plus rapide, surtout sur mobile bas-de-gamme.",
      },
    ],
  },
  {
    version: "v47",
    date: "2026-05-11",
    titre: "Nettoyage post-Vite : 13 composants .js → .jsx",
    changes: [
      {
        type: "chore",
        text: "Tous les fichiers React contenant du JSX (App + 12 composants + entrypoint index) renommés en .jsx. vite.config.js simplifié — suppression du hack esbuild loader 'jsx' pour les .js qui n'est plus nécessaire. Aucun changement runtime, juste de l'hygiène : Vite a maintenant la convention propre attendue, et les outils tiers (eslint, IDE, code-splitters) détectent correctement les fichiers JSX par extension.",
      },
    ],
  },
  {
    version: "v46",
    date: "2026-05-11",
    titre: "Migration CRA → Vite + upgrade React 19",
    changes: [
      {
        type: "chore",
        text: "Build chain remplacé : Create React App (déprécié depuis février 2023) → Vite 6. Le build de production passe de ~30 s à <1 s, le HMR en dev est instantané, et le bundle final est de taille équivalente. node_modules ~10× plus petit (159 packages au lieu de ~1500). React 18 → React 19 (aucun breaking visible côté MediURG : pas de propTypes, defaultProps, forwardRef ou class components dans le code). lucide-react retiré (n'était importée nulle part).",
      },
      {
        type: "chore",
        text: "Layout de sortie identique à CRA (build/static/js + build/static/css + build/asset-manifest.json) pour ne rien casser côté service worker ni Vercel. Script post-build dédié (scripts/generate-asset-manifest.cjs) produit le manifest au format CRA attendu par le SW pour le précache offline.",
      },
    ],
  },
  {
    version: "v45",
    date: "2026-05-11",
    titre: "Chrono ACR : écran maintenu allumé pendant la RCP (Wake Lock)",
    changes: [
      {
        type: "feat",
        text: "Tant que le chrono ACR tourne, le tel/tablette ne s'éteint plus tout seul — Wake Lock API activée pendant que le chrono est en marche, relâchée à la pause ou à la fermeture du mode urgence. Évite l'écran noir au milieu d'un cycle de 2 min de RCP quand personne n'a touché l'écran. Le verrou est ré-acquis automatiquement si l'app passe en arrière-plan puis revient au premier plan. Supporté Chrome 84+, Safari 16.4+, Firefox 126+ ; ignoré silencieusement sur navigateurs plus anciens.",
      },
    ],
  },
  {
    version: "v44",
    date: "2026-05-11",
    titre: "Garde « 2× retour pour quitter »",
    changes: [
      {
        type: "feat",
        text: "Le 1er appui sur le bouton retour (Android, geste retour iOS, Esc clavier) affiche un toast en bas d'écran « Appuyez à nouveau sur retour pour quitter » et garde l'app active. Le 2e appui dans les 2 s ferme proprement. Évite de quitter MediURG par accident en cours de réa.",
      },
      {
        type: "feat",
        text: "Implémentation universelle : CloseWatcher API en primaire (Chrome 120+, Firefox 149+, l'API conçue exactement pour ce cas), fallback popstate avec sentinelle d'history pour les navigateurs plus anciens. Fonctionne en Chrome PWA installée, Chrome onglet, Firefox onglet, Safari onglet.",
      },
      {
        type: "fix",
        text: "Limitation Firefox Android (PWA ou onglet) : la fermeture programmatique via hardware back enchaîne des écrans morts intermédiaires (bug Mozilla 1742059 / 1745793, non corrigé à ce jour). Sur cette config, le 2e back affiche un toast spécifique « Utilisez le bouton app récente Android pour fermer MediURG » au lieu de tenter une fermeture qui casserait l'affichage. Fermeture propre par le multitâche Android.",
      },
      {
        type: "chore",
        text: "Itérations diagnostiques v34→v43 fusionnées dans cette entrée pour clarté de l'historique.",
      },
    ],
  },
  {
    version: "v33",
    date: "2026-05-10",
    titre: "Chrono ACR : passage de cycle automatique à 2 min",
    changes: [
      {
        type: "feat",
        text: "Plus besoin de cliquer « Passer au cycle X+1 → » : à 2 min de RCP réelle (phase actions), le timer archive le cycle, incrémente le compteur et bascule en analyse pour le rythme suivant — pile dans le tempo ACLS. Le bouton manuel reste dispo pour avancer plus tôt si tout est coché.",
      },
      {
        type: "fix",
        text: "Ancrage du chrono 2 min repositionné sur la reprise du MCE (= choix du rythme), pas sur le clic « cycle suivant » manuel. Garantit pile 2 min de massage entre 2 analyses, même si le médecin met 20 s à décider du rythme.",
      },
      {
        type: "feat",
        text: "Zoom T-15s et annonces vocales s'affichent désormais aussi pendant la phase actions (où l'user passe l'essentiel du cycle), pas uniquement en phase rcp pure.",
      },
    ],
  },
  {
    version: "v31",
    date: "2026-05-10",
    titre: "Chrono ACR : prompt analyse au démarrage + cycle 2 min relatif",
    changes: [
      {
        type: "feat",
        text: "Au tout 1er Démarrer (pas une reprise après pause), le chrono bascule directement en phase analyse pour le rythme initial — workflow ACLS standard (pads collés → analyse). Le bouton Reprendre conserve la phase courante.",
      },
      {
        type: "fix",
        text: "Le cycle 2 min de RCP est désormais ancré sur le début du cycle courant (mis à jour à chaque « Passer au cycle suivant »), pas sur l'elapsed absolu. Avant : si tu mettais 30 s à choisir le rythme + cocher les actions, la RCP du cycle suivant n'avait que 1:30 réelle. Maintenant : pile 2 min de massage entre 2 analyses, peu importe le temps passé en analyse/actions.",
      },
      {
        type: "fix",
        text: "Le zoom T-15s et les annonces vocales se calent automatiquement sur le bon moment du cycle courant (clé voicedRef = cycleStartedAt).",
      },
    ],
  },
  {
    version: "v30",
    date: "2026-05-10",
    titre: "Fix critique chrono ACR : phase ne flippait plus dès la 1re seconde",
    changes: [
      {
        type: "fix",
        text: "Bug pré-existant depuis le mode URGENCE ACR initial : à elapsed=1s, la garde de passage de cycle (analyseIdx > -1) était trop laxe et basculait immédiatement la phase en « analyse » 1 seconde après Démarrer. Conséquences invisibles si on tapait choquable/non choquable tout de suite, mais le zoom T-15s ACLS ajouté en v29 ne s'affichait jamais et le passage auto de cycle à 2:00 paraissait inactif. Garde alignée sur celle de l'adrénaline (analyseIdx >= 1).",
      },
    ],
  },
  {
    version: "v29",
    date: "2026-05-10",
    titre: "Coach RCP 3 modes + zoom préparation DSA (ACLS)",
    changes: [
      {
        type: "feat",
        text: "Coach RCP 3 modes cyclables persistés : 🔊 Complet (visuel + bips + voix française), 👁 Visuel (visuel + bips, voix coupée — sweet spot SAUV bruyante), 🔇 Muet (aucun feedback). Picto pill libellé en haut à droite du chrono, mémorisé entre sessions.",
      },
      {
        type: "feat",
        text: "Zoom plein cadre 15 secondes avant l'analyse rythme : compte à rebours géant (blanc → orange ≤10s → rouge ≤5s → GO), checklist ACLS High-Performance CPR à 4 étapes — charger défib pendant compressions, relève masseur, « on s'écarte » + arrêt MCE, analyse ≤ 10 s + reprise MCE immédiate.",
      },
      {
        type: "feat",
        text: "Annonces vocales fr-FR aux moments critiques (mode 🔊) : « Préparation analyse, charger le défibrillateur sans arrêter le massage » à T-15s, « On s'écarte » à T-5s, « Analyser le rythme » à T-0, « Prochaine adrénaline » au cycle 4 min.",
      },
      {
        type: "feat",
        text: "Bips countdown discrets T-5 → T-1 + vibration mobile pour repérer la pause coordonnée sans regarder l'écran.",
      },
    ],
  },
  {
    version: "v24",
    date: "2026-05-09",
    titre: "Quitter l'app : appuyer 2× sur retour",
    changes: [
      {
        type: "fix",
        text: 'Plus d\'écran vide gris/rouge persistant en quittant la PWA Android : le 1er appui sur retour à la racine affiche un toast "Appuyez à nouveau sur retour pour quitter", le 2e appui dans les 2 secondes ferme proprement la fenêtre. Évite la fenêtre standalone vide laissée par Chrome / Samsung Internet.',
      },
    ],
  },
  {
    version: "v23",
    date: "2026-05-09",
    titre: "Bouton retour Android + flash gris au lancement",
    changes: [
      {
        type: "feat",
        text: "Bouton retour Android (et geste retour iOS) : ferme d'abord la modale ouverte (URGENCE ACR, notes de version), puis revient au sous-onglet précédent (PISU / Incompatibilités / Kits), puis à la page précédente — l'app se quitte uniquement à la racine.",
      },
      {
        type: "fix",
        text: "Plus d'écran gris/blanc au lancement de la PWA : le fond sombre est maintenant peint dès le HTML, avant le chargement du bundle React (status bar iOS également alignée sur le thème).",
      },
    ],
  },
  {
    version: "v21",
    date: "2026-05-07",
    titre: "Mode URGENCE ACR",
    changes: [
      {
        type: "feat",
        text: "Bouton flottant 🚨 URGENCE accessible partout — ouvre le mode ACR plein écran (sélecteur Adulte / Enfant).",
      },
      {
        type: "feat",
        text: "Chrono RCP guidé : cycles 2 min (analyse DSA) et 4 min (adrénaline) avec bips d'alerte, suggestions ERC selon le rythme choisi (choquable / non choquable).",
      },
      {
        type: "feat",
        text: "Métronome MCE 100-120/min synchronisé sur la cadence ERC pour le massage cardiaque.",
      },
      {
        type: "feat",
        text: "Doses de référence Adré / Cordarone toujours visibles + clic = ouverture de la fiche complète Médicaments.",
      },
      {
        type: "feat",
        text: "Compteurs modifiables (chocs / adré / cordarone déjà donnés) — utile à l'arrivée si le DSA grand-public a déjà choqué.",
      },
      {
        type: "feat",
        text: "Bilan de fin de séance copiable (durée totale, totaux, détail des cycles) pour transmission.",
      },
    ],
  },
  {
    version: "v20",
    date: "2026-05-07",
    titre: "Numéro de version + notes",
    changes: [
      {
        type: "feat",
        text: "Numéro de version cliquable sous la barre de navigation — ouvre les notes de version (ce que tu lis).",
      },
    ],
  },
  {
    version: "v19",
    date: "2026-05-07",
    titre: "Badge état réseau",
    changes: [
      {
        type: "feat",
        text: "Badge état réseau Online/Offline en header (vert/rouge) au lieu du bandeau plein écran.",
      },
    ],
  },
  {
    version: "v18",
    date: "2026-05-06",
    titre: "Propofol — surveillance capno (préparation)",
    changes: [
      {
        type: "fix",
        text: "Propofol : remise de la note « surveillance capno » dans le bloc préparation.",
      },
    ],
  },
  {
    version: "v17",
    date: "2026-05-06",
    titre: "Propofol — surveillance capno (sédation procédurale)",
    changes: [
      {
        type: "fix",
        text: "Propofol : surveillance capno ajoutée à la ligne sédation procédurale (poso adulte).",
      },
      { type: "fix", text: "Retrait de la note de préparation redondante." },
    ],
  },
  {
    version: "v16",
    date: "2026-05-05",
    titre: "Revue clinique batch",
    changes: [
      {
        type: "fix",
        text: "Revue clinique : Propofol, Etomidate, Midazolam, Kétamine, Cordarone, Octaplex, Striadyne, etc.",
      },
    ],
  },
  {
    version: "v15",
    date: "2026-05-04",
    titre: "Renommage KÉTALAR → KÉTAMINE",
    changes: [{ type: "chore", text: "KÉTALAR renommé en KÉTAMINE (DCI)." }],
  },
  {
    version: "v14",
    date: "2026-05-03",
    titre: "Tables de dilution pédiatrique ACR",
    changes: [
      {
        type: "feat",
        text: "Tables de dilution pédiatrique pour ACR : Adrénaline, Cordarone, Morphine.",
      },
    ],
  },
  {
    version: "v13",
    date: "2026-05-02",
    titre: "Kits — affichage contextuel",
    changes: [
      {
        type: "fix",
        text: "Kits : afficher uniquement la préparation du contexte du kit (pas tous les usages du drug).",
      },
    ],
  },
  {
    version: "v12",
    date: "2026-05-01",
    titre: "Nouveaux kits",
    changes: [
      {
        type: "feat",
        text: "Ajout des kits VNI et Réchauffeur-Accélérateur (transfusion massive).",
      },
    ],
  },
  {
    version: "v11",
    date: "2026-04-30",
    titre: "Refactor & tests",
    changes: [
      {
        type: "refactor",
        text: "Extraction des composants DrugNote, PrepBlock, PseBlock + utilitaires (normalize, protocolText) + tests.",
      },
      {
        type: "refactor",
        text: "Extraction des calculateurs DrugCard → src/lib/calc + tests Jest.",
      },
      {
        type: "refactor",
        text: "Kits de préparation utilisent les vraies données prep depuis drugs.js (par drugId).",
      },
    ],
  },
  {
    version: "v10",
    date: "2026-04-29",
    titre: "Favoris, historique & alias",
    changes: [
      {
        type: "feat",
        text: "Recherche : alias / synonymes (FR + EN + noms commerciaux alternatifs).",
      },
      {
        type: "feat",
        text: "Favoris (étoile + filtre) + historique des 5 derniers médicaments consultés.",
      },
      { type: "feat", text: "Mode hors-ligne complet : précache exhaustif (icônes/JS/CSS)." },
      {
        type: "feat",
        text: "Contre-indications : 3 niveaux de sévérité (Absolue / Relative / Précaution).",
      },
      { type: "feat", text: "Layout 2-3 colonnes sur tablette paysage / desktop." },
      {
        type: "fix",
        text: "Navigation Médicaments ↔ Protocoles synchronisée avec l'historique navigateur (back button).",
      },
    ],
  },
];
