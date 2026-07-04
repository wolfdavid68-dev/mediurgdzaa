import { fireEvent, render, screen } from "@testing-library/react";
import { DRUGS } from "../data/drugs";
import DrugCard from "./DrugCard";

// Drug mock minimal mais réaliste : structure copiée de src/data/drugs.js (id 1
// DIPRIVAN), simplifiée pour ne tester que le composant. Le nom "TEST_DRUG_XYZ"
// garantit qu'aucun protocole ne le mentionne (crossref retourne []), donc la
// section « Utilisée dans » ne rend pas — évite de devoir mocker PROTOCOLS.
const mockDrug = {
  id: 99999, // hors plage des vraies drugs
  nom: "TEST_DRUG_XYZ",
  commercial: "Mediurgine",
  dci: "Médicament de test",
  classe: "Classe pharmacologique de test",
  cat: "Hypnotiques",
  svc: ["SAUV", "SMUR"],
  couleur: "#F5D300",
  icon: "💊",
  desc: "Description longue du médicament de test pour vérifier que la carte le rend.",
  indic: ["Indication 1", "Indication 2"],
  ci: ["Contre-indication absolue grave", "Précaution mineure"],
  ei: ["Effet indésirable A", "Effet indésirable B"],
  cond: ["Ampoule 10 mL", "Flacon 50 mg"],
  // 1-2 mg/kg max 200 mg — la regex de calcDose doit matcher
  poso: {
    a: ["1-2 mg/kg IV lente, max 200 mg"],
    p: ["0,5-1 mg/kg IV lente"],
  },
};

describe("DrugCard", () => {
  describe("Rendu fermé", () => {
    test("affiche nom, commercial, classe, catégorie et services", () => {
      render(<DrugCard drug={mockDrug} />);
      expect(screen.getByText("TEST_DRUG_XYZ")).toBeInTheDocument();
      expect(screen.getByText("Mediurgine")).toBeInTheDocument();
      expect(screen.getByText("Classe pharmacologique de test")).toBeInTheDocument();
      expect(screen.getByText("Hypnotiques")).toBeInTheDocument();
      expect(screen.getByText("SAUV")).toBeInTheDocument();
      expect(screen.getByText("SMUR")).toBeInTheDocument();
    });

    test("le corps de la carte n'est pas rendu tant qu'on n'a pas cliqué", () => {
      render(<DrugCard drug={mockDrug} />);
      // La description vit dans le drug-body, masqué tant que open=false
      expect(screen.queryByText(/Description longue du médicament/)).not.toBeInTheDocument();
    });

    test("affiche immédiatement le badge Scope si une surveillance scopée est requise", () => {
      const kcl = DRUGS.find((drug) => drug.nom === "KCL")!;

      render(<DrugCard drug={kcl} />);

      expect(screen.getByLabelText(/Surveillance requise : Scope/)).toBeInTheDocument();
      expect(screen.queryByText("Surveillance")).not.toBeInTheDocument();
    });
  });

  describe("Toggle open / close", () => {
    test("clic sur le header ouvre la carte (description, DCI visible, onglet poso actif)", () => {
      render(<DrugCard drug={mockDrug} />);
      const header = screen.getByText("TEST_DRUG_XYZ").closest("button");
      fireEvent.click(header!);

      expect(screen.getByText(/Description longue du médicament/)).toBeInTheDocument();
      expect(screen.getByText("DCI")).toBeInTheDocument();
      expect(screen.getByText("Médicament de test")).toBeInTheDocument();
      // Onglet poso = actif par défaut → texte des posologies visible
      expect(screen.getByText(/1-2 mg\/kg IV lente/)).toBeInTheDocument();
    });

    test("re-clic sur le header referme la carte", () => {
      render(<DrugCard drug={mockDrug} />);
      const header = screen.getByText("TEST_DRUG_XYZ").closest("button")!;
      fireEvent.click(header);
      expect(screen.getByText(/Description longue/)).toBeInTheDocument();
      fireEvent.click(header);
      expect(screen.queryByText(/Description longue/)).not.toBeInTheDocument();
    });
  });

  describe("Onglets — switch et contenu", () => {
    const openCard = () => {
      render(<DrugCard drug={mockDrug} />);
      fireEvent.click(screen.getByText("TEST_DRUG_XYZ").closest("button")!);
    };

    test("onglet Indications affiche la liste", () => {
      openCard();
      fireEvent.click(screen.getByRole("button", { name: /Indications/i }));
      expect(screen.getByText("Indication 1")).toBeInTheDocument();
      expect(screen.getByText("Indication 2")).toBeInTheDocument();
    });

    test("onglet Contre-ind affiche les CI avec badges de sévérité", () => {
      openCard();
      fireEvent.click(screen.getByRole("button", { name: /Contre-ind/i }));
      expect(screen.getByText("Contre-indication absolue grave")).toBeInTheDocument();
      // ciSeverity détecte "absolue" → badge "Absolue"
      expect(screen.getByText("Absolue")).toBeInTheDocument();
    });

    test("onglet Effets indés. affiche la liste", () => {
      openCard();
      fireEvent.click(screen.getByRole("button", { name: /Effets ind/i }));
      expect(screen.getByText("Effet indésirable A")).toBeInTheDocument();
      expect(screen.getByText("Effet indésirable B")).toBeInTheDocument();
    });

    test("onglet Conditionnements affiche les tags", () => {
      openCard();
      fireEvent.click(screen.getByRole("button", { name: /Conditionnements/i }));
      expect(screen.getByText("Ampoule 10 mL")).toBeInTheDocument();
      expect(screen.getByText("Flacon 50 mg")).toBeInTheDocument();
    });

    test("re-clic sur l'onglet actif le ferme", () => {
      openCard();
      const indic = screen.getByRole("button", { name: /Indications/i });
      fireEvent.click(indic);
      expect(screen.getByText("Indication 1")).toBeInTheDocument();
      fireEvent.click(indic);
      expect(screen.queryByText("Indication 1")).not.toBeInTheDocument();
    });
  });

  describe("Calculateur de dose adulte", () => {
    test("sans poids saisi : aucun calcul affiché", () => {
      render(<DrugCard drug={mockDrug} />);
      fireEvent.click(screen.getByText("TEST_DRUG_XYZ").closest("button")!);
      // Le texte de poso est affiché mais pas de calc-result
      expect(screen.getByText(/1-2 mg\/kg IV lente/)).toBeInTheDocument();
      // Aucun span avec une valeur calculée — on cherche par className
      const container = screen.getByText(/1-2 mg\/kg IV lente/).closest(".poso-item");
      expect(container?.querySelector(".calc-result")).toBeNull();
    });

    test("poids = 70 kg (via prop patientWeight) : calc affiche 70-140 mg", () => {
      render(<DrugCard drug={mockDrug} patientWeight="70" />);
      fireEvent.click(screen.getByText("TEST_DRUG_XYZ").closest("button")!);
      // Le poids vient du bandeau global (App.tsx) via prop, l'input inline a
      // été retiré pour éviter le doublon. Le résultat apparaît dans .calc-result.
      const adultePosoItem = screen.getByText(/1-2 mg\/kg IV lente/).closest(".poso-item")!;
      const result = adultePosoItem.querySelector(".calc-result");
      expect(result).toBeTruthy();
      expect(result!.textContent).toMatch(/70.*140/);
    });

    test("poids = 150 kg : 1-2 mg/kg × 150 = 150-300, capé à max 200 mg → badge ⚠ max", () => {
      render(<DrugCard drug={mockDrug} patientWeight="150" />);
      fireEvent.click(screen.getByText("TEST_DRUG_XYZ").closest("button")!);
      // 150 > 70 → seule la colonne Adulte s'affiche (filtre poso par poids)
      const adultePosoItem = screen.getByText(/1-2 mg\/kg IV lente/).closest(".poso-item")!;
      const result = adultePosoItem.querySelector(".calc-result");
      expect(result).toBeTruthy();
      expect(result!.textContent).toMatch(/⚠ max/);
      expect(result!.className).toContain("calc-over");
    });
  });

  describe("Préparation HYPNOVEL", () => {
    test("affiche uniquement la préparation PSE, le bolus restant pur", () => {
      const hypnovel = DRUGS.find((drug) => drug.nom === "HYPNOVEL")!;

      render(<DrugCard drug={hypnovel} patientWeight="80" />);
      fireEvent.click(screen.getByText("HYPNOVEL").closest("button")!);

      expect(screen.getByText("Seringue PSE")).toBeInTheDocument();
      expect(screen.getByText("1 ampoule 50 mg/10 mL")).toBeInTheDocument();
      expect(screen.getByText(/PSE : ampoule 50 mg\/10 mL qsp 50 mL/)).toBeInTheDocument();
      expect(
        screen.getByText(/Bolus titrés : ampoule 5 mg\/5 mL.*pas de préparation/)
      ).toBeInTheDocument();
      expect(screen.queryByText("8 mL du produit")).not.toBeInTheDocument();
      expect(screen.queryByText("1.6 mL du produit")).not.toBeInTheDocument();
    });
  });

  describe("Préparation ANEXATE", () => {
    test("affiche le résultat de préparation comme un débit, pas comme une injection", () => {
      const anexate = DRUGS.find((drug) => drug.nom === "ANEXATE")!;

      render(<DrugCard drug={anexate} patientWeight="80" />);
      fireEvent.click(screen.getByText("ANEXATE").closest("button")!);
      expect(screen.getByText("PSE entretien")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Dose efficace"), { target: { value: "12" } });

      expect(screen.getByText("Débit")).toBeInTheDocument();
      expect(screen.getByText("Pour 12 mL")).toBeInTheDocument();
      expect(screen.getByText("4 ampoules soit 20 mL")).toBeInTheDocument();
      expect(screen.getByText("12 mL/h")).toBeInTheDocument();
      expect(screen.queryByText("Produit final")).not.toBeInTheDocument();
      expect(screen.queryByText("Injecter")).not.toBeInTheDocument();
    });
  });

  describe("Préparation NARCAN", () => {
    test("sépare la préparation IVD de la préparation PSE", () => {
      const narcan = DRUGS.find((drug) => drug.nom === "NARCAN")!;

      render(<DrugCard drug={narcan} patientWeight="80" />);
      fireEvent.click(screen.getByText("NARCAN").closest("button")!);

      expect(screen.getByRole("button", { name: /IVD.*0,04 mg\/mL/i })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByRole("button", { name: /PSE.*0,1 mg\/mL/i })).toBeInTheDocument();
      expect(screen.getByText("1 ampoule 0,4 mg/1 mL")).toBeInTheDocument();
      expect(screen.getByText("10 mL avec NaCl 0,9%")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /PSE.*0,1 mg\/mL/i }));

      expect(screen.getByText("10 ampoules 0,4 mg/1 mL (= 4 mg)")).toBeInTheDocument();
      expect(screen.getByText("40 mL avec NaCl 0,9%")).toBeInTheDocument();
      expect(screen.getAllByText(/10 ampoules qsp 40 mL/).length).toBeGreaterThan(0);
      expect(screen.queryByText("1 ampoule 0,4 mg/1 mL")).not.toBeInTheDocument();

      expect(screen.getByText("Dose efficace")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Dose efficace"), { target: { value: "10" } });

      expect(screen.getByText("Débit")).toBeInTheDocument();
      expect(screen.getAllByText("Débit PSE").length).toBeGreaterThan(0);
      expect(screen.getAllByText("2.67 mL/h").length).toBeGreaterThan(0);
      expect(screen.getByText("2/3 dose = 0,267 mg/h")).toBeInTheDocument();
    });
  });

  describe("Préparation CYANOKIT", () => {
    test("n'affiche pas de préparation adulte, mais l'affiche chez l'enfant", () => {
      const cyanokit = DRUGS.find((drug) => drug.nom === "CYANOKIT")!;

      const { unmount } = render(<DrugCard drug={cyanokit} patientWeight="80" />);
      fireEvent.click(screen.getByText("CYANOKIT").closest("button")!);

      expect(screen.queryByText("Préparation")).not.toBeInTheDocument();
      expect(screen.queryByText(/Flacon lyophilisé 5 g/)).not.toBeInTheDocument();

      unmount();

      render(<DrugCard drug={cyanokit} patientWeight="20" />);
      fireEvent.click(screen.getByText("CYANOKIT").closest("button")!);

      expect(screen.getByText("Préparation")).toBeInTheDocument();
      expect(screen.getByText(/Flacon lyophilisé 5 g/)).toBeInTheDocument();
    });
  });

  describe("Adrénaline", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("affiche la table PSE enfant et la préparation ACR enfant IVD pour un poids pédiatrique", () => {
      const adrenaline = DRUGS.find((drug) => drug.nom === "ADRÉNALINE")!;

      render(<DrugCard drug={adrenaline} patientWeight="20" prepPopulation="enfant" />);
      fireEvent.click(screen.getByText("ADRÉNALINE").closest("button")!);

      expect(screen.getByText("Pour 20 kg — enfant")).toBeInTheDocument();
      expect(screen.queryByText("PSE enfant")).not.toBeInTheDocument();
      expect(screen.queryByText("PSE adulte")).not.toBeInTheDocument();

      expect(screen.getAllByText("200 µg").length).toBeGreaterThan(0);
      expect(screen.getByText("2 mL de produit")).toBeInTheDocument();
      expect(screen.getByText("8 mL NaCl 0,9%")).toBeInTheDocument();
      expect(screen.getByText("1 mL IVD toutes les 4 min")).toBeInTheDocument();
    });

    test("affiche uniquement la table PSE adulte pour un poids adulte", () => {
      const adrenaline = DRUGS.find((drug) => drug.nom === "ADRÉNALINE")!;

      render(<DrugCard drug={adrenaline} patientWeight="80" prepPopulation="adulte" />);
      fireEvent.click(screen.getByText("ADRÉNALINE").closest("button")!);

      expect(screen.getByText("Pour 80 kg — adulte")).toBeInTheDocument();
      expect(screen.queryByText("PSE adulte")).not.toBeInTheDocument();
      expect(screen.queryByText("PSE enfant")).not.toBeInTheDocument();
    });
  });

  describe("Grille posologie — séparation Adulte/Enfant (toggle preview)", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    const posoTitles = (container: HTMLElement) =>
      Array.from(container.querySelectorAll(".poso-title")).map((el) => el.textContent);

    test("toggle Enfant masque la colonne Adulte même à un poids adulte (40 kg)", () => {
      const diprivan = DRUGS.find((drug) => drug.nom === "DIPRIVAN")!;
      const { container } = render(
        <DrugCard drug={diprivan} patientWeight="40" prepPopulation="enfant" />
      );
      fireEvent.click(screen.getByText("DIPRIVAN").closest("button")!);

      const titles = posoTitles(container);
      expect(titles).toContain("Pédiatrique");
      expect(titles).not.toContain("Adulte");
    });

    test("toggle Adulte masque la colonne Pédiatrique même à un poids pédiatrique (20 kg)", () => {
      const diprivan = DRUGS.find((drug) => drug.nom === "DIPRIVAN")!;
      const { container } = render(
        <DrugCard drug={diprivan} patientWeight="20" prepPopulation="adulte" />
      );
      fireEvent.click(screen.getByText("DIPRIVAN").closest("button")!);

      const titles = posoTitles(container);
      expect(titles).toContain("Adulte");
      expect(titles).not.toContain("Pédiatrique");
    });

    test("sans toggle, le filtrage par poids reste actif (40 kg → les deux colonnes)", () => {
      const diprivan = DRUGS.find((drug) => drug.nom === "DIPRIVAN")!;
      const { container } = render(<DrugCard drug={diprivan} patientWeight="40" />);
      fireEvent.click(screen.getByText("DIPRIVAN").closest("button")!);

      const titles = posoTitles(container);
      expect(titles).toContain("Adulte");
      expect(titles).toContain("Pédiatrique");
    });
  });

  describe("Conversions v2 dose_kg (Lot 2)", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("Célocurine enfant : recette ISR enfant (1,5-2 mg/kg), pas la recette adulte", async () => {
      const celo = DRUGS.find((drug) => drug.nom === "CÉLOCURINE")!;
      render(<DrugCard drug={celo} patientWeight="20" prepPopulation="enfant" />);
      fireEvent.click(screen.getByText("CÉLOCURINE").closest("button")!);

      expect(await screen.findByText("ISR enfant")).toBeInTheDocument();
      expect(screen.queryByText("ISR adulte")).not.toBeInTheDocument();
      expect(screen.getByText(/30-40 mg/)).toBeInTheDocument();
    });

    test("Bridion enfant : dose pédiatrique 4-16 mg/kg (80-320 mg à 20 kg), pas la dose CICO adulte", async () => {
      const bridion = DRUGS.find((drug) => drug.nom === "BRIDION")!;
      render(<DrugCard drug={bridion} patientWeight="20" prepPopulation="enfant" />);
      fireEvent.click(screen.getByText("BRIDION").closest("button")!);

      expect(await screen.findByText("Décurarisation enfant")).toBeInTheDocument();
      expect(screen.queryByText("CICO adulte")).not.toBeInTheDocument();
      expect(screen.getByText(/80-320 mg/)).toBeInTheDocument();
    });

    test("Dobutamine preview : recette PSE affichée sans boîte fixed_dilution en double", async () => {
      const dobu = DRUGS.find((drug) => drug.nom === "DOBUTAMINE")!;
      render(<DrugCard drug={dobu} patientWeight="70" />);
      fireEvent.click(screen.getByText("DOBUTAMINE").closest("button")!);

      expect(await screen.findByText("1 flacon 250 mg/25 mL (10 mg/mL)")).toBeInTheDocument();
      // Le prélèvement ne doit apparaître qu'une fois (pas de double rendu recette + boîte fixe)
      expect(screen.getAllByText("1 flacon 250 mg/25 mL (10 mg/mL)")).toHaveLength(1);
    });
  });

  describe("Conversions v2 etapes-seules + cas particuliers (Lots 3-4)", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("Primperan enfant : recette vide « Non recommandé < 18 ans »", async () => {
      const primperan = DRUGS.find((drug) => drug.nom === "PRIMPERAN")!;
      render(<DrugCard drug={primperan} patientWeight="20" prepPopulation="enfant" />);
      fireEvent.click(screen.getByText("PRIMPERAN").closest("button")!);

      expect(await screen.findByText("Enfant")).toBeInTheDocument();
      expect(screen.getAllByText(/Non recommandé < 18 ans/).length).toBeGreaterThan(0);
      expect(screen.queryByText("IVL adulte")).not.toBeInTheDocument();
    });

    test("Nalbuphine enfant : pedTable pédiatrique, PAS les boutons adrénaline (bug corrigé)", async () => {
      const nalbuphine = DRUGS.find((drug) => drug.nom === "NALBUPHINE")!;
      render(<DrugCard drug={nalbuphine} patientWeight="20" prepPopulation="enfant" />);
      fireEvent.click(screen.getByText("NALBUPHINE").closest("button")!);

      expect(await screen.findByText("Préparation pédiatrique")).toBeInTheDocument();
      expect(screen.queryByText("IM anaphylaxie")).not.toBeInTheDocument();
      expect(screen.queryByText("IVD ACR")).not.toBeInTheDocument();
    });

    test('Mannitol adulte : calcul en g → mL (unit "g"), 70 kg → 17,5-70 g', async () => {
      const mannitol = DRUGS.find((drug) => drug.nom === "MANNITOL 20%")!;
      render(<DrugCard drug={mannitol} patientWeight="70" prepPopulation="adulte" />);
      fireEvent.click(screen.getByText("MANNITOL 20%").closest("button")!);

      expect(await screen.findByText(/17,5-70 g/)).toBeInTheDocument();
    });
  });

  describe("Éphédrine preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("affiche la dilution fixe à 3 mg/mL sans calcul pondéral de préparation", async () => {
      const ephedrine = DRUGS.find((drug) => drug.nom === "ÉPHÉDRINE")!;

      render(<DrugCard drug={ephedrine} patientWeight="35" />);
      fireEvent.click(screen.getByText("ÉPHÉDRINE").closest("button")!);

      expect(await screen.findByText("1 ampoule 30 mg/1 mL")).toBeInTheDocument();
      expect(screen.getByText("10 mL avec NaCl 0,9%")).toBeInTheDocument();
      expect(screen.getAllByText("3 mg/mL").length).toBeGreaterThan(0);
      expect(screen.queryByText("3.5 mg")).not.toBeInTheDocument();
      expect(screen.queryByText("0.1 mL du produit")).not.toBeInTheDocument();
    });
  });

  describe("Noradrénaline preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("affiche la préparation PSE enfant sans cohabitation adulte", async () => {
      const noradrenaline = DRUGS.find((drug) => drug.nom === "NORADRÉNALINE")!;

      render(<DrugCard drug={noradrenaline} patientWeight="20" />);
      fireEvent.click(screen.getByText("NORADRÉNALINE").closest("button")!);

      expect(await screen.findByText("PSE enfant")).toBeInTheDocument();
      expect(screen.getByText("Pour 20 kg — enfant")).toBeInTheDocument();
      expect(screen.queryByText("PSE adulte")).not.toBeInTheDocument();
      expect(screen.getByText("Pédia : 0,05-2 µg/kg/min IVSE")).toBeInTheDocument();
      expect(screen.queryByText("Repères dose → débit — enfant")).not.toBeInTheDocument();
    });
  });

  describe("Actilyse preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("affiche les préparations IDM, EP massive et AVC calculées au poids", async () => {
      const actilyse = DRUGS.find((drug) => drug.nom === "ACTILYSE")!;

      render(<DrugCard drug={actilyse} patientWeight="80" />);
      fireEvent.click(screen.getByText("ACTILYSE").closest("button")!);

      expect(await screen.findByText("Bolus IV")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /IDM/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("15 mg")).toBeInTheDocument();
      expect(screen.getAllByText("60 mg").length).toBeGreaterThan(0);
      expect(screen.getAllByText("120 mL/h").length).toBeGreaterThan(0);
      expect(screen.getAllByText("40 mg").length).toBeGreaterThan(0);
      expect(screen.getAllByText("40 mL/h").length).toBeGreaterThan(0);
      expect(screen.queryByText("Final")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /EP massive/i }));
      expect(screen.getByText("10 mg")).toBeInTheDocument();
      expect(screen.getAllByText("90 mg").length).toBeGreaterThan(0);
      expect(screen.getAllByText("45 mL/h").length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole("button", { name: /AVC/i }));
      expect(screen.getAllByText("72 mg").length).toBeGreaterThan(0);
      expect(screen.getByText("7,2 mg")).toBeInTheDocument();
      expect(screen.getAllByText("64,8 mg").length).toBeGreaterThan(0);
      expect(screen.getAllByText("64,8 mL/h").length).toBeGreaterThan(0);
    });
  });

  describe("Metalyse preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("calcule la dose et le volume de bolus selon le palier de poids", async () => {
      const metalyse = DRUGS.find((drug) => drug.nom === "METALYSE")!;

      const { unmount } = render(<DrugCard drug={metalyse} patientWeight="55" />);
      fireEvent.click(screen.getByText("METALYSE").closest("button")!);

      expect(await screen.findByText("30 mg = 6 mL")).toBeInTheDocument();
      expect(screen.getByText(/Reconstituer le lyophilisat 10 000 UI/)).toBeInTheDocument();
      expect(screen.getByText("Flacon reconstitue 50 mg/10 mL")).toBeInTheDocument();
      expect(screen.getByText(/Injection IV bolus unique strict < 10 sec/)).toBeInTheDocument();
      expect(screen.queryByText(/Adapter la dose au POIDS/)).not.toBeInTheDocument();

      unmount();

      render(<DrugCard drug={metalyse} patientWeight="80" />);
      fireEvent.click(screen.getByText("METALYSE").closest("button")!);

      expect(await screen.findByText("45 mg = 9 mL")).toBeInTheDocument();
    });
  });

  describe("Célestène", () => {
    test("affiche la posologie et la préparation pédiatrique en gouttes", async () => {
      const celestene = DRUGS.find((drug) => drug.nom === "CÉLESTÈNE")!;

      render(<DrugCard drug={celestene} patientWeight="30" prepPopulation="enfant" />);
      fireEvent.click(screen.getByText("CÉLESTÈNE").closest("button")!);

      expect(await screen.findByText("Per os enfant")).toBeInTheDocument();
      expect(screen.getAllByText("60 gouttes").length).toBeGreaterThan(0);
      expect(screen.getByText("15 gouttes/kg = 0,75 mg/kg")).toBeInTheDocument();
      expect(screen.queryByText("22.5 mg")).not.toBeInTheDocument();
    });
  });

  describe("Oméprazole", () => {
    beforeEach(() => {
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      window.history.pushState({}, "", "/");
    });

    test("intègre la posologie enfant dans la préparation sans bloc posologie doublon", async () => {
      const omeprazole = DRUGS.find((drug) => drug.nom === "OMÉPRAZOLE")!;

      render(<DrugCard drug={omeprazole} patientWeight="20" prepPopulation="enfant" />);
      fireEvent.click(screen.getByText("OMÉPRAZOLE").closest("button")!);

      expect(await screen.findByText("IVL enfant")).toBeInTheDocument();
      expect(screen.getByText("Dose à préparer")).toBeInTheDocument();
      expect(screen.getByText("20 mg")).toBeInTheDocument();
      expect(screen.getByText(/Dose enfant : 1 mg\/kg IV \/12h/)).toBeInTheDocument();
      expect(screen.queryByText("Pédiatrique")).not.toBeInTheDocument();
      expect(screen.queryByText(/1 mg\/kg IV \/12h \(max 40 mg\/dose\)/)).not.toBeInTheDocument();
    });
  });

  describe("SoluMedrol", () => {
    beforeEach(() => {
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      window.history.pushState({}, "", "/");
    });

    test("adapte la dilution à la dose saisie", async () => {
      const solumedrol = DRUGS.find((drug) => drug.nom === "SOLUMEDROL")!;

      render(<DrugCard drug={solumedrol} patientWeight="50" />);
      fireEvent.click(screen.getByText("SOLUMEDROL").closest("button")!);

      const input = await screen.findByLabelText("Dose à préparer");
      expect(input).toHaveAttribute("placeholder", "120");
      expect(
        screen.getByText("IVD : reconstituer avec 2 mL EPPI puis diluer qsp 10 mL NaCl 0,9%")
      ).toBeInTheDocument();

      fireEvent.change(input, { target: { value: "125" } });

      expect(screen.getByText("IVL : dans 100 mL NaCl 0,9%")).toBeInTheDocument();
      expect(screen.queryByText(/IVL \(dose > 120 mg\)/)).not.toBeInTheDocument();
    });
  });

  describe("Zophren", () => {
    beforeEach(() => {
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      window.history.pushState({}, "", "/");
    });

    test("affiche la plage adulte 4-8 mg sans calcul pondéral", async () => {
      const zophren = DRUGS.find((drug) => drug.nom === "ZOPHREN")!;

      render(<DrugCard drug={zophren} patientWeight="80" />);
      fireEvent.click(screen.getByText("ZOPHREN").closest("button")!);

      expect(await screen.findByText("IVD adulte")).toBeInTheDocument();
      expect(screen.getByText("4-8 mg")).toBeInTheDocument();
      expect(screen.getByText("4-8 mg = 2-4 mL")).toBeInTheDocument();
    });
  });

  describe("Amiklin", () => {
    beforeEach(() => {
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      window.history.pushState({}, "", "/");
    });

    test("sépare les préparations adulte et pédiatrique", async () => {
      const amiklin = DRUGS.find((drug) => drug.nom === "AMIKLIN")!;

      const { unmount } = render(
        <DrugCard drug={amiklin} patientWeight="80" prepPopulation="adulte" />
      );
      fireEvent.click(screen.getByText("AMIKLIN").closest("button")!);

      expect(await screen.findByText("IVL adulte")).toBeInTheDocument();
      expect(screen.getByText("à 500 mL avec G5%")).toBeInTheDocument();
      expect(
        screen.getByText("1600 mg : 1 flacon 1 g + 1 flacon 500 mg + 100 mg (1 mL) d'appoint")
      ).toBeInTheDocument();
      expect(
        screen.getByText("2400 mg : 2 flacons 1 g + 400 mg (4 mL) d'appoint")
      ).toBeInTheDocument();
      expect(screen.queryByText(/À ouvrir/)).not.toBeInTheDocument();
      expect(screen.queryByText("Dose < 1500 mg → 250 mL G5%")).not.toBeInTheDocument();
      expect(screen.queryByText("Dose > 1500 mg → 500 mL G5%")).not.toBeInTheDocument();
      expect(screen.queryByText(/PÉDIATRIE : dilution NaCl 0,9% ou G5%/)).not.toBeInTheDocument();
      expect(screen.queryByText(/6\.4-9\.6 mL du produit/)).not.toBeInTheDocument();

      unmount();

      render(<DrugCard drug={amiklin} patientWeight="20" prepPopulation="enfant" />);
      fireEvent.click(screen.getByText("AMIKLIN").closest("button")!);

      expect(await screen.findByText("IVL enfant")).toBeInTheDocument();
      expect(screen.getByText("NaCl 0,9% ou G5% — concentration max 5 mg/mL")).toBeInTheDocument();
      expect(screen.queryByText(/ADULTE — dose/)).not.toBeInTheDocument();
    });
  });

  describe("Amoxicilline", () => {
    beforeEach(() => {
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      window.history.pushState({}, "", "/");
    });

    test("affiche la dose méningée sur pompe selon la dose journalière", async () => {
      const amoxicilline = DRUGS.find((drug) => drug.nom === "AMOXICILLINE")!;

      const { unmount } = render(<DrugCard drug={amoxicilline} patientWeight="80" />);
      fireEvent.click(screen.getByText("AMOXICILLINE").closest("button")!);

      fireEvent.click(await screen.findByRole("button", { name: /Dose méningée pompe/i }));

      expect(screen.queryByText("Dilution : NaCl 0,9%")).not.toBeInTheDocument();
      expect(screen.queryByText("1 g dans 100 mL")).not.toBeInTheDocument();
      expect(screen.queryByText("Perfusion sur 20-30 min")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Dose/j")).toHaveAttribute("placeholder", "12");
      expect(screen.getByText("12 g/j")).toBeInTheDocument();
      expect(screen.getByText("5 g/250 mL")).toBeInTheDocument();
      expect(screen.getByText("25 mL/h")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Dose/j"), { target: { value: "8" } });

      expect(screen.getByText("8 g/j")).toBeInTheDocument();
      expect(screen.getByText("2 g/100 mL")).toBeInTheDocument();
      expect(screen.getByText("17 mL/h")).toBeInTheDocument();

      unmount();

      render(<DrugCard drug={amoxicilline} patientWeight="20" prepPopulation="enfant" />);
      fireEvent.click(screen.getByText("AMOXICILLINE").closest("button")!);

      expect(await screen.findByText("IVL enfant")).toBeInTheDocument();
      expect(screen.getByText("1000-4000 mg")).toBeInTheDocument();
      expect(screen.getByText("dans NaCl 0,9%")).toBeInTheDocument();
      expect(screen.queryByText("IVL standard")).not.toBeInTheDocument();
      expect(screen.queryByText("Dose méningée pompe")).not.toBeInTheDocument();
    });
  });

  describe("Claforan", () => {
    beforeEach(() => {
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      window.history.pushState({}, "", "/");
    });

    test("affiche la dose méningée sur pompe comme l'amoxicilline", async () => {
      const claforan = DRUGS.find((drug) => drug.nom === "CLAFORAN")!;

      render(<DrugCard drug={claforan} patientWeight="80" prepPopulation="adulte" />);
      fireEvent.click(screen.getByText("CLAFORAN").closest("button")!);

      fireEvent.click(await screen.findByRole("button", { name: /Dose méningée pompe/i }));

      expect(screen.getByLabelText("Dose/j")).toHaveAttribute("placeholder", "16");
      expect(screen.getByText("16 g/j")).toBeInTheDocument();
      expect(screen.getByText("5 g/250 mL")).toBeInTheDocument();
      expect(screen.getByText("33 mL/h")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Dose/j"), { target: { value: "24" } });

      expect(screen.getByText("24 g/j")).toBeInTheDocument();
      expect(screen.getByText("50 mL/h")).toBeInTheDocument();
    });
  });

  describe("Préparations legacy preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("reprend l'ancienne préparation dans le bloc v2 sans répéter l'étape principale", async () => {
      const augmentin = DRUGS.find((drug) => drug.nom === "AUGMENTIN")!;

      render(<DrugCard drug={augmentin} patientWeight="80" />);
      fireEvent.click(screen.getByText("AUGMENTIN").closest("button")!);

      expect(await screen.findByLabelText("Préparation v2")).toBeInTheDocument();
      expect(
        screen.getAllByText(/Flacon poudre IV 1 g amoxicilline\/200 mg clavulanate/)
      ).toHaveLength(1);
      expect(screen.getByText(/1-2 g dans 100 mL NaCl 0,9% STRICT/)).toBeInTheDocument();
    });

    test("masque en posologie les lignes déjà reprises dans la préparation", async () => {
      const primperan = DRUGS.find((drug) => drug.nom === "PRIMPERAN")!;

      render(<DrugCard drug={primperan} patientWeight="50" />);
      fireEvent.click(screen.getByText("PRIMPERAN").closest("button")!);

      expect(await screen.findByLabelText("Préparation v2")).toBeInTheDocument();
      expect(screen.getByText("10 mg IV lente /8h")).toBeInTheDocument();
      expect(screen.getAllByText("Peut se diluer qsp 10 mL NaCl 0,9%")).toHaveLength(1);
    });
  });

  describe("Atropine preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("affiche une préparation pure adulte sans calcul pondéral", async () => {
      const atropine = DRUGS.find((drug) => drug.nom === "ATROPINE")!;

      render(<DrugCard drug={atropine} patientWeight="80" />);
      fireEvent.click(screen.getByText("ATROPINE").closest("button")!);

      expect(await screen.findByText("2 ampoules")).toBeInTheDocument();
      expect(screen.getByText("1 mg = 2 mL")).toBeInTheDocument();
      expect(
        screen.getByText("Bradycardie : 0,5-1 mg IV, répéter toutes les 3-5 min (max 3 mg)")
      ).toBeInTheDocument();
      expect(screen.queryByText("1.6 mg")).not.toBeInTheDocument();
      expect(screen.queryByText("3.2 mL du produit")).not.toBeInTheDocument();
    });
  });

  describe("Brevibloc preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("sépare la dose de charge et le PSE avec le débit calculé", async () => {
      const brevibloc = DRUGS.find((drug) => drug.nom === "BREVIBLOC")!;

      render(<DrugCard drug={brevibloc} patientWeight="80" />);
      fireEvent.click(screen.getByText("BREVIBLOC").closest("button")!);

      expect(await screen.findByText("Dose de charge")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Charge 1 min/i })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByText("40 mg = 4 mL")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /PSE entretien/i }));

      expect(screen.getByText("Entretien PSE : 50 µg/kg/min")).toBeInTheDocument();
      expect(screen.getAllByText("4000 µg/min").length).toBeGreaterThan(0);
      expect(screen.getAllByText("24 mL/h").length).toBeGreaterThan(0);
      expect(screen.queryByText("4000 mg/min")).not.toBeInTheDocument();
    });
  });

  describe("Cordarone preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("regroupe les ACR puis sépare charge et PSE entretien", async () => {
      const cordarone = DRUGS.find((drug) => drug.nom === "CORDARONE")!;

      render(<DrugCard drug={cordarone} patientWeight="80" />);
      fireEvent.click(screen.getByText("CORDARONE").closest("button")!);

      expect(await screen.findByText("Ampoule 150 mg/3 mL (50 mg/mL)")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ACR/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("300 mg = 6 mL")).toBeInTheDocument();
      expect(screen.getByText("150 mg = 3 mL")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /IVL dose de charge/i }));
      expect(screen.getByText("300 mg = 6 mL")).toBeInTheDocument();
      expect(screen.getByText("G5% STRICT sur 30 min")).toBeInTheDocument();
      expect(screen.getByText("IVL : dose de charge 5 mg/kg dans G5% STRICT")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /PSE entretien/i }));
      expect(screen.getByText("4 ampoules 150 mg/3 mL (= 600 mg/12 mL)")).toBeInTheDocument();
      expect(screen.getByText("à 48 mL avec G5%")).toBeInTheDocument();
      expect(screen.getByText("12,5 mg/mL")).toBeInTheDocument();
    });
  });

  describe("Digoxine preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("affiche la préparation IVL en v2", async () => {
      const digoxine = DRUGS.find((drug) => drug.nom === "DIGOXINE NATIVELLE")!;

      render(<DrugCard drug={digoxine} patientWeight="80" />);
      fireEvent.click(screen.getByText("DIGOXINE NATIVELLE").closest("button")!);

      expect((await screen.findAllByText("1 ampoule 0,5 mg/2 mL")).length).toBeGreaterThan(0);
      expect(screen.getByText("mini-flac 100 mL NaCl 0,9%")).toBeInTheDocument();
      expect(screen.getAllByText("0,5 mg/100 mL = 5 µg/mL").length).toBeGreaterThan(0);
      expect(screen.getAllByText("ECG obligatoire avant injection").length).toBeGreaterThan(0);
      expect(screen.getByText("Marge thérapeutique étroite")).toBeInTheDocument();
      expect(screen.queryByText("Final")).not.toBeInTheDocument();
    });
  });

  describe("Eupressyl preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("affiche la préparation PSE pure en v2 sans bolus", async () => {
      const eupressyl = DRUGS.find((drug) => drug.nom === "EUPRESSYL")!;

      render(<DrugCard drug={eupressyl} patientWeight="80" />);
      fireEvent.click(screen.getByText("EUPRESSYL").closest("button")!);

      expect(await screen.findByText("Ampoule 25 mg/5 mL")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Bolus pur/i })).not.toBeInTheDocument();
      expect(screen.getAllByText("PSE : administrer PUR").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Dose usuelle : 5-30 mg/h selon TA cible").length).toBeGreaterThan(
        0
      );
      expect(screen.getByText("Débit : 1-6 mL/h avec ampoule pure à 5 mg/mL")).toBeInTheDocument();
      expect(screen.getByText("Voies : VVP ou VVC")).toBeInTheDocument();
    });
  });

  describe("Loxen preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("affiche les préparations bolus et PSE en v2", async () => {
      const loxen = DRUGS.find((drug) => drug.nom === "LOXEN")!;

      render(<DrugCard drug={loxen} patientWeight="80" />);
      fireEvent.click(screen.getByText("LOXEN").closest("button")!);

      expect(await screen.findByText("Bolus initial")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Bolus/i })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByText("1 mg = 1 mL")).toBeInTheDocument();
      expect(screen.getByText("Bolus initial : 1 mg IV (= 1 mL)")).toBeInTheDocument();
      expect(screen.getByText("1 ampoule 10 mg/10 mL")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /^PSE/i }));
      expect(screen.getByText("Débit usuel")).toBeInTheDocument();
      expect(screen.getByText("1-15 mg/h = 1-15 mL/h")).toBeInTheDocument();
      expect(screen.getAllByText("PSE : administrer PUR (1 mg/mL)").length).toBeGreaterThan(0);
      expect(screen.getByText("Soit 1-15 mL/h avec ampoule pure")).toBeInTheDocument();
      expect(screen.queryByText("Débit PSE")).not.toBeInTheDocument();
    });
  });

  describe("Risordan preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("affiche les préparations bolus et PSE en v2 sans bloc débit dupliqué", async () => {
      const risordan = DRUGS.find((drug) => drug.nom === "RISORDAN")!;

      render(<DrugCard drug={risordan} patientWeight="80" />);
      fireEvent.click(screen.getByText("RISORDAN").closest("button")!);

      expect(await screen.findByText(/IVD en bolus : administrer PUR/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Bolus/i })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getAllByText("IVD en bolus : administrer PUR").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Ampoule 10 mg/10 mL").length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole("button", { name: /^PSE/i }));

      expect(screen.getByText("Débit usuel")).toBeInTheDocument();
      expect(screen.getByText("1-10 mg/h = 1-10 mL/h")).toBeInTheDocument();
      expect(screen.getAllByText("PSE : administrer PUR (1 mg/mL)").length).toBeGreaterThan(0);
      expect(screen.getByText("Soit 1-10 mL/h avec ampoule pure")).toBeInTheDocument();
      expect(screen.queryByText("Débit PSE")).not.toBeInTheDocument();
    });
  });

  describe("Préparation v2 générique", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("structure l'ancienne préparation Rivotril en recette v2 (IVD adulte)", async () => {
      const rivotril = DRUGS.find((drug) => drug.nom === "RIVOTRIL")!;

      render(<DrugCard drug={rivotril} patientWeight="" />);
      fireEvent.click(screen.getByText("RIVOTRIL").closest("button")!);

      expect(await screen.findByLabelText("Préparation v2")).toBeInTheDocument();
      expect(screen.getByText("IVD adulte")).toBeInTheDocument();
      expect(screen.getByText("1-2 mg IV lente sur 2 min")).toBeInTheDocument();
      expect(
        screen.getAllByText("Ampoule 1 mg/1 mL — à reconstituer avec son solvant").length
      ).toBeGreaterThan(0);
    });
  });

  describe("Isoptine preview", () => {
    beforeEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/?author=preview");
    });

    afterEach(() => {
      sessionStorage.clear();
      window.history.pushState({}, "", "/");
    });

    test("affiche une préparation IVL v2 avec dose et volume injectés", async () => {
      const isoptine = DRUGS.find((drug) => drug.nom === "ISOPTINE")!;

      render(<DrugCard drug={isoptine} patientWeight="50" />);
      fireEvent.click(screen.getByText("ISOPTINE").closest("button")!);

      expect(await screen.findByText("1 ampoule 5 mg/2 mL")).toBeInTheDocument();
      expect(screen.getByText("à 10 mL avec NaCl 0,9%")).toBeInTheDocument();
      expect(screen.getByText("Injecter")).toBeInTheDocument();
      expect(screen.getByText("3,8-7,5 mg = 7,5-15 mL")).toBeInTheDocument();
      expect(screen.getByText("Injecter lentement en 2 à 3 min")).toBeInTheDocument();
    });
  });

  describe("Préparation SUFENTANIL", () => {
    test("affiche la préparation PSE et la préparation intranasale dose-poids", () => {
      const sufentanil = DRUGS.find((drug) => drug.nom === "SUFENTANIL")!;

      render(<DrugCard drug={sufentanil} patientWeight="85" />);
      fireEvent.click(screen.getByText("SUFENTANIL").closest("button")!);

      expect(screen.getByRole("button", { name: /PSE.*5 µg\/mL/i })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByText("1 ampoule entière 250 µg/5 mL (= 250 µg)")).toBeInTheDocument();
      expect(screen.getByText("50 mL avec NaCl 0,9%")).toBeInTheDocument();
      expect(
        screen.getByText("Diluer 1 ampoule entière (250 µg / 5 mL) qsp 50 mL NaCl 0,9% → 5 µg/mL")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Débit IVSE (mL/h) = dose (µg/kg/h) × poids ÷ 5")
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Intranasal.*0,3 µg\/kg/i }));

      expect(screen.getByText("25,5 µg = 0,51 mL")).toBeInTheDocument();
      expect(screen.getByText("0,3 mL")).toBeInTheDocument();
      expect(screen.getByText("0,21 mL")).toBeInTheDocument();
      expect(screen.getByText("12,75 µg = 0,26 mL")).toBeInTheDocument();
      expect(screen.getByText("Demi-dose de rappel : 0,15 µg/kg")).toBeInTheDocument();
      expect(
        screen.queryByText("1 ampoule entière 250 µg/5 mL (= 250 µg)")
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Diluer 1 ampoule entière/)).not.toBeInTheDocument();
    });
  });

  describe("Préparation KÉTAMINE", () => {
    test("bascule visuellement entre bolus/sédation et PSE sans calcul de bolus", () => {
      const ketamine = DRUGS.find((drug) => drug.nom === "KÉTAMINE")!;

      render(<DrugCard drug={ketamine} patientWeight="80" />);
      fireEvent.click(screen.getByText("KÉTAMINE").closest("button")!);

      expect(screen.getByRole("button", { name: /Bolus \/ sédation.*10 mL/i })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByText("2 mL de kétamine 250 mg/5 mL (= 100 mg)")).toBeInTheDocument();
      expect(screen.getByText("10 mL avec NaCl 0,9%")).toBeInTheDocument();
      expect(screen.queryByText("2 ampoules 250 mg/5 mL (= 500 mg)")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /PSE.*50 mL/i }));

      expect(screen.getByText("2 ampoules 250 mg/5 mL (= 500 mg)")).toBeInTheDocument();
      expect(screen.getByText("50 mL avec NaCl 0,9%")).toBeInTheDocument();
      expect(
        screen.getByText(/Sédation : prélever 2 mL.*compléter à 10 mL.*10 mg\/mL/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Compléter à 50 mL avec NaCl 0,9%.*10 mg\/mL/)).toBeInTheDocument();
      expect(screen.queryByText("160-240 mg")).not.toBeInTheDocument();
      expect(screen.queryByText("3.2-4.8 mL du produit")).not.toBeInTheDocument();
    });
  });

  describe("Préparation MORPHINE", () => {
    test("bascule entre bolus/titration et PSE", () => {
      const morphine = DRUGS.find((drug) => drug.nom === "MORPHINE")!;

      render(<DrugCard drug={morphine} patientWeight="80" />);
      fireEvent.click(screen.getByText("MORPHINE").closest("button")!);

      expect(screen.getByRole("button", { name: /Bolus \/ titration.*1 mg\/mL/i })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByText("1 mL de morphine 10 mg/1 mL (= 10 mg)")).toBeInTheDocument();
      expect(screen.getByText("10 mL avec NaCl 0,9%")).toBeInTheDocument();
      expect(
        screen.queryByText("5 mL d'une ampoule 100 mg/10 mL (= 50 mg)")
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /PSE.*1 mg\/mL/i }));

      expect(screen.getByText("5 mL d'une ampoule 100 mg/10 mL (= 50 mg)")).toBeInTheDocument();
      expect(screen.getByText("50 mL avec NaCl 0,9%")).toBeInTheDocument();
      expect(screen.queryByText("0.8 mL du produit")).not.toBeInTheDocument();
    });
  });

  describe("Favoris", () => {
    test("affiche l'étoile creuse si non favori", () => {
      render(<DrugCard drug={mockDrug} isFavorite={false} onToggleFavorite={() => {}} />);
      expect(screen.getByLabelText("Ajouter aux favoris")).toHaveTextContent("☆");
    });

    test("affiche l'étoile pleine si favori", () => {
      render(<DrugCard drug={mockDrug} isFavorite={true} onToggleFavorite={() => {}} />);
      expect(screen.getByLabelText("Retirer des favoris")).toHaveTextContent("★");
    });

    test("clic sur l'étoile appelle onToggleFavorite avec l'id sans ouvrir la carte", () => {
      const onToggle = vi.fn();
      render(<DrugCard drug={mockDrug} isFavorite={false} onToggleFavorite={onToggle} />);
      fireEvent.click(screen.getByLabelText("Ajouter aux favoris"));
      expect(onToggle).toHaveBeenCalledWith(99999);
      // stopPropagation : la carte ne s'ouvre pas
      expect(screen.queryByText(/Description longue/)).not.toBeInTheDocument();
    });

    test("l'étoile est un vrai <button> (Enter/Space géré nativement par le browser)", () => {
      render(<DrugCard drug={mockDrug} isFavorite={false} onToggleFavorite={() => {}} />);
      const star = screen.getByLabelText("Ajouter aux favoris");
      // Vrai bouton natif → pas besoin de handler keyDown explicite. Le browser
      // déclenche un click au Enter/Space. On vérifie juste que c'est bien un
      // <button> (couvre la régression « nested-interactive » détectée par axe).
      expect(star.tagName).toBe("BUTTON");
    });

    test("pas d'étoile si onToggleFavorite n'est pas fourni", () => {
      render(<DrugCard drug={mockDrug} />);
      expect(screen.queryByLabelText("Ajouter aux favoris")).not.toBeInTheDocument();
    });
  });

  describe("onOpen callback", () => {
    test("est appelé avec drug.id à l'ouverture", () => {
      const onOpen = vi.fn();
      render(<DrugCard drug={mockDrug} onOpen={onOpen} />);
      fireEvent.click(screen.getByText("TEST_DRUG_XYZ").closest("button")!);
      expect(onOpen).toHaveBeenCalledWith(99999);
    });

    test("n'est pas appelé tant que la carte n'est pas ouverte", () => {
      const onOpen = vi.fn();
      render(<DrugCard drug={mockDrug} onOpen={onOpen} />);
      expect(onOpen).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Filtre poso par poids — < 30 kg pédiatrique, > 70 kg adulte,
  // 30-70 kg les deux. Bornes incluses (30 et 70 → les deux).
  // Repli : si la colonne pertinente n'est pas renseignée, on affiche l'autre.
  // CRITIQUE cliniquement : afficher la mauvaise colonne = mauvaise dose.
  // ════════════════════════════════════════════════════════════════
  describe("Filtre poso par poids", () => {
    const openWith = (weight: string, drug = mockDrug) => {
      render(<DrugCard drug={drug} patientWeight={weight} />);
      fireEvent.click(screen.getByText(drug.nom).closest("button")!);
    };
    const drugAdulteOnly = { ...mockDrug, nom: "ADULT_ONLY", poso: { a: mockDrug.poso.a, p: [] } };
    const drugPedOnly = { ...mockDrug, nom: "PED_ONLY", poso: { a: [], p: mockDrug.poso.p } };

    test("pas de poids → les deux colonnes (Adulte + Pédiatrique)", () => {
      openWith("");
      expect(screen.getByText("Adulte")).toBeInTheDocument();
      expect(screen.getByText("Pédiatrique")).toBeInTheDocument();
    });

    test("poids = 50 kg (30-70) → les deux colonnes", () => {
      openWith("50");
      expect(screen.getByText("Adulte")).toBeInTheDocument();
      expect(screen.getByText("Pédiatrique")).toBeInTheDocument();
    });

    test("poids = 30 kg (borne incluse) → les deux colonnes", () => {
      openWith("30");
      expect(screen.getByText("Adulte")).toBeInTheDocument();
      expect(screen.getByText("Pédiatrique")).toBeInTheDocument();
    });

    test("poids = 70 kg (borne incluse) → les deux colonnes", () => {
      openWith("70");
      expect(screen.getByText("Adulte")).toBeInTheDocument();
      expect(screen.getByText("Pédiatrique")).toBeInTheDocument();
    });

    test("poids = 20 kg (<30) → Pédiatrique seule, bandeau d'explication", () => {
      openWith("20");
      expect(screen.queryByText("Adulte")).not.toBeInTheDocument();
      expect(screen.getByText("Pédiatrique")).toBeInTheDocument();
      expect(screen.getByText(/Poids < 30 kg.*pédiatrique/i)).toBeInTheDocument();
    });

    test("poids = 100 kg (>70) → Adulte seule, bandeau d'explication", () => {
      openWith("100");
      expect(screen.getByText("Adulte")).toBeInTheDocument();
      expect(screen.queryByText("Pédiatrique")).not.toBeInTheDocument();
      expect(screen.getByText(/Poids > 70 kg.*adulte/i)).toBeInTheDocument();
    });

    test("repli : poids 20 kg + pas de poso pédiatrique → affiche Adulte + bandeau", () => {
      openWith("20", drugAdulteOnly);
      expect(screen.getByText("Adulte")).toBeInTheDocument();
      expect(screen.queryByText("Pédiatrique")).not.toBeInTheDocument();
      expect(screen.getByText(/Pas de posologie pédiatrique/i)).toBeInTheDocument();
    });

    test("repli : poids 100 kg + pas de poso adulte → affiche Pédiatrique + bandeau", () => {
      openWith("100", drugPedOnly);
      expect(screen.queryByText("Adulte")).not.toBeInTheDocument();
      expect(screen.getByText("Pédiatrique")).toBeInTheDocument();
      expect(screen.getByText(/Pas de posologie adulte/i)).toBeInTheDocument();
    });

    test("poids invalide (vide / > 300) → les deux colonnes, pas de bandeau", () => {
      openWith("999"); // > 300 → traité comme invalide
      expect(screen.getByText("Adulte")).toBeInTheDocument();
      expect(screen.getByText("Pédiatrique")).toBeInTheDocument();
      expect(screen.queryByText(/Poids < 30|Poids > 70|Pas de posologie/i)).not.toBeInTheDocument();
    });
  });
});
