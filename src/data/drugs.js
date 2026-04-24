export const DRUGS = [
  {
    id:1, nom:"Altéplase", commercial:"ACTILYSE", dci:"Altéplase (rt-PA)", classe:"Fibrinolytique", cat:"Thrombolyse", svc:["SAUV"],
    couleur:"#FF375F", icon:"🔓",
    desc:"Activateur tissulaire du plasminogène recombinant. Convertit le plasminogène en plasmine, dissolve les thrombus fibrineux.",
    indic:["IDM STEMI si délai PCI > 120 min","EP massive avec instabilité hémodynamique","AVC ischémique < 4h30 si éligible","Thrombose de prothèse valvulaire"],
    ci:["Hémorragie active ou récente < 3 mois","Chirurgie majeure < 10 jours","AVC < 3 mois ou ATCD hémorragie intracrânienne","HTA > 180/110 non contrôlée","Ponction artérielle non compressible récente"],
    ei:["Hémorragie majeure (risque principal)","Hémorragie intracrânienne (1-3%)","Hypotension","Arythmies de reperfusion","Anaphylaxie (rare)"],
    cond:["Poudre IV 10 mg + solvant","Poudre IV 50 mg + solvant"],
    poso:{a:["IDM : 15 mg bolus IV, puis 0,75 mg/kg /30 min (max 50 mg), puis 0,5 mg/kg /60 min (max 35 mg)","EP massive : 100 mg IV sur 2h","AVC : 0,9 mg/kg IV (max 90 mg) dont 10% en bolus puis reste sur 60 min"],p:["Non recommandé < 18 ans sauf cas exceptionnels spécialisés"]}
  },
  {
    id:2, nom:"Néfopam", commercial:"ACUPAN", dci:"Néfopam chlorhydrate", classe:"Antalgique central non opioïde", cat:"Analgésie", svc:["SAUV"],
    couleur:"#34C759", icon:"💆",
    desc:"Antalgique central non opioïde, non AINS. Inhibe la recapture des monoamines et antagonisme NMDA partiel. Pas d'effet anti-inflammatoire.",
    indic:["Douleurs aiguës modérées à intenses","Douleurs post-opératoires","Épargne morphinique (association)","Alternative morphine si CI"],
    ci:["Épilepsie non contrôlée","Rétention urinaire, obstacle prostatique","Glaucome à angle fermé","IDM récent","Association IMAO"],
    ei:["Sueurs, vertiges, nausées (fréquents)","Tachycardie, HTA","Somnolence","Troubles urinaires","Hallucinations (surdosage)"],
    cond:["Ampoule 20 mg/2 mL (10 mg/mL)"],
    poso:{a:["20 mg IV dilué dans 100 mL NaCl 0,9%, perfusion 15-20 min","Répéter /4-6h (max 120 mg/j)","IM : 20 mg /4-6h"],p:["Non recommandé < 15 ans"]}
  },
  {
    id:3, nom:"Adrénaline", commercial:"ADRÉNALINE", dci:"Épinéphrine", classe:"Catécholamine α/β agoniste", cat:"Urgence vitale", svc:["SAUV","SMUR"],
    couleur:"#FF3B30", icon:"⚡",
    desc:"Catécholamine endogène agoniste α et β-adrénergique. Vasoconstricteur puissant, bronchodilatateur, chronotrope et inotrope positif. Indispensable en ACR et anaphylaxie.",
    indic:["Arrêt cardio-respiratoire (ACR) — 1ère ligne","Choc anaphylactique — 1ère ligne","Bradycardie sévère réfractaire à l'atropine","Bronchospasme sévère réfractaire"],
    ci:["Aucune absolue en ACR","Relative : HTA sévère, coronaropathie, hyperthyroïdie","Anesthésie à l'halothane"],
    ei:["Tachycardie, arythmies ventriculaires","HTA sévère, angor","Tremblements, anxiété","Nécrose tissulaire si extravasation"],
    cond:["Ampoule 1 mg/1 mL (1:1000)","Ampoule 0,1 mg/1 mL (1:10000)","Stylo auto-injecteur 0,3 mg (EpiPen®)"],
    poso:{a:["ACR : 1 mg IV/IO toutes les 3-5 min","Anaphylaxie : 0,3-0,5 mg IM face ant. cuisse","Choc : 0,1-1 µg/kg/min IVSE (voie centrale idéale)"],p:["ACR : 10 µg/kg IV/IO (max 1 mg/dose)","Anaphylaxie : 0,01 mg/kg IM (max 0,5 mg)","< 15 kg : EpiPen Jr 0,15 mg"]}
  },
  {
    id:4, nom:"Flumazénil", commercial:"ANEXATE", dci:"Flumazénil", classe:"Antagoniste benzodiazépines", cat:"Antidotes", svc:["SAUV","SMUR"],
    couleur:"#FF2D55", icon:"🔄",
    desc:"Antagoniste compétitif spécifique des récepteurs GABA-A aux BZD. Renverse rapidement les effets sédatifs. Demi-vie courte (60-90 min) < BZD → risque récidive sédation.",
    indic:["Surdosage aux benzodiazépines avec dépression respiratoire","Levée de sédation post-procédurale","Coma d'étiologie incertaine (test diagnostique)","Sédation excessive per-procédurale"],
    ci:["Épilepsie traitée par BZD (risque convulsions de sevrage)","Intoxication mixte tricycliques (convulsions)","HTA intracrânienne sévère"],
    ei:["Syndrome de sevrage brutal aux BZD","Convulsions","Nausées, vomissements","Agitation, anxiété","Récidive sédation (t½ court)"],
    cond:["Ampoule 0,5 mg/5 mL (0,1 mg/mL) — ANEXATE®","Ampoule 1 mg/10 mL"],
    poso:{a:["0,2 mg IV en 15 sec, puis 0,1 mg /60 sec jusqu'au réveil (max 1 mg)","Si récidive sédation : 0,1-0,4 mg/h IVSE"],p:["0,01 mg/kg IV (max 0,2 mg/dose), répéter /60 sec jusqu'au réveil (max 1 mg)"]}
  },
  {
    id:5, nom:"Aspégic", commercial:"ASPEGIC", dci:"Acétylsalicylate de DL-Lysine (AAS)", classe:"Antiplaquettaire / AINS", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"💊",
    desc:"Inhibiteur irréversible de la COX-1 bloquant la thromboxane A2. Antiagrégant plaquettaire définitif pour toute la durée de vie de la plaquette (7-10 j).",
    indic:["SCA (IDM STEMI et NSTEMI) — 1ère ligne","Angor instable","AVC ischémique / AIT (dose antiagrégante)","Prévention secondaire cardiovasculaire"],
    ci:["Allergie aspirine / AINS (urticaire, bronchospasme)","Ulcère gastroduodénal évolutif","Hémorragie active","Grossesse 3e trimestre"],
    ei:["Hémorragie digestive","Bronchospasme (asthme à l'aspirine)","Thrombopénie (rare)","Syndrome de Reye (enfant < 12 ans, CI absolue)"],
    cond:["Sachet 250 mg PO/IV (Aspégic®)","Sachet 500 mg PO/IV","Comprimé 75-100 mg PO"],
    poso:{a:["SCA : 250-500 mg PO ou IV (sachet dissous dans eau)","Antiagrégant chronique : 75-100 mg/j PO"],p:["CI < 12 ans (syndrome de Reye)","≥ 12 ans si SCA : 250-500 mg PO"]}
  },
  {
    id:6, nom:"Atropine", commercial:"ATROPINE", dci:"Atropine sulfate", classe:"Anticholinergique (parasympatholytique)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"♥",
    desc:"Antagoniste compétitif muscarinique de l'acétylcholine. Accélère la FC, réduit les sécrétions glandulaires, bronchodilatateur et mydriase.",
    indic:["Bradycardie symptomatique (chute PA, malaise)","BAV 1er degré et 2e type Mobitz I","Intoxication organophosphorés / insecticides cholinergiques","Prémédication hypersécrétion, per-ISR"],
    ci:["Glaucome à angle fermé","Adénome prostate avec rétention urinaire","Tachycardie sinusale préexistante","Mégacôlon toxique, iléus paralytique"],
    ei:["Tachycardie excessive","Rétention urinaire","Mydriase, sécheresse muqueuses","Confusion (sujet âgé)","Hyperthermie (enfant)"],
    cond:["Ampoule 0,25 mg/1 mL","Ampoule 0,5 mg/1 mL","Ampoule 1 mg/1 mL"],
    poso:{a:["Bradycardie : 0,5-1 mg IV /5 min (max 3 mg total)","Organophosphorés : 2-4 mg IV en bolus, répéter jusqu'à atropinisation (max 50 mg)","Prémédication : 0,5 mg IM 30 min avant"],p:["0,02 mg/kg IV (min 0,1 mg, max 0,5 mg/dose)","Organophosphorés : 0,05 mg/kg IV, répéter","Dose min 0,1 mg (bradycardie paradoxale si < 0,1 mg)"]}
  },
  {
    id:7, nom:"Augmentin", commercial:"AUGMENTIN", dci:"Amoxicilline + Acide clavulanique", classe:"Antibiotique pénicilline + inhibiteur β-lactamase", cat:"Infectiologie", svc:["SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"Association aminopénicilline + inhibiteur de β-lactamase. Large spectre incluant germes producteurs de pénicillinase. Bactéricide.",
    indic:["Infections ORL et respiratoires basses communautaires","Infections cutanées et des parties molles","Infections urinaires compliquées","Morsures animales / humaines","Infections abdominales (en association)"],
    ci:["Allergie pénicillines avec anaphylaxie","Antécédent d'ictère/hépatite à l'amoxicilline-clavulanique","Mononucléose infectieuse EBV (rash cutané)"],
    ei:["Diarrhée, nausées (fréquents)","Hépatite cholestatique (clavulanate, tardive)","Allergie cutanée, anaphylaxie","Colite à Clostridioides difficile"],
    cond:["Flacon poudre IV 1 g/200 mg — AUGMENTIN®","Comprimé 500/125 mg et 875/125 mg PO"],
    poso:{a:["IV : 1 g/200 mg toutes les 8h","PO : 875/125 mg × 2/j ou 500/125 mg × 3/j (max 3 g amoxicilline/j)"],p:["IV : 100 mg/kg/j d'amoxicilline en 3 injections (max 3 g/j)","PO : 80 mg/kg/j amoxicilline en 3 prises (max 3 g/j)"]}
  },
  {
    id:8, nom:"Bicarbonate 4,2%", commercial:"BICARBONATE MOLAIRE 4,2%", dci:"Bicarbonate de sodium 4,2%", classe:"Alcalinisant isotonique (semi-molaire)", cat:"Métabolique", svc:["SAU"],
    couleur:"#FFD60A", icon:"⚗️",
    desc:"Solution semi-molaire (500 mmol/L) isotonique. Correction de l'acidose métabolique sévère. Moins irritant que le 8,4%, utilisable en voie périphérique.",
    indic:["Acidose métabolique sévère pH < 7,20","Intoxication tricycliques (alcalinisation plasmatique)","Hyperkaliémie sévère (en complément)","Réanimation néonatale"],
    ci:["Alcalose préexistante","Hypernatrémie / hyperosmolarité","Œdème pulmonaire (apport sodé important)","Incompatible avec adrénaline et calcium IV"],
    ei:["Hypernatrémie, hyperosmolarité","Alcalose métabolique de rebond","Hypokaliémie, hypocalcémie ionisée"],
    cond:["Flacon 250 mL à 4,2%","Ampoule 10 mL à 4,2%"],
    poso:{a:["0,5-1 mmol/kg IV en 20-30 min","Tricycliques : 1-2 mmol/kg bolus IV (objectif pH 7,45-7,55)"],p:["1-2 mEq/kg IV lent (toujours dilué 1:1 chez NN)","Réanimation NN : 1-2 mEq/kg en 2 min"]}
  },
  {
    id:9, nom:"Bicarbonate 8,4%", commercial:"BICARBONATE MOLAIRE 8,4%", dci:"Bicarbonate de sodium 8,4%", classe:"Alcalinisant molaire hypertonique", cat:"Métabolique", svc:["SAUV","SMUR"],
    couleur:"#FFD60A", icon:"⚗️",
    desc:"Solution molaire (1000 mmol/L) hypertonique. Puissant alcalinisant. Indispensable en ACR prolongé > 15-20 min. Voie centrale ou dilué chez l'enfant.",
    indic:["ACR prolongé > 15-20 min (acidose sévère)","Acidose métabolique pH < 7,10","Hyperkaliémie menaçante avec signes ECG","Intoxication tricycliques, cocaïne"],
    ci:["Alcalose préexistante","Hypernatrémie / hyperosmolarité sévère","Ne JAMAIS mélanger avec adrénaline ou calcium"],
    ei:["Hypernatrémie, hyperosmolarité sévère","Alcalose post-réanimation","Hypokaliémie, hypocalcémie","Nécrose tissulaire si extravasation (pH très alcalin)"],
    cond:["Ampoule 10 mL à 8,4% (1 mmol/mL)","Flacon 250 mL à 8,4%"],
    poso:{a:["ACR : 1 mEq/kg IV bolus (= 50 mL), puis 0,5 mEq/kg /10 min","Acidose : 0,3 × poids × (24 − HCO3- mesuré) en mmol"],p:["1 mEq/kg IV lent — TOUJOURS dilué 1:1 avec NaCl 0,9% chez enfant","ACR : 1 mEq/kg IV"]}
  },
  {
    id:10, nom:"Esmolol", commercial:"BREVIBLOC", dci:"Esmolol chlorhydrate", classe:"Bêtabloquant β1-sélectif ultracourt", cat:"Cardiologie", svc:["SAUV"],
    couleur:"#FF9500", icon:"📉",
    desc:"Bêtabloquant β1-cardiosélectif d'action ultracourte (t½ = 9 min) par hydrolyse par estérases érythrocytaires. Parfaitement titrable en IVSE.",
    indic:["FA / Flutter à réponse ventriculaire rapide","Tachycardie sinusale hémodynamiquement délétère","Dissection aortique (contrôle FC + PA)","HTA péri-opératoire sévère"],
    ci:["BAV 2e/3e degré sans PM","Bradycardie < 60/min","Asthme / bronchospasme actif sévère","Insuffisance cardiaque décompensée","Choc cardiogénique"],
    ei:["Bradycardie, BAV","Hypotension","Bronchospasme (β2 résiduel)","Phlébite (solution concentrée)"],
    cond:["Ampoule 10 mg/10 mL — BREVIBLOC®","Ampoule 100 mg/10 mL","Flacon 2500 mg/250 mL (IVSE)"],
    poso:{a:["Dose de charge : 500 µg/kg/min sur 1 min IV","Entretien : 50-200 µg/kg/min IVSE (paliers 50 µg/kg/min /4 min)"],p:["100-500 µg/kg/min IVSE (données limitées)"]}
  },
  {
    id:11, nom:"Sugammadex", commercial:"BRIDION", dci:"Sugammadex", classe:"Antagoniste curares stéroïdiens (cyclodextrine γ)", cat:"Antidotes", svc:["REA"],
    couleur:"#FF2D55", icon:"🔓",
    desc:"Cyclodextrine γ-modifiée encapsulant le rocuronium et vécuronium dans un complexe inactif éliminé par voie rénale. Antagonisme direct, complet et rapide.",
    indic:["Décurarisation après rocuronium ou vécuronium","Curarisation résiduelle post-opératoire","Cannot intubate cannot oxygenate sur rocuronium (antagonisme d'urgence)","Antagonisme bloc profond en réanimation"],
    ci:["Allergie sugammadex","Insuffisance rénale sévère (accumulation)","Grossesse (données insuffisantes)"],
    ei:["Bradycardie (rare)","Anaphylaxie / hypersensibilité","Recurarisation si dose insuffisante"],
    cond:["Flacon 200 mg/2 mL — BRIDION®","Flacon 500 mg/5 mL"],
    poso:{a:["Bloc modéré : 2 mg/kg IV bolus","Bloc profond : 4 mg/kg IV bolus","Antagonisme d'urgence RSI rocuronium : 16 mg/kg IV bolus rapide"],p:["2-4 mg/kg IV selon profondeur","Antagonisme d'urgence : 16 mg/kg IV"]}
  },
  {
    id:12, nom:"Ticagrélor", commercial:"BRILIQUE", dci:"Ticagrélor", classe:"Antiplaquettaire inhibiteur P2Y12 (réversible)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"💊",
    desc:"Inhibiteur réversible du récepteur P2Y12 à l'ADP. Action plus rapide et puissante que le clopidogrel. Pas de conversion hépatique nécessaire.",
    indic:["SCA (STEMI et NSTEMI) en bithérapie avec aspirine","Prévention secondaire après IDM","AVC ischémique / AIT (certaines situations)"],
    ci:["Hémorragie active","Antécédent d'hémorragie intracrânienne","Insuffisance hépatique sévère"],
    ei:["Hémorragie (risque majeur)","Dyspnée (20% — mécanisme adénosinergique, non grave)","Bradycardie","Élévation créatinine et uricémie"],
    cond:["Comprimé 90 mg — BRILIQUE®","Comprimé 60 mg (prévention secondaire)"],
    poso:{a:["SCA : dose de charge 180 mg PO unique, puis 90 mg × 2/j","Prévention secondaire : 60 mg × 2/j"],p:["Non recommandé < 18 ans"]}
  },
  {
    id:13, nom:"Budésonide", commercial:"PULMICORT", dci:"Budésonide", classe:"Corticoïde inhalé / nébulisé", cat:"Pneumologie", svc:["SAUV","SMUR"],
    couleur:"#30D158", icon:"🌬️",
    desc:"Corticoïde à action topique bronchique et sous-glottique puissante. Réduit l'œdème muqueux. Délai d'action 30-60 min. Efficacité prouvée dans la laryngite.",
    indic:["Laryngite sous-glottique (croup) modérée à sévère","Asthme aigu (complément bronchodilatateur)","Exacerbation BPCO (adjuvant)","Bronchiolite sévère (usage controversé)"],
    ci:["Tuberculose pulmonaire active non traitée","Infections fongiques pulmonaires"],
    ei:["Candidose oropharyngée (rincer la bouche après)","Dysphonie","Rares effets systémiques à doses habituelles"],
    cond:["Ampoule nébulisation 0,5 mg/2 mL — PULMICORT®","Ampoule 1 mg/2 mL"],
    poso:{a:["Nébulisation : 2 mg en dose unique (ou 2 × 1 mg)"],p:["Croup : 2 mg en nébulisation sur 15 min (répétable à 12h)","< 6 mois : 1 mg/dose","Alternative à l'adrénaline nébulisée"]}
  },
  {
    id:14, nom:"Gluconate de Calcium", commercial:"CALCIUM", dci:"Gluconate de calcium 10%", classe:"Sel calcique IV (cardioprotecteur)", cat:"Métabolique", svc:["SAUV","SMUR"],
    couleur:"#FFD60A", icon:"⚗️",
    desc:"Apport calcique IV. Stabilise la membrane myocardique en cas d'hyperkaliémie. Moins irritant que CaCl2 (10× moins de Ca2+ élémentaire). Voie périphérique possible.",
    indic:["Hyperkaliémie sévère avec signes ECG (cardioprotection — effet immédiat)","Hypocalcémie symptomatique (tétanie, convulsions, laryngospasme)","Intoxication inhibiteurs calciques","Brûlures acide fluorhydrique (HF)"],
    ci:["Hypercalcémie préexistante","Traitement digitalique en cours (arythmies graves)","Ne pas mélanger avec bicarbonates (précipitation)"],
    ei:["Bradycardie si injection rapide","Phlébite","Nécrose cutanée si extravasation (moins qu'avec CaCl2)"],
    cond:["Ampoule 10 mL à 10% (1 g = 93 mg Ca2+ élémentaire)"],
    poso:{a:["Hyperkaliémie ECG : 10-20 mL IV lent sur 5-10 min (répétable après 5 min)","Hypocalcémie sympt. : 10 mL à 10% IV lent en 10 min"],p:["0,5-1 mL/kg de gluconate 10% IV sur 5-10 min (max 10 mL/dose)"]}
  },
  {
    id:15, nom:"Chlorure de Potassium", commercial:"CHLORURE DE POTASSIUM", dci:"Chlorure de potassium (KCl)", classe:"Électrolyte — MÉDICAMENT À RISQUE", cat:"Métabolique", svc:["SAUV"],
    couleur:"#FF3B30", icon:"⚠️",
    desc:"Apport potassique IV. PRODUIT À HAUT RISQUE D'ERREUR MÉDICAMENTEUSE. Ne jamais injecter en bolus IV direct (arrêt cardiaque immédiat). Toujours diluer.",
    indic:["Hypokaliémie sévère < 2,5 mEq/L","Hypokaliémie avec signes ECG (ondes U, allongement QT)","Correction carence lors de renutrition","Prévention hypokaliémie sous diurétiques de l'anse"],
    ci:["⚠️ JAMAIS EN BOLUS IV DIRECT — arrêt cardiaque immédiat","Hyperkaliémie préexistante","Anurie sans contrôle de la diurèse"],
    ei:["Arrêt cardiaque si IV rapide (DANGER MAJEUR)","Brûlures veineuses / phlébite (solution concentrée)","Hyperkaliémie par surdosage"],
    cond:["Ampoule 10 mEq/10 mL (1 mEq/mL)","Ampoule 20 mEq/10 mL (2 mEq/mL)"],
    poso:{a:["TOUJOURS DILUER : max 40 mEq/L en voie périphérique, 80 mEq/L en VVC","Vitesse max : 10-20 mEq/h (20 mEq/h sous scope et monitoring continu en urgence)"],p:["0,5-1 mEq/kg/j IV (toujours dilué)","Max 0,5 mEq/kg/h sous scope continu — jamais sans monitoring"]}
  },
  {
    id:16, nom:"Céfotaxime", commercial:"CLAFORAN", dci:"Céfotaxime sodique", classe:"Céphalosporine 3e génération (C3G)", cat:"Infectiologie", svc:["SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"C3G bactéricide à large spectre avec excellente diffusion méningée. Active sur entérobactéries et cocci gram+/- (sauf Pseudomonas et entérocoques).",
    indic:["Méningite bactérienne (+ dexaméthasone si indiqué)","Sepsis sévère communautaire","Infections graves à entérobactéries","Pneumopathie sévère (en association)"],
    ci:["Allergie céphalosporines","Allergie pénicillines sévère (10% allergie croisée, prudence)"],
    ei:["Diarrhées, nausées","Phlébite voie IV","Allergie cutanée (éruption maculo-papuleuse)","Colite à Clostridioides difficile"],
    cond:["Poudre IV 500 mg, 1 g, 2 g — CLAFORAN®"],
    poso:{a:["Méningite : 200-300 mg/kg/j en 4-6 injections IV (max 12 g/j)","Sepsis grave : 3-6 g/j en 3 injections IV"],p:["50-100 mg/kg/j en 2-3 injections","Méningite : 200-300 mg/kg/j en 4 injections (max 12 g/j)"]}
  },
  {
    id:17, nom:"Suxaméthonium", commercial:"CELOCURINE", dci:"Suxaméthonium chlorure", classe:"Curare dépolarisant", cat:"Curares", svc:["SMUR"],
    couleur:"#8E8E93", icon:"🔒",
    desc:"Curare dépolarisant mimant l'acétylcholine sur la plaque motrice. Curarisation complète ultra-rapide (45-60 sec) et courte (8-12 min). Référence ISR estomac plein.",
    indic:["ISR (intubation à séquence rapide) estomac plein — référence","Laryngospasme sévère","Situation cannot intubate (récupération spontanée courte)"],
    ci:["Hyperkaliémie ou risque (brûlés > J3, paralysies chroniques > 24h, polytraumatisé > J3)","Myopathie de Duchenne / dystrophinopathies (rabdomyolyse + hyperkaliémie)","Allergie suxaméthonium","Glaucome à angle fermé (relatif)"],
    ei:["Hyperkaliémie (+0,5 mEq/L en aigu, +5-10 mEq/L si CI)","Bradycardie (2e dose ou enfant)","Myalgies post-opératoires","Trismus / contracture masséter","Hyperthermie maligne (rare)"],
    cond:["Ampoule 200 mg/10 mL (20 mg/mL) — CELOCURINE®"],
    poso:{a:["ISR : 1-1,5 mg/kg IV bolus (100 mg pour 70 kg)"],p:["2 mg/kg IV (nourrisson et enfant < 12 ans)","Prudence absolue si myopathie — préférer rocuronium + sugammadex"]}
  },
  {
    id:18, nom:"Cisatracurium", commercial:"NIMBEX", dci:"Cisatracurium bésilate", classe:"Curare non dépolarisant (benzylisoquinoline)", cat:"Curares", svc:["SAUV"],
    couleur:"#8E8E93", icon:"🔒",
    desc:"Curare non dépolarisant à durée intermédiaire. Métabolisme par dégradation de Hofmann (indépendant foie/rein). Choix de référence en insuffisance d'organe.",
    indic:["Intubation orotrachéale (délai action 2-3 min)","Curarisation longue durée en réanimation","Insuffisance hépatique ou rénale sévère nécessitant un curare"],
    ci:["Allergie curares benzylisoquinolines","Myasthénie gravis (prudence extrême)","Syndrome de Lambert-Eaton"],
    ei:["Bloc neuromusculaire prolongé si surdosage","Curarisation résiduelle au réveil","Faible libération histamine (avantage vs atracurium)"],
    cond:["Ampoule 10 mg/5 mL (2 mg/mL) — NIMBEX®"],
    poso:{a:["Intubation : 0,15 mg/kg IV (délai 2-3 min)","Entretien réa : 3 µg/kg/min IVSE"],p:["0,1-0,15 mg/kg IV","Entretien : 1-2 µg/kg/min"]}
  },
  {
    id:19, nom:"Clonazépam", commercial:"RIVOTRIL", dci:"Clonazépam", classe:"Benzodiazépine antiépileptique", cat:"Neurologie", svc:["SAUV","SMUR"],
    couleur:"#5856D6", icon:"🧠",
    desc:"BZD à fort pouvoir antiépileptique. Potentialise GABA-A. Demi-vie longue (20-40h). Référence SMUR pour les états de mal épileptiques avec le midazolam.",
    indic:["État de mal épileptique convulsif et non convulsif (1ère/2e ligne)","Crises épileptiques en cours","Spasmes infantiles (syndrome de West)"],
    ci:["Myasthénie grave","Insuffisance respiratoire sévère non ventilée","Apnée du sommeil sévère"],
    ei:["Dépression respiratoire +++","Somnolence excessive et prolongée","Hypersécrétion bronchique (nourrisson)","Dépendance, tolérance"],
    cond:["Ampoule 1 mg/1 mL — RIVOTRIL®","Comprimé 0,5 mg et 2 mg"],
    poso:{a:["1 mg IV lent > 2 min, puis 1 mg après 5 min si besoin (max 3 mg)","IVSE EME réfractaire : 4-8 mg/24h"],p:["0,05-0,1 mg/kg IV (max 0,5 mg nourrisson, 1 mg enfant)","Répéter si besoin après 10 min"]}
  },
  {
    id:20, nom:"Clopidogrel", commercial:"PLAVIX", dci:"Clopidogrel", classe:"Antiplaquettaire inhibiteur P2Y12 (irréversible)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"💊",
    desc:"Prodrogue thiénopyridine inhibant irréversiblement le récepteur P2Y12 à l'ADP. Délai d'action 2-6h. Inhibition définitive de la plaquette (durée de vie 7-10 j).",
    indic:["SCA (IDM STEMI et NSTEMI) en bithérapie avec aspirine","Prévention secondaire AVC / AIT","AOMI avec antécédent ischémique","Après pose de stent coronaire"],
    ci:["Hémorragie active","Insuffisance hépatique sévère","Hypersensibilité"],
    ei:["Hémorragie (risque majeur)","Purpura thrombotique thrombocytopénique (rare, grave)","Troubles digestifs","Rash cutané"],
    cond:["Comprimé 75 mg — PLAVIX®","Comprimé 300 mg"],
    poso:{a:["SCA : charge 300-600 mg PO unique, puis 75 mg/j","Prévention secondaire : 75 mg/j PO"],p:["Non recommandé < 18 ans"]}
  },
  {
    id:21, nom:"Tramadol", commercial:"CONTRAMAL", dci:"Tramadol chlorhydrate", classe:"Opioïde faible / Inhibiteur recapture monoamines (palier 2)", cat:"Analgésie", svc:["SAUV"],
    couleur:"#34C759", icon:"💊",
    desc:"Analgésique palier 2 OMS à double mécanisme : agoniste µ-opioïde faible + inhibiteur recapture sérotonine/noradrénaline. Effets respiratoires moindres que morphine.",
    indic:["Douleurs modérées à sévères (palier 2)","Douleurs neuropathiques (en complément)","Douleurs post-opératoires","Douleurs cancéreuses (palier 2)"],
    ci:["Association IMAO (syndrome sérotoninergique potentiellement fatal)","Épilepsie non contrôlée","Insuffisance respiratoire sévère","Enfant < 12 ans","CI amygdalectomie/adénoïdectomie (< 18 ans, EMA)"],
    ei:["Nausées, vomissements (très fréquents)","Vertiges, somnolence","Convulsions (surdosage, terrain épileptique)","Syndrome sérotoninergique","Dépression respiratoire (moindre qu'opioïdes forts)"],
    cond:["Ampoule 100 mg/2 mL — CONTRAMAL® / TOPALGIC®","Gélule LP 100-150-200 mg PO"],
    poso:{a:["IV : 100 mg dilué dans 100 mL, perfusion 20-30 min ; puis 50-100 mg /4-6h (max 400 mg/j)","PO LP : 100-200 mg × 2/j"],p:["12-17 ans : 1-2 mg/kg IV (max 8 mg/kg/j et 400 mg/j)","CI amygdalectomie/adénoïdectomie"]}
  },
  {
    id:22, nom:"Amiodarone", commercial:"CORDARONE", dci:"Amiodarone chlorhydrate", classe:"Antiarythmique classe III (Vaughan-Williams)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"💓",
    desc:"Antiarythmique à large spectre. Allonge la période réfractaire de tous les tissus cardiaques. Bloque canaux K+, Na+, Ca2+. Demi-vie très longue (40-55 j).",
    indic:["FV / TV sans pouls réfractaire (ACR) — 3e choc","TV hémodynamiquement stable","FA / Flutter (cardioversion médicale ou contrôle fréquence)","TSV réfractaires"],
    ci:["Bradycardie < 55/min sans PM","BAV 2e/3e degré sans PM","Dysthyroïdie connue","Allergie iode","Grossesse / allaitement (relatif urgence)"],
    ei:["Hypotension, bradycardie (IV)","Toxicité pulmonaire chronique","Dysthyroïdie (hyper ou hypo)","Phlébite en voie périphérique (préférer VVC)","Photosensibilisation (long terme)"],
    cond:["Ampoule 150 mg/3 mL (50 mg/mL) — CORDARONE®","Comprimé 200 mg PO"],
    poso:{a:["ACR : 300 mg IV bolus après 3e choc, puis 150 mg si FV réfractaire","Charge : 5 mg/kg en 20-60 min (max 1200 mg/24h)","Entretien : 900 mg/24h IVSE"],p:["ACR : 5 mg/kg IV/IO bolus","Charge : 5 mg/kg en 20-60 min","Entretien : 10-15 µg/kg/min"]}
  },
  {
    id:23, nom:"Hydroxocobalamine", commercial:"CYANOKIT", dci:"Hydroxocobalamine (vitamine B12a)", classe:"Antidote cyanures", cat:"Antidotes", svc:["SMUR"],
    couleur:"#FF2D55", icon:"🔴",
    desc:"Se lie directement au cyanure (CN−) pour former la cyanocobalamine inoffensive éliminée par voie rénale. Antidote de référence des intoxications au cyanure sur incendie.",
    indic:["Intoxication au cyanure (fumées d'incendie de bâtiment)","ACR sur incendie — systématique","Suspicion CN− : lactates > 10 mmol/L + incendie","Intoxication acide cyanhydrique"],
    ci:["Allergie (peu documentée)","Ne pas associer au pentatriomate de cobalt (sauf CN− certaine)"],
    ei:["Coloration rouge des téguments, urines, muqueuses (attendue, transitoire 48h)","HTA transitoire","Bradycardie","Fausse les examens biologiques (ne pas doser sur tube rouge après injection)"],
    cond:["Flacon 5 g/250 mL (20 mg/mL) — CYANOKIT®"],
    poso:{a:["5 g IV en 15 min (perfusion)","ACR : bolus IV rapide (pas de perfusion lente)","Si persistance : 5 g supplémentaires (max 15 g total)"],p:["70 mg/kg IV en 15 min (max 5 g)","ACR : 70 mg/kg bolus IV rapide"]}
  },
  {
    id:24, nom:"Dexchlorphéniramine", commercial:"POLARAMINE", dci:"Dexchlorphéniramine maléate", classe:"Antihistaminique H1 (1ère génération, sédatif)", cat:"Urgence vitale", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"💊",
    desc:"Antihistaminique H1 sédatif de 1ère génération. ADJUVANT uniquement dans l'anaphylaxie — ne remplace jamais l'adrénaline. Antagoniste compétitif récepteurs H1.",
    indic:["Anaphylaxie (adjuvant APRÈS adrénaline + corticoïde)","Urticaire aiguë sévère","Réactions allergiques aiguës","Œdème de Quincke (adjuvant)"],
    ci:["Glaucome à angle fermé","Adénome prostate avec rétention","Association IMAO","Épilepsie (baisse seuil)"],
    ei:["Somnolence, sédation","Sécheresse buccale, vision trouble","Rétention urinaire","Tachycardie (effet anticholinergique)"],
    cond:["Ampoule 5 mg/1 mL — POLARAMINE®"],
    poso:{a:["5 mg IV lent sur 5 min ou IM","Répéter 1 fois si besoin après 30 min"],p:["0,1 mg/kg IV ou IM (max 5 mg/dose)","⚠️ Ne remplace JAMAIS l'adrénaline dans l'anaphylaxie"]}
  },
  {
    id:26, nom:"Digoxine", commercial:"DIGOXINE NATIVELLE", dci:"Digoxine", classe:"Glycoside cardiotonique (hétéroside)", cat:"Cardiologie", svc:["SAU"],
    couleur:"#FF9500", icon:"💓",
    desc:"Inhibe la Na+/K+-ATPase. Inotrope positif, chronotrope et dromotrope négatif. Index thérapeutique très étroit (toxicité fréquente). Demi-vie 36-48h.",
    indic:["FA avec réponse ventriculaire rapide (contrôle de fréquence)","Insuffisance cardiaque systolique à FA","Certaines TSV (flutter, TAJ)"],
    ci:["BAV 2e/3e degré sans PM","Syndrome de WPW (risque FV)","Hypokaliémie non corrigée","Hypertrophie sous-aortique obstructive","Tamponnade"],
    ei:["Intoxication : nausées, vomissements, bradycardie, BAV (degrés variables), TV bidirectionnelle (gravissime)","Troubles visuels (halos jaunes-verts)","Hyperkaliémie (surdosage)"],
    cond:["Ampoule 0,5 mg/2 mL — DIGOXINE NATIVELLE®","Comprimé 0,25 mg PO"],
    poso:{a:["Digitalisation IV urgence : 0,5 mg dilué sur 30 min, puis 0,25 mg /4-8h (max 1-1,5 mg total)","Entretien PO : 0,125-0,25 mg/j (adapter digoxinémie + fonction rénale)"],p:["Digitalisation : 20-40 µg/kg en 3 doses IV (½ dose initiale)"]}
  },
  {
    id:27, nom:"Propofol", commercial:"DIPRIVAN", dci:"Propofol", classe:"Anesthésique IV — émulsion lipidique (phénol)", cat:"Sédation", svc:["SAUV","SMUR"],
    couleur:"#5856D6", icon:"💉",
    desc:"Anesthésique général IV d'action ultra-rapide (onset 30-60 sec). Potentialise GABA-A. Dépression respiratoire et vasodilatation marquées. Émulsion lipidique (soja/œuf).",
    indic:["Induction anesthésie générale","Sédation procédurale courte","Sédation en réanimation (IVSE)","EME réfractaire (barbiturathérapie alternative)"],
    ci:["Allergie œuf ou soja (émulsion lipidique)","Enfant < 1 mois","Hypertriglycéridémie sévère"],
    ei:["Apnée, dépression respiratoire (très fréquent)","Hypotension marquée (vasodilatation)","Douleur à l'injection IV","Syndrome d'infusion propofol (SIPP) si ≥ 4 mg/kg/h prolongé — grave","Hypertriglycéridémie"],
    cond:["Ampoule 200 mg/20 mL (10 mg/mL) — DIPRIVAN®","Flacon 500 mg/50 mL et 1000 mg/100 mL"],
    poso:{a:["Induction : 1-2,5 mg/kg IV titration lente (réduire sujet âgé : 0,5-1 mg/kg)","Sédation proc. : 0,5-1 mg/kg IV + bolus 0,5 mg/kg si besoin","IVSE réa : 0,5-4 mg/kg/h"],p:["Induction > 3 ans : 2,5-3 mg/kg IV","CI sédation IVSE prolongée < 16 ans (risque SIPP fatal)"]}
  },
  {
    id:28, nom:"Dobutamine", commercial:"DOBUTREX", dci:"Dobutamine chlorhydrate", classe:"Catécholamine β1+β2 agoniste (inotrope positif)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"💗",
    desc:"Sympathomimétique β1-prépondérant. Inotrope positif puissant, chronotrope modéré, vasodilatateur (β2). Améliore le débit cardiaque sans majorer les résistances périphériques.",
    indic:["Choc cardiogénique","Insuffisance cardiaque décompensée avec bas débit","Test de stress pharmacologique (écho-dobutamine)","Pont vers revascularisation ou assistance ventriculaire"],
    ci:["Cardiomyopathie hypertrophique obstructive (CMHO)","Tachycardie > 130/min (aggrave ischémie)","Sténose aortique sévère"],
    ei:["Tachycardie, arythmies (augmente consommation O2)","Angor (aggrave ischémie)","Hypertension","Tremblements, céphalées"],
    cond:["Ampoule 250 mg/20 mL (12,5 mg/mL) — DOBUTREX®"],
    poso:{a:["Début : 2-5 µg/kg/min IVSE","Titration : paliers +2-3 µg/kg/min (max 20 µg/kg/min)"],p:["2-20 µg/kg/min IVSE (même schéma)","Surveillance ECG continue"]}
  },
  {
    id:29, nom:"Prasugrel", commercial:"EFIENT", dci:"Prasugrel", classe:"Antiplaquettaire inhibiteur P2Y12 (thiénopyridine)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"💊",
    desc:"Prodrogue thiénopyridine, inhibiteur irréversible P2Y12. Plus puissant et à délai plus court que le clopidogrel. Métabolisme hépatique plus prévisible.",
    indic:["SCA avec stratégie d'angioplastie programmée (STEMI, NSTEMI)","Non-répondeurs ou allergie clopidogrel"],
    ci:["Antécédent d'AVC ou AIT — CONTRE-INDICATION ABSOLUE","Hémorragie active","Âge ≥ 75 ans (relative, risque hémorragique accru)","Poids < 60 kg (relative)","Insuffisance hépatique sévère"],
    ei:["Hémorragie (risque supérieur au clopidogrel)","PTT (rare, grave)","Dyspnée (rare)"],
    cond:["Comprimé 5 mg et 10 mg — EFIENT®"],
    poso:{a:["Charge : 60 mg PO dose unique","Entretien : 10 mg/j PO (5 mg/j si ≥ 75 ans ou < 60 kg)"],p:["Non recommandé < 18 ans"]}
  },
  {
    id:30, nom:"Éphédrine", commercial:"EPHEDRINE", dci:"Éphédrine chlorhydrate", classe:"Sympathomimétique mixte α/β (direct + indirect)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"📈",
    desc:"Agoniste adrénergique mixte (direct α/β + indirect libérateur noradrénaline). Vasoconstricteur, bronchodilatateur, inotrope. Tachyphylaxie rapide si doses répétées.",
    indic:["Hypotension per-anesthésique (rachianesthésie, péridurale)","Hypotension induite médicamenteuse","Bloc sympathique sur ALR"],
    ci:["HTA sévère non contrôlée","Hyperthyroïdie","Coronaropathie ischémique non contrôlée","Association IMAO"],
    ei:["Tachycardie, arythmies","HTA rebond","Céphalées","Tachyphylaxie (doses répétées — efficacité réduite)"],
    cond:["Ampoule 30 mg/1 mL — EPHEDRINE® Renaudin","Souvent diluée à 3 mg/mL pour titration"],
    poso:{a:["Bolus IV : 3-6 mg, répéter selon PAM cible (titration)","Total max : 30-60 mg par épisode"],p:["0,1 mg/kg IV (max 10 mg/dose)"]}
  },
  {
    id:31, nom:"Urapidil", commercial:"EUPRESSYL", dci:"Urapidil", classe:"Antihypertenseur (antagoniste α1 + agoniste 5-HT1A)", cat:"Cardiologie", svc:["SAUV"],
    couleur:"#FF9500", icon:"📉",
    desc:"Vasodilatateur artériel par bloc α1 périphérique ET action centrale sérotoninergique (réduction tonus sympathique central). Pas de tachycardie réflexe.",
    indic:["Urgences hypertensives avec souffrance d'organe (encéphalopathie, dissection)","HTA sévère péri-opératoire","Pré-éclampsie sévère / éclampsie"],
    ci:["Sténose aortique sévère","Coarctation de l'aorte","Grossesse (1er trimestre)"],
    ei:["Hypotension orthostatique","Céphalées, nausées","Tachycardie modérée (rare)","Fatigue"],
    cond:["Ampoule 50 mg/10 mL (5 mg/mL) — EUPRESSYL®"],
    poso:{a:["Bolus IV : 12,5-25 mg lent, répéter selon PA (max 50 mg par épisode)","IVSE : 9-30 mg/h (titration selon objectif tensionnel)"],p:["Non validé < 18 ans"]}
  },
  {
    id:32, nom:"Rocuronium", commercial:"ESMERON", dci:"Rocuronium bromure", classe:"Curare non dépolarisant (aminostéroïde)", cat:"Curares", svc:["SAUV","SMUR"],
    couleur:"#8E8E93", icon:"🔒",
    desc:"Curare non dépolarisant à délai rapide (60-90 sec à dose ISR). Alternative au suxaméthonium. Antagonisable par sugammadex (avantage majeur en cas de cannot intubate).",
    indic:["ISR — alternative au suxaméthonium si CI","Intubation orotrachéale programmée","Curarisation de confort en réanimation","Curarisation prolongée"],
    ci:["Allergie rocuronium / curares stéroïdiens","Myasthénie gravis (prudence extrême)","TOUJOURS avoir sugammadex disponible avant injection"],
    ei:["Bloc neuromusculaire prolongé (durée d'action 30-60 min à dose ISR)","Curarisation résiduelle au réveil","Anaphylaxie (plus fréquente que suxaméthonium)","Vagolytique modéré (légère tachycardie)"],
    cond:["Ampoule 50 mg/5 mL (10 mg/mL) — ESMERON®","Ampoule 100 mg/10 mL"],
    poso:{a:["ISR : 1,2 mg/kg IV bolus (délai 60-90 sec)","Intubation standard : 0,6 mg/kg IV (délai 90-120 sec)","Entretien réa : 0,1-0,15 mg/kg bolus ou 0,3-0,6 mg/kg/h IVSE"],p:["ISR : 1,2 mg/kg IV","Standard : 0,6 mg/kg IV"]}
  },
  {
    id:33, nom:"Esoméprazole", commercial:"INEXIUM", dci:"Esoméprazole magnésique", classe:"Inhibiteur de la pompe à protons (IPP)", cat:"Gastro-entérologie", svc:["SAU"],
    couleur:"#32D74B", icon:"🟢",
    desc:"IPP inhibant la H+/K+-ATPase de la cellule pariétale gastrique. Réduit la sécrétion acide de 90-95%. Forme lévogyre de l'oméprazole.",
    indic:["Hémorragie digestive haute sur ulcère gastro-duodénal","Œsophagite peptique sévère","Prévention ulcères de stress en réanimation","RGO sévère","Syndrome de Zollinger-Ellison"],
    ci:["Hypersensibilité IPP","Association atazanavir / nelfinavir (antiviraux VIH)"],
    ei:["Diarrhée, nausées, céphalées","Hyponatrémie, hypomagnésémie (usage prolongé)","Infections digestives à Clostridium","Ostéoporose (long terme)"],
    cond:["Poudre IV 40 mg — INEXIUM®","Gélule 20 mg et 40 mg PO"],
    poso:{a:["Hémorragie digestive : 80 mg IV bolus, puis 8 mg/h IVSE × 72h","Standard : 40 mg/j IV ou PO"],p:["1-11 ans : 10-20 mg/j PO selon poids","IV : 0,5-1 mg/kg/j (max 40 mg)"]}
  },
  {
    id:34, nom:"Étomidate", commercial:"ETOMIDATE LIPURO", dci:"Étomidate", classe:"Anesthésique IV (imidazole) — émulsion lipidique", cat:"Sédation", svc:["SAUV","SMUR"],
    couleur:"#5856D6", icon:"💉",
    desc:"Anesthésique général IV d'action rapide (30-60 sec). Peu de retentissement hémodynamique — agent privilégié du patient instable. Inhibe transitoirement la stéroïdogenèse surrénalienne.",
    indic:["ISR du patient hémodynamiquement instable (choc, sepsis, hypovolémie)","Induction anesthésique — alternative propofol si instabilité","Protection cérébrale (réduit CMRO2)"],
    ci:["Insuffisance corticosurrénalienne connue (relative — inhibe 11β-hydroxylase)","Porphyrie","Enfant < 6 mois (absence données)","Usage répété > 24h en choc septique (CI relative)"],
    ei:["Myoclonies (30-70% sans prémédication — bénin)","Nausées, vomissements","Douleur à l'injection (forme lipidique réduit ce risque)","Insuffisance surrénalienne transitoire (cortisol ↓ 6-24h)"],
    cond:["Ampoule 20 mg/10 mL (2 mg/mL) — ETOMIDATE LIPURO® (émulsion)","HYPNOMIDATE® (solution propylène-glycol)"],
    poso:{a:["ISR / induction : 0,2-0,3 mg/kg IV en 30-60 sec"],p:["0,3 mg/kg IV","Prémédication BZD recommandée (réduit myoclonies)"]}
  },
  {
    id:35, nom:"Acide tranexamique", commercial:"EXACYL", dci:"Acide tranexamique", classe:"Antifibrinolytique (analogue lysine)", cat:"Urgence vitale", svc:["SAUV","SMUR"],
    couleur:"#FF3B30", icon:"🩸",
    desc:"Inhibiteur de la fibrinolyse en bloquant les sites de liaison du plasminogène sur la fibrine. Réduit la mortalité hémorragique si administré précocement (< 3h du trauma).",
    indic:["Hémorragie traumatique sévère — à débuter < 3h du trauma (CRASH-2)","Hémorragie du post-partum (HPP)","Chirurgie à risque hémorragique élevé","Épistaxis sévère, hémoptysie"],
    ci:["Antécédent de convulsions (abaisse seuil convulsivant)","Thrombose artérielle ou veineuse récente active","Insuffisance rénale sévère (adapter dose)","Hématurie d'origine haute (risque obstruction)"],
    ei:["Nausées, vomissements (injection IV rapide)","Thromboses (pro-coagulant)","Convulsions (fortes doses intrathécales ou IV)","Hypotension si injection trop rapide"],
    cond:["Ampoule 500 mg/5 mL (100 mg/mL) — EXACYL®","Ampoule 1000 mg/10 mL"],
    poso:{a:["Trauma : 1 g IV en 10 min, puis 1 g sur 8h (IMPÉRATIF < 3h du trauma)","HPP : 1 g IV en 10 min, répéter si besoin à 30 min"],p:["15 mg/kg IV en 15 min (max 1 g), puis 2 mg/kg/h"]}
  },
  {
    id:36, nom:"Fosphénytoïne", commercial:"PRODILANTIN", dci:"Fosphénytoïne sodique", classe:"Antiépileptique (prodrogue hydantoïne)", cat:"Neurologie", svc:["SAUV"],
    couleur:"#007AFF", icon:"🧠",
    desc:"Prodrogue hydrosoluble de la phénytoïne, convertie par phosphatases plasmatiques. Bloque canaux Na+ voltage-dépendants. Moins d'effets locaux que la phénytoïne directe.",
    indic:["EME convulsif (2e/3e ligne après BZD)","Convulsions récurrentes dans l'EME établi","Prévention convulsions post-neurochirurgie"],
    ci:["BAV 2e/3e degré sans PM","Bradycardie sinusale","Bloc sino-auriculaire","Allergie hydantoïnes"],
    ei:["Hypotension, bradycardie, arythmies (si IV trop rapide — monitoring indispensable)","Nystagmus, ataxie, diplopie","Syndrome purple glove (voie périphérique)","Choc anaphylactoïde"],
    cond:["Flacon 750 mg/10 mL éq. phénytoïne 500 mg — PRODILANTIN®"],
    poso:{a:["Charge : 15-20 mg EP/kg IV (max 150 mg EP/min sous scope continu)","Entretien : 4-6 mg EP/kg/j en 1-2 injections"],p:["15-20 mg EP/kg IV (max 3 mg EP/kg/min)"]}
  },
  {
    id:37, nom:"Furosémide", commercial:"LASILIX", dci:"Furosémide", classe:"Diurétique de l'anse (inhibiteur cotransporteur Na-K-2Cl)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#007AFF", icon:"💧",
    desc:"Inhibiteur puissant du cotransporteur Na-K-2Cl dans la branche ascendante de l'anse de Henle. Action veinodilatatrice précoce (utile OAP) puis diurétique puissant.",
    indic:["OAP cardiogénique (urgence)","Surcharge hydrosodée / hypervolémie","HTA sévère avec hypervolémie","Hypercalcémie sévère","Insuffisance rénale oligurique avec surcharge"],
    ci:["Hypovolémie, déshydratation","Anurie sur obstacle","Hypokaliémie sévère non corrigée","Allergie sulfamides"],
    ei:["Hypokaliémie, hyponatrémie (déséquilibre électrolytique)","Hypotension orthostatique","Déshydratation","Ototoxicité (injection IV rapide à hautes doses)"],
    cond:["Ampoule 20 mg/2 mL — LASILIX®","Ampoule 250 mg/25 mL","Comprimé 20 mg, 40 mg PO"],
    poso:{a:["OAP : 40-80 mg IV lent (> 2 min)","Surcharge : 20-40 mg IV","Résistance : doublement dose ou IVSE 10-40 mg/h"],p:["0,5-1 mg/kg IV (max 6 mg/kg/j)","Prématuré : 0,5 mg/kg/24h"]}
  },
  {
    id:38, nom:"Phénobarbital", commercial:"GARDENAL", dci:"Phénobarbital", classe:"Barbiturique antiépileptique", cat:"Neurologie", svc:["SAUV","SMUR"],
    couleur:"#007AFF", icon:"🧠",
    desc:"Potentialise GABA-A et inhibe canaux Na+/Ca2+. Antiépileptique à large spectre. Sédatif puissant. Demi-vie longue (50-120h). 2e/3e ligne EME après BZD.",
    indic:["EME convulsif (2e/3e ligne après BZD)","Crises néonatales (1ère ligne)","Épilepsie partielle et généralisée (traitement de fond)","Sevrage alcoolique sévère (2e ligne)"],
    ci:["Porphyrie aiguë intermittente (absolue)","Dépression respiratoire sévère non ventilée","Insuffisance hépatique sévère","Hypersensibilité barbituriques"],
    ei:["Dépression respiratoire (majeure)","Hypotension","Sédation profonde prolongée","Induction enzymatique hépatique (nombreuses interactions)","Dépendance"],
    cond:["Ampoule 200 mg/1 mL — GARDENAL® injectable / PHENOBARBITAL Renaudin®","Comprimé 10-50-100 mg PO"],
    poso:{a:["EME : 15-20 mg/kg IV lent (max 100 mg/min sous scope), puis 100 mg /6-8h","Relais PO : 1-3 mg/kg/j"],p:["EME : 15-20 mg/kg IV (max 2 mg/kg/min)","NN crises : 15-20 mg/kg IV en 20 min"]}
  },
  {
    id:39, nom:"Glucosé 30%", commercial:"GLUCOSÉ 30%", dci:"Glucose anhydre 30%", classe:"Soluté glucosé hypertonique", cat:"Métabolique", svc:["SAUV","SMUR"],
    couleur:"#FFD60A", icon:"🔋",
    desc:"Apport glucidique hypertonique à action immédiate. Correction rapide de l'hypoglycémie sévère symptomatique. Ne contient pas de sodium.",
    indic:["Hypoglycémie sévère symptomatique (< 0,50 g/L)","Coma hypoglycémique","Neuroglypénie (signes neuropsychiatriques)","Hypoglycémie iatrogène (insuline, sulfamides)"],
    ci:["Hyperglycémie > 2 g/L","AVC ischémique en phase aiguë (aggrave lésions ischémiques — éviter)","Voie IM ou SC — STRICTEMENT INTERDIT"],
    ei:["Hyperglycémie rebond (contrôler à 15-30 min)","Phlébite, nécrose si extravasation (solution hypertonique)","Rebond hypoglycémique (sulfamides hypoglycémiants — surveiller 4h)"],
    cond:["Ampoule 10 mL à 30% (= 3 g glucose)"],
    poso:{a:["Bolus : 30-50 mL de G30% IV (= 10-15 g de glucose)","Contrôle glycémie à 15-30 min, répéter si besoin"],p:["G10% : 2-4 mL/kg IV lent","NN : G10% 2 mL/kg IV lent (toujours dilué)"]}
  },
  {
    id:40, nom:"Terlipressine", commercial:"GLYPRESSINE / HAEMOPRESSIN", dci:"Terlipressine", classe:"Analogue vasopressine (agoniste V1a)", cat:"Urgence vitale", svc:["SMUR"],
    couleur:"#FF3B30", icon:"🩸",
    desc:"Analogue synthétique de la vasopressine à action prolongée. Vasoconstricteur splanchnique puissant par activation des récepteurs V1a. Réduit l'hypertension portale.",
    indic:["Hémorragie digestive sur hypertension portale (rupture varices œsophagiennes)","Syndrome hépato-rénal type 1","Choc vasoplégique réfractaire (2e ligne)"],
    ci:["Grossesse (ocytocique)","IDM récent ou angor instable","HTA sévère non contrôlée","Arythmies ventriculaires"],
    ei:["Douleurs abdominales, diarrhées (vasoconstriction intestinale)","Bradycardie, HTA","Ischémie myocardique ou mésentérique (grave)","Céphalées, pâleur, sueurs"],
    cond:["Ampoule 1 mg poudre + solvant — GLYPRESSINE® / HAEMOPRESSIN®"],
    poso:{a:["Varices œsophagiennes : 1-2 mg IV toutes les 4-6h × 48h","Choc vasoplégique : 1,3 mg/h IVSE (ajuster selon PAM)"],p:["0,02 mg/kg IV (max 1 mg) — données limitées"]}
  },
  {
    id:41, nom:"Héparine", commercial:"HEPARINE", dci:"Héparine sodique non fractionnée (HNF)", classe:"Anticoagulant (anti-Xa et anti-IIa, indirect)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"💉",
    desc:"Anticoagulant indirect potentialisant l'antithrombine III. Action immédiate, demi-vie courte (1-2h), antagonisable par protamine. Monitorage par TCA (ratio 2-3).",
    indic:["SCA (IDM STEMI avant/pendant angioplastie)","EP / TVP (traitement curatif initial)","FA (anticoagulation)","Circuits extracorporels (CEC, ECMO)","CIVD (indication sélective)"],
    ci:["Hémorragie active","Thrombopénie induite par l'héparine (TIH) antérieure","Allergie héparine","Hémorragie intracrânienne récente"],
    ei:["Hémorragie (risque majeur)","TIH type II (J5-J20 : thromboses artérielles et veineuses, grave)","Ostéoporose (long terme)","Hyperkaliémie (usage prolongé)"],
    cond:["Ampoule 5000 UI/1 mL","Ampoule 25000 UI/5 mL — HÉPARINE SODIQUE CHOAY®"],
    poso:{a:["Curatif IV : 80 UI/kg bolus, puis 18 UI/kg/h IVSE (ajuster selon TCA)","SCA STEMI : 60-70 UI/kg bolus (max 5000 UI), puis 12-15 UI/kg/h"],p:["75-100 UI/kg IV bolus, puis 15-25 UI/kg/h IVSE (adapter TCA)"]}
  },
  {
    id:42, nom:"Midazolam", commercial:"HYPNOVEL", dci:"Midazolam", classe:"Benzodiazépine hydrosoluble d'action rapide", cat:"Sédation", svc:["SAUV","SMUR"],
    couleur:"#5856D6", icon:"💊",
    desc:"BZD hydrosoluble à action rapide (onset 2-3 min IV) et durée courte. Anxiolytique, sédatif, anticonvulsivant, amnésiant. 1ère ligne SMUR pour EME et sédation procédurale.",
    indic:["EME convulsif — 1ère ligne (IM ou buccal si pas d'accès IV)","Sédation procédurale","Prémédication anesthésique","Agitation sévère","Sédation en réanimation (IVSE)"],
    ci:["Myasthénie grave","Insuffisance respiratoire sévère non ventilée","Allergie BZD","Glaucome à angle fermé"],
    ei:["Dépression respiratoire +++","Hypotension","Amnésie antérograde","Agitation paradoxale (enfant, sujet âgé)","Dépendance"],
    cond:["Ampoule 5 mg/5 mL (1 mg/mL) — HYPNOVEL®","Ampoule 50 mg/10 mL (5 mg/mL)","Solution buccale 10 mg/mL — BUCCOLAM® (pédiatrique)"],
    poso:{a:["Sédation titration : 1-2,5 mg IV lent, répéter par paliers 1 mg /2-3 min","EME : 10 mg IM ou 0,1 mg/kg IV","IVSE sédation réa : 0,02-0,1 mg/kg/h"],p:["EME : 0,3 mg/kg buccal ou nasal (max 10 mg) — BUCCOLAM® si < 18 ans","Sédation : 0,05-0,1 mg/kg IV lent"]}
  },
  {
    id:43, nom:"Idarucizumab", commercial:"PRAXBIND", dci:"Idarucizumab", classe:"Antidote dabigatran (anticorps monoclonal Fab)", cat:"Antidotes", svc:["REA"],
    couleur:"#FF2D55", icon:"🔴",
    desc:"Fragment Fab d'anticorps monoclonal humanisé se liant avec très haute affinité au dabigatran et à ses métabolites, les neutralisant immédiatement et de façon complète.",
    indic:["Neutralisation urgente du dabigatran (PRADAXA®)","Hémorragie grave sous dabigatran","Chirurgie urgente non ajournée sous dabigatran","Surdosage dabigatran"],
    ci:["Allergie idarucizumab (excipient : fructose — CI chez patients intolérants au fructose)","⚠️ Ne neutralise PAS les anti-Xa (rivaroxaban, apixaban, edoxaban)"],
    ei:["Hypersensibilité / anaphylaxie (rare)","Hypokaliémie, confusion (rapportés)","Fièvre","Thromboses (rebond anticoagulation — envisager anticoagulation précoce si indication)"],
    cond:["Flacon 2,5 g/50 mL × 2 flacons (dose totale = 5 g) — PRAXBIND®"],
    poso:{a:["5 g IV en 2 perfusions consécutives de 2,5 g/50 mL (perfusion 5-10 min chacune)","En urgence vitale : possible en bolus IV rapide"],p:["Données insuffisantes < 18 ans"]}
  },
  {
    id:44, nom:"Isoprénaline", commercial:"ISUPREL", dci:"Isoprénaline chlorhydrate", classe:"Sympathomimétique β1+β2 pur (sans effet α)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"⬆️",
    desc:"Agoniste β1 et β2 pur sans effet α. Chronotrope positif puissant, inotrope, bronchodilatateur. Utilisé principalement pour les bradycardies extrêmes réfractaires.",
    indic:["Bradycardie extrême réfractaire à l'atropine (en attente PM)","BAV 3e degré sans PM disponible immédiatement","Torsades de pointes (accélère FC pour réduire QTc)","Syndrome de Brugada symptomatique (controversé)"],
    ci:["Tachycardie sinusale ou ventriculaire","FA / Flutter","IDM récent < 3 mois","HTA sévère","Hyperthyroïdie"],
    ei:["Tachycardie excessive, arythmies ventriculaires","Aggravation ischémie myocardique","Tremblements","Hypotension (effet β2 vasodilatateur)"],
    cond:["Ampoule 0,2 mg/1 mL — ISUPREL®"],
    poso:{a:["IVSE : 0,01-0,10 µg/kg/min (titration selon FC cible)","Bolus urgence : 20-60 µg IV lent"],p:["0,01-0,10 µg/kg/min IVSE (mêmes principes)"]}
  },
  {
    id:45, nom:"Isosorbide dinitrate", commercial:"RISORDAN", dci:"Isosorbide dinitrate (ISDN)", classe:"Dérivé nitré (nitrate organique)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"💓",
    desc:"Libère du NO → active la guanylate cyclase. Vasodilatateur veineux prédominant (réduction précharge), artériel à haute dose. Vasodilatateur coronaire.",
    indic:["Angor instable / SCA (réduction ischémie)","OAP cardiogénique (réduction précharge — PA > 100 mmHg)","Insuffisance cardiaque décompensée avec PA conservée"],
    ci:["Hypotension < 90 mmHg systolique","Choc cardiogénique avec bas débit","Association inhibiteurs PDE5 (sildénafil, tadalafil, vardénafil) < 48h — risque effondrement PA MORTEL","Glaucome à angle fermé"],
    ei:["Hypotension","Céphalées (vasodilatation artères cérébrales)","Tachycardie réflexe","Méthémoglobinémie (fortes doses)","Tolérance (usage répété prolongé)"],
    cond:["Ampoule 10 mg/10 mL IV — RISORDAN®","Spray 1,25 mg/dose sublingual"],
    poso:{a:["IV : débuter 1-2 mg/h IVSE, titration jusqu'à 10 mg/h selon PA","Spray SL : 1-3 bouffées /5 min (max 3 doses)"],p:["Usage limité en pédiatrie (hors avis spécialisé)"]}
  },
  {
    id:46, nom:"Lévétiracétam", commercial:"KEPPRA", dci:"Lévétiracétam", classe:"Antiépileptique (se lie à SV2A des vésicules synaptiques)", cat:"Neurologie", svc:["SAUV"],
    couleur:"#007AFF", icon:"🧠",
    desc:"Antiépileptique à mécanisme original (protéine SV2A). Bonne tolérance, peu d'interactions médicamenteuses, pas d'induction enzymatique. Large spectre antiépileptique.",
    indic:["EME convulsif (2e-3e ligne IV)","Épilepsies partielles avec ou sans généralisation secondaire","Myoclonies de l'épilepsie myoclonique juvénile","Prévention crises post-traumatiques (post-TCG)"],
    ci:["Hypersensibilité lévétiracétam","Dépression sévère (risque aggravation)"],
    ei:["Somnolence, asthénie (fréquents)","Troubles comportementaux, irritabilité, agressivité (15-20%)","Céphalées","Rash cutané (rare)"],
    cond:["Flacon 500 mg/5 mL (100 mg/mL) IV — KEPPRA®","Comprimé 250/500/750/1000 mg PO"],
    poso:{a:["EME IV : 60 mg/kg en 15 min (max 4500 mg)","Entretien : 500-1500 mg × 2/j IV ou PO"],p:["EME : 60 mg/kg IV en 15 min (max 4500 mg)","Entretien : 20-60 mg/kg/j en 2 prises"]}
  },
  {
    id:47, nom:"Kétamine", commercial:"KETALAR", dci:"Kétamine chlorhydrate", classe:"Anesthésique dissociatif (antagoniste NMDA)", cat:"Sédation", svc:["SAUV","SMUR"],
    couleur:"#5856D6", icon:"💉",
    desc:"Antagoniste NMDA induisant une dissociation cortex-limbique. Analgésie + amnésie + anesthésie avec maintien tonus musculaire et réflexes laryngés. Bronchodilatateur. Idéal en hémodynamique précaire.",
    indic:["ISR chez patient en choc (maintien TA)","Sédation-analgésie procédurale (réduction fractures, pansements)","Bronchospasme réfractaire","Analgésie sub-dissociative (faible dose)","EME réfractaire (forte dose)"],
    ci:["Relative : âge < 3 mois","Relative : HTA sévère non contrôlée, cardiopathie ischémique grave","Relative : psychose évolutive","Chirurgie intra-oculaire (HTIO)"],
    ei:["Réactions dysphorie / hallucinations (adulte, réduit par BZD associée)","Hypersécrétion salivaire (atropine 0,01 mg/kg en prémédication)","Nystagmus","HTA, tachycardie transitoire","Laryngospasme (rare)"],
    cond:["Ampoule 250 mg/5 mL (50 mg/mL) — KETALAR®","Ampoule 500 mg/10 mL","Ampoule 200 mg/20 mL (10 mg/mL)"],
    poso:{a:["ISR / induction : 1,5-2 mg/kg IV (+ midazolam 0,02-0,05 mg/kg)","Sédation procédurale : 0,5-1 mg/kg IV","Analgésie sub-dissociative : 0,1-0,3 mg/kg IV","IM si pas d'accès IV : 4-6 mg/kg"],p:["Induction : 1-2 mg/kg IV","IM procédure : 4-5 mg/kg","Analgésie : 0,1-0,5 mg/kg IV"]}
  },
  {
    id:48, nom:"Kétoprofène", commercial:"PROFENID", dci:"Kétoprofène", classe:"AINS (inhibiteur COX-1 et COX-2 non sélectif)", cat:"Analgésie", svc:["SAUV","SMUR"],
    couleur:"#34C759", icon:"💊",
    desc:"AINS à forte action analgésique et anti-inflammatoire. Inhibe la synthèse des prostaglandines. Délai d'action IV rapide (5-10 min). Antispasmodique modéré (coliques).",
    indic:["Douleurs aiguës modérées à sévères (coliques néphrétiqueS, traumatologie, douleurs osseuses)","Crises de goutte aiguës","Dysménorrhées sévères","Analgésie multimodale post-opératoire"],
    ci:["Allergie AINS ou aspirine","Ulcère GD actif ou récent","Insuffisance rénale sévère (DFG < 30)","Insuffisance hépatique sévère","Grossesse ≥ 24 SA (fermeture prématurée canal artériel)","Insuffisance cardiaque sévère"],
    ei:["Gastrotoxicité (ulcère, hémorragie digestive)","Insuffisance rénale fonctionnelle","Bronchospasme (asthme à l'aspirine)","Rétention hydrosodée, HTA"],
    cond:["Ampoule 100 mg/2 mL — PROFENID® / KÉTOPROFÈNE","Gélule 50 mg PO"],
    poso:{a:["100-150 mg IV perfusion 20-30 min (diluer dans 100 mL NaCl 0,9%)","Répéter /8h (max 300 mg/j)","PO : 50 mg × 3-4/j"],p:["CI < 15 ans pour la forme IV","PO > 15 ans : 50 mg × 3/j"]}
  },
  {
    id:49, nom:"Adénosine", commercial:"KRENOSIN", dci:"Adénosine", classe:"Antiarythmique classe V (endogène)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"📡",
    desc:"Nucléoside naturel hyperpolarisant le nœud AV par récepteurs A1. Demi-vie ultra-courte < 10 sec. Interrompt les TSV par réentrée nodale. Effets fugaces mais intenses.",
    indic:["TSV paroxystique par réentrée nodale (AVNRT, AVRT)","Diagnostic différentiel tachycardies à QRS fins","TAV à faisceau accessoire (si non pré-excitées)"],
    ci:["BAV 2e/3e degré sans PM","Dysfonction sinusale sans PM","Asthme sévère actif / bronchospasme","FA / Flutter pré-excités (risque FV)","Association dipyridamole (potentialise fortement)"],
    ei:["Flush facial, dyspnée, douleur thoracique (transitoire < 30 sec, prévisibles)","Pause sinusale, BAV transitoire","Bronchospasme (asthmeux — CI)"],
    cond:["Ampoule 6 mg/2 mL — KRENOSIN®","Ampoule 3 mg/1 mL"],
    poso:{a:["6 mg IV bolus rapide (< 2 sec) + flush 20 mL NaCl 0,9% rapide","Si échec après 1-2 min : 12 mg (max 18 mg total)"],p:["0,1 mg/kg IV rapide (max 6 mg dose initiale)","2e dose : 0,2 mg/kg (max 12 mg)"]}
  },
  {
    id:50, nom:"Loxapine", commercial:"LOXAPAC", dci:"Loxapine succinate", classe:"Antipsychotique (antagoniste D2, H1, α1, 5-HT2)", cat:"Psychiatrie", svc:["SMUR"],
    couleur:"#BF5AF2", icon:"🧬",
    desc:"Antipsychotique typique à fort effet sédatif par antagonisme H1 et dopaminergique. Forme inhalée (ADASUVE®) d'action rapide (10-20 min) pour agitation aiguë.",
    indic:["Agitation aiguë modérée à sévère (psychiatrique ou non)","Crise aiguë schizophrénique avec agitation","Agitation dans le trouble bipolaire"],
    ci:["Insuffisance respiratoire aiguë (BPCO, asthme actif) — forme inhalée CI","Stridor ou wheezing actif","Âge < 18 ans (forme inhalée)","Association dépresseurs respiratoires (prudence majeure)"],
    ei:["Bronchospasme (peut être grave — surveillance respiratoire 15 min OBLIGATOIRE après inhalation)","Sédation","Syndromes extrapyramidaux (akathisie, dystonie)","Hypotension orthostatique","Tachycardie"],
    cond:["Cartouche 9,1 mg inhalation buccale — ADASUVE® / LOXAPAC®","Gélule 25 mg, 50 mg PO"],
    poso:{a:["Inhalation : 9,1 mg dose unique, répéter après 2h si besoin (max 18,2 mg/j)","PO : 25-50 mg × 2-4/j (traitement fond)"],p:["CI < 18 ans pour forme inhalée"]}
  },
  {
    id:51, nom:"Nicardipine IV", commercial:"LOXEN IV", dci:"Nicardipine chlorhydrate", classe:"Inhibiteur calcique vasodilatateur (DHP — IV)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"📉",
    desc:"Inhibiteur calcique vasodilatateur artériel sélectif. Réduit les résistances vasculaires périphériques sans bradycardie. Neuroprotecteur (vasodilatateur cérébral).",
    indic:["Urgences hypertensives avec souffrance d'organe (encéphalopathie, dissection, AVC hémorragique)","HTA sévère péri-opératoire","HTA de la pré-éclampsie sévère / éclampsie","Vasospasme cérébral post-HSA (Nimotop préféré)"],
    ci:["Choc cardiogénique / IC décompensée sévère","Sténose aortique sévère","Association dantrolène IV"],
    ei:["Céphalées (vasodilatation cérébrale)","Tachycardie réflexe","Flush","Hypotension excessive","Nausées"],
    cond:["Ampoule 10 mg/10 mL (1 mg/mL) — LOXEN® IV","Comprimé LP 20-30-50 mg PO (LOXEN PO)"],
    poso:{a:["IV : 5-15 mg/h IVSE (titration selon objectif PA)","Urgence vitale : bolus 1-5 mg IV lent puis IVSE"],p:["0,5-5 µg/kg/min IVSE (milieu spécialisé)"]}
  },
  {
    id:52, nom:"Nicardipine PO", commercial:"LOXEN PO", dci:"Nicardipine chlorhydrate (PO)", classe:"Inhibiteur calcique (DHP — voie orale)", cat:"Cardiologie", svc:["SAU"],
    couleur:"#FF9500", icon:"💊",
    desc:"Forme orale de la nicardipine. Antihypertenseur pour relais IV ou urgences hypertensives peu sévères avec PA systolique tolérant l'administration orale.",
    indic:["Relais IV vers PO après contrôle de la PA en urgence","HTA sévère non urgence immédiate (urgence différée)","Angor stable et instable (2e ligne)"],
    ci:["Choc cardiogénique","Sténose aortique sévère","Insuffisance cardiaque décompensée"],
    ei:["Céphalées, flush","Tachycardie réflexe","Œdèmes des membres inférieurs","Nausées"],
    cond:["Comprimé LP 20 mg, 30 mg, 50 mg PO — LOXEN®"],
    poso:{a:["20-40 mg × 3/j PO (LP : 1 comprimé × 2/j)","Adapter selon réponse tensionnelle"],p:["Données limitées, usage hors AMM < 18 ans"]}
  },
  {
    id:53, nom:"Sulfate de Magnésium", commercial:"SULFATE DE MAGNÉSIUM", dci:"Sulfate de magnésium (MgSO4)", classe:"Anticonvulsivant / Tocolytique / Antiarythmique", cat:"Métabolique", svc:["SAUV","SMUR"],
    couleur:"#FFD60A", icon:"⚗️",
    desc:"Antagoniste physiologique du calcium. Anticonvulsivant (référence pré-éclampsie/éclampsie), tocolytique, antiarythmique (torsades de pointes) et bronchodilatateur.",
    indic:["Pré-éclampsie sévère / éclampsie (prévention et traitement convulsions — RÉFÉRENCE)","Torsades de pointes (arythmie par hypomagnésémie ou QT long)","Asthme aigu sévère réfractaire (bronchodilatateur adjuvant)","Hypomagnésémie symptomatique","Tocolyse (menace accouchement prématuré — délai transfert)"],
    ci:["Insuffisance rénale sévère / anurie","BAV complet","Myasthénie gravis"],
    ei:["Dépression respiratoire (surdosage — ANTIDOTE : gluconate Ca)","Hypotension","Flush, bouffées de chaleur","Abolition des réflexes ostéotendineux (signe d'alarme de surdosage)","Bradycardie, BAV"],
    cond:["Ampoule 1,5 g/10 mL (15%) = 1,5 g MgSO4","Ampoule 3 g/10 mL (30%)"],
    poso:{a:["Éclampsie : 4-6 g IV en 20 min (charge), puis 1-2 g/h IVSE × 24h","Torsades : 2 g IV en 2-3 min (répétable 1 fois)","Asthme aigu : 2 g IV en 20 min (dose unique)"],p:["Éclampsie / convulsions : 25-50 mg/kg IV sur 15-30 min (max 2 g)","Asthme aigu : 25-50 mg/kg IV en 20 min (max 2 g)"]}
  },
  {
    id:54, nom:"Méthylprednisolone", commercial:"SOLUMEDROL", dci:"Méthylprednisolone succinate sodique", classe:"Corticoïde glucocorticoïde de synthèse", cat:"Urgence vitale", svc:["SAUV","SMUR"],
    couleur:"#FF3B30", icon:"💊",
    desc:"Corticoïde de synthèse à durée d'action intermédiaire. Puissamment anti-inflammatoire et immunosuppresseur. Adjuvant indispensable dans l'anaphylaxie et l'asthme aigu.",
    indic:["Choc anaphylactique (2e ligne après adrénaline)","Asthme aigu sévère","Exacerbation BPCO sévère","Laryngite sous-glottique (croup) sévère","Insuffisance surrénalienne aiguë","Pathologies inflammatoires aiguës (LED, vascularites)"],
    ci:["Infections non contrôlées (relatif en urgence)","Ulcère GD évolutif (relatif)","Diabète décompensé (déséquilibre glycémie)"],
    ei:["Hyperglycémie","HTA transitoire","Rétention hydrosodée","Agitation, insomnie","Immunosuppression"],
    cond:["Poudre IV 40 mg, 120 mg, 500 mg, 1000 mg — SOLUMEDROL®"],
    poso:{a:["Anaphylaxie : 1-2 mg/kg IV (max 120 mg)","Asthme aigu : 1-2 mg/kg IV (max 120 mg)","Choc anaphylactique sévère : 500 mg-1 g IV"],p:["1-2 mg/kg IV (max 60-80 mg/dose)","Asthme : 1-2 mg/kg IV (max 60 mg)"]}
  },
  {
    id:55, nom:"Métoclopramide", commercial:"PRIMPERAN", dci:"Métoclopramide chlorhydrate", classe:"Antiémétique / Prokinétique (antagoniste D2)", cat:"Gastro-entérologie", svc:["SAUV"],
    couleur:"#32D74B", icon:"💊",
    desc:"Antagoniste dopaminergique D2 central (antiémétique) et périphérique (prokinétique). Accélère la vidange gastrique. Abaisse le seuil épileptique.",
    indic:["Nausées / vomissements aigus (toutes causes)","Gastroparésie","Migraine (adjuvant antalgique — améliore absorption)","Prémédication avant anesthésie (vidange gastrique)"],
    ci:["Obstruction mécanique gastro-intestinale ou perforation","Saignement GI actif","Phéochromocytome","Épilepsie (abaisse seuil convulsivant)","Association halopéridol (syndrome extrapyramidal)"],
    ei:["Somnolence, akathisie","Syndromes extrapyramidaux (surtout enfant et adulte jeune)","Dyskinésie tardive (traitements prolongés)","Hyperprolactinémie","Méthémoglobinémie (nourrisson — CI)"],
    cond:["Ampoule 10 mg/2 mL (5 mg/mL) — PRIMPERAN® / PLASIL®"],
    poso:{a:["10 mg IV lent (> 3 min) ou IM","Répéter /8h (max 30 mg/j)","Migraine : 10 mg IV en premier"],p:["CI < 1 an (méthémoglobinémie)","1-18 ans : 0,1-0,15 mg/kg IV/IM (max 0,5 mg/kg/j, max 5 mg/dose < 6 ans)"]}
  },
  {
    id:56, nom:"Métoprolol", commercial:"SELOKEN injectable", dci:"Métoprolol succinate/tartrate", classe:"Bêtabloquant β1-sélectif (demi-vie intermédiaire)", cat:"Cardiologie", svc:["SAUV"],
    couleur:"#FF9500", icon:"📉",
    desc:"Bêtabloquant cardiosélectif β1 d'action intermédiaire. Réduit FC, PA et travail myocardique. Antiarythmique classe II.",
    indic:["SCA (protection myocardique si fréquence élevée)","FA / Flutter tachycardique stable","TSV — contrôle de fréquence","HTA sévère","Insuffisance cardiaque stable (chronique — PO)"],
    ci:["BAV 2e/3e degré sans PM","Bradycardie < 55/min","Asthme / BPCO avec bronchospasme actif","Choc cardiogénique","IC décompensée aiguë"],
    ei:["Bradycardie, BAV","Hypotension","Bronchospasme (β2 résiduel)","Fatigue, dépression","Syndrome de Raynaud"],
    cond:["Ampoule 5 mg/5 mL (1 mg/mL) — SELOKEN®"],
    poso:{a:["IV : 2,5-5 mg bolus lent (> 2 min), répéter /5 min (max 15 mg)","PO : 25-200 mg/j selon indication"],p:["0,1 mg/kg IV lent (max 5 mg/dose)"]}
  },
  {
    id:57, nom:"Morphine", commercial:"MORPHINE", dci:"Morphine chlorhydrate / sulfate", classe:"Opioïde fort agoniste µ (palier 3 OMS)", cat:"Analgésie", svc:["SAUV","SMUR"],
    couleur:"#34C759", icon:"💊",
    desc:"Agoniste µ-opioïde de référence. Analgésique central puissant, anxiolytique. Demi-vie 2-4h. Métabolites actifs (M6G) s'accumulent en insuffisance rénale.",
    indic:["Douleurs intenses EVA ≥ 7 / 10 (trauma, infarctus, cancer)","OAP cardiogénique (réduction anxiété et précharge)","IDM (analgésie de la douleur thoracique)","Dyspnée palliative"],
    ci:["Insuffisance respiratoire sévère non ventilée","TCG non évalué / HTLIC (masque l'évaluation neurologique)","Association IMAO < 14 j","Iléus paralytique"],
    ei:["Dépression respiratoire (dose-dépendante)","Nausées / vomissements (fréquents)","Constipation","Rétention urinaire","Hypotension orthostatique","Prurit (libération histamine)"],
    cond:["Ampoule 10 mg/1 mL","Ampoule 20 mg/1 mL","Seringue préremplie 10 mg/10 mL (1 mg/mL)"],
    poso:{a:["Titration IV : 2-3 mg /5 min jusqu'à EVA ≤ 3 (max 0,15-0,2 mg/kg)","IM / SC : 5-10 mg /4h","IVSE : 1-5 mg/h selon EVA"],p:["IV : 0,05-0,1 mg/kg/dose (titration)","IM/SC : 0,1-0,2 mg/kg/dose (max 15 mg)","< 3 mois : 0,025 mg/kg (prudence extrême)"]}
  },
  {
    id:58, nom:"Nalbuphine", commercial:"NUBAIN", dci:"Nalbuphine chlorhydrate", classe:"Opioïde agoniste-antagoniste (κ agoniste / µ antagoniste partiel)", cat:"Analgésie", svc:["SAUV","SMUR"],
    couleur:"#34C759", icon:"💊",
    desc:"Opioïde à double action. Analgésique (agoniste κ) avec effet plafond sur la dépression respiratoire (antagoniste µ partiel). 1ère intention SMUR pédiatrique.",
    indic:["Douleurs modérées à sévères (1ère intention pédiatrique SMUR)","Alternative morphine (effet plafond respiratoire = plus sûr)","Douleurs traumatiques, viscérales, post-opératoires"],
    ci:["Dépendance aux opioïdes µ (précipite sevrage)","Allergie opioïdes","Nourrisson < 18 mois (forme IV — données insuffisantes)","Insuffisance respiratoire sévère"],
    ei:["Dépression respiratoire (limitée — effet plafond)","Sédation, vertiges","Nausées","Flush, sueurs","Dysphorie (fortes doses)"],
    cond:["Ampoule 20 mg/2 mL (10 mg/mL) — NUBAIN®"],
    poso:{a:["0,1-0,3 mg/kg IV lent ou IM (titration)","Dose habituelle : 0,2 mg/kg IV"],p:["0,2-0,4 mg/kg IV ou IM (1ère intention SMUR pédiatrique)","Max 20 mg/dose"]}
  },
  {
    id:59, nom:"Naloxone", commercial:"NARCAN", dci:"Naloxone chlorhydrate", classe:"Antagoniste opioïde pur (µ, κ, δ)", cat:"Antidotes", svc:["SAUV","SMUR"],
    couleur:"#FF2D55", icon:"🚨",
    desc:"Antagoniste compétitif pur de tous les récepteurs opioïdes. Renverse rapidement tous les effets. Demi-vie courte (60-90 min) < opioïdes → risque de réintoxication.",
    indic:["Surdosage opioïde avec dépression respiratoire","Coma morphinique","Intoxication néonatale aux opioïdes (mère sous traitement)"],
    ci:["Allergie naloxone","Prudence : douleurs chroniques sous opioïdes (sevrage brutal)","Syndrome de sevrage chez NN de mère dépendante aux opioïdes"],
    ei:["Syndrome de sevrage brutal (agitation, douleur, HTA, tachycardie)","OAP flash (rare)","Arythmies (adrénaline endogène libérée)","Récidive sédation (t½ court)"],
    cond:["Ampoule 0,4 mg/1 mL — NARCAN®","Ampoule 2 mg/5 mL","Spray nasal 1,8 mg/dose — NALSCUE® / NYXOID®"],
    poso:{a:["Titration IV : 0,04-0,1 mg /2-3 min jusqu'à FR > 12 (max 2 mg)","IM/SC : 0,4-0,8 mg","IVSE si rechute : 0,002-0,004 mg/kg/h","Nasal : 1 spray (1,8 mg) par narine"],p:["0,01 mg/kg IV/IM, répéter /2-3 min (max 2 mg total)"]}
  },
  {
    id:60, nom:"Trinitrine Spray", commercial:"NATISPRAY", dci:"Trinitrine (glycéryl trinitrate)", classe:"Dérivé nitré sublingual — action ultra-rapide", cat:"Cardiologie", svc:["SAUV"],
    couleur:"#FF9500", icon:"💊",
    desc:"Libère NO → vasodilatateur veineux prédominant (réduction précharge) et coronaire. Action en 1-3 min. Durée 30-60 min. Voie sublinguale pour rapidité d'action.",
    indic:["Angor instable / SCA (douleur thoracique ischémique)","OAP cardiogénique (PA > 100 mmHg — réduction précharge)","Spasme coronaire"],
    ci:["Hypotension < 90 mmHg","Association inhibiteurs PDE5 (sildénafil, tadalafil, vardénafil) < 48h — risque effondrement PA MORTEL","Choc cardiogénique / bas débit"],
    ei:["Céphalées (vasodilatation cérébrale)","Hypotension","Tachycardie réflexe","Tolérance (usage répété prolongé)"],
    cond:["Spray 0,3 mg/dose ou 0,4 mg/dose — NATISPRAY® sublingual"],
    poso:{a:["1-2 sprays sublinguale, répéter /5 min si besoin (max 3 doses)","OAP : 1 spray /5 min sous surveillance PA continue"],p:["Non validé en routine pédiatrique"]}
  },
  {
    id:61, nom:"Nimodipine", commercial:"NIMOTOP", dci:"Nimodipine", classe:"Inhibiteur calcique cérébral sélectif (DHP)", cat:"Neurologie", svc:["SAUV"],
    couleur:"#007AFF", icon:"🧠",
    desc:"Inhibiteur calcique sélectif des artères cérébrales. Prévient le vasospasme cérébral post-HSA. Peu d'effet systémique aux doses correctes. Administration IV ou PO.",
    indic:["Prévention et traitement du vasospasme cérébral après hémorragie sous-arachnoïdienne (HSA)","HSA traumatique (usage controversé, moins prouvé)"],
    ci:["Hypotension sévère < 90 mmHg","Association IV avec autres inhibiteurs calciques","Sténose cérébrale sévère (rare)"],
    ei:["Hypotension (dose-dépendante — limiter doses si PA basse)","Céphalées, flush","Nausées","Phlébite voie IV (alcool benzylique dans l'excipient)"],
    cond:["Flacon 10 mg/50 mL (0,2 mg/mL) IV — NIMOTOP®","Comprimé 30 mg PO"],
    poso:{a:["IV : 1 mg/h sur 2h, puis 2 mg/h IVSE × 5-14 jours (si PA tolère)","PO : 60 mg toutes les 4h × 21 jours (voie préférentielle si PA stable)"],p:["Non étudié en routine pédiatrique"]}
  },
  {
    id:62, nom:"Noradrénaline", commercial:"LEVOPHED", dci:"Noradrénaline (norépinéphrine)", classe:"Catécholamine vasopresseur (α1 >> β1)", cat:"Urgence vitale", svc:["SAUV","SMUR"],
    couleur:"#FF3B30", icon:"⬆️",
    desc:"Vasopresseur de 1ère ligne des états de choc vasoplégiques. Puissant agoniste α1 vasoconstricteur. Inotrope modéré (β1). Toujours en IVSE (voie centrale idéalement).",
    indic:["Choc septique — vasopresseur de référence (SURVIVING SEPSIS)","Choc vasoplégique (anaphylaxie, médullaire, post-CEC)","Choc cardiogénique avec vasoplégie (en association dobutamine)"],
    ci:["Hypovolémie non corrigée (relatif — compléter remplissage en parallèle)","Asystolie (préférer adrénaline)"],
    ei:["Ischémie myocardique, mésentérique, digitale (vasoconstriction excessive)","Nécrose tissulaire (extravasation — phentolamine locale en antidote)","Bradycardie réflexe","HTA excessive"],
    cond:["Ampoule 8 mg/4 mL (2 mg/mL) — LEVOPHED®","Ampoule 4 mg/4 mL (1 mg/mL)"],
    poso:{a:["Début : 0,1-0,2 µg/kg/min IVSE","Titration : jusqu'à PAM ≥ 65 mmHg","Dose usuelle : 0,1-1 µg/kg/min","Doses élevées choc réfractaire : jusqu'à 2-5 µg/kg/min"],p:["0,05-0,3 µg/kg/min IVSE (titration PAM)","VVC ou IO recommandée"]}
  },
  {
    id:63, nom:"Ondansétron", commercial:"ZOPHREN", dci:"Ondansétron chlorhydrate", classe:"Antiémétique (antagoniste sélectif 5-HT3)", cat:"Gastro-entérologie", svc:["SAUV","SMUR"],
    couleur:"#32D74B", icon:"💊",
    desc:"Antagoniste sélectif des récepteurs 5-HT3 sérotoninergiques centraux et périphériques. Antiémétique puissant, particulièrement efficace pour chimiothérapie et post-opératoire.",
    indic:["Nausées / vomissements post-chimiothérapie (NVCI)","Nausées / vomissements post-opératoires (NVPO)","Gastro-entérite aiguë avec vomissements réfractaires","Nausées et vomissements gravidiques sévères"],
    ci:["Hypersensibilité ondansétron","Syndrome congénital du QT long","Hypokaliémie / hypomagnésémie (allongement QTc)","Association apomorphine"],
    ei:["Céphalées (fréquentes)","Constipation","Allongement QTc (dose-dépendant)","Flush","Anaphylaxie (rare)"],
    cond:["Ampoule 8 mg/4 mL (2 mg/mL) — ZOPHREN®","Comprimé 4 mg et 8 mg PO","Lyophilisat oral 4 mg et 8 mg"],
    poso:{a:["4-8 mg IV lent (> 30 sec) ou IM","Répéter /8h (max 32 mg/j en contexte chimiothérapie)"],p:["≥ 1 mois : 0,1 mg/kg IV (max 4 mg/dose)","Répéter /4-8h (max 3 doses)"]}
  },
  {
    id:64, nom:"Octaplex", commercial:"OCTAPLEX", dci:"Complexe prothrombinique (CCP 4 facteurs : II, VII, IX, X + prot. C, S)", classe:"Facteurs de coagulation vitamine K-dépendants", cat:"Cardiologie", svc:["SAU"],
    couleur:"#FF9500", icon:"🩸",
    desc:"Concentré de facteurs de coagulation vit. K-dépendants. Neutralise rapidement les AVK. Action immédiate. Indispensable pour les hémorragies graves sous AVK.",
    indic:["Surdosage AVK avec hémorragie grave","Hémorragie intracrânienne sous AVK (urgence vitale — 1ère ligne)","Chirurgie urgente non ajournée sous AVK","Antagonisation urgente anticoagulants oraux AVK"],
    ci:["Allergie protéines héparine / plasma humain","CIVD (relatif)","Thromboses artérielles récentes < 3 mois (relatif)"],
    ei:["Thromboses veineuses ou artérielles","Anaphylaxie (rare)","Transmission agents infectieux (très faible risque, produit sécurisé)"],
    cond:["Flacon 500 UI (facteur IX) + solvant 20 mL — OCTAPLEX® / CONFIDEX®"],
    poso:{a:["Basé sur INR et poids : INR 2-4 → 25 UI/kg ; INR 4-6 → 35 UI/kg ; INR > 6 → 50 UI/kg IV","Urgence extrême : 25-50 UI/kg IV (max 3000 UI)","TOUJOURS associer vitamine K 10 mg IV lent"],p:["25-50 UI/kg selon INR (mêmes principes)"]}
  },
  {
    id:65, nom:"Oxytocine", commercial:"SYNTOCINON", dci:"Oxytocine de synthèse", classe:"Ocytocique / Hormone utérotone", cat:"Obstétrique", svc:["SMUR"],
    couleur:"#FF9F0A", icon:"🤰",
    desc:"Analogue synthétique de l'hormone neurohypophysaire. Stimule les contractions utérines et réduit le saignement utérin post-partum par rétraction utérine.",
    indic:["Hémorragie du post-partum (HPP) — 1ère ligne universelle","Prévention HPP après délivrance (systématique)","Déclenchement / stimulation du travail (en maternité)"],
    ci:["Souffrance fœtale avant délivrance","Placenta prævia (relatif)","Utérus cicatriciel multiple (relatif)"],
    ei:["Hypotension transitoire (si bolus IV rapide — ne pas faire en bolus)","Hyponatrémie (effet antidiurétique)","Hyperstimulation utérine","Nausées"],
    cond:["Ampoule 5 UI/1 mL — SYNTOCINON®","Ampoule 10 UI/1 mL"],
    poso:{a:["HPP : 5-10 UI IV LENTEMENT (≥ 1 min) ou IM, puis 20 UI dans 500 mL NaCl perfusion sur 4h","Prévention HPP : 10 UI IM après dégagement de l'épaule antérieure"],p:["N/A (usage obstétrical)"]}
  },
  {
    id:66, nom:"Paracétamol", commercial:"PERFALGAN", dci:"Paracétamol (acétaminophène)", classe:"Antalgique / Antipyrétique central (palier 1)", cat:"Analgésie", svc:["SAUV","SMUR"],
    couleur:"#34C759", icon:"💊",
    desc:"Antalgique et antipyrétique central. Mécanisme précis imparfaitement compris (voie endocannabinoïde, voie NO). Pas d'effet anti-inflammatoire ni antiplaquettaire. Excellente tolérance.",
    indic:["Douleurs légères à modérées (palier 1 OMS)","Fièvre","Analgésie multimodale (épargne morphinique ≈ 30%)","Alternative AINS si CI"],
    ci:["Insuffisance hépatocellulaire sévère","Allergie paracétamol (rare)","Surdosage > 150 mg/kg (intoxication aiguë)"],
    ei:["Hépatotoxicité dose-dépendante (surdosage → nécrose hépatique fulminante — ANTIDOTE N-acétylcystéine)","Hypotension transitoire (IV rapide)","Très bien toléré à doses thérapeutiques"],
    cond:["Flacon 1 g/100 mL IV (10 mg/mL) — PERFALGAN®","Comprimé 500 mg et 1 g PO","Suppositoire 80-300 mg"],
    poso:{a:["1 g IV en 15 min (perfusion)","Max 4 g/j (6h entre doses)","Insuffisance rénale / hépatique : max 2-3 g/j"],p:["15 mg/kg/dose IV ou PO /4-6h (max 60-80 mg/kg/j)","< 10 kg : 7,5 mg/kg/dose IV"]}
  },
  {
    id:67, nom:"Thiopental", commercial:"PENTOTHAL", dci:"Thiopental sodique", classe:"Barbiturique anesthésique IV (ultra-rapide)", cat:"Sédation", svc:["SAUV","SMUR"],
    couleur:"#5856D6", icon:"💉",
    desc:"Barbiturique d'action ultra-rapide (onset 20-30 sec). Puissant dépresseur du SNC via GABA-A. Réduit la pression intracrânienne (CMRO2↓). Demi-vie longue après doses répétées.",
    indic:["ISR en hypertension intracrânienne sévère (neurochirurgie, TCG grave)","EME réfractaire (barbiturathérapie en réanimation)","Protection cérébrale péri-opératoire","Induction anesthésique (usage en baisse depuis propofol)"],
    ci:["Porphyrie aiguë intermittente (ABSOLUE)","Hypovolémie sévère (hypotension majeure)","Asthme actif (histamino-libération, laryngospasme)","Obstruction voies aériennes"],
    ei:["Apnée, dépression respiratoire profonde (IMMÉDIATE)","Hypotension marquée (vasodilatation + inotrope négatif)","Nécrose tissulaire si extravasation (pH très alcalin)","Bronchospasme","Accumulation (longue demi-vie après doses répétées)"],
    cond:["Poudre + solvant 500 mg/vial (reconstituer en solution 2,5% = 25 mg/mL) — PENTOTHAL®"],
    poso:{a:["Induction standard : 3-5 mg/kg IV (sujet âgé / fragilisé : 1-2 mg/kg)","EME réfractaire : 100-250 mg IV bolus, puis 3-5 mg/kg/h IVSE","HTLIC : 1,5-3 mg/kg IV (protection cérébrale)"],p:["Induction > 1 mois : 5-6 mg/kg IV","NN : 3-4 mg/kg IV"]}
  },
  {
    id:68, nom:"Phloroglucinol", commercial:"SPASFON", dci:"Phloroglucinol + triméthylphloroglucinol", classe:"Antispasmodique musculotrope direct", cat:"Gastro-entérologie", svc:["SAUV","SMUR"],
    couleur:"#32D74B", icon:"💊",
    desc:"Antispasmodique direct sur le muscle lisse des viscères creux. Sans effet anticholinergique. Relaxation des fibres musculaires lisses gastro-intestinales et urétérales.",
    indic:["Coliques hépatiques et coliques néphrétiques (antispasmodique)","Douleurs abdominales spasmodiques","Dysménorrhées","Spasmes gastro-intestinaux"],
    ci:["Allergie phloroglucinol (rare)","Occlusion intestinale (masque les symptômes)"],
    ei:["Nausées légères (rare)","Allergie cutanée (très rare)","Très bien toléré en général"],
    cond:["Ampoule 40 mg/4 mL (10 mg/mL) — SPASFON®","Comprimé 80 mg PO","Lyophilisat oral 80 mg"],
    poso:{a:["40-80 mg IV lent ou IM, répéter /6-8h si besoin","PO : 80-160 mg × 3-4/j"],p:["IM/IV : 40 mg (enfant > 5 ans)","PO > 6 ans : 80 mg × 3/j"]}
  },
  {
    id:69, nom:"Sufentanil", commercial:"SUFENTA", dci:"Sufentanil citrate", classe:"Opioïde très puissant agoniste µ (500-1000× morphine)", cat:"Analgésie", svc:["SAUV","SMUR"],
    couleur:"#34C759", icon:"💉",
    desc:"Opioïde de synthèse ultra-puissant (5-10× fentanyl, 500-1000× morphine). Analgésique per et post-opératoire. Voie intranasale praticable en SMUR pédiatrique sans abord IV.",
    indic:["Analgésie per-opératoire (bloc opératoire / réanimation)","Sédation-analgésie réanimation (IVSE)","Analgésie nasale non invasive — SMUR pédiatrique (pas de voie IV)","Douleurs cancéreuses réfractaires"],
    ci:["Insuffisance respiratoire sévère non ventilée","Association IMAO < 14 j","Allergie opioïdes","HTLIC sévère (relatif)"],
    ei:["Dépression respiratoire (majeure — dose-dépendante)","Rigidité thoracique (injection IV rapide)","Nausées, vomissements","Bradycardie, hypotension","Prurit"],
    cond:["Ampoule 250 µg/5 mL (50 µg/mL) — SUFENTA®","Ampoule 1000 µg/20 mL (50 µg/mL)"],
    poso:{a:["Analgésie IV : 0,1-0,2 µg/kg/dose IV lent","IVSE réa : 0,1-0,5 µg/kg/h","ISR adjuvant : 0,3-1 µg/kg IV"],p:["IV : 0,1-0,2 µg/kg IV lent","Intranasal : 0,3-0,5 µg/kg (max 20 µg) — SMUR pédiatrique sans abord IV"]}
  },
  {
    id:71, nom:"Terbutaline", commercial:"BRICANYL", dci:"Terbutaline sulfate", classe:"Bêta-2 mimétique bronchodilatateur / Tocolytique", cat:"Pneumologie", svc:["SMUR"],
    couleur:"#30D158", icon:"🫁",
    desc:"Agoniste β2 sélectif. Bronchodilatateur et tocolytique (relaxation utérine). Voie SC rapide très utile en SMUR si nébulisation non disponible.",
    indic:["Asthme aigu sévère (alternative ou complément salbutamol)","Menace d'accouchement prématuré (tocolyse en attente transfert)","Bronchospasme réfractaire"],
    ci:["Hypokaliémie sévère (aggrave)","IDM récent","Grossesse > 37 SA (tocolyse inutile)","Hémorragie antepartum"],
    ei:["Tremblements fins, tachycardie","Hypokaliémie (forte dose)","Hyperglycémie","Céphalées, palpitations"],
    cond:["Ampoule 0,5 mg/1 mL — BRICANYL®"],
    poso:{a:["Asthme SC : 0,25-0,5 mg SC, répéter /30 min si besoin (max 0,5 mg/4h)","Tocolyse IV : 10 µg/min IVSE, augmenter /20 min par paliers 5 µg/min (max 25 µg/min)"],p:["SC : 0,01 mg/kg (max 0,3 mg/dose)","Nébulisation : 0,1 mg/kg/dose (max 5 mg)"]}
  },
  {
    id:72, nom:"Salbutamol", commercial:"SALBUTAMOL / VENTOLINE", dci:"Salbutamol sulfate", classe:"Bêta-2 mimétique bronchodilatateur sélectif", cat:"Pneumologie", svc:["SAUV","SMUR"],
    couleur:"#30D158", icon:"🫁",
    desc:"Agoniste sélectif β2-adrénergique. Bronchodilatateur d'action rapide (5-10 min) et courte durée (4-6h). Également utilisé pour l'hyperkaliémie (translocation K+ intracellulaire).",
    indic:["Crise d'asthme aiguë (toute sévérité — 1ère ligne)","BPCO décompensée avec bronchospasme","Hyperkaliémie sévère (translocation K+ intracel. — adjuvant)","Bronchospasme per-intubation"],
    ci:["Tachycardie > 130/min (relative)","IDM récent < 3 mois (relative)","Hyperthyroïdie non contrôlée"],
    ei:["Tremblements fins des extrémités","Tachycardie, palpitations","Hypokaliémie (forte dose — risque arythmies)","Céphalées"],
    cond:["Nébulisation 2,5 mg/2,5 mL — SALBUTAMOL® / VENTOLINE® nébulisation","Spray 100 µg/dose (VENTOLINE® inhalateur)","Ampoule IV 5 mg/5 mL"],
    poso:{a:["Nébulisation : 2,5-5 mg dans 3 mL NaCl 0,9%, répéter /20 min × 3 (asthme aigu)","Inhalateur : 2-4 bouffées /20 min × 3 (urgence)","IV choc asthmatique : 0,1-0,2 mg/kg/h IVSE"],p:["Nébulisation : 0,15 mg/kg (min 1,25 mg, max 5 mg)","Inhalateur + chambre : 2-4 bouffées /20 min × 3"]}
  },
  {
    id:73, nom:"Lidocaïne", commercial:"XYLOCAÏNE", dci:"Lidocaïne chlorhydrate", classe:"Anesthésique local amide / Antiarythmique classe Ib", cat:"Analgésie", svc:["SAUV","SMUR"],
    couleur:"#007AFF", icon:"💉",
    desc:"Anesthésique local amide. Bloque canaux Na+ voltage-dépendants. Anesthésie locale par infiltration ou topique. Antiarythmique ventriculaire classe Ib (2e ligne).",
    indic:["Anesthésie locale par infiltration (sutures, gestes)","Anesthésie topique des voies aériennes (intubation vigile)","Arythmies ventriculaires post-IDM (2e ligne après amiodarone)","Prévention réaction à l'intubation (HTLIC — effet antitussif IV)"],
    ci:["Allergie anesthésiques locaux type amide","BAV complet sans PM","Bloc sino-auriculaire","Porphyrie"],
    ei:["Toxicité neurologique (surdosage) : acouphènes, vertiges, troubles visuels, convulsions","Toxicité cardiaque : bradycardie, BAV, ACR (fortes doses IV)","Méthémoglobinémie (rare, fortes doses topiques muqueuses)"],
    cond:["Ampoule 1% (10 mg/mL) et 2% (20 mg/mL) — XYLOCAÏNE®","Solution spray 5% et 10%","Gel 2%"],
    poso:{a:["Infiltration : 1-7 mg/kg selon zone (max 200 mg sans adrénaline, 500 mg avec)","Antiarythmique IV : 1,5 mg/kg bolus, puis 1-4 mg/min IVSE","Topique voies aériennes : 2-4 mg/kg spray (max 8 mg/kg avec adrénaline)"],p:["Infiltration : 3-5 mg/kg (max, jamais sur muqueuse très vascularisée sans précaution)","IV : 1 mg/kg bolus, puis 20-50 µg/kg/min IVSE"]}
  },
  {
    id:75, nom:"Diazépam", commercial:"VALIUM", dci:"Diazépam", classe:"Benzodiazépine longue durée d'action", cat:"Neurologie", svc:["SAUV","SMUR","SAU"],
    couleur:"#007AFF", icon:"🧠",
    desc:"Benzodiazépine à longue demi-vie (20-70 h) et métabolite actif (déméthyldiazépam). Potentialise le GABA-A. Antiépileptique, anxiolytique, myorelaxant.",
    indic:["État de mal épileptique (2ème ligne après midazolam/clonazépam)","Sevrage alcoolique symptomatique","Tétanos (myorelaxation)","Anxiolyse / sédation procédurale légère"],
    ci:["Insuffisance respiratoire sévère non assistée","Myasthénie","Allergie BZD","Intoxication alcool aiguë sévère (relative)"],
    ei:["Dépression respiratoire","Sédation excessive","Hypotension","Amnésie antérograde","Dépendance (usage prolongé)"],
    cond:["Ampoule 10 mg/2 mL (5 mg/mL)","Comprimé 2 mg, 5 mg, 10 mg","Solution rectale 5 mg, 10 mg (Valium rectal®)"],
    poso:{a:["État de mal : 10 mg IV lent (2,5 mg/min), répéter une fois si besoin","Sevrage alcoolique : 10-20 mg PO /6h selon CIWA","Sédation : 2-10 mg IV lent selon effet"],p:["Convulsions : 0,3-0,5 mg/kg rectal (max 10 mg) ou 0,2-0,3 mg/kg IV lent (max 10 mg)"]}
  },
  {
    id:78, nom:"Spironolactone injectable", commercial:"SOLUDACTONE", dci:"Canrénate de potassium", classe:"Antagoniste de l'aldostérone / Diurétique épargneur de potassium", cat:"Cardiologie", svc:["SAUV"],
    couleur:"#FF9500", icon:"💧",
    desc:"Forme injectable de l'antagoniste de l'aldostérone. Diurétique épargneur de potassium, utilisé en réanimation pour hyperaldostéronisme, insuffisance cardiaque et cirrhose avec ascite.",
    indic:["Insuffisance cardiaque congestive (surcharge hydrosodée)","Cirrhose hépatique avec ascite et oedèmes","Hyperaldostéronisme primaire (Conn)","Hypokaliémie réfractaire aux suppléments"],
    ci:["Hyperkaliémie","Insuffisance rénale aiguë (créatinine > 200 µmol/L)","Association potassium + IEC + ARA2 (triple whammy)"],
    ei:["Hyperkaliémie (risque principal)","Gynécomastie (usage prolongé)","Hyponatrémie","Acidose métabolique hyperchlorémique"],
    cond:["Ampoule 200 mg/10 mL","Ampoule 400 mg/10 mL"],
    poso:{a:["200-400 mg/j IV en 1-2 perfusions de 30-60 min","Ascite réfractaire : 400 mg/j IV","Relais PO dès que possible : 25-200 mg/j"],p:["Non recommandé en pédiatrie d'urgence"]}
  },
  {
    id:79, nom:"Chlorure de Calcium", commercial:"CHLORURE DE CALCIUM", dci:"Chlorure de calcium 10% (CaCl2)", classe:"Sel calcique IV hypertonique (cardioprotecteur)", cat:"Métabolique", svc:["SAUV","SMUR"],
    couleur:"#FFD60A", icon:"⚗️",
    desc:"Sel calcique hypertonique à haute teneur en Ca2+ élémentaire (3× le gluconate). Cardioprotecteur direct. Voie centrale recommandée (veinotoxique). Stabilise la membrane myocardique en hyperkaliémie sévère.",
    indic:["Hyperkaliémie sévère avec signes ECG — cardioprotection immédiate","Hypocalcémie symptomatique sévère (tétanie, laryngospasme)","Intoxication inhibiteurs calciques (vérapamil, diltiazem)","Antagonisme du sulfate de magnésium en surdosage"],
    ci:["Hypercalcémie","Traitement digitalique en cours (risque arythmies graves)","Ne pas mélanger avec bicarbonates, phosphates ni sulfates (précipitation)"],
    ei:["Bradycardie si injection trop rapide","Nécrose tissulaire sévère si extravasation (VVC fortement recommandée)","Phlébite sur voie périphérique"],
    cond:["Ampoule 1 g/10 mL à 10% (CaCl2) — 270 mg Ca2+ élémentaire/10 mL"],
    poso:{a:["Hyperkaliémie ECG : 5-10 mL (0,5-1 g) IV lent sur 5-10 min sous scope (répétable)","Intox inhibiteurs calciques : 1-2 g IV en 10-20 min, puis IVSE 0,2-0,4 mg/kg/h"],p:["0,2 mL/kg de CaCl2 10% IV lent sur 5-10 min sous scope (max 10 mL/dose)"]}
  },
  {
    id:80, nom:"Fibrinogène", commercial:"CLOTTAFACT", dci:"Fibrinogène humain (concentré)", classe:"Facteur de coagulation — protéine plasmatique", cat:"Urgence vitale", svc:["SAUV","SAU"],
    couleur:"#FF3B30", icon:"🩸",
    desc:"Concentré lyophilisé de fibrinogène humain. Corrige le déficit en fibrinogène (premier facteur à chuter en choc hémorragique). Seuil d'alerte < 1,5 g/L. Reconstituer extemporanément.",
    indic:["Choc hémorragique avec hypofibrinogénémie < 1,5 g/L","Hémorragie du post-partum sévère (HPP) réfractaire","Coagulopathie traumatique aiguë","CIVD avec effondrement fibrinogène"],
    ci:["Thrombose en cours non traitée (relatif — balance bénéfice/risque)","Allergie aux protéines plasmatiques humaines"],
    ei:["Réactions allergiques / anaphylaxie (rares — produit sécurisé viroatténué)","Événements thromboemboliques (rares)"],
    cond:["Poudre 1,5 g + solvant 100 mL — CLOTTAFACT® (reconstituer avec le solvant fourni dans la boîte)"],
    poso:{a:["Dose initiale : 3 g (2 flacons) IV en 20-30 min via PSE","Objectif fibrinogénémie > 1,5 g/L — contrôle à 30 min puis adaptation","Dose max : 6 g selon contrôle"],p:["70 mg/kg IV (max 3 g/dose) selon fibrinogénémie"]}
  },
  {
    id:81, nom:"Dopamine", commercial:"DOPAMINE", dci:"Dopamine chlorhydrate", classe:"Catécholamine (agoniste dopaminergique D1/D2 + adrénergique α/β dose-dépendant)", cat:"Cardiologie", svc:["SAUV","SMUR"],
    couleur:"#FF9500", icon:"💗",
    desc:"Précurseur de la noradrénaline. Effets strictement dose-dépendants : dopaminergique (vasodilatation rénale) à faibles doses, β1 (inotrope) à doses intermédiaires, α1 (vasoconstricteur) à fortes doses. TOUJOURS en IVSE.",
    indic:["Choc cardiogénique avec bas débit (alternative dobutamine/noradrénaline)","Choc septique réfractaire (2e ligne après noradrénaline)","Bradycardie réfractaire en attente de PM"],
    ci:["Phéochromocytome (stimulation adrénergique massive)","Hypovolémie non corrigée","Association IMAO","Tachycardie, FV","Fibrillation ventriculaire"],
    ei:["Tachycardie, arythmies ventriculaires","Nécrose tissulaire si extravasation","HTA excessive (fortes doses)","Nausées, vomissements"],
    cond:["Ampoule 200 mg/5 mL (40 mg/mL) — DOPAMINE®","PSE : diluer dans G5% ou NaCl 0,9%"],
    poso:{a:["Bas débit β1 : 5-10 µg/kg/min IVSE","Vasopresseur α : 10-20 µg/kg/min IVSE (max 20-30 µg/kg/min)","PSE : 200 mg dans 50 mL G5% = 4 mg/mL"],p:["2-20 µg/kg/min IVSE (mêmes effets dose-dépendants)"]}
  },
  {
    id:82, nom:"Ténectéplase", commercial:"METALYSE", dci:"Ténectéplase (TNK-tPA)", classe:"Fibrinolytique (activateur tissulaire du plasminogène modifié)", cat:"Thrombolyse", svc:["SAUV","SMUR"],
    couleur:"#FF375F", icon:"🔓",
    desc:"Mutant du rt-PA avec demi-vie longue permettant l'administration en bolus IV unique. Haute affinité pour la fibrine et résistant à l'inhibiteur PAI-1. Thrombolyse coronaire de 1ère ligne si angioplastie impossible.",
    indic:["IDM STEMI si délai angioplastie > 120 min (thrombolyse pharmaco-invasive)","EP massive avec instabilité hémodynamique et CI à l'angioplastie"],
    ci:["Hémorragie active ou récente < 3 mois","AVC ou TIA < 6 mois","Chirurgie majeure < 3 semaines","HTA > 180/110 mmHg non contrôlée","Ponction artérielle non compressible récente"],
    ei:["Hémorragie majeure (risque principal)","Hémorragie intracrânienne (0,5-1%)","Arythmies de reperfusion","Hypotension transitoire"],
    cond:["Lyophilisat + solvant (10 000 UI = 50 mg) avec 10 mL EPPI — METALYSE®","Bolus unique adapté au poids"],
    poso:{a:["Poids < 60 kg : 30 mg (6 000 UI) IV bolus unique","60-70 kg : 35 mg ; 70-80 kg : 40 mg ; 80-90 kg : 45 mg ; > 90 kg : 50 mg","Systématiquement associé à anticoagulation (HNF ou HBPM)"],p:["Non recommandé < 18 ans"]}
  },
  {
    id:83, nom:"Octréotide", commercial:"SANDOSTATINE", dci:"Octréotide acétate", classe:"Analogue de la somatostatine — vasoconstricteur splanchnique", cat:"Gastro-entérologie", svc:["SAUV"],
    couleur:"#32D74B", icon:"💊",
    desc:"Analogue synthétique de la somatostatine à longue durée d'action. Réduit le débit sanguin splanchnique et inhibe les sécrétions gastriques. Traitement médical des hémorragies sur rupture de varices œsophagiennes.",
    indic:["Hémorragie digestive sur rupture de varices œsophagiennes (en attente endoscopie)","Fistules digestives à haut débit","Tumeurs neuroendocrines sécrétantes (diarrhée profuse, flush carcinoïde)"],
    ci:["Allergie octréotide","Grossesse (données insuffisantes)"],
    ei:["Nausées, douleurs abdominales, diarrhées","Bradycardie, anomalies ECG (espace QT)","Hypoglycémie ou hyperglycémie","Lithiase biliaire (usage prolongé)"],
    cond:["Ampoule 100 µg/1 mL — SANDOSTATINE®","Ampoule 200 µg/1 mL","Conserver au réfrigérateur (boîte déchocage)"],
    poso:{a:["Bolus initial : 50 µg IV lent puis IVSE : 6 ampoules 100 µg qsp 48 mL NaCl 0,9%","Débit : 25-50 µg/h IVSE × 3-5 jours","Soit 1-2 mL/h avec la préparation 600 µg/48 mL"],p:["1-2 µg/kg IV bolus, puis 1-2 µg/kg/h IVSE"]}
  },
  {
    id:84, nom:"Oméprazole", commercial:"MOPRAL / INIPOMP", dci:"Oméprazole", classe:"Inhibiteur de la pompe à protons (IPP)", cat:"Gastro-entérologie", svc:["SAUV","SAU"],
    couleur:"#32D74B", icon:"🟢",
    desc:"IPP inhibant de façon irréversible la H+/K+-ATPase de la cellule pariétale gastrique. Réduit la sécrétion acide de 90-95%. Prévention des ulcères de stress en réanimation.",
    indic:["Hémorragie digestive haute sur ulcère gastro-duodénal","Prévention ulcères de stress (réanimation, ventilation mécanique)","Œsophagite peptique sévère","RGO sévère","Syndrome de Zollinger-Ellison"],
    ci:["Hypersensibilité IPP","Association atazanavir / nelfinavir (antiviraux VIH — réduction absorption)"],
    ei:["Diarrhée, nausées, céphalées","Hyponatrémie, hypomagnésémie (usage prolongé)","Infections digestives (Clostridium difficile)","Ostéoporose (traitement long terme)"],
    cond:["Poudre IV 40 mg — MOPRAL® / INIPOMP® IV","Gélule 10 mg, 20 mg, 40 mg PO","PSE entretien : 80 mg/48 mL = 1,67 mg/mL"],
    poso:{a:["Hémorragie digestive : 80 mg IV bolus en 20-30 min dans 100 mL NaCl 0,9%, puis 8 mg/h IVSE × 72h (PSE 200 mg/24h)","Standard : 40 mg/j IV ou PO"],p:["1-2 mg/kg/j PO (max 40 mg/j)","IV : 0,5-1 mg/kg/j"]}
  },
  {
    id:85, nom:"Striadyne", commercial:"STRIADYNE", dci:"Adénosine triphosphate (ATP)", classe:"Antiarythmique — nucléotide endogène (agoniste récepteurs A1)", cat:"Cardiologie", svc:["SAUV"],
    couleur:"#FF9500", icon:"📡",
    desc:"Nucléotide endogène agissant sur les récepteurs adénosinergiques A1. Bloque la conduction nodale AV. Utilisé pour la conversion des TSV en rythme sinusal. Effets très transitoires < 30 secondes.",
    indic:["TSV paroxystique par réentrée nodale (TRNAV) ou jonctionelle","Diagnostic différentiel tachycardies à QRS fins (bloc AV transitoire révélateur)"],
    ci:["BAV 2e/3e degré sans PM","Dysfonction sinusale sévère sans PM","Asthme sévère actif (bronchospasme)","Syndrome de WPW avec pré-excitation (risque FV)","Association dipyridamole"],
    ei:["Flush facial intense, dyspnée, douleurs thoraciques (transitoires < 30 sec — prévisibles)","Pause sinusale transitoire","BAV transitoire","Bronchospasme (asthmateux CI)"],
    cond:["Ampoule 20 mg/2 mL — STRIADYNE® (ATP)","Administrer pur, bolus IV rapide < 2 sec"],
    poso:{a:["20 mg IV bolus très rapide (< 2 sec) + flush 20 mL NaCl 0,9% rapide en proximal","Si échec après 2 min : 20 mg (même dose répétée)","Annoncer au patient les effets transitoires prévisibles"],p:["0,3-0,5 mg/kg IV bolus rapide (max 20 mg)"]}
  },
  {
    id:86, nom:"Glucagon", commercial:"GLUCAGEN", dci:"Glucagon (rDNA) chlorhydrate", classe:"Hormone pancréatique α / Antidote bêtabloquants et inhibiteurs calciques", cat:"Métabolique", svc:["SAUV","SMUR"],
    couleur:"#FFD60A", icon:"🔋",
    desc:"Hormone hyperglycémiante stimulant la glycogénolyse hépatique. Principale indication d'urgence : antidote des bêtabloquants (inotrope positif non adrénergique) et des inhibiteurs calciques.",
    indic:["Intoxication / surdosage bêtabloquants (bradycardie, BAV, choc)","Intoxication inhibiteurs calciques (2e ligne)","Hypoglycémie sévère si voie IV impossible (administration IM ou SC)"],
    ci:["Phéochromocytome (libération catécholamines massive)","Insulinome (risque hypoglycémie rebond sévère)","Allergie glucagon"],
    ei:["Nausées, vomissements (fréquents)","Hypokaliémie","Tachycardie, hypertension (doses élevées)","Hyperglycémie transitoire"],
    cond:["Flacon 1 mg poudre + seringue solvant 1 mL EPPI — GLUCAGEN® HypoKit","Flacon 1 mg IV","Nécessite reconstitution extemporanée"],
    poso:{a:["Intox bêtabloquants : 1-5 mg IV bolus lent (max 5 mg), puis IVSE 2-5 mg/h selon réponse","Hypoglycémie : 1 mg IM ou SC (adulte > 25 kg), puis gestion voie orale dès réveil"],p:["< 25 kg : 0,5 mg IM ou SC","Intox : 0,05-0,1 mg/kg IV, puis 0,07 mg/kg/h IVSE"]}
  },
  {
    id:87, nom:"Amikacine", commercial:"AMIKLIN", dci:"Amikacine sulfate", classe:"Aminoside (aminoglycoside) — bactéricide concentration-dépendant", cat:"Infectiologie", svc:["SAUV","SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"Aminoside de 3e génération. Spectre étendu aux BGN résistants aux autres aminosides (Pseudomonas, entérobactéries sécrétant des enzymes modificatrices). Dosage une fois par jour. Surveillance de la toxicité rénale et auditive.",
    indic:["Sepsis grave / choc septique à BGN en association (synergie)","Infection à Pseudomonas aeruginosa (association)","Pneumopathie nosocomiale (en association)","Méningite à BGN (en association)"],
    ci:["Insuffisance rénale sévère (adapter impérativement)","Myasthénie grave","Grossesse (ototoxicité fœtale)"],
    ei:["Néphrotoxicité (surveillance créatinine / diurèse)","Ototoxicité cochléaire et vestibulaire (surveillance audiogramme si > 5j)","Bloc neuromusculaire (fortes doses)"],
    cond:["Flacon 500 mg/4 mL (125 mg/mL)","Flacon 1 g/4 mL","Diluer dans 50-100 mL NaCl 0,9% — perfusion 30 min"],
    poso:{a:["Dose unique journalière : 15-20 mg/kg IV sur 30 min (max 1,5 g/j)","Pic sérique cible > 64 mg/L à 30 min après fin de perfusion","Résiduelle cible < 2,5 mg/L avant dose suivante"],p:["Néonat : 15 mg/kg/48h IV","NN-enfant : 15-20 mg/kg/j IV (1 injection)"]}
  },
  {
    id:88, nom:"Amoxicilline", commercial:"AMOXICILLINE", dci:"Amoxicilline trihydratée", classe:"Antibiotique pénicilline A (aminopénicilline) — bactéricide", cat:"Infectiologie", svc:["SAUV","SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"Aminopénicilline à large spectre sur les germes sensibles. Bactéricide par inhibition de la synthèse du peptidoglycane. Dose méningée très élevée (12-24 g/j) pour franchir la BHE.",
    indic:["Méningite bactérienne (Listéria — dose méningée en association)","Endocardite à streptocoque (traitement de référence)","Pneumopathie communautaire (association si nécessaire)","Angine à streptocoque A","Infections ORL communautaires"],
    ci:["Allergie pénicillines (anaphylaxie)","Mononucléose infectieuse EBV (rash maculo-papuleux généralisé)"],
    ei:["Diarrhée, nausées","Allergie cutanée (exanthème maculo-papuleux)","Anaphylaxie","Colite à Clostridioides difficile (rare)"],
    cond:["Flacon poudre IV 500 mg, 1 g, 2 g","Diluer dans 100 mL NaCl 0,9% — perfusion 20-30 min","Stable 8h à 25°C"],
    poso:{a:["Standard : 1-2 g IV × 3-4/j","Méningite : 200-300 mg/kg/j IV en 6 injections (max 24 g/j)","Endocardite : 12 g/j IV en perfusion continue ou 6 injections"],p:["100-200 mg/kg/j en 3-4 injections","Méningite : 300-400 mg/kg/j en 6 injections"]}
  },
  {
    id:89, nom:"Aciclovir", commercial:"ZOVIRAX IV", dci:"Aciclovir (acyclovir)", classe:"Antiviral — analogue nucléosidique inhibiteur de l'ADN polymérase virale", cat:"Infectiologie", svc:["SAUV","SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"Analogue de la guanosine activé spécifiquement par la thymidine kinase virale. Actif sur HSV 1 et 2, VZV. Traitement de référence de l'encéphalite herpétique. Administrer seul (incompatible avec de nombreux produits).",
    indic:["Encéphalite herpétique (HSV) — urgence diagnostique et thérapeutique","Primo-infection herpétique grave (HSV)","Zona ophtalmique ou disséminé sévère (VZV)","Infection herpétique chez immunodéprimé"],
    ci:["Allergie aciclovir / valaciclovir","Insuffisance rénale sévère sans adaptation posologique","Ne pas mélanger avec d'autres médicaments (risque cristallisation)"],
    ei:["Néphrotoxicité (cristallurie — hydratation +++, perfusion > 1h)","Neurotoxicité (confusion, tremblements, encéphalopathie — IR ou surdosage)","Phlébite (pH alcalin)","Nausées"],
    cond:["Poudre IV 250 mg / 500 mg / 1 000 mg — ZOVIRAX® IV","Reconstituer puis diluer dans 50-250 mL NaCl 0,9% — perfusion ≥ 1h STRICT","Passer SEUL — incompatible avec de nombreux produits"],
    poso:{a:["Encéphalite herpétique : 10 mg/kg IV toutes les 8h (× 14-21 jours)","HSV mucocutané grave : 5 mg/kg/8h","Adapater si insuffisance rénale selon DFG"],p:["NN : 20 mg/kg IV /8h × 14-21 j","Encéphalite > 3 mois : 10-15 mg/kg/8h"]}
  },
  {
    id:90, nom:"Ceftriaxone", commercial:"ROCÉPHINE", dci:"Ceftriaxone disodique", classe:"Céphalosporine 3e génération (C3G) — bactéricide", cat:"Infectiologie", svc:["SAUV","SMUR","SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"C3G à large spectre avec excellente diffusion méningée et demi-vie longue (1 injection/jour). Active sur la plupart des entérobactéries, cocci gram+ et gram-. Référence méningite bactérienne de l'adulte.",
    indic:["Méningite bactérienne (1ère ligne adulte et enfant)","Sepsis sévère communautaire à point de départ non identifié","Pneumopathie communautaire grave","Infections ostéo-articulaires / endocardite (certain germe)","SAMU : infections graves de l'adulte"],
    ci:["Allergie céphalosporines","Allergie pénicillines sévère (10% allergie croisée — prudence)","Nourrisson < 41 SA corrigées avec bilirubinémie élevée (compétition albumine)","Ne pas mélanger avec du calcium IV (précipitation)"],
    ei:["Diarrhée, nausées","Allergie cutanée","Colite à Clostridioides difficile (rare)","Lithiase biliaire de boue (usage prolongé)","Arythmie si injection IV rapide sur cathéter central (risque)"],
    cond:["Flacon poudre IV 1 g, 2 g — ROCÉPHINE®","Diluer dans 100 mL NaCl 0,9% ou G5% — perfusion 30 min","Stable 3h à 25°C","Attention : NE PAS PASSER avec une perfusion calcium IV (même ligne)"],
    poso:{a:["Standard : 1-2 g IV /24h","Méningite : 100 mg/kg/j IV en 1 injection (max 4 g/j)","Sepsis grave : 2 g/j IV"],p:["50-100 mg/kg/j IV en 1-2 injections (max 4 g/j)","Méningite : 100 mg/kg/j"]}
  },
  {
    id:91, nom:"Gentamicine", commercial:"GENTALLINE", dci:"Gentamicine sulfate", classe:"Aminoside (aminoglycoside) — bactéricide concentration-dépendant", cat:"Infectiologie", svc:["SAUV","SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"Aminoside de 1ère génération. Spectre large sur BGN aérobies. Toujours en dose unique journalière (meilleure efficacité, moindre toxicité). Synergie avec les bêta-lactamines (endocardite).",
    indic:["Sepsis grave à BGN en association (synergie bêta-lactamines)","Endocardite à entérocoque ou streptocoque (synergie — dose réduite)","Infection urinaire compliquée à BGN","Infections graves à BGN nosocomiales (en association)"],
    ci:["Insuffisance rénale sévère (adapter impérativement)","Myasthénie grave","Grossesse (ototoxicité fœtale)"],
    ei:["Néphrotoxicité (dépend de la durée et des doses cumulées)","Ototoxicité cochléo-vestibulaire","Bloc neuromusculaire (rare, fortes doses)"],
    cond:["Flacon 160 mg/1,5 mL (80 mg/mL)","Flacon 80 mg/2 mL","Diluer dans 50-100 mL NaCl 0,9% — perfusion 30 min","Stable 24h à 25°C"],
    poso:{a:["Dose unique journalière : 3-5 mg/kg IV sur 30 min (sepsis grave jusqu'à 7 mg/kg)","Pic sérique cible > 10 mg/L à 30 min post-perfusion","Résiduelle cible < 0,5 mg/L avant la prochaine dose (ou non détectable)"],p:["NN : 2,5 mg/kg/36-48h selon âge gestationnel","Enfant : 3-5 mg/kg/j en 1 injection IV"]}
  },
  {
    id:92, nom:"Lévofloxacine", commercial:"TAVANIC", dci:"Lévofloxacine hémihydratée", classe:"Antibiotique fluoroquinolone (quinolone 3e génération) — bactéricide", cat:"Infectiologie", svc:["SAUV","SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"Fluoroquinolone de 3e génération avec activité étendue aux cocci gram+ (pneumocoque) et BGN. Bonne diffusion pulmonaire. Flacon prêt à l'emploi (250 mg/50 mL ou 500 mg/100 mL).",
    indic:["Pneumopathie communautaire sévère (alternative ou association)","Exacerbation aiguë de BPCO (formes sévères)","Infections urinaires compliquées à BGN","Légionellose"],
    ci:["Allergie fluoroquinolones","Antécédent de tendinopathie aux quinolones","Association médicaments allongeant le QT (risque torsades de pointe)","Épilepsie non contrôlée","Grossesse / allaitement"],
    ei:["Tendinopathie et rupture tendineuse (Achille ++)","Allongement QTc (ECG si facteur de risque)","Nausées, diarrhées","Hypoglycémie (diabétique sous sulfamide)","Encéphalopathie (sujet âgé, IR)"],
    cond:["Flacon prêt à l'emploi 250 mg/50 mL — TAVANIC® (perfusion 30 min)","Flacon prêt à l'emploi 500 mg/100 mL (perfusion 60 min)","Ne pas diluer davantage"],
    poso:{a:["500 mg IV /24h (ou /12h si infection sévère ou à germe résistant) — perfusion 60 min","Adapter à la fonction rénale (DFG < 50 : espacer)"],p:["Non recommandé < 15 ans (chondrotoxicité animaux)"]}
  },
  {
    id:93, nom:"Métronidazole", commercial:"FLAGYL", dci:"Métronidazole", classe:"Antibiotique / Antiparasitaire nitroimidazolé — bactéricide anaérobies", cat:"Infectiologie", svc:["SAUV","SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"Actif spécifiquement sur les bactéries anaérobies et les protozoaires. Réduit par des réductases bactériennes en dérivés cytotoxiques pour l'ADN. Flacon prêt à l'emploi.",
    indic:["Infections à anaérobies (péritonite, abcès, infections gynécologiques)","Colite à Clostridioides difficile (cure orale — alternative vancomycine PO)","Amœbose hépatique","Infections dentaires sévères (association)","Traitement d'Helicobacter pylori (en trithérapie)"],
    ci:["Allergie métronidazole","Association disulfirame (Antabuse®)","Grossesse 1er trimestre (relatif)","Allaitement (suspension 12-24h post-dose)"],
    ei:["Nausées, goût métallique","Réaction antabuse si alcool (ne pas consommer)","Neurotoxicité (neuropathie périphérique, encéphalopathie) — traitement prolongé","Coloration des urines en brun (normal)"],
    cond:["Flacon prêt à l'emploi 500 mg/100 mL — FLAGYL® (perfusion 30 min)","Comprimé 250 mg, 500 mg PO","Stable 24h à 25°C à l'abri de la lumière"],
    poso:{a:["500 mg IV toutes les 8h — perfusion 30 min","Infections sévères : 1 g /8h","PO : 500 mg × 3/j pendant 7-14 jours"],p:["15 mg/kg/j IV en 3 injections (max 500 mg/dose)"]}
  },
  {
    id:94, nom:"Pipéracilline + Tazobactam", commercial:"TAZOCILLINE", dci:"Pipéracilline sodique + Tazobactam sodique", classe:"Antibiotique pénicilline de 4e génération + inhibiteur β-lactamase — très large spectre", cat:"Infectiologie", svc:["SAUV","SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"Association d'une uréidopénicilline à large spectre (pipéracilline) et d'un inhibiteur de β-lactamase (tazobactam). Actif sur Pseudomonas, entérobactéries (dont productrices de BLSE selon CMI), anaérobies.",
    indic:["Sepsis grave / choc septique nosocomial — spectre large en probabiliste","Pneumopathie acquise sous ventilation (PAV)","Péritonite, infection intra-abdominale sévère","Infection urinaire compliquée à BGN","Infection du patient neutropénique fébrile"],
    ci:["Allergie pénicillines (anaphylaxie)","Allergie céphalosporines sévère (allergie croisée partielle)"],
    ei:["Diarrhée, nausées","Allergie cutanée","Hypokaliémie (apport sodé important)","Colite à Clostridioides difficile","Élévation transaminases","Neutropénie (usage prolongé)"],
    cond:["Flacon poudre IV 4 g/500 mg — TAZOCILLINE® (pipéracilline 4g + tazobactam 500mg)","Dissoudre avec 20 mL EPPI, puis diluer dans 100 mL NaCl 0,9% — perfusion 30-60 min","Stable 24h à 25°C"],
    poso:{a:["4 g/500 mg IV toutes les 8h (toutes les 6h en infections sévères à Pseudomonas)","Neutropénie fébrile : 4 g/8h IV","Perfusion prolongée 4h possible pour optimiser la couverture (T > CMI)"],p:["Enfant > 2 mois : 100 mg/kg/j de pipéracilline IV en 3-4 injections","NN et < 2 mois : données limitées"]}
  },
  {
    id:95, nom:"Rovamycine", commercial:"ROVAMYCINE", dci:"Spiramycine", classe:"Antibiotique macrolide — bactériostatique / bactéricide (concentration-dépendant)", cat:"Infectiologie", svc:["SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"Macrolide de 16 carbones à forte concentration tissulaire intracellulaire. Actif sur les bactéries intracellulaires, germes atypiques et certains cocci gram+. Alternative aux bêta-lactamines si allergie.",
    indic:["Infections ORL et respiratoires à germes sensibles (alternative bêta-lactamines)","Toxoplasmose en cours de grossesse (1ère ligne)","Infections à germes atypiques (Mycoplasma, Chlamydia, Legionella)"],
    ci:["Allergie macrolides","Insuffisance hépatique sévère"],
    ei:["Nausées, vomissements, diarrhées (moins qu'érythromycine)","Réactions allergiques cutanées","Élévation des transaminases (rare)"],
    cond:["Comprimé 1,5 MUI et 3 MUI — ROVAMYCINE® PO","Flacon poudre IV 1,5 MUI","IV : 1,5 MUI dans 100 mL G5% — perfusion 60 min","Utilisation immédiate après reconstitution"],
    poso:{a:["IV : 1,5 MUI toutes les 8h (perfusion 60 min dans G5% STRICT)","PO : 3 MUI × 2-3/j","Toxoplasmose grossesse : 9 MUI/j en 3 prises PO (jusqu'à amniocentèse)"],p:["150 000 UI/kg/j PO en 2-3 prises","IV : 75 000 UI/kg × 2-3/j"]}
  },
  {
    id:96, nom:"Vancomycine", commercial:"VANCOMYCINE", dci:"Vancomycine chlorhydrate", classe:"Glycopeptide — bactéricide sur cocci gram+ (dont SARM)", cat:"Infectiologie", svc:["SAUV","SAU"],
    couleur:"#00C7BE", icon:"🦠",
    desc:"Glycopeptide actif sur les bactéries gram+ résistantes aux bêta-lactamines (SARM, ERV). Inhibiteur de la synthèse du peptidoglycane. Monitoring TDM obligatoire (objectif : AUC 400-600 mg.h/L ou résiduelle 15-20 mg/L selon protocole).",
    indic:["Sepsis grave / endocardite à SARM ou entérocoque résistant","Méningite à SARM ou pneumocoque résistant (dose méningée ++)","Infection grave chez sujet allergique aux bêta-lactamines (staphylococci)","Colite à Clostridioides difficile sévère (voie orale uniquement)"],
    ci:["Allergie vancomycine","Insuffisance rénale sévère sans adaptation (accumulation)","Ne pas associer en même ligne IV à d'autres médicaments (incompatibilités multiples)"],
    ei:["Red man syndrome (flush, prurit, hypotension) si injection trop rapide — prévenir par lenteur","Néphrotoxicité (surveillance créatinine ++)","Ototoxicité (surdosage)","Phlébite (solution acide — VVC conseillée si doses élevées)"],
    cond:["Flacon poudre 500 mg ou 1 g — VANCOMYCINE®","Reconstituer puis diluer : 500 mg dans 100 mL / 1 g dans 250 mL NaCl 0,9%","Perfusion 60 min (sur KTC : 100 mL quelle que soit la posologie)","Stable 24h à 25°C"],
    poso:{a:["Dose de charge : 25-30 mg/kg IV (max 3 g) — perfusion ≥ 2h","Entretien : 15-20 mg/kg IV /8-12h selon DFG et monitorage","Objectif AUC/CMI 400-600 ou résiduelle 15-25 mg/L (méningite : 20-25)"],p:["Néonat : 15-20 mg/kg/12-24h selon AG","Enfant : 40-60 mg/kg/j en 4 injections (méningite : 60 mg/kg/j)"]}
  },
  {
    id:97, nom:"NaCl 0,9%", commercial:"CHLORURE DE SODIUM 0,9%", dci:"Chlorure de sodium 9 g/L — solution isotonique", classe:"Soluté isotonique de remplissage / diluant / vecteur", cat:"Solutés", svc:["SAUV","SMUR","SAU"],
    couleur:"#007AFF", icon:"💧",
    desc:"Soluté cristalloïde isotonique de référence. Soluté de remplissage universel, vecteur de dilution pour la majorité des médicaments IV. Apport exclusivement extracellulaire. À privilégier chez les cérébrolésés.",
    indic:["Déshydratation extracellulaire / déplétion sodique","Remplissage vasculaire en première intention (choc, hypovolémie)","Vecteur de dilution pour la majorité des médicaments IV","Soluté de référence pour les patients neurochirurgicaux et cérébrolésés","Lavage de cathéter / rinçage de ligne"],
    ci:["Hypernatrémie sévère non corrigée","Surcharge hydrosodée / OAP (relatif — adapter débit)","Hyperchlorémie sévère (acidose hyperchlorémique si volumes importants)"],
    ei:["Hypernatrémie, hyperchlorémie (volumes importants)","Acidose métabolique hyperchlorémique (apports massifs)","Surcharge volumique (patient insuffisant cardiaque)"],
    cond:["Poche 50 mL / 100 mL / 250 mL / 500 mL / 1000 mL","Ampoules 5 mL / 10 mL (pour dilution médicaments)"],
    poso:{a:["Remplissage : 500 mL à 1 L IV sur 15-30 min selon état hémodynamique (évaluer la réponse)","Dilution médicaments : selon le médicament concerné","Entretien : 500-2000 mL/24h selon bilan entrées-sorties"],p:["Remplissage : 10-20 mL/kg IV sur 20-30 min, réévaluer"]}
  },
  {
    id:98, nom:"Glucose 5%", commercial:"GLUCOSÉ 5%", dci:"Glucose anhydre 5 g/100 mL — solution isotonique", classe:"Soluté glucosé isotonique d'entretien", cat:"Solutés", svc:["SAUV","SMUR","SAU"],
    couleur:"#007AFF", icon:"💧",
    desc:"Soluté glucosé isotonique. Fournit 50 g de glucose/L soit 200 kcal/L. Apport hypotonique résiduel après métabolisation du glucose. À éviter en neurochirurgie (aggrave les lésions ischémiques). Vecteur de choix pour amiodarone et certains produits incompatibles avec NaCl.",
    indic:["Entretien hydrique et apport calorique modéré (état de jeûne)","Soluté de dilution obligatoire pour certains médicaments (amiodarone, noradrénaline)","Suspicion de pathologie cardiaque en entretien (moins de sodium)","Corriger une hypernatrémie (avec surveillance)"],
    ci:["Hyperglycémie (contrôler glycémie, adapter)","Cérébrolésion aiguë : éviter (aggrave œdème cérébral et ischémie)","En remplissage seul (pas de sodium : risque hyponatrémie)"],
    ei:["Hyperglycémie (surveillance glycémique ++)","Risque d'hyponatrémie si perfusion isolée prolongée","Aggravation des lésions ischémiques cérébrales"],
    cond:["Poche 250 mL / 500 mL / 1 000 mL — GLUCOSÉ 5%","Apport de 50 g sucre par litre"],
    poso:{a:["Entretien : 500-2000 mL/24h selon besoins","Correction hypernatrémie : calcul selon déficit en eau libre, correction lente < 10 mEq/L/24h","Vecteur médicament : volume selon protocole du médicament"],p:["Entretien : 60-120 mL/kg/j selon poids et âge"]}
  },
  {
    id:99, nom:"Isofundine", commercial:"ISOFUNDINE", dci:"Solution polyélectrolytique balancée (cristalloïde isotonique balancé)", classe:"Soluté de remplissage cristalloïde balancé — solution de Hartmann modifiée", cat:"Solutés", svc:["SAUV","SMUR"],
    couleur:"#007AFF", icon:"💧",
    desc:"Cristalloïde balancé iso-osmolaire à la composition proche du plasma. Contient Na+, K+, Ca2+, Mg2+, Cl- et acétate/malate comme tampons. Limite l'acidose hyperchlorémique comparativement au NaCl 0,9%.",
    indic:["Remplissage vasculaire — soluté de remplissage cristalloïde à privilégier","Choc hémorragique, hypovolémie, déshydratation extracellulaire","Alternative au NaCl 0,9% pour limiter l'acidose hyperchlorémique","Grands brûlés (protocole de remplissage)"],
    ci:["Hyperkaliémie (contient du potassium — vérifier kaliémie)","Insuffisance rénale oligo-anurique (risque hyperkaliémie)","Alcalose métabolique sévère"],
    ei:["Surcharge volumique si apports excessifs","Hyperkaliémie (patient avec IR)","Hypercalcémie (contient du calcium)"],
    cond:["Poche 500 mL — ISOFUNDINE®","Poche 1 000 mL"],
    poso:{a:["Remplissage : 500 mL IV sur 15-30 min, réévaluation clinique","Grands brûlés : 2-4 mL/kg/% surface brûlée sur 24h (Parkland modifié)"],p:["10-20 mL/kg IV sur 20-30 min, réévaluer"]}
  },
  {
    id:100, nom:"Ringer Lactate", commercial:"RINGER LACTATE", dci:"Solution de Ringer lactate (lactate de sodium, NaCl, KCl, CaCl2)", classe:"Soluté de remplissage cristalloïde balancé (solution de Hartmann)", cat:"Solutés", svc:["SAUV","SMUR"],
    couleur:"#007AFF", icon:"💧",
    desc:"Cristalloïde balancé classique contenant lactate (métabolisé en bicarbonate par le foie), potassium et calcium. Proche de la composition plasmatique. Soluté de référence du choc hémorragique traumatique.",
    indic:["Choc hémorragique traumatique (référence traumato)","Remplissage vasculaire — moins d'acidose hyperchlorémique que NaCl 0,9%","Déshydratation extracellulaire","Grands brûlés (protocole Parkland)"],
    ci:["Insuffisance hépatique sévère (métabolisme du lactate altéré)","Hyperkaliémie (contient K+ — vérifier kaliémie)","Alcalose lactique préexistante"],
    ei:["Surcharge volumique si apports excessifs","Élévation de la lactatémie (interférence avec le monitoring biologique)","Hypercalcémie (contient Ca2+)"],
    cond:["Poche 500 mL — RINGER LACTATE®","Poche 1 000 mL"],
    poso:{a:["Remplissage choc hémorragique : 500-1000 mL IV rapide, réévaluation","Grands brûlés : 3-4 mL/kg/% surface brûlée sur 24h (Parkland)","Entretien : adapter aux besoins"],p:["10-20 mL/kg IV sur 20-30 min, réévaluer"]}
  },
  {
    id:101, nom:"Mannitol 20%", commercial:"MANNITOL 20%", dci:"Mannitol 200 g/L (solution hypertonique)", classe:"Diurétique osmotique / Osmothérapie", cat:"Neurologie", svc:["SAUV","SMUR"],
    couleur:"#007AFF", icon:"🧠",
    desc:"Diurétique osmotique non réabsorbable. Réduit la pression intracrânienne par déshydratation osmotique du parenchyme cérébral sain (BHE intacte) et par augmentation de la déformabilité érythrocytaire. Effet en 15-30 min.",
    indic:["Hypertension intracrânienne (HTIC) aiguë — TCG grave, AVC hémorragique étendu","Engagement cérébral imminent (signe mydriase unilatérale)","Traitement osmotique avant transfert neurochirurgical"],
    ci:["Hypovolémie non corrigée (aggrave)","Insuffisance rénale anurique","Hyperosmolarité sévère > 320 mOsm/kg","Insuffisance cardiaque décompensée (surcharge)"],
    ei:["Déshydratation, hypovolémie (effet osmotique)","Hyperosmolarité, hypernatrémie","Insuffisance rénale aiguë (doses élevées répétées)","Effet rebond si fuite vers le parenchyme cérébral (BHE lésée)"],
    cond:["Flacon 500 mL à 20% (200 g/L) — MANNITOL®","Pouvant être perfusé pur ou dilué dans NaCl 0,9%","Surveiller osmolarité : objectif < 320 mOsm/kg"],
    poso:{a:["0,5-1,5 g/kg IV en 20-30 min (débit libre)","Dose répétée /4-6h si persistance HTIC (max 2 g/kg/24h)","Objectif osmolarité sérique 295-310 mOsm/kg"],p:["0,5-1 g/kg IV en 15-30 min","Même surveillance osmolarité"]}
  },
  {
    id:102, nom:"Concentré Globulaire Rouge", commercial:"CGR — CONCENTRÉ DE GLOBULES ROUGES", dci:"Concentré érythrocytaire (produit sanguin labile)", classe:"Produit sanguin labile — érythrocytes déleucocytés", cat:"Produits sanguins", svc:["SAUV","SAU"],
    couleur:"#FF3B30", icon:"🩸",
    desc:"Produit sanguin labile composé d'érythrocytes concentrés déleucocytés. Restaure la capacité de transport de l'oxygène. Commande à l'EFS. Traçabilité obligatoire (RAI, groupe sanguin). Conservation au réfrigérateur à sang dédié.",
    indic:["Anémie aiguë symptomatique (Hb < 7 g/dL ou < 10 g/dL si cardiopathie ischémique)","Choc hémorragique (transfusion massive)","Hémorragie active menaçant le pronostic vital"],
    ci:["Incompatibilité ABO / Rh (groupe préalable et RAI indispensable)","Absence de contrôle ultime au lit du patient avant transfusion","Surcharge volémique relative (adapter débit)"],
    ei:["Réaction hémolytique immunologique (incompatibilité ABO — MORTEL)","Réaction fébrile non hémolytique","Allergie / TRALI","Surcharge volumique (TACO)","Transmission agent infectieux (très faible risque)"],
    cond:["Poche de 250-350 mL environ — conservée au réfrigérateur dédié (+ 4°C)","Durée de transfusion : 1-2h (max 4h après sortie du frigo)","Utiliser une tubulure à transfusion avec filtre","Peut être conservé max 6h hors frigo"],
    poso:{a:["1 CGR augmente l'Hb d'environ 1 g/dL (chez adulte de 70 kg)","Choc hémorragique : transfusion massive (CGR + PFC en ratio 1:1)","Débit adapté selon urgence clinique, tolérance et état cardiaque"],p:["10-15 mL/kg sur 2-3h (augmentation Hb ≈ 2-3 g/dL)"]}
  },
  {
    id:103, nom:"Plasma Frais Congelé", commercial:"PFC — PLASMA FRAIS CONGELÉ", dci:"Plasma humain frais congelé (facteurs de coagulation)", classe:"Produit sanguin labile — plasma thérapeutique", cat:"Produits sanguins", svc:["SAUV","SAU"],
    couleur:"#FF3B30", icon:"🩸",
    desc:"Plasma humain contenant tous les facteurs de coagulation, inhibiteurs naturels (protéines C, S, antithrombine) et fibrinogène. Traçabilité obligatoire. Administration dans les 6h après décongélation. Compatible avec le TGV (transfusion globale).",
    indic:["Coagulopathie de consommation / CIVD avec saignement","Transfusion massive (ratio CGR:PFC 1:1 ou 1:2)","Antidote urgente si concentrés de facteurs indisponibles","Déficit en facteur de coagulation non disponible en concentré spécifique"],
    ci:["Surcharge volémique sévère (TACO)","Ne pas utiliser pour simple remplissage","Incompatibilité ABO (iso-groupe ou iso-compatible)"],
    ei:["TRALI (lésion pulmonaire aiguë post-transfusionnelle — grave)","Allergie / anaphylaxie","TACO (surcharge volumique)","Transmission agents infectieux (très faible risque)"],
    cond:["Poche 200-250 mL — décongeler avant utilisation (décongélation au bain-marie)","Administration dans les 30 min en perfusion IV","Compatible avec le TGV (transfusion globale)","Traçabilité obligatoire — peut être transfusé jusqu'à 6h après décongélation"],
    poso:{a:["10-15 mL/kg IV en 30 min (4-6 poches adulte en général)","Transfusion massive : ratio CGR:PFC 1:1 ou selon protocole local","Objectif TP > 50% / TCA < 1,5 × témoin"],p:["10-15 mL/kg IV sur 30 min — même principe"]}
  },
  {
    id:104, nom:"Plaquettes", commercial:"CONCENTRÉ PLAQUETTAIRE (CP)", dci:"Concentré plaquettaire (produit sanguin labile)", classe:"Produit sanguin labile — plaquettes thérapeutiques", cat:"Produits sanguins", svc:["SAUV","SAU"],
    couleur:"#FF3B30", icon:"🩸",
    desc:"Concentré plaquettaire (CP) ou apherèse plaquettaire (MCP). Restaure l'hémostase primaire. Transfuser dès réception dans le service sans délai. Ne JAMAIS administrer avec le TGV.",
    indic:["Thrombopénie sévère < 10 G/L (ou < 20 G/L si fièvre)","Thrombopénie avec hémorragie active (seuil < 50 G/L)","Chirurgie urgente / neurochirurgie (objectif > 100 G/L)","Transfusion massive avec thrombopénie < 50 G/L"],
    ci:["Purpura thrombotique thrombocytopénique (PTT) — CONTRE-INDICATION FORMELLE","Thrombopénie induite à l'héparine (TIH) — éviter","Ne JAMAIS administrer avec le TGV"],
    ei:["Réaction allergique / anaphylaxie","Allo-immunisation plaquettaire (réfractarité)","Réaction fébrile non hémolytique","TRALI (rare)","Transmission agents infectieux (très faible risque)"],
    cond:["Poche de CP ou MCP (apherèse) — à transfuser AU PLUS VITE après réception","Administration en 20-30 min","Tubulure standard (ne PAS utiliser tubulure TGV)","Conservation à température ambiante sous agitation (ne pas mettre au réfrigérateur)"],
    poso:{a:["1 concentré plaquettaire d'aphérèse (CPA) = augmentation de 20-50 G/L","Transfuser sans délai après réception (ne pas stocker dans le service)","Contrôle NFS 1h post-transfusion pour évaluer le rendement transfusionnel"],p:["1 CPA pour 10-15 kg (même principe)"]}
  },
  {
    id:105, nom:"Albumine", commercial:"ALBUMINE HUMAINE", dci:"Albumine humaine (solution à 4% ou 20%)", classe:"Médicament dérivé du sang — colloïde macromoléculaire", cat:"Produits sanguins", svc:["SAUV","SAU"],
    couleur:"#FF9500", icon:"💊",
    desc:"Protéine plasmatique humaine à haute pression oncotique. Maintien de la pression oncotique intravasculaire. En urgence : expansion volémique (20%). Traçabilité obligatoire. Documents à envoyer à la pharmacie.",
    indic:["Remplissage vasculaire si inefficacité cristalloïdes (choc réfractaire, brûlés étendus)","Syndrome hépatorénal (en association terlipressine)","Prévention dysfonction rénale après paracentèse évacuatrice (> 5 L)","Hypoalbuminémie sévère < 20 g/L avec œdèmes réfractaires"],
    ci:["Insuffisance cardiaque décompensée sévère","Hypervolémie","Allergie albumine humaine"],
    ei:["Surcharge volémique (TACO)","Réaction allergique / anaphylaxie (rare — produit viroatténué)","Hyperthermie transitoire","Frisson"],
    cond:["Flacon prêt à l'emploi 200 mL à 4% (40 g/L) ou 50-100 mL à 20% (200 g/L) — ALBUMINE HUMAINE®","Traçabilité obligatoire — documents à envoyer à la pharmacie","Flacon en verre : faire l'appel d'air sur la tubulure avant perfusion"],
    poso:{a:["Remplissage : albumine 20% : 100 mL IV en 30-60 min (équivalent oncotique 500 mL cristalloïdes)","Albumine 4% : 200-500 mL IV sur 1-4h","Syndrome hépatorénal : albumine 1 g/kg J1 puis 20-40 g/j"],p:["0,5-1 g/kg IV sur 1-2h (selon indication)"]}
  }
];
