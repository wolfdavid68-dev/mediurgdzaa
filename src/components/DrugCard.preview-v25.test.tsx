import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DRUGS } from "../data/drugs";
import DrugCard from "./DrugCard";

const drugNamed = (name: string) => {
  const drug = DRUGS.find((candidate) => candidate.nom === name);
  if (!drug) throw new Error(`Médicament introuvable : ${name}`);
  return drug;
};

const openDrug = (name: string) => {
  fireEvent.click(screen.getByText(name).closest("button")!);
};

const checkAllControls = (container: HTMLElement) => {
  const section = container.querySelector<HTMLElement>(".preview-v25-control")!;
  within(section)
    .getAllByRole("button")
    .filter((button) => button.hasAttribute("aria-pressed"))
    .forEach((button) => fireEvent.click(button));
};

describe("DrugCard — surface Prépa Med v2.5", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/?author=preview");
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  test("reste strictement absente de l’app principale", () => {
    window.history.pushState({}, "", "/");
    const { container } = render(<DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" />);
    openDrug("ADRÉNALINE");

    expect(container.querySelector(".preview-v25-results")).toBeNull();
    expect(container.querySelector(".preview-v25-panel")).toBeNull();
  });

  test("ne modifie pas l’en-tête de la carte médicament", () => {
    window.history.pushState({}, "", "/");
    const main = render(<DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" />);
    const mainHeader = main.container.querySelector(".drug-row")?.innerHTML;
    main.unmount();

    window.history.pushState({}, "", "/?author=preview");
    const preview = render(<DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" />);
    expect(preview.container.querySelector(".drug-row")?.innerHTML).toBe(mainHeader);
    expect(preview.container.querySelector(".drug-header .preview-v25-panel")).toBeNull();
  });

  test("affiche et ajuste la prescription avec le débit calculé de l’app principale", async () => {
    const { container } = render(
      <DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("ADRÉNALINE");

    const modes = container.querySelector<HTMLElement>(".preview-v25-modes")!;
    const pseMode = await within(modes).findByRole("button", {
      name: /PSR \/ PSE — Vi\/Vf poids/i,
    });
    fireEvent.click(pseMode);

    const results = container.querySelector<HTMLElement>(".preview-v25-results")!;
    expect(within(results).getByText("Prescription · µg/kg/min")).toBeInTheDocument();
    const doseInput = within(results).getByRole("spinbutton", {
      name: "Saisir Prescription · µg/kg/min",
    });
    expect(doseInput).toHaveValue("0,5");
    expect(within(results).getByText("5 mL/h")).toBeInTheDocument();

    fireEvent.click(within(results).getByRole("button", { name: "Augmenter le réglage" }));
    expect(doseInput).toHaveValue("1");
    expect(within(results).getByText("10 mL/h")).toBeInTheDocument();
  });

  test("accepte une saisie décimale libre et conserve les paliers rapides", async () => {
    const { container } = render(
      <DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("ADRÉNALINE");

    const modes = container.querySelector<HTMLElement>(".preview-v25-modes")!;
    fireEvent.click(
      await within(modes).findByRole("button", { name: /PSR \/ PSE — Vi\/Vf poids/i })
    );
    const results = container.querySelector<HTMLElement>(".preview-v25-results")!;
    const doseInput = within(results).getByRole("spinbutton", {
      name: /saisir prescription/i,
    });

    fireEvent.change(doseInput, { target: { value: "0,7" } });
    expect(doseInput).toHaveValue("0,7");
    expect(within(results).getByText("7 mL/h")).toBeInTheDocument();

    fireEvent.click(within(results).getByRole("button", { name: "Diminuer le réglage" }));
    expect(doseInput).toHaveValue("0,5");
    fireEvent.change(doseInput, { target: { value: "0,7" } });
    fireEvent.click(within(results).getByRole("button", { name: "Augmenter le réglage" }));
    expect(doseInput).toHaveValue("1");
  });

  test("refuse une valeur hors plage sans l’appliquer au calcul", async () => {
    const { container } = render(
      <DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("ADRÉNALINE");
    const modes = container.querySelector<HTMLElement>(".preview-v25-modes")!;
    fireEvent.click(
      await within(modes).findByRole("button", { name: /PSR \/ PSE — Vi\/Vf poids/i })
    );
    const results = container.querySelector<HTMLElement>(".preview-v25-results")!;
    const doseInput = within(results).getByRole("spinbutton", {
      name: /saisir prescription/i,
    });

    fireEvent.change(doseInput, { target: { value: "9" } });
    expect(within(results).getByRole("alert")).toHaveTextContent("0,125 à 2");
    expect(within(results).getByText("5 mL/h")).toBeInTheDocument();
    fireEvent.blur(doseInput);
    expect(doseInput).toHaveValue("0,5");
    expect(within(results).getByRole("alert")).toHaveTextContent("valeur précédente conservée");
  });

  test("annule le double contrôle dès qu’une saisie devient invalide", async () => {
    const { container } = render(
      <DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("ADRÉNALINE");
    const modes = container.querySelector<HTMLElement>(".preview-v25-modes")!;
    fireEvent.click(
      await within(modes).findByRole("button", { name: /PSR \/ PSE — Vi\/Vf poids/i })
    );
    checkAllControls(container);
    fireEvent.click(screen.getByRole("button", { name: "Valider les 5 contrôles" }));
    expect(screen.getByText("Préparation vérifiée")).toBeInTheDocument();

    const results = container.querySelector<HTMLElement>(".preview-v25-results")!;
    fireEvent.change(within(results).getByRole("spinbutton", { name: /saisir prescription/i }), {
      target: { value: "abc" },
    });
    expect(screen.queryByText("Préparation vérifiée")).not.toBeInTheDocument();
    expect(screen.getByText("0 / 5 contrôles")).toBeInTheDocument();
  });

  test("traite le volume IVD efficace d’Anexate comme une saisie libre en mL", async () => {
    const { container } = render(
      <DrugCard drug={drugNamed("ANEXATE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("ANEXATE");
    const modes = container.querySelector<HTMLElement>(".preview-v25-modes")!;
    fireEvent.click(await within(modes).findByRole("button", { name: /Débit PSE/i }));
    const results = container.querySelector<HTMLElement>(".preview-v25-results")!;
    const volumeInput = within(results).getByRole("spinbutton", {
      name: /saisir volume IVD efficace/i,
    });

    expect(volumeInput).toHaveValue("");
    expect(volumeInput).toHaveAttribute("placeholder", "Saisir");
    fireEvent.change(volumeInput, { target: { value: "12,5" } });
    expect(volumeInput).toHaveValue("12,5");
    expect(within(results).getByText("1,25 mg administrés en IVD")).toBeInTheDocument();
    expect(within(results).getByText("12,5 mL/h")).toBeInTheDocument();
  });

  test("sépare les deux saisies et les deux résultats d’Octaplex", () => {
    const { container } = render(
      <DrugCard drug={drugNamed("OCTAPLEX")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("OCTAPLEX");
    const results = container.querySelector<HTMLElement>(".preview-v25-results")!;
    const inrInput = within(results).getByRole("spinbutton", {
      name: /saisir INR \/ dose calculée/i,
    });
    const rateInput = within(results).getByRole("spinbutton", {
      name: /saisir prescription · mL\/kg\/min/i,
    });

    expect(inrInput).toHaveValue("4");
    expect(within(results).getByText("Dose calculée : 2800 UI")).toBeInTheDocument();
    expect(rateInput).toHaveValue("0,12");
    expect(rateInput.parentElement).toHaveTextContent("mL/kg/min");
    expect(within(results).getByText("Débit calculé : 480 mL/h")).toBeInTheDocument();
  });

  test("accepte une dose recette libre et annonce la ligne clinique retenue", async () => {
    const { container } = render(
      <DrugCard drug={drugNamed("AMOXICILLINE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("AMOXICILLINE");
    const modes = container.querySelector<HTMLElement>(".preview-v25-modes")!;
    fireEvent.click(await within(modes).findByRole("button", { name: /Dose méningée pompe/i }));
    const results = container.querySelector<HTMLElement>(".preview-v25-results")!;
    const doseInput = within(results).getByRole("spinbutton", { name: /saisir Dose\/j/i });

    fireEvent.change(doseInput, { target: { value: "13,5" } });
    expect(doseInput).toHaveValue("13,5");
    expect(screen.getByText("Ligne la plus proche de 13,5 g/j")).toBeInTheDocument();
    expect(screen.getByText("14 g/j")).toBeInTheDocument();
  });

  test("réinitialise le double contrôle après débit, poids ou protocole", async () => {
    const { container, rerender } = render(
      <DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("ADRÉNALINE");

    const modes = container.querySelector<HTMLElement>(".preview-v25-modes")!;
    fireEvent.click(
      await within(modes).findByRole("button", { name: /PSR \/ PSE — Vi\/Vf poids/i })
    );
    checkAllControls(container);
    fireEvent.click(screen.getByRole("button", { name: "Valider les 5 contrôles" }));
    expect(screen.getByText("Préparation vérifiée")).toBeInTheDocument();

    const results = container.querySelector<HTMLElement>(".preview-v25-results")!;
    fireEvent.click(within(results).getByRole("button", { name: "Augmenter le réglage" }));
    expect(screen.queryByText("Préparation vérifiée")).not.toBeInTheDocument();
    expect(screen.getByText("0 / 5 contrôles")).toBeInTheDocument();

    checkAllControls(container);
    fireEvent.click(screen.getByRole("button", { name: "Valider les 5 contrôles" }));
    rerender(
      <DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="90" prepPopulation="adulte" />
    );
    await waitFor(() => expect(screen.queryByText("Préparation vérifiée")).not.toBeInTheDocument());
    expect(screen.getByText("0 / 5 contrôles")).toBeInTheDocument();

    fireEvent.click(within(modes).getByRole("button", { name: /Choc anaphylactique/i }));
    expect(screen.getByText("0 / 5 contrôles")).toBeInTheDocument();
  });

  test("expose tous les protocoles et tous les avertissements", async () => {
    const { container } = render(
      <DrugCard
        drug={drugNamed("SULFATE DE MAGNÉSIUM")}
        patientWeight="80"
        prepPopulation="adulte"
      />
    );
    openDrug("SULFATE DE MAGNÉSIUM");

    const modes = container.querySelector<HTMLElement>(".preview-v25-modes")!;
    await waitFor(() => expect(within(modes).getAllByRole("button")).toHaveLength(4));
    fireEvent.click(within(modes).getByRole("button", { name: /Éclampsie — Charge puis PSE/i }));

    const notes = container.querySelector<HTMLElement>(".preview-v25-recipe-notes")!;
    expect(within(notes).getAllByText(/.+/)).toHaveLength(4);
    expect(within(notes).getByText("Insuffisance rénale : adapter posologie")).toBeInTheDocument();
  });

  test("regroupe la dépendance au poids au lieu de la répéter dans chaque phase", () => {
    const { container } = render(
      <DrugCard drug={drugNamed("ACTILYSE")} patientWeight="" prepPopulation="adulte" />
    );
    openDrug("ACTILYSE");

    const preparation = container.querySelector<HTMLElement>(".preview-v25-prepare")!;
    const requirement = within(preparation).getByRole("note");
    expect(within(requirement).getByText("Renseigner le poids patient")).toBeInTheDocument();
    expect(within(requirement).getByText(/les 2 étapes pondérales/i)).toBeInTheDocument();

    const recipe = preparation.querySelector<HTMLElement>(".preview-v25-recipe")!;
    expect(within(recipe).queryByText("Poids requis")).not.toBeInTheDocument();
    expect(within(recipe).getAllByText("À calculer")).toHaveLength(2);
    expect(within(recipe).getByText("Dose fixe")).toBeInTheDocument();
    expect(within(recipe).getByText("0,75 mg/kg · 30 min")).toBeInTheDocument();
  });

  test("n’affiche pas l’ancien moteur détaillé dans la structure V2.5", async () => {
    const { container } = render(
      <DrugCard drug={drugNamed("ANEXATE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("ANEXATE");

    expect(container.querySelector(".prep-v2, .prep-block, .pse-block")).toBeNull();
    expect(screen.queryByText("Calculs et tables détaillés de l’app principale")).toBeNull();
  });

  test("bloque la validation d’une préparation pédiatrique non recommandée", async () => {
    const { container } = render(
      <DrugCard drug={drugNamed("PRIMPERAN")} patientWeight="20" prepPopulation="enfant" />
    );
    openDrug("PRIMPERAN");

    expect((await screen.findAllByText(/Non recommandé < 18 ans/i)).length).toBeGreaterThan(0);
    checkAllControls(container);
    expect(screen.getByRole("button", { name: "Calcul à compléter" })).toBeDisabled();
  });
});
