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
  {
    id: 7,
    code: "PISU 3",
    version: "2",
    valide: "01/01/2024",
    titre: "Arrêt Cardio-Respiratoire — Adulte",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "Recommandations AHA ERC 2021",
    service: "SMUR",
    couleur: "#ef4444",
    icon: "💔",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Inconscience" },
          { text: "Absence de mouvements ventilatoires ou présence de gasps" },
          { text: "Absence de pouls carotidien" },
        ],
      },
      {
        titre: "Critères d'exclusion",
        type: "exclusion",
        items: [
          { text: "Absence des 3 critères d'inclusion" },
        ],
      },
      {
        titre: "Recueil de données",
        type: "recueil",
        items: [
          { text: "Heure supposée de l'ACR" },
          { text: "Délai de no-flow" },
          { text: "Causes de l'ACR (médical, traumatique, contexte de fin de vie)" },
          { text: "Âge de la victime" },
          { text: "Éventuelles directives anticipées de fin de vie" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Demander ou faire demander un renfort médical en précisant la notion d'ACR." },
          { text: "Faire débuter ou poursuivre les manœuvres de RCP de haute qualité avec utilisation de DSA." },
          { text: "Libérer les voies aériennes et réaliser, si nécessaire, l'extraction d'un corps étranger (manuellement ou à l'aide d'un laryngoscope et d'une pince de Magill)." },
          { text: "Poser une VVP tout en poursuivant la RCP et administrer NaCl 0,9 % 500 mL à 80 mL/h, ou une voie intra-osseuse si la VVP ne peut pas être obtenue immédiatement." },
          { text: "Débuter les traitements IV en fonction du caractère choquable/non choquable du rythme (cf. ci-dessous)." },
          {
            text: "Contrôler les voies aériennes tout en poursuivant la RCP :",
            sub: [
              "LMA Fastrach® (uniquement mise en place du masque laryngé). À défaut, poursuivre la ventilation au masque. La pose ne doit pas entraîner d'arrêt prolongé du MCE.",
            ],
          },
          { text: "Mettre en place l'électrocardioscope et la capnographie." },
        ],
      },
      {
        titre: "Rythme choquable",
        type: "rythme_choquable",
        items: [
          {
            text: "Après le 3ème choc inefficace :",
            sub: ["Adrénaline 1 mg IV bolus.", "Amiodarone 300 mg IV bolus."],
          },
          {
            text: "Après le 5ème choc inefficace :",
            sub: ["Adrénaline 1 mg IV bolus.", "Amiodarone 150 mg IV bolus."],
          },
          { text: "Renouveler 1 mg d'adrénaline toutes les 4 min (toutes les 2 analyses DSA) jusqu'à reprise d'activité circulatoire." },
        ],
      },
      {
        titre: "Rythme non choquable",
        type: "rythme_non_choquable",
        items: [
          { text: "Injecter toutes les 4 min (toutes les 2 analyses DSA) un bolus IV de 1 mg d'adrénaline jusqu'à reprise d'activité circulatoire." },
        ],
      },
      {
        titre: "Reprise d'activité cardiaque",
        type: "reprise",
        items: [
          { text: "Arrêter le MCE et poursuivre la ventilation artificielle à raison de 12 insufflations/min." },
          { text: "Surveiller en continu le pouls fémoral et la capnographie." },
          { text: "Mettre en place un monitorage complet avec PNI et SpO₂." },
          { text: "Réaliser un ECG 12 dérivations." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "Qualité de la RCP en continu" },
          { text: "Valeurs de capnographie en continu" },
        ],
      },
    ],
  },
  {
    id: 8,
    code: "PISU 3 ENF",
    version: "2",
    valide: "01/01/2024",
    titre: "Arrêt Cardio-Respiratoire — Enfant",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "Recommandations AHA ERC 2021",
    service: "SMUR",
    couleur: "#f43f5e",
    icon: "💔",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Inconscience" },
          { text: "Absence de mouvements ventilatoires ou présence de gasps" },
          { text: "Absence d'un pouls huméral/fémoral/carotidien (en fonction de l'âge)" },
        ],
      },
      {
        titre: "Critères d'exclusion",
        type: "exclusion",
        items: [
          { text: "Absence des 3 critères d'inclusion" },
        ],
      },
      {
        titre: "Recueil de données",
        type: "recueil",
        items: [
          { text: "Heure supposée de l'ACR" },
          { text: "Délai de no-flow" },
          { text: "Causes de l'ACR" },
          { text: "Âge de la victime" },
          { text: "Antécédents médico-chirurgicaux pertinents" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Demander ou faire demander un renfort médical en précisant la notion d'ACR." },
          { text: "Faire débuter ou poursuivre les manœuvres de RCP de haute qualité et mettre en œuvre le DSA." },
          { text: "Libérer les VAS et réaliser si nécessaire l'extraction d'un corps étranger à l'aide du laryngoscope et de la pince de Magill." },
          { text: "Privilégier une ventilation efficace, préalable indispensable à tout autre geste technique." },
          { text: "Préparer une VVP avec du NaCl 0,9 % à 20 mL/h. Poser une VVP ou une voie intra-osseuse si VVP non obtenue immédiatement." },
          { text: "Débuter les traitements IV en fonction du caractère choquable/non choquable du rythme (cf. ci-dessous)." },
          {
            text: "Contrôler les voies aériennes :",
            sub: [
              "LMA Fastrach® si poids > 30 kg. À défaut, poursuivre la ventilation au masque. La pose ne doit pas entraîner d'arrêt prolongé du MCE.",
            ],
          },
          { text: "Mettre en place l'électrocardioscope et la capnographie." },
        ],
      },
      {
        titre: "Rythme choquable",
        type: "rythme_choquable",
        items: [
          {
            text: "Après le 3ème choc inefficace :",
            sub: ["Adrénaline 0,01 mg/kg IV bolus.", "Amiodarone 5 mg/kg IV bolus."],
          },
          {
            text: "Après le 5ème choc inefficace :",
            sub: ["Adrénaline 0,01 mg/kg IV bolus.", "Amiodarone 5 mg/kg IV bolus."],
          },
          { text: "Renouveler 0,01 mg/kg d'adrénaline toutes les 4 min (toutes les 2 analyses DSA) jusqu'à reprise d'activité circulatoire." },
        ],
      },
      {
        titre: "Rythme non choquable",
        type: "rythme_non_choquable",
        items: [
          { text: "Injecter toutes les 4 min (toutes les 2 analyses DSA) un bolus IV de 0,01 mg/kg d'adrénaline jusqu'à reprise d'activité circulatoire." },
        ],
      },
      {
        titre: "Reprise d'activité cardiaque",
        type: "reprise",
        items: [
          { text: "Arrêter le MCE et poursuivre la ventilation artificielle en adaptant la fréquence aux valeurs physiologiques de l'enfant." },
          { text: "Surveiller en continu le pouls fémoral/huméral/carotidien et la capnographie." },
          { text: "Mettre en place un monitorage complet avec PNI et SpO₂." },
          { text: "Réaliser un ECG 12 dérivations." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "Qualité de la RCP en continu" },
          { text: "Valeurs de capnographie en continu" },
        ],
      },
    ],
  },
  {
    id: 9,
    code: "PISU 6 ENF",
    version: "2",
    valide: "01/01/2024",
    titre: "Convulsions — Enfant",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "Recommandations RFE SFLF SFMU — État de mal épileptique 2018",
    service: "SMUR",
    couleur: "#8b5cf6",
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
          { text: "Âge inférieur à 2 ans" },
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
          { text: "Recueil d'éléments : heure de début, durée, nombre d'épisodes, type de crise, état de conscience inter-crise, contexte (hyperthermie, traumatisme), antécédents d'épilepsie, traitements en cours." },
          { text: "Paramètres vitaux : FC, PA, SpO₂, FR, glycémie capillaire (obj. 1,4–1,8 g/L) et température." },
          { text: "Demander ou faire demander un renfort médical en présence d'élément de gravité." },
          { text: "Libérer et protéger les VAS, mettre la victime en PLS dès que possible. Oxygénothérapie si besoin (obj. SpO₂ 95–99 %)." },
          { text: "Administrer 0,5 mg/kg de Diazépam par voie intra-rectale, maximum 10 mg." },
          { text: "Mettre en place une VVP avec du NaCl 0,9 % 500 mL à 20 mL/h." },
          { text: "En cas de persistance de la crise au-delà de 5 min après la 1ère administration et après contact du médecin régulateur : administrer une seconde dose IR identique à la première." },
          { text: "Ou si VVP disponible : administrer 0,3 mg/kg de Diazépam en IVL." },
          { text: "Administration de 15 mg/kg de paracétamol en cas d'hyperthermie supérieure à 38,5 °C." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "État de conscience, SpO₂, FR, glycémie (si hypoglycémie), température (si hyperthermie), TA" },
          { text: "Liberté des VAS et état de conscience" },
          { text: "Éventuelle récidive des convulsions" },
        ],
      },
    ],
  },
  {
    id: 10,
    code: "PISU 7",
    version: "2",
    valide: "01/01/2024",
    titre: "Hypoglycémie Symptomatique",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "",
    service: "SMUR",
    couleur: "#ca8a04",
    icon: "🍬",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Glycémie capillaire < 0,6 g/L associée à une symptomatologie : troubles de la conscience, troubles du comportement, déficit neurologique, sensation de malaise avec faiblesse et sueurs" },
        ],
      },
      {
        titre: "Critères d'exclusion",
        type: "exclusion",
        items: [
          { text: "Absence de retentissement clinique" },
        ],
      },
      {
        titre: "Signes de gravité",
        type: "gravite",
        items: [
          { text: "Présence de convulsions" },
          { text: "Glasgow < 7" },
          { text: "Absence de régression des signes cliniques lors de la correction de la glycémie > 1 g/L" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Demander un renfort médical en cas de signes de gravité." },
          { text: "Recueil d'éléments : antécédents de diabète et traitement (per os, insuline SC ou pompe), contexte de survenue (observance, repas, prise de toxique)." },
          { text: "Arrêt ou retrait de la pompe à insuline en cas de présence." },
          { text: "Administrer 20 mL de Glucose 30 % per os si le patient est conscient et non somnolent." },
          { text: "Poser une VVP avec du Glucose 5 % 250 mL à 80 mL/h (ou 20 mL/h pour un enfant) et injecter 20 mL de Glucose 30 % en IVL (ou 1 mL/kg jusqu'à 20 kg chez l'enfant)." },
          { text: "Contrôler la glycémie et renouveler l'administration de 20 mL de Glucose 30 % après 5 minutes si besoin, objectif glycémie capillaire > 1,00 g/L." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "État de conscience" },
          { text: "Renouvellement de la glycémie capillaire en cas de modification de l'état clinique" },
        ],
      },
    ],
  },
  {
    id: 11,
    code: "PISU 8",
    version: "2",
    valide: "01/01/2023",
    titre: "Brûlure",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "Recommandations SFAR — Prise en charge du brûlé grave 2018",
    service: "SMUR",
    couleur: "#ea580c",
    icon: "🔥",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Brûlures du 2ème ou du 3ème degré" },
        ],
      },
      {
        titre: "Critères d'exclusion",
        type: "exclusion",
        items: [
          { text: "Brûlures du 1er degré" },
        ],
      },
      {
        titre: "Signes de gravité",
        type: "gravite",
        items: [
          { text: "Présence de brûlures au niveau du cou avec risque d'atteinte respiratoire" },
          { text: "Brûlure circulaire" },
          { text: "Surface brûlée > 20 % chez l'adulte et > 10 % chez l'enfant" },
          { text: "Présence de 3ème degré" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Évaluation précise de la surface brûlée (règle de Wallace, application E-burn), localisation, degré, poids du patient." },
          { text: "Contexte de survenue, agent physique ou chimique en cause." },
          { text: "Demander un renfort médical en cas de signes de gravité." },
          { text: "Refroidissement des brûlures si surface < 20 % (adulte) ou < 10 % (enfant), sauf si température < 36 °C — pendant 20 min puis pansement stérile sec." },
          { text: "Mettre en place une VVP avec du NaCl 0,9 % à 20 mL/kg la première heure si surface brûlée > 20 % (adulte) ou > 10 % (enfant)." },
          { text: "Lutte contre l'hypothermie." },
          { text: "Application du PISU 10 si besoin." },
          { text: "ECG en cas de brûlure électrique." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "La température" },
          { text: "Évaluation antalgique" },
        ],
      },
    ],
  },
  {
    id: 12,
    code: "PISU 9",
    version: "2",
    valide: "01/01/2024",
    titre: "Intoxication aux Fumées d'Incendie",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "",
    service: "SMUR",
    couleur: "#78716c",
    icon: "🌫️",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Argument clinique d'inhalation de fumées d'incendie : suies en regard des VAS, dysphonie, brûlures du visage, toux" },
        ],
      },
      {
        titre: "Signes de gravité",
        type: "gravite",
        items: [
          { text: "Signes de toxicité systémique : trouble hémodynamique et/ou trouble neurologique, ACR" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Recueil d'éléments : temps d'exposition, taux CO en air ambiant et/ou SpCO, lésions associées." },
          { text: "Demander ou faire demander un renfort si présence de signes de gravité." },
          { text: "Administration d'O₂ au masque à haute concentration." },
          { text: "Mettre en place une VVP avec du NaCl 0,9 % 500 mL à 80 mL/h." },
          {
            text: "En cas de signes de gravité, administrer en 15 min :",
            sub: [
              "Adulte : 5 g d'hydroxocobalamine (Cyanokit®).",
              "Enfant : 70 mg/kg d'hydroxocobalamine (Cyanokit®).",
            ],
          },
          { text: "Réaliser un ECG." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "Mise en place de l'électrocardioscope" },
          { text: "Efficacité des thérapeutiques" },
        ],
      },
    ],
  },
  {
    id: 13,
    code: "PISU 10",
    version: "2",
    valide: "01/01/2024",
    titre: "Douleur Aiguë — Adulte",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "Recommandations RFE SFAR SFMU — Sédation et analgésie en structure d'urgence 2010",
    service: "SMUR",
    couleur: "#10b981",
    icon: "💊",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Douleur aiguë avec EVA ou Échelle Numérique > 3" },
        ],
      },
      {
        titre: "Critères d'exclusion",
        type: "exclusion",
        items: [
          { text: "Trouble de la conscience" },
        ],
      },
      {
        titre: "Signes de gravité",
        type: "gravite",
        items: [
          { text: "Présence d'une détresse vitale" },
          { text: "Instabilité hémodynamique" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Recueil d'éléments descriptifs de la douleur : EN/EVA, contexte de survenue, évolutivité, traitement antérieur." },
          {
            text: "En fonction de l'EVA ou EN :",
            sub: [
              "EVA < 3 : surveillance simple.",
              "EVA 3 à 6 : VVP NaCl 0,9 % 80 mL/h + Paracétamol 1 000 mg en 15 min (sauf allergie ou prise < 6h).",
              "EVA > 6 : VVP NaCl 0,9 % 80 mL/h + Paracétamol 1 000 mg en 15 min + titration morphine : bolus 2 mg (poids < 60 kg) ou 3 mg (poids ≥ 60 kg) toutes les 5 min, objectif EVA/EN < 3.",
            ],
          },
          { text: "Oxygénothérapie pour un objectif de SpO₂ > 94 %." },
          { text: "Contacter le médecin régulateur en cas de dose cumulée de morphine ≥ 10 mg." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "Réévaluation de l'EN ou EVA avant chaque bolus de morphine" },
          { text: "Surveillance continue : conscience, FR, SpO₂" },
          { text: "En cas de surdosage morphinique : contacter le médecin régulateur. Si besoin : naloxone 0,04 mg toutes les 2 min jusqu'à normalisation de la FR et de l'état de conscience." },
        ],
      },
    ],
  },
  {
    id: 14,
    code: "PISU 10 ENF",
    version: "2",
    valide: "01/01/2024",
    titre: "Douleur Aiguë — Enfant",
    auteurs: ["Dr NOIZET", "Dr DE CARLO"],
    ref: "Recommandations RFE SFAR SFMU — Sédation et analgésie en structure d'urgence 2010",
    service: "SMUR",
    couleur: "#059669",
    icon: "💊",
    sections: [
      {
        titre: "Critères d'inclusion",
        type: "inclusion",
        items: [
          { text: "Douleur aiguë avec EVA, Échelle Numérique ou EVENDOL > 3" },
          { text: "Âge > 6 mois" },
        ],
      },
      {
        titre: "Critères d'exclusion",
        type: "exclusion",
        items: [
          { text: "Trouble de la conscience" },
          { text: "Âge < 6 mois" },
        ],
      },
      {
        titre: "Signes de gravité",
        type: "gravite",
        items: [
          { text: "Présence d'une détresse vitale" },
          { text: "Instabilité hémodynamique" },
        ],
      },
      {
        titre: "Actions et actes infirmiers",
        type: "actions",
        items: [
          { text: "Recueil d'éléments descriptifs de la douleur : EN/EVA/EVENDOL, contexte de survenue, évolutivité, traitement antérieur." },
          {
            text: "En fonction de l'EVA (ou EN ou EVENDOL) :",
            sub: [
              "EVA < 3 : surveillance simple.",
              "EVA 3 à 6 : VVP NaCl 0,9 % 20 mL/h + Paracétamol 15 mg/kg en 15 min (sauf allergie ou prise < 6h).",
              "EVA > 6 : VVP NaCl 0,9 % 20 mL/h + Paracétamol 15 mg/kg en 15 min + titration morphine : dose de charge 0,05 mg/kg puis bolus 0,01 mg/kg toutes les 5 min, objectif EVA/EN < 3.",
            ],
          },
          { text: "Oxygénothérapie pour un objectif de SpO₂ > 94 %." },
          { text: "Contacter le médecin régulateur en cas d'administration de 5 bolus." },
        ],
      },
      {
        titre: "Surveillance",
        type: "surveillance",
        items: [
          { text: "Réévaluation de l'EN ou EVA avant chaque bolus de morphine" },
          { text: "Surveillance continue : conscience, FR, SpO₂" },
          { text: "En cas de surdosage morphinique : contacter le médecin régulateur. Si besoin : naloxone 0,04 mg toutes les 2 min jusqu'à normalisation de la FR et de l'état de conscience." },
        ],
      },
    ],
  },
];
