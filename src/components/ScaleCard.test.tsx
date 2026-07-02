import { fireEvent, render, screen } from "@testing-library/react";
import ScaleCard from "./ScaleCard";
import type { ClinicalScale } from "../types/data";

// Helper : lit la valeur du total via son className unique. Évite l'ambiguïté
// quand le score apparaît aussi dans une option (ex: "1" présent dans la liste
// d'options ET dans .scale-total-value).
const getTotalText = () => document.querySelector(".scale-total-value")?.textContent?.trim() ?? "";

const getBadgeText = () => document.querySelector(".scale-badge")?.textContent?.trim() ?? "";

// Mocks d'échelles : structure copiée de src/data/scales.js mais simplifiée
// pour tester le composant en isolation. On couvre les 3 modes :
// - "sum" simple (Glasgow-like)
// - "sum" avec variants (Cushman-like)
// - "single-pick" (RASS-like)

const sumScale: ClinicalScale = {
  id: "test-sum",
  nom: "Échelle de test (sum)",
  icon: "🧠",
  description: "Description de l'échelle de test à 2 items.",
  type: "sum",
  items: [
    {
      label: "Item A",
      options: [
        { score: 4, label: "Réponse A4" },
        { score: 2, label: "Réponse A2" },
        { score: 1, label: "Réponse A1" },
      ],
    },
    {
      label: "Item B",
      options: [
        { score: 5, label: "Réponse B5" },
        { score: 3, label: "Réponse B3" },
      ],
    },
  ],
  interpret: (total: number) => {
    if (total <= 4) return { severity: "Sévère", color: "#dc2626" };
    if (total <= 7) return { severity: "Modérée", color: "#f97316" };
    return { severity: "Légère", color: "#16a34a" };
  },
};

const variantScale: ClinicalScale = {
  id: "test-variant",
  nom: "Échelle avec variants",
  icon: "🩺",
  description: "Sum avec variants par tranche.",
  type: "sum",
  items: [
    {
      label: "PA selon âge",
      variants: [
        {
          id: "adulte",
          label: "Adulte",
          options: [
            { score: 0, label: "PA normale" },
            { score: 1, label: "PA basse" },
          ],
        },
        {
          id: "enfant",
          label: "Enfant",
          options: [
            { score: 0, label: "PA normale" },
            { score: 2, label: "PA basse enfant" },
          ],
        },
      ],
    },
  ],
  interpret: (_total: number) => ({ severity: "OK", color: "#000" }),
};

const pickScale: ClinicalScale = {
  id: "test-pick",
  nom: "Échelle single-pick",
  icon: "💉",
  description: "Une seule sélection, score signé.",
  type: "single-pick",
  options: [
    { score: 4, label: "Combatif", description: "Agressif" },
    { score: 0, label: "Calme" },
    { score: -3, label: "Sédation modérée" },
    { score: -5, label: "Non réveillable" },
  ],
  interpret: (total: number) => ({
    severity: total < 0 ? "Sédaté" : "Éveillé",
    color: "#3b82f6",
  }),
};

const wallaceScale: ClinicalScale = {
  id: "wallace",
  nom: "Règle des 9 de Wallace",
  icon: "🔥",
  description: "SCB adulte.",
  type: "sum",
  items: [
    {
      label: "Tête et cou (9 %)",
      options: [
        { score: 0, label: "Indemne" },
        { score: 4.5, label: "Une face (4,5 %)" },
        { score: 9, label: "Totale (9 %)" },
      ],
    },
    {
      label: "Membre supérieur droit (9 %)",
      options: [
        { score: 0, label: "Indemne" },
        { score: 4.5, label: "Une face (4,5 %)" },
        { score: 9, label: "Totale (9 %)" },
      ],
    },
    {
      label: "Membre supérieur gauche (9 %)",
      options: [
        { score: 0, label: "Indemne" },
        { score: 4.5, label: "Une face (4,5 %)" },
        { score: 9, label: "Totale (9 %)" },
      ],
    },
    {
      label: "Tronc antérieur (18 %)",
      options: [
        { score: 0, label: "Indemne" },
        { score: 9, label: "Thorax ou abdomen (9 %)" },
        { score: 18, label: "Total (18 %)" },
      ],
    },
    {
      label: "Tronc postérieur (18 %)",
      options: [
        { score: 0, label: "Indemne" },
        { score: 9, label: "Haut ou bas du dos (9 %)" },
        { score: 18, label: "Total (18 %)" },
      ],
    },
    {
      label: "Membre inférieur droit (18 %)",
      options: [
        { score: 0, label: "Indemne" },
        { score: 9, label: "Une face (9 %)" },
        { score: 18, label: "Total (18 %)" },
      ],
    },
    {
      label: "Membre inférieur gauche (18 %)",
      options: [
        { score: 0, label: "Indemne" },
        { score: 9, label: "Une face (9 %)" },
        { score: 18, label: "Total (18 %)" },
      ],
    },
    {
      label: "Périnée / organes génitaux (1 %)",
      options: [
        { score: 0, label: "Indemne" },
        { score: 1, label: "Atteint (1 %)" },
      ],
    },
  ],
  interpret: (total: number) => {
    if (total < 10) return { severity: "Brûlure localisée", color: "#16a34a" };
    if (total < 20) return { severity: "Brûlure étendue", color: "#f97316" };
    return { severity: "Brûlure grave", color: "#dc2626" };
  },
};

describe("ScaleCard — sum (Glasgow-like)", () => {
  test("rendu fermé : nom, description, score —", () => {
    render(<ScaleCard scale={sumScale} />);
    expect(screen.getByText("Échelle de test (sum)")).toBeInTheDocument();
    expect(screen.getByText(/Description de l'échelle/)).toBeInTheDocument();
  });

  test("clic sur le header ouvre la carte (items visibles)", () => {
    render(<ScaleCard scale={sumScale} />);
    fireEvent.click(screen.getByText("Échelle de test (sum)"));
    expect(screen.getByText("Item A")).toBeInTheDocument();
    expect(screen.getByText("Item B")).toBeInTheDocument();
    expect(screen.getByText("Réponse A4")).toBeInTheDocument();
  });

  test("sélection partielle : total reste « — » tant que les 2 items ne sont pas répondus", () => {
    render(<ScaleCard scale={sumScale} />);
    fireEvent.click(screen.getByText("Échelle de test (sum)"));
    fireEvent.click(screen.getByText("Réponse A4"));
    // 1/2 items répondu → allAnswered=false → total affiche "—"
    expect(getTotalText()).toBe("—");
  });

  test("toutes les réponses : total = somme + badge interpretation", () => {
    render(<ScaleCard scale={sumScale} />);
    fireEvent.click(screen.getByText("Échelle de test (sum)"));
    fireEvent.click(screen.getByText("Réponse A4")); // 4
    fireEvent.click(screen.getByText("Réponse B3")); // 3
    expect(getTotalText()).toBe("7");
    expect(getBadgeText()).toBe("Modérée");
  });

  test("changer une réponse met à jour le total", () => {
    render(<ScaleCard scale={sumScale} />);
    fireEvent.click(screen.getByText("Échelle de test (sum)"));
    fireEvent.click(screen.getByText("Réponse A4"));
    fireEvent.click(screen.getByText("Réponse B3"));
    expect(getTotalText()).toBe("7");
    // Bascule A4 → A1 : total devient 1+3=4
    fireEvent.click(screen.getByText("Réponse A1"));
    expect(getTotalText()).toBe("4");
    expect(getBadgeText()).toBe("Sévère");
  });

  test("Réinitialiser efface toutes les sélections", () => {
    render(<ScaleCard scale={sumScale} />);
    fireEvent.click(screen.getByText("Échelle de test (sum)"));
    fireEvent.click(screen.getByText("Réponse A4"));
    fireEvent.click(screen.getByText("Réponse B5"));
    expect(getTotalText()).toBe("9");
    fireEvent.click(screen.getByText("Réinitialiser"));
    expect(getTotalText()).toBe("—");
  });
});

describe("ScaleCard — sum avec variants (Cushman-like)", () => {
  test("sans variant choisi : hint affiché, options absentes", () => {
    render(<ScaleCard scale={variantScale} />);
    fireEvent.click(screen.getByText("Échelle avec variants"));
    expect(screen.getByText(/Choisissez d'abord la tranche d'âge/)).toBeInTheDocument();
    expect(screen.queryByText("PA basse")).not.toBeInTheDocument();
  });

  test("choisir un variant révèle ses options spécifiques", () => {
    render(<ScaleCard scale={variantScale} />);
    fireEvent.click(screen.getByText("Échelle avec variants"));
    fireEvent.click(screen.getByText("Adulte"));
    expect(screen.getByText("PA basse")).toBeInTheDocument();
    expect(screen.queryByText("PA basse enfant")).not.toBeInTheDocument();
  });

  test("changer de variant après avoir scoré reset le score de cet item", () => {
    render(<ScaleCard scale={variantScale} />);
    fireEvent.click(screen.getByText("Échelle avec variants"));
    fireEvent.click(screen.getByText("Adulte"));
    fireEvent.click(screen.getByText("PA basse")); // score=1, total=1
    expect(getTotalText()).toBe("1");
    // Bascule Adulte → Enfant : score précédent doit être effacé
    fireEvent.click(screen.getByText("Enfant"));
    expect(getTotalText()).toBe("—");
  });
});

describe("ScaleCard — single-pick (RASS-like)", () => {
  test("rend toutes les options avec scores signés", () => {
    render(<ScaleCard scale={pickScale} />);
    fireEvent.click(screen.getByText("Échelle single-pick"));
    expect(screen.getByText("Combatif")).toBeInTheDocument();
    expect(screen.getByText("Agressif")).toBeInTheDocument();
    expect(screen.getByText("Sédation modérée")).toBeInTheDocument();
    expect(screen.getByText("Non réveillable")).toBeInTheDocument();
  });

  test("pick d'une option négative : total signé, badge Sédaté", () => {
    render(<ScaleCard scale={pickScale} />);
    fireEvent.click(screen.getByText("Échelle single-pick"));
    fireEvent.click(screen.getByText("Sédation modérée"));
    expect(getTotalText()).toBe("-3");
    expect(getBadgeText()).toBe("Sédaté");
  });

  test("pick d'une option positive : total préfixé par +, badge Éveillé", () => {
    render(<ScaleCard scale={pickScale} />);
    fireEvent.click(screen.getByText("Échelle single-pick"));
    fireEvent.click(screen.getByText("Combatif"));
    expect(getTotalText()).toBe("+4");
    expect(getBadgeText()).toBe("Éveillé");
  });

  test("Réinitialiser efface la sélection", () => {
    render(<ScaleCard scale={pickScale} />);
    fireEvent.click(screen.getByText("Échelle single-pick"));
    fireEvent.click(screen.getByText("Calme"));
    fireEvent.click(screen.getByText("Réinitialiser"));
    expect(getTotalText()).toBe("—");
  });
});

describe("ScaleCard — Wallace", () => {
  test("affiche un total immédiat en pourcentage et calcule Parkland", () => {
    render(<ScaleCard scale={wallaceScale} />);
    fireEvent.click(screen.getByText("Règle des 9 de Wallace"));

    expect(getTotalText()).toBe("0 %");
    fireEvent.click(screen.getByRole("button", { name: "Totale (9 %)" }));
    expect(getTotalText()).toBe("9 %");

    fireEvent.change(screen.getByLabelText("Poids (kg)"), { target: { value: "70" } });
    expect(screen.getByText(/2\s520 mL de Ringer lactate \/ 24 h/)).toBeInTheDocument();
  });

  test("alerte dès 20 % ou plus", () => {
    render(<ScaleCard scale={wallaceScale} />);
    fireEvent.click(screen.getByText("Règle des 9 de Wallace"));
    fireEvent.click(screen.getByRole("button", { name: "Totale (9 %)" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Total (18 %)" })[0]);

    expect(getTotalText()).toBe("27 %");
    expect(screen.getByText(/SCB ≥ 20 %/)).toBeInTheDocument();
  });

  test("changer l'âge recalcule les pourcentages sans resélectionner les zones", () => {
    render(<ScaleCard scale={wallaceScale} />);
    fireEvent.click(screen.getByText("Règle des 9 de Wallace"));
    fireEvent.click(screen.getByRole("button", { name: "Totale (9 %)" }));

    expect(getTotalText()).toBe("9 %");
    expect(screen.getByRole("button", { name: "Totale (9 %)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enfant 5 ans" }));
    expect(getTotalText()).toBe("13 %");
    expect(screen.getByRole("button", { name: "Totale (13 %)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Bébé" }));
    expect(getTotalText()).toBe("19 %");
    expect(screen.getByRole("button", { name: "Totale (19 %)" })).toBeInTheDocument();
    expect(screen.getByText(/SCB ≥ 10 %/)).toBeInTheDocument();
  });
});
