import { fireEvent, render, screen } from "@testing-library/react";
import PatientWeightBanner from "./PatientWeightBanner";

describe("PatientWeightBanner", () => {
  test("rend le label et l'input vide par défaut", () => {
    render(<PatientWeightBanner weight="" onChange={() => {}} />);
    expect(screen.getByText("Poids patient")).toBeInTheDocument();
    const input = screen.getByLabelText("Poids patient en kilogrammes") as HTMLInputElement;
    expect(input.value).toBe("");
  });

  test("affiche la valeur fournie", () => {
    render(<PatientWeightBanner weight="70" onChange={() => {}} />);
    const input = screen.getByLabelText("Poids patient en kilogrammes") as HTMLInputElement;
    expect(input.value).toBe("70");
  });

  test("onChange est appelé avec la nouvelle valeur lors de la saisie", () => {
    const onChange = vi.fn();
    render(<PatientWeightBanner weight="" onChange={onChange} />);
    const input = screen.getByLabelText("Poids patient en kilogrammes");
    fireEvent.change(input, { target: { value: "65" } });
    expect(onChange).toHaveBeenCalledWith("65");
  });

  test("bouton ×  absent si pas de valeur", () => {
    render(<PatientWeightBanner weight="" onChange={() => {}} />);
    expect(screen.queryByLabelText("Effacer le poids")).not.toBeInTheDocument();
  });

  test("bouton × présent si valeur, clic appelle onChange('')", () => {
    const onChange = vi.fn();
    render(<PatientWeightBanner weight="70" onChange={onChange} />);
    const clear = screen.getByLabelText("Effacer le poids");
    fireEvent.click(clear);
    expect(onChange).toHaveBeenCalledWith("");
  });
});
