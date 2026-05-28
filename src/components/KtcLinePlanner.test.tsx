import { fireEvent, render, screen } from "@testing-library/react";
import KtcLinePlanner from "./KtcLinePlanner";

describe("KtcLinePlanner", () => {
  test("recherche, ajoute puis retire un médicament du montage", () => {
    render(<KtcLinePlanner />);

    const reset = screen.getByRole("button", { name: "Effacer" });
    expect(reset).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Médicaments à brancher/i), {
      target: { value: "noradrenaline" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Noradrénaline/i }));

    expect(reset).not.toBeDisabled();
    expect(screen.getAllByText(/Noradrénaline/i).length).toBeGreaterThan(0);

    fireEvent.click(reset);
    expect(reset).toBeDisabled();
    expect(screen.getByText(/Aucun médicament saisi/i)).toBeInTheDocument();
  });
});
