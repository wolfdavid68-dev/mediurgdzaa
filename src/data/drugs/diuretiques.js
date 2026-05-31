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
      solvant: "Pur",
      volume_final: null,
      conc_finale: "10 mg/mL (pur)",
      conc_produit: 10,
      unite: "mg",
      duree: "Bolus ou PSE pur",
      stabilite: "Utiliser immédiatement",
      preparations: [
        {
          titre: "IVD OAP",
          mode: "bolus",
          population: "adulte",
          tag: "40-80 mg",
          phase_doses: [
            {
              label: "Injecter",
              dose_fixed: 40,
              dose_max_fixed: 80,
              unit: "mg",
              suffix: " IVD pur en bolus > 2 min",
            },
          ],
          hide_final: true,
          etapes: [
            "Ampoule 20 mg/2 mL (10 mg/mL) — administrer pure en bolus",
            "OAP : 40-80 mg IV",
            "Doubler si diurèse < 40 mL/h",
          ],
          notes: [
            "Rincer la tubulure avant et après",
            "Ototoxicité si injection rapide : toujours > 2 min",
          ],
        },
        {
          titre: "PSE",
          mode: "pse",
          population: "adulte",
          tag: "5-20 mg/h",
          prelever: "Ampoule 250 mg/25 mL (10 mg/mL) — utiliser pure",
          rate_label: "Débit",
          rate_value: "5-20 mg/h = 0,5-2 mL/h",
          hide_final: true,
          etapes: [
            "Ampoule 250 mg/25 mL (10 mg/mL)",
            "PSE : administrer pur",
            "Entretien PSE : 5-20 mg/h",
          ],
          notes: ["Rincer la tubulure avant et après"],
        },
        {
          titre: "IVD enfant",
          mode: "bolus",
          population: "enfant",
          tag: "1-2 mg/kg",
          phase_doses: [
            {
              label: "Injecter",
              dose_kg: 1,
              dose_max_kg: 2,
              unit: "mg",
              suffix: " IV lent > 2 min",
            },
          ],
          hide_final: true,
          etapes: [
            "Ampoule 20 mg/2 mL (10 mg/mL) — administrer pure",
            "Dose enfant : 1-2 mg/kg IV",
            "Maximum 6 mg/kg/j",
          ],
          notes: [
            "Rincer la tubulure avant et après",
            "Ototoxicité si injection rapide : toujours > 2 min",
          ],
        },
      ],
    },
  },
];
