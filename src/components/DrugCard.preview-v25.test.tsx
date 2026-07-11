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
    expect(within(results).getByText("0,5")).toBeInTheDocument();
    expect(within(results).getByText("5 mL/h")).toBeInTheDocument();

    fireEvent.click(within(results).getByRole("button", { name: "Augmenter le réglage" }));
    expect(within(results).getByText("1")).toBeInTheDocument();
    expect(within(results).getByText("10 mL/h")).toBeInTheDocument();
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
