import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProfileProvider } from "../lib/authProfile";
import DrugNote from "./DrugNote";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("DrugNote", () => {
  test("reste compacte puis enregistre la note locale du médicament", () => {
    const onChange = vi.fn();
    render(<DrugNote drugId={42} onChange={onChange} />);

    expect(screen.queryByLabelText("Note personnelle pour ce médicament")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Note personnelle/i }));
    fireEvent.change(screen.getByLabelText("Note personnelle pour ce médicament"), {
      target: { value: "Dilution utilisée dans le service" },
    });

    expect(localStorage.getItem("mediurg-note-42")).toBe("Dilution utilisée dans le service");
    expect(onChange).toHaveBeenLastCalledWith(true);
  });

  test("restaure une note existante et en affiche un aperçu sans ouvrir l’éditeur", () => {
    localStorage.setItem("mediurg-note-42", "Surveillance habituelle du service");

    render(<DrugNote drugId={42} />);

    expect(screen.getByText("Surveillance habituelle du service")).toBeInTheDocument();
    expect(screen.queryByLabelText("Note personnelle pour ce médicament")).not.toBeInTheDocument();
  });

  test("isole les notes par utilisateur authentifié", () => {
    render(
      <AuthProfileProvider value={{ id: "soignant-1" } as never}>
        <DrugNote drugId={42} />
      </AuthProfileProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /Note personnelle/i }));
    fireEvent.change(screen.getByLabelText("Note personnelle pour ce médicament"), {
      target: { value: "Note du compte" },
    });

    expect(localStorage.getItem("mediurg-usoignant-1-note-42")).toBe("Note du compte");
    expect(localStorage.getItem("mediurg-note-42")).toBeNull();
  });

  test("ouvre et focalise l’éditeur à la demande de la préparation", async () => {
    const { rerender } = render(<DrugNote drugId={42} openRequest={0} />);

    rerender(<DrugNote drugId={42} openRequest={1} />);

    const editor = await screen.findByLabelText("Note personnelle pour ce médicament");
    await waitFor(() => expect(editor).toHaveFocus());
  });
});
