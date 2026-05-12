// Constantes et data tables pour AcrTimer.tsx. Extrait pour alléger le
// composant principal (qui faisait 1643 lignes). Tout ce qui ne change pas
// au runtime et qui peut être référencé sans contexte React est ici.

// Cycles RCP (recommandations ERC/AHA 2021)
export const CYCLE_ANALYSE_S = 120; // analyse rythme DSA toutes les 2 min
export const CYCLE_ADRE_S = 240; // adrénaline toutes les 4 min après la 1re dose

export const BPM_OPTIONS = [100, 110, 120];

// ─────────────────────────────────────────────────────────
// Coach mode : 3 états cyclables persistés en localStorage
//   full   = visuel + bips + métronome + voix (TTS)
//   visual = visuel + bips + métronome (sans voix) — sweet spot SAUV bruyante
//   silent = aucun feedback (pas de bip, pas de zoom, pas de voix)
// ─────────────────────────────────────────────────────────
export const COACH_LS_KEY = "mediurg-acr-coach";
export const COACH_NEXT = { full: "visual", visual: "silent", silent: "full" } as const;
export const COACH_ICON = { full: "🔊", visual: "👁", silent: "🔇" } as const;
export const COACH_NAME = { full: "Complet", visual: "Visuel", silent: "Muet" } as const;
export const COACH_TITLE = {
  full: "Coach complet (visuel + bips + voix) — clic pour visuel sans voix",
  visual: "Coach visuel (bips, voix coupée) — clic pour silencieux",
  silent: "Silencieux (aucun feedback) — clic pour coach complet",
} as const;

// ─────────────────────────────────────────────────────────
// Préparation DSA — checklist ACLS High-Performance CPR
// Affichée en overlay « zoom » 15s avant l'analyse rythme.
// Principe ACLS clé : Charging during compressions
// (anticiper la charge sans interrompre le MCE) + minimiser
// la pause péri-choc et le post-shock pause = 0.
// Chaque étape a une fenêtre [from..to] (en s avant T-0).
// ─────────────────────────────────────────────────────────
export const ACLS_PREP_STEPS = [
  { icon: "⚡", label: "Charger le défib · MCE continue", from: 15, to: 11 },
  { icon: "🔄", label: "Préparer relève masseur · cycle 2 min", from: 10, to: 6 },
  { icon: "🗣", label: "Annoncer « on s'écarte » · arrêt MCE", from: 5, to: 2 },
  { icon: "👁", label: "Analyse ≤ 10 s · reprise MCE immédiate", from: 1, to: 0 },
];

// ─────────────────────────────────────────────────────────
// Mini-fiches préparation pour overlay rapide pendant le chrono.
// Source : PREP_KITS.acr.drogues + DRUGS[Adrénaline/Cordarone].prep.pedTable.
// Volontairement condensé : pendant une ACR, on n'a pas le temps de lire 700
// lignes de fiche médicament — juste la dose, comment la préparer, comment
// l'injecter. Bouton « Fiche complète ↗ » disponible pour le détail.
// ─────────────────────────────────────────────────────────
export const PREP_CONTENT = {
  Adrénaline: {
    icon: "⚡",
    couleur: "#7C3AED",
    adulte: {
      dose: "1 mg IV/IO toutes les 3-5 min",
      pure: true,
      etapes: [
        "Préparer une seringue de 10 mL : 10 ampoules 1 mg/1 mL (1:1000)",
        "Seringue finale : 10 mL = 10 mg · concentration 1 mg/mL",
        "Injecter 1 mL = 1 mg PUR en IVD à chaque dose (toutes les 3-5 min)",
        "Flush 20 mL NaCl 0,9% après chaque dose",
      ],
      notes: [
        "Au plus proche du patient (VVP ou IO proximale)",
        "Seringue prête = 10 doses d'avance (≈ 40 min de RCP)",
        "Compatible NaCl 0,9% et G5%",
      ],
    },
    enfant: {
      dose: "10 µg/kg IV/IO (max 1 mg/dose) toutes les 4 min",
      pure: false,
      etapes: [
        "Ampoule 1 mg/1 mL — prélever 1 mL + qsp 10 mL NaCl 0,9%",
        "Concentration finale : 0,1 mg/mL = 100 µg/mL",
        "Injecter 0,1 mL/kg = 10 µg/kg en IVD",
        "Flush 5-10 mL NaCl 0,9% après",
      ],
      notes: ["Renouveler toutes les 4 min (= tous les 2 cycles RCP)"],
    },
  },
  Amiodarone: {
    icon: "💓",
    couleur: "#0EA5E9",
    adulte: {
      dose: "300 mg après 3e CEE · 150 mg après 5e CEE",
      pure: true,
      etapes: [
        "1ère dose : 2 ampoules 150 mg/3 mL = 300 mg PUR — bolus IV",
        "Récidive : 1 ampoule 150 mg/3 mL = 150 mg PUR — bolus IV",
        "Flush G5% après — PAS de NaCl 0,9%",
      ],
      notes: [
        "G5% STRICT — précipite avec NaCl 0,9%",
        "Changer tubulures à chaque seringue (corrosion PVC)",
      ],
    },
    enfant: {
      dose: "5 mg/kg IV après 3e CEE (max 300 mg/dose)",
      pure: false,
      etapes: [
        "1 ampoule 150 mg/3 mL + 12 mL G5% → 10 mg/mL (15 mL total)",
        "Injecter 0,5 mL/kg = 5 mg/kg en bolus IV",
        "Flush G5% après",
      ],
      notes: ["G5% STRICT — incompatible NaCl 0,9%", "Répéter après 5e CEE si FV/TV persistante"],
    },
  },
};

// ─────────────────────────────────────────────────────────
// Causes réversibles (H&T) — affichées en collapsible dans la phase actions.
// Différence majeure ERC vs ACLS :
//   ERC 4H/4T : regroupe acidose dans "métabolique", regroupe thrombose en un seul T
//   ACLS 5H/5T : sépare H+ acidose, sépare thrombose pulmonaire / coronaire
// Volontairement courts (1 phrase d'intervention) — en réa pas le temps de lire.
// ─────────────────────────────────────────────────────────
export const HT_CAUSES = {
  erc: [
    {
      id: "hypoxie",
      icon: "🫁",
      nom: "Hypoxie",
      action: "O2 100%, vérifier IOT/ventilation/auscultation",
    },
    {
      id: "hypovol",
      icon: "💧",
      nom: "Hypovolémie",
      action: "Remplissage cristalloïdes 500 mL, hémorragie ?",
    },
    {
      id: "metab",
      icon: "⚗️",
      nom: "Métabolique / K+",
      action: "Iono, gaz : Ca²⁺ + bicarb si K+, insuline + G30%",
    },
    {
      id: "hypotherm",
      icon: "❄️",
      nom: "Hypothermie",
      action: "Température centrale, réchauffement actif",
    },
    {
      id: "pneumo",
      icon: "🎈",
      nom: "Pneumothorax suffocant",
      action: "Exsufflation 2e EIC LMC + drainage thoracique",
    },
    {
      id: "tampon",
      icon: "❤️",
      nom: "Tamponnade",
      action: "Écho FAST, péricardiocentèse écho-guidée",
    },
    {
      id: "toxiques",
      icon: "☠️",
      nom: "Toxiques",
      action: "Antidote ciblé (bicarb 8,4% si tricycliques, glucagon...)",
    },
    {
      id: "thrombo",
      icon: "🩸",
      nom: "Thrombose (pulm/coro)",
      action: "Fibrinolyse si EP / coro si IDM probable",
    },
  ],
  acls: [
    {
      id: "hypoxie",
      icon: "🫁",
      nom: "Hypoxia",
      action: "O2 100%, vérifier IOT/ventilation/auscultation",
    },
    {
      id: "hypovol",
      icon: "💧",
      nom: "Hypovolemia",
      action: "Remplissage cristalloïdes 500 mL, hémorragie ?",
    },
    {
      id: "hion",
      icon: "⚗️",
      nom: "H⁺ (acidose)",
      action: "Gaz, bicarb 1 mEq/kg si pH < 7,1 ou TCA tricycliques",
    },
    {
      id: "kalemie",
      icon: "⚡",
      nom: "Hypo/Hyperkaliémie",
      action: "Iono : Ca²⁺ + bicarb + insuline si K+ élevé",
    },
    {
      id: "hypotherm",
      icon: "❄️",
      nom: "Hypothermia",
      action: "Température centrale, réchauffement actif",
    },
    {
      id: "pneumo",
      icon: "🎈",
      nom: "Tension pneumothorax",
      action: "Exsufflation 2e EIC LMC + drainage thoracique",
    },
    {
      id: "tampon",
      icon: "❤️",
      nom: "Tamponade cardiaque",
      action: "Écho FAST, péricardiocentèse écho-guidée",
    },
    {
      id: "toxiques",
      icon: "☠️",
      nom: "Toxins",
      action: "Antidote ciblé (bicarb 8,4%, glucagon, naloxone...)",
    },
    {
      id: "thrombo-p",
      icon: "🫁",
      nom: "Thrombose pulmonaire",
      action: "Fibrinolyse (alteplase 50 mg IVD) si EP probable",
    },
    {
      id: "thrombo-c",
      icon: "💔",
      nom: "Thrombose coronaire",
      action: "Coronarographie en urgence post-ROSC",
    },
  ],
};

// ─────────────────────────────────────────────────────────
// Post-ROSC — 4 cartes compactes (objectifs chiffrés affichés d'un coup d'œil)
// Source : ILCOR 2022 + ERC 2021 post-resuscitation care.
// Volontairement très court : une cible chiffrée + une action.
// ─────────────────────────────────────────────────────────
export const POST_ROSC_TARGETS = [
  {
    icon: "🩸",
    cat: "Hémodynamique",
    cible: "PAM ≥ 65 mmHg",
    action: "Remplissage · Noradré IVSE · push-dose adré 10-20 µg si hypoTA transitoire",
  },
  {
    icon: "🫁",
    cat: "Ventilation",
    cible: "SpO₂ 94-98% · EtCO₂ 35-45",
    action: "Éviter hyperO₂ et hyperventilation",
  },
  {
    icon: "🧠",
    cat: "Neuro / température",
    cible: "T° ≤ 37,7 °C",
    action: "Contrôle ciblé température · pas de sédation profonde si neuro évaluable",
  },
  {
    icon: "📊",
    cat: "ECG & cause",
    cible: "ECG 12 dériv · gaz · lactates",
    action: "Coronarographie en urgence si STEMI ou choc cardiogénique",
  },
];
