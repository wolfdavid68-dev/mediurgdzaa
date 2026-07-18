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

const findPreparationModes = () => screen.findByRole("group", { name: "Modes de préparation" });

const findPreparationResults = () => screen.findByLabelText("Résultats de préparation");

const checkAllControls = (container: HTMLElement) => {
  const section = container.querySelector<HTMLElement>(".prep-v25-control")!;
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

  test("est active dans l’app principale sans paramètre preview", async () => {
    window.history.pushState({}, "", "/");
    const { container } = render(
      <DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepV25Enabled />
    );
    openDrug("ADRÉNALINE");

    await findPreparationResults();
    expect(container.querySelector(".prep-v25-results")).toBeInTheDocument();
    expect(container.querySelector(".prep-v25-panel")).toBeInTheDocument();
  });

  test("ne modifie pas l’en-tête de la carte médicament", () => {
    window.history.pushState({}, "", "/");
    const main = render(<DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" />);
    const mainHeader = main.container.querySelector(".drug-row")?.innerHTML;
    main.unmount();

    window.history.pushState({}, "", "/?author=preview");
    const previewView = render(<DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" />);
    expect(previewView.container.querySelector(".drug-row")?.innerHTML).toBe(mainHeader);
    expect(previewView.container.querySelector(".drug-header .prep-v25-panel")).toBeNull();
  });

  test("affiche et ajuste le débit mL/h avec la dose délivrée calculée", async () => {
    render(<DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepPopulation="adulte" />);
    openDrug("ADRÉNALINE");

    const modes = await findPreparationModes();
    const pseMode = await within(modes).findByRole("button", {
      name: /PSR \/ PSE — 0,2 mg\/mL/i,
    });
    fireEvent.click(pseMode);
    expect(within(modes).queryByRole("button", { name: /Vi\/Vf poids/i })).toBeNull();

    const results = await findPreparationResults();
    expect(within(results).getByText("Débit à programmer · mL/h")).toBeInTheDocument();
    expect(within(results).queryByText("Prescription · µg/kg/min")).toBeNull();
    const rateInput = within(results).getByRole("spinbutton", {
      name: "Saisir Débit à programmer · mL/h",
    });
    expect(rateInput).toHaveValue("2");
    expect(within(results).getByText("0,08 µg/kg/min")).toBeInTheDocument();

    fireEvent.click(within(results).getByRole("button", { name: "Augmenter le réglage" }));
    expect(rateInput).toHaveValue("3");
    expect(within(results).getByText("0,13 µg/kg/min")).toBeInTheDocument();
  });

  test("accepte un débit décimal libre et conserve les paliers rapides", async () => {
    render(<DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepPopulation="adulte" />);
    openDrug("ADRÉNALINE");

    const modes = await findPreparationModes();
    fireEvent.click(await within(modes).findByRole("button", { name: /PSR \/ PSE — 0,2 mg\/mL/i }));
    const results = await findPreparationResults();
    const rateInput = within(results).getByRole("spinbutton", {
      name: /saisir débit à programmer/i,
    });

    fireEvent.change(rateInput, { target: { value: "2,5" } });
    expect(rateInput).toHaveValue("2,5");
    expect(within(results).getByText("0,1 µg/kg/min")).toBeInTheDocument();

    fireEvent.click(within(results).getByRole("button", { name: "Diminuer le réglage" }));
    expect(rateInput).toHaveValue("2");
    fireEvent.change(rateInput, { target: { value: "2,5" } });
    fireEvent.click(within(results).getByRole("button", { name: "Augmenter le réglage" }));
    expect(rateInput).toHaveValue("3");
  });

  test("refuse un débit hors plage sans l’appliquer au calcul", async () => {
    render(<DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepPopulation="adulte" />);
    openDrug("ADRÉNALINE");
    const modes = await findPreparationModes();
    fireEvent.click(await within(modes).findByRole("button", { name: /PSR \/ PSE — 0,2 mg\/mL/i }));
    const results = await findPreparationResults();
    const rateInput = within(results).getByRole("spinbutton", {
      name: /saisir débit à programmer/i,
    });

    fireEvent.change(rateInput, { target: { value: "25" } });
    expect(within(results).getByRole("alert")).toHaveTextContent("1,2 à 24");
    expect(within(results).getByText("0,08 µg/kg/min")).toBeInTheDocument();
    fireEvent.blur(rateInput);
    expect(rateInput).toHaveValue("2");
    expect(within(results).getByRole("alert")).toHaveTextContent("valeur précédente conservée");
  });

  test("annule le double contrôle dès qu’une saisie devient invalide", async () => {
    const { container } = render(
      <DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("ADRÉNALINE");
    const modes = await findPreparationModes();
    fireEvent.click(await within(modes).findByRole("button", { name: /PSR \/ PSE — 0,2 mg\/mL/i }));
    checkAllControls(container);
    fireEvent.click(screen.getByRole("button", { name: "Valider les 5 contrôles" }));
    expect(screen.getByText("Préparation vérifiée")).toBeInTheDocument();

    const results = await findPreparationResults();
    fireEvent.change(
      within(results).getByRole("spinbutton", { name: /saisir débit à programmer/i }),
      {
        target: { value: "abc" },
      }
    );
    expect(screen.queryByText("Préparation vérifiée")).not.toBeInTheDocument();
    expect(screen.getByText("0 / 5 contrôles")).toBeInTheDocument();
  });

  test("traite le volume IVD efficace d’Anexate comme une saisie libre en mL", async () => {
    render(<DrugCard drug={drugNamed("ANEXATE")} patientWeight="80" prepPopulation="adulte" />);
    openDrug("ANEXATE");
    const modes = await findPreparationModes();
    expect(
      await within(modes).findByRole("button", { name: /Bolus urgence \/ transport/i })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("2 mL = 0,2 mg IV en 15 s")).toBeInTheDocument();
    expect(screen.getByText("1 mL = 0,1 mg IV si effet insuffisant")).toBeInTheDocument();
    expect(
      screen.getByText(/1 mL toutes les 60 s.*dose cumulée max 10 mL = 1 mg/i)
    ).toBeInTheDocument();

    fireEvent.click(await within(modes).findByRole("button", { name: /PSE entretien/i }));
    const results = await findPreparationResults();
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

  test("sépare les deux saisies et les deux résultats d’Octaplex", async () => {
    render(<DrugCard drug={drugNamed("OCTAPLEX")} patientWeight="80" prepPopulation="adulte" />);
    openDrug("OCTAPLEX");
    const results = await findPreparationResults();
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

  test("refuse une dose AMOX absente de la table sans l’arrondir silencieusement", async () => {
    render(
      <DrugCard drug={drugNamed("AMOXICILLINE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("AMOXICILLINE");
    const modes = await findPreparationModes();
    fireEvent.click(await within(modes).findByRole("button", { name: /Dose méningée pompe/i }));
    const results = await findPreparationResults();
    const doseInput = within(results).getByRole("spinbutton", { name: /saisir Dose\/j/i });

    fireEvent.change(doseInput, { target: { value: "13,5" } });
    expect(doseInput).toHaveValue("13,5");
    expect(doseInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Valeurs disponibles : 6, 8, 10, 12, 14, 16, 18, 20, 22, 24"
    );
    expect(screen.queryByText(/Ligne la plus proche de 13,5 g\/j/i)).toBeNull();
    expect(screen.queryByText("14 g/j")).toBeNull();
    fireEvent.blur(doseInput);
    expect(doseInput).toHaveValue("12");
    expect(screen.getByRole("alert")).toHaveTextContent("valeur précédente conservée");

    fireEvent.change(doseInput, { target: { value: "14" } });
    expect(doseInput).toHaveValue("14");
    expect(screen.getByText("Ligne exacte de la table principale")).toBeInTheDocument();
    expect(screen.getByText("14 g/j")).toBeInTheDocument();
  });

  test("réinitialise le double contrôle après débit, poids ou protocole", async () => {
    const { container, rerender } = render(
      <DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("ADRÉNALINE");

    const modes = await findPreparationModes();
    fireEvent.click(await within(modes).findByRole("button", { name: /PSR \/ PSE — 0,2 mg\/mL/i }));
    checkAllControls(container);
    fireEvent.click(screen.getByRole("button", { name: "Valider les 5 contrôles" }));
    expect(screen.getByText("Préparation vérifiée")).toBeInTheDocument();

    const results = await findPreparationResults();
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

    const modes = await findPreparationModes();
    await waitFor(() => expect(within(modes).getAllByRole("button")).toHaveLength(4));
    fireEvent.click(within(modes).getByRole("button", { name: /Éclampsie — Charge puis PSE/i }));

    const notes = container.querySelector<HTMLElement>(".prep-v25-recipe-notes")!;
    expect(within(notes).getAllByText(/.+/)).toHaveLength(4);
    expect(within(notes).getByText("Insuffisance rénale : adapter posologie")).toBeInTheDocument();
  });

  test("regroupe la dépendance au poids au lieu de la répéter dans chaque phase", () => {
    const { container } = render(
      <DrugCard drug={drugNamed("ACTILYSE")} patientWeight="" prepPopulation="adulte" />
    );
    openDrug("ACTILYSE");

    const preparation = container.querySelector<HTMLElement>(".prep-v25-prepare")!;
    const requirement = within(preparation).getByRole("note");
    expect(within(requirement).getByText("Renseigner le poids patient")).toBeInTheDocument();
    expect(within(requirement).getByText(/les 2 étapes pondérales/i)).toBeInTheDocument();

    const recipe = preparation.querySelector<HTMLElement>(".prep-v25-recipe")!;
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

  test("rend la préparation pas à pas sans répéter l’action et sa valeur", async () => {
    const { container } = render(
      <DrugCard drug={drugNamed("ADRÉNALINE")} patientWeight="80" prepPopulation="adulte" />
    );
    openDrug("ADRÉNALINE");

    expect(screen.getByText("Préparation pas à pas")).toBeInTheDocument();
    const modes = await findPreparationModes();
    expect(
      await within(modes).findByRole("button", { name: /ACR — 1 mg IV\/IO/i })
    ).toHaveAttribute("aria-pressed", "true");
    const recipe = container.querySelector<HTMLElement>(".prep-v25-recipe")!;
    const injectStep = within(recipe).getByText("Injecter").closest("li")!;
    const rinseStep = within(recipe).getByText("Rincer").closest("li")!;

    expect(within(injectStep).getAllByText("Dose fixe · 1 mg")).toHaveLength(1);
    expect(within(injectStep).getAllByText("1 mL")).toHaveLength(1);
    expect(
      within(rinseStep).getAllByText("Voie veineuse ou intra-osseuse — rincer après injection")
    ).toHaveLength(1);
    expect(within(rinseStep).getAllByText("Après injection")).toHaveLength(1);
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
