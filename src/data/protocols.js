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
  {
    id: 3,
    code: "PISU 2",
    version: "2",
    valide: "01/01/2024",
    titre: "Réaction Anaphylactique Sévère — Adulte",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "Recommandations ERC 2021",
    service: "SMUR",
    couleur: "#dc2626",
    icon: "⚠️",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Apparition brutale d'au moins deux des signes suivants après suspicion d'exposition à un allergène :" },
          { text: "Réaction urticarienne cutanéomuqueuse (éruption, prurit et/ou œdème), signes digestifs" },
          { text: "Hypotension artérielle avec PAS < 90 mmHg" },
          { text: "Bronchospasme responsable d'une dyspnée asthmatiforme" },
        ],
      },
      {
        titre: "Critères d'exclusion",
        type: "exclusion",
        items: [
          { text: "Réaction urticarienne cutanéomuqueuse isolée" },
        ],
      },
      {
        titre: "Signes de gravité",
        type: "gravite",
        items: [
          { text: "Raucité de la voix, altération de la fluence verbale, sueurs, cyanose" },
          { text: "FR > 30 cycles/min, SpO₂ < 94 %" },
          { text: "FC > 120 bpm, PAS < 90 mmHg" },
          { text: "Marbrures" },
          { text: "Altération de l'état de conscience ou agitation" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Éviction de l'allergène si possible." },
          { text: "Demander ou faire demander un renfort médical en présence de signes de gravité." },
          { text: "Mettre la victime en décubitus dorsal (en l'absence de signe respiratoire) ou dans la position la mieux tolérée." },
          { text: "Oxygénothérapie pour un objectif de SpO₂ > 94 %." },
          {
            text: "Administrer, en cas de présence d'au moins 2 critères d'inclusion :",
            sub: [
              "Adrénaline 0,5 mg IM face latéro-externe du tiers moyen de la cuisse.",
            ],
          },
          {
            text: "Poser une VVP et administrer :",
            sub: [
              "NaCl 0,9 % 500 mL sur 10 min, puis poursuivre le remplissage en adaptant le débit à la clinique, sans dépasser 20 mL/kg au total.",
            ],
          },
          { text: "En l'absence de réponse tensionnelle ou clinique favorable après 5 minutes, administrer une seconde dose d'adrénaline 0,5 mg IM." },
          { text: "En cas de dyspnée asthmatiforme, cf. PISU 1." },
          { text: "En cas d'ACR, cf. PISU 3." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "Efficacité des thérapeutiques par l'amélioration des signes cliniques et des paramètres vitaux" },
          { text: "Apparition d'éventuel signe d'épuisement ou de troubles de la conscience" },
        ],
      },
    ],
  },
  {
    id: 4,
    code: "PISU 4",
    version: "2",
    valide: "01/01/2024",
    titre: "Hémorragie Sévère",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "Recommandations RFE SFAR — Choc hémorragique 2015",
    service: "SMUR",
    couleur: "#b91c1c",
    icon: "🩸",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Contexte d'hémorragie externe, extériorisée ou de suspicion d'hémorragie interne" },
          { text: "Tachycardie > 110 bpm ou PAs < 90 mmHg" },
          { text: "Pour les enfants : PAs < aux normes ; FC > aux normes" },
        ],
      },
      {
        titre: "Signes de gravité",
        type: "gravite",
        items: [
          { text: "Troubles de la conscience" },
          { text: "Signes périphériques de choc" },
          { text: "Tachypnée" },
          { text: "Hemocue < 8 g/dL" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Demander ou faire demander un renfort médical en cas de signes de gravité." },
          {
            text: "Prioriser les gestes secouristes :",
            sub: [
              "Stopper une éventuelle hémorragie externe par la technique adaptée : pansement compressif, pansement hémostatique, garrot.",
              "Poser devant une suspicion de traumatisme du bassin une ceinture pelvienne.",
              "Installer la victime en décubitus dorsal et en position déclive en l'absence de détresse respiratoire.",
              "Administrer de l'oxygène.",
              "Prévenir l'hypothermie et réchauffer si nécessaire.",
            ],
          },
          { text: "Poser une VVP de gros calibre avec le Ringer Lactate 500 mL à défaut du NaCl 0,9 % 500 mL." },
          { text: "Administrer du NaCl 0,9 % 500 mL sur 10 min, puis poursuivre le remplissage en adaptant le débit à la clinique sans dépasser 20 mL/kg au total ou 1 000–1 500 mL chez l'adulte." },
          { text: "Pour les enfants : administrer Ringer Lactate à défaut du NaCl 0,9 %, 10 mL/kg en 15 min, à renouveler selon la clinique." },
          { text: "Poser une seconde VVP." },
          {
            text: "Administrer :",
            sub: [
              "1 g d'acide tranexamique (Exacyl®) dilué dans 100 mL de NaCl 0,9 % en 10 min.",
              "Pour les enfants : 10 mg/kg d'acide tranexamique (Exacyl®) dilué dans 100 mL de NaCl 0,9 % en 20 min.",
            ],
          },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "Efficacité des gestes de contrôle de l'hémorragie" },
          { text: "Correction de l'hypovolémie : amélioration de l'état de conscience, diminution de la FC, remontée de la PA, régression des signes périphériques de choc" },
          { text: "FR et SpO₂" },
          { text: "Perméabilité des perfusions" },
          { text: "Objectifs adulte : PAS 80–90 mmHg · PAM 80 mmHg si TC grave" },
        ],
      },
    ],
  },
  {
    id: 5,
    code: "PISU 5",
    version: "2",
    valide: "01/01/2024",
    titre: "Douleur Thoracique Non Traumatique",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "",
    service: "SMUR",
    couleur: "#f97316",
    icon: "❤️",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Douleur thoracique et/ou épigastrique avec ou sans irradiation" },
        ],
      },
      {
        titre: "Critères d'exclusion",
        type: "exclusion",
        items: [
          { text: "Douleur thoracique d'origine traumatique" },
        ],
      },
      {
        titre: "Signes de gravité",
        type: "gravite",
        items: [
          { text: "Présence d'un ou de plusieurs signes de détresse vitale" },
          { text: "Sensation de mort imminente" },
          { text: "Troubles du rythme visible à l'électrocardioscopie" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Recueil d'éléments : circonstances de survenue, qualification de la douleur, heure de début, signes associés, antécédents personnels et familiaux, facteurs de risque cardio-vasculaire, traitement en cours." },
          { text: "Installer la victime au repos, en position demi-assise ou en décubitus dorsal." },
          { text: "Paramètres vitaux : état de conscience, pouls, FC, PA aux 2 bras, FR." },
          { text: "Mettre en place l'électrocardioscope et réaliser une surveillance continue." },
          { text: "Mettre en place une VVP avec du Glucose 5 % 250 mL à 80 mL/h." },
          { text: "Réaliser et transmettre au médecin régulateur un ECG 18 dérivations." },
          { text: "Oxygénothérapie si SpO₂ < 90 %." },
          { text: "Contact avec médecin régulateur pour définir la stratégie thérapeutique et service de destination." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "Monitorage ECG en continu" },
          { text: "Réaliser un nouvel ECG en cas de modification de la douleur" },
        ],
      },
    ],
  },
  {
    id: 6,
    code: "PISU 6",
    version: "2",
    valide: "01/01/2024",
    titre: "Convulsions — Adulte",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "Recommandations RFE SRLF SFMU — État de mal épileptique 2018",
    service: "SMUR",
    couleur: "#7c3aed",
    icon: "🧠",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Crise convulsive généralisée (en cours)" },
        ],
      },
      {
        titre: "Critères d'exclusion",
        type: "exclusion",
        items: [
          { text: "Absence de trouble de la conscience" },
        ],
      },
      {
        titre: "Signes de gravité",
        type: "gravite",
        items: [
          { text: "Durée des convulsions supérieure à 5 min" },
          { text: "Succession de crises convulsives sans amélioration de la conscience" },
          { text: "Phase postcritique supérieure à 30 min" },
          { text: "Détresse respiratoire soutenue" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Recueil d'éléments : heure de début, durée, nombre d'épisodes, type de crise, état de conscience inter-crise, contexte (hyperthermie, intoxication, traumatisme, grossesse), antécédents d'épilepsie, d'AVC, de TC, diabète et traitements en cours." },
          { text: "Paramètres vitaux : FC, PA, SpO₂, FR, glycémie capillaire et température. (Si hypoglycémie, cf. PISU 7)" },
          { text: "Demander ou faire demander un renfort médical en présence d'élément de gravité." },
          { text: "Libérer et protéger les VAS, mettre la victime en PLS dès que possible. Oxygénothérapie si besoin (obj. SpO₂ 95–99 %)." },
          { text: "Mettre en place une VVP avec du NaCl 0,9 % 500 mL à 80 mL/h." },
          {
            text: "Administrer en présence de convulsions :",
            sub: [
              "1 mg de clonazépam (Rivotril®) en IVD lente.",
              "En cas d'échec de VVP : 0,15 mg/kg de midazolam en IM.",
            ],
          },
          { text: "En cas de persistance de la crise au-delà de 5 min après la 1ère administration, administrer après contact du médecin régulateur : 1 mg de clonazépam (Rivotril®) en IVD lente." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "TA, SpO₂, glycémie (si hypoglycémie initialement), température (si hyperthermie initialement)" },
          { text: "Liberté des VAS et état de conscience" },
          { text: "Éventuelle récidive des convulsions" },
        ],
      },
    ],
  },
];
