export const PROTOCOLS = [
  {
    id: 1,
    code: "PISU 1",
    version: "2",
    valide: "01/01/2024",
    titre: "Détresse Respiratoire Aiguë — Adulte",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "Recommandations SPLF + SFMU — Prise en charge des crises de l'exacerbation sévère d'asthme 2018",
    service: "SMUR",
    couleur: "#0EA5E9",
    icon: "🫁",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Détresse respiratoire aiguë avec FR ≥ 25 cycles/min et/ou SpO₂ ≤ 94 %" },
          { text: "Dyspnée inhabituelle à composante expiratoire avec sifflements chez une victime présentant un antécédent d'asthme ou de BPCO" },
        ],
      },
      {
        titre: "Critères d'exclusion",
        type: "exclusion",
        items: [
          { text: "Bradypnée < 10 cycles/min" },
        ],
      },
      {
        titre: "Signes de gravité",
        type: "gravite",
        items: [
          { text: "Troubles de la conscience, agitation, sueurs, cyanose, anxiété" },
          { text: "Altération de la fluence verbale" },
          { text: "FR > 30 cycles/min" },
          { text: "FC > 120 bpm, PAS < 90 mmHg" },
          { text: "Non amélioration de la SpO₂ sous O₂ ou résistance au traitement habituel" },
          { text: "Pour l'asthmatique : ATCD d'asthme aiguë grave ou séjour en réanimation" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Demander ou faire demander un renfort médical en présence de signes de gravité." },
          { text: "Installer la victime en position demi-assise." },
          { text: "Oxygénothérapie pour un objectif de SpO₂ > 94 % ou ≥ 92 % chez le BPCO." },
          {
            text: "Administrer, en cas d'antécédent d'asthme ou BPCO :",
            sub: [
              "Aérosol Terbutaline 5 mg + Ipratropium 0,5 mg QSP 5 mL de NaCl 0,9 % sous oxygène 6 L/min. À renouveler l'aérosol de Terbutaline 5 mg en l'absence d'amélioration.",
            ],
          },
          { text: "Poser une VVP avec du NaCl 0,9 % 500 mL débit 80 mL/h." },
          {
            text: "Administrer en cas d'antécédent d'asthme :",
            sub: [
              "Méthylprednisolone (Solumédrol®) 1 mg/kg sans dépasser 120 mg IVD lente.",
            ],
          },
          { text: "Pratiquer une ventilation artificielle à l'aide de l'insufflateur manuel en présence de signes d'épuisement ou de troubles de la conscience." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "Paramètres vitaux dont FR et FC" },
          { text: "Apparition d'éventuel signe d'épuisement ou de troubles de la conscience" },
          { text: "Efficacité des thérapeutiques par la diminution des signes cliniques" },
        ],
      },
    ],
  },
  {
    id: 2,
    code: "PISU 1 ENF",
    version: "2",
    valide: "01/01/2024",
    titre: "Détresse Respiratoire Aiguë — Enfant",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "Recommandations SRLF + SFMU — Prise en charge des crises de l'exacerbation sévère d'asthme 2018",
    service: "SMUR",
    couleur: "#a855f7",
    icon: "👶",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "FR > 30 cycles/min après 6 ans, > 40 cycles/min avant 6 ans ou SpO₂ < 94 %" },
        ],
      },
      {
        titre: "Critères d'exclusion",
        type: "exclusion",
        items: [
          { text: "Bradypnée < 20 cycles/min" },
        ],
      },
      {
        titre: "Signes de gravité",
        type: "gravite",
        items: [
          { text: "Troubles de la conscience, agitation, sueurs, cyanose, anxiété" },
          { text: "Altération de la fluence verbale" },
          { text: "Signes de lutte : tirage, battements des ailes du nez" },
          { text: "FR > 40 cycles/min après 6 ans, > 50 cycles/min avant 6 ans" },
          { text: "Non amélioration de la SpO₂ sous O₂ ou résistance au traitement habituel" },
          { text: "Asthmatique : ATCD d'asthme aiguë grave" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Demander ou faire demander un renfort médical en présence de signes de gravité." },
          { text: "Installer la victime en position demi-assise." },
          { text: "Oxygénothérapie pour un objectif de SpO₂ > 94 %." },
          {
            text: "Administrer, en cas d'antécédent d'asthme :",
            sub: [
              "Âge < 6 ans : aérosol Terbutaline 2,5 mg + Ipratropium 0,25 mg + NaCl 0,9 % QSP 5 mL sous oxygène 6 L/min.",
              "Âge ≥ 6 ans : aérosol Terbutaline 5 mg + Ipratropium 0,5 mg + NaCl 0,9 % QSP 5 mL sous oxygène 6 L/min.",
            ],
          },
          { text: "À renouveler l'aérosol de Terbutaline en fonction de l'âge, en l'absence d'amélioration." },
          { text: "Poser une VVP avec du NaCl 0,9 % 500 mL débit 20 mL/h." },
          {
            text: "Administrer en cas d'antécédent d'asthme :",
            sub: [
              "Méthylprednisolone (Solumédrol®) 2 mg/kg IVD lente.",
              "ou Bétaméthasone 15 gouttes/kg per os.",
            ],
          },
          { text: "Pratiquer une ventilation artificielle à l'aide de l'insufflateur manuel en présence de signes d'épuisement ou de troubles de la conscience." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "Paramètres vitaux dont FR et FC" },
          { text: "Apparition d'éventuel signe d'épuisement ou de troubles de la conscience" },
          { text: "Efficacité des thérapeutiques par la diminution des signes cliniques" },
        ],
      },
    ],
  },
];
