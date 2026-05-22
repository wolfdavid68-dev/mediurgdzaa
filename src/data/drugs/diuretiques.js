// ============================================================
// MediURG — Catégorie : Diurétiques
// 1 médicament.
// Auto-extrait de drugs.js (split par catégorie).
// ============================================================

export const DRUGS_DIURETIQUES = [
  {
    id: 36,
    nom: "LASILIX",
    commercial: "Furosémide",
    dci: "Furosémide",
    classe: "Diurétique de l'anse",
    cat: "Diurétiques",
    svc: ["SMUR", "SAU"],
    couleur: "#64D2FF",
    icon: "💧",
    desc: "Diurétique de l'anse. Produit qui précipite avec de nombreux autres thérapeutiques — se référer au tableau des incompatibilités. Rincer la tubulure avant et après l'injection. Stabilité à la lumière 12h.",
    indic: ["OAP cardiogénique", "Surcharge hydrosodée", "Hypercalcémie sévère"],
    ci: ["Hypovolémie", "Anurie", "Allergie sulfamides (rare)", "Hypokaliémie sévère non corrigée"],
    ei: [
      "Hypokaliémie, hyponatrémie",
      "Déshydratation",
      "Ototoxicité (injection rapide)",
      "Incompatibilité avec nombreux médicaments",
    ],
    cond: ["Ampoule 20 mg/2 mL", "Ampoule 250 mg/25 mL"],
    poso: {
      a: [
        "IVD : administrer PUR en bolus",
        "PSE : administrer PUR (ampoule 250 mg/25 mL)",
        "OAP : 40-80 mg IV (doubler si < 40 mL/h diurèse)",
        "Entretien PSE : 5-20 mg/h",
        "RINCER tubulure avant/après",
        "Voies : VVP ou VVC",
      ],
      p: ["1-2 mg/kg IV (max 6 mg/kg/j)"],
    },
    prep: {
      solvant: "Pur (IVD) ou NaCl 0,9% (PSE)",
      volume_final: null,
      conc_finale: "10 mg/mL (pur)",
      conc_produit: 10,
      unite: "mg",
      dose_kg: 0.5,
      dose_max_kg: 1,
      duree: "Bolus IV lent > 2 min",
      stabilite: "Utiliser immédiatement",
      etapes: [
        "Ampoule 20 mg/2 mL (10 mg/mL) — administrer pure en bolus",
        "PSE entretien : ampoule 250 mg/25 mL dans NaCl 0,9%",
        "Ototoxicité si injection rapide : toujours > 2 min",
      ],
      notes: ["Rincer la tubulure avant et après (incompatibilités nombreuses)"],
    },
  },
];
