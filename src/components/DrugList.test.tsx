import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DrugList from "./DrugList";

// Drugs minimaux : reproduit la forme attendue par DrugCard sans les centaines
// de lignes de drugs.js réelles. Les champs absents tombent sur les fallbacks
// "Non renseigné" du composant.
const adrenaline = {
  id: 1,
  nom: "Adrénaline",
  commercial: "Adrenaline Aguettant",
  dci: "épinéphrine",
  classe: "Catécholamine α/β",
  cat: "Cardio",
  svc: ["SAUV", "SMUR"],
  couleur: "#FF3B30",
  icon: "💉",
  desc: "Sympathomimétique direct.",
  indic: ["Arrêt cardio-respiratoire", "Anaphylaxie"],
  ci: [],
  ei: [],
  cond: [],
  poso: { a: ["1 mg IV toutes les 3-5 min"], p: ["10 µg/kg IV"] },
  prep: null,
};

const atropine = {
  ...adrenaline,
  id: 2,
  nom: "Atropine",
  commercial: "Atropine Aguettant",
  dci: "sulfate d'atropine",
  classe: "Anticholinergique",
};

describe("DrugList", () => {
  test("rend une carte par drug, dans l'ordre fourni", () => {
    render(
      <DrugList
        drugs={[adrenaline, atropine]}
        favorites={new Set()}
        onToggleFavorite={() => {}}
        onOpen={() => {}}
        onProtocolOpen={() => {}}
      />
    );
    // getAllByRole heading récupère les <h-X> rendus par chaque DrugCard
    expect(screen.getByText("Adrénaline")).toBeInTheDocument();
    expect(screen.getByText("Atropine")).toBeInTheDocument();
  });

  test("clic sur l'étoile favori déclenche onToggleFavorite avec le bon id", async () => {
    const user = userEvent.setup();
    const onToggleFavorite = vi.fn();
    render(
      <DrugList
        drugs={[adrenaline]}
        favorites={new Set()}
        onToggleFavorite={onToggleFavorite}
        onOpen={() => {}}
        onProtocolOpen={() => {}}
      />
    );
    // Le bouton favori est libellé "Ajouter aux favoris" / "Retirer..." dans DrugCard
    const favButton = screen.getByRole("button", { name: /favoris/i });
    await user.click(favButton);
    expect(onToggleFavorite).toHaveBeenCalledWith(1);
  });

  test("clic sur la carte expand DrugCard et révèle l'onglet Posologie actif", async () => {
    const user = userEvent.setup();
    render(
      <DrugList
        drugs={[adrenaline]}
        favorites={new Set()}
        onToggleFavorite={() => {}}
        onOpen={() => {}}
        onProtocolOpen={() => {}}
      />
    );
    // Avant clic : l'onglet "Posologie" du body collapsé n'est pas visible
    expect(screen.queryByRole("button", { name: "Posologie" })).not.toBeInTheDocument();
    // Le header est un <button> (cf. DrugCard) → clic dessus expand
    await user.click(screen.getByRole("button", { name: /Adrénaline/i }));
    // Après expand, l'onglet "Posologie" est rendu et actif par défaut
    expect(screen.getByRole("button", { name: "Posologie" })).toBeInTheDocument();
  });
});
