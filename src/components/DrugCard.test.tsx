import { fireEvent, render, screen } from "@testing-library/react";
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
  });

  describe("Toggle open / close", () => {
    test("clic sur le header ouvre la carte (description, DCI visible, onglet poso actif)", () => {
      render(<DrugCard drug={mockDrug} />);
      const header = screen.getByText("TEST_DRUG_XYZ").closest("button");
      fireEvent.click(header!);

      expect(screen.getByText(/Description longue du médicament/)).toBeInTheDocument();
      expect(screen.getByText("DCI")).toBeInTheDocument();
      expect(screen.getByText("Médicament de test")).toBeInTheDocument();
      // Onglet poso = actif par défaut → calculateur de poids visible
      expect(screen.getByPlaceholderText("kg")).toBeInTheDocument();
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

    test("poids = 70 kg : calc affiche 70-140 mg (1-2 mg/kg × 70)", () => {
      render(<DrugCard drug={mockDrug} />);
      fireEvent.click(screen.getByText("TEST_DRUG_XYZ").closest("button")!);
      const weightInput = screen.getByPlaceholderText("kg") as HTMLInputElement;
      fireEvent.change(weightInput, { target: { value: "70" } });
      // Le résultat apparaît dans un .calc-result. La regex de calcDose
      // produit un format type "70-140 mg" pour la fourchette.
      const adultePosoItem = screen.getByText(/1-2 mg\/kg IV lente/).closest(".poso-item")!;
      const result = adultePosoItem.querySelector(".calc-result");
      expect(result).toBeTruthy();
      expect(result!.textContent).toMatch(/70.*140/);
    });

    test("poids = 150 kg : 1-2 mg/kg × 150 = 150-300, capé à max 200 mg → badge ⚠ max", () => {
      render(<DrugCard drug={mockDrug} />);
      fireEvent.click(screen.getByText("TEST_DRUG_XYZ").closest("button")!);
      const weightInput = screen.getByPlaceholderText("kg") as HTMLInputElement;
      fireEvent.change(weightInput, { target: { value: "150" } });
      const adultePosoItem = screen.getByText(/1-2 mg\/kg IV lente/).closest(".poso-item")!;
      const result = adultePosoItem.querySelector(".calc-result");
      expect(result).toBeTruthy();
      // Le calcul doit signaler le cap (« ⚠ max ») et la classe calc-over
      expect(result!.textContent).toMatch(/⚠ max/);
      expect(result!.className).toContain("calc-over");
    });

    test("clic sur la croix efface le poids", () => {
      render(<DrugCard drug={mockDrug} />);
      fireEvent.click(screen.getByText("TEST_DRUG_XYZ").closest("button")!);
      const weightInput = screen.getByPlaceholderText("kg") as HTMLInputElement;
      fireEvent.change(weightInput, { target: { value: "70" } });
      expect(weightInput.value).toBe("70");

      const clearBtn = screen.getByRole("button", { name: "Effacer le poids" });
      fireEvent.click(clearBtn);
      expect(weightInput.value).toBe("");
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

    test("Enter ou Space sur l'étoile fonctionne aussi (a11y clavier)", () => {
      const onToggle = vi.fn();
      render(<DrugCard drug={mockDrug} isFavorite={false} onToggleFavorite={onToggle} />);
      const star = screen.getByLabelText("Ajouter aux favoris");
      fireEvent.keyDown(star, { key: "Enter" });
      expect(onToggle).toHaveBeenCalledWith(99999);
      fireEvent.keyDown(star, { key: " " });
      expect(onToggle).toHaveBeenCalledTimes(2);
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
});
