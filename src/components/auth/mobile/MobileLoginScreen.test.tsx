import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MobileLoginScreen from "./MobileLoginScreen";

// Test de rendu du login mobile dédié : hero, actions, validation inline.

describe("MobileLoginScreen", () => {
  const props = {
    onLoggedIn: vi.fn(),
    onGoToRegister: vi.fn(),
    onGoToForgot: vi.fn(),
  };

  test("rend le hero et les boutons full-width", () => {
    render(<MobileLoginScreen {...props} />);
    expect(screen.getByText(/à portée de main/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Se connecter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Créer un compte/i })).toBeInTheDocument();
  });

  test("submit matricule vide → erreur, onLoggedIn non appelé", async () => {
    render(<MobileLoginScreen {...props} />);
    fireEvent.submit(screen.getByRole("button", { name: /Se connecter/i }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/M \+ 6 chiffres/));
    expect(props.onLoggedIn).not.toHaveBeenCalled();
  });

  test("« Créer un compte » déclenche le callback", () => {
    render(<MobileLoginScreen {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Créer un compte/i }));
    expect(props.onGoToRegister).toHaveBeenCalled();
  });
});
