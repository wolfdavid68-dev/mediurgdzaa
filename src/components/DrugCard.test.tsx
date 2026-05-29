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
