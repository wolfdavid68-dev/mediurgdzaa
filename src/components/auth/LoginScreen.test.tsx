import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginScreen from "./LoginScreen";

// Test de rendu : l'écran s'affiche et la validation inline marche sans
// réseau (matricule vide → erreur, login() jamais appelé).

describe("LoginScreen (desktop)", () => {
  const props = {
    onLoggedIn: vi.fn(),
    onGoToRegister: vi.fn(),
    onGoToForgot: vi.fn(),
  };

  test("rend le titre et les actions clés", () => {
    render(<LoginScreen {...props} />);
    expect(screen.getByText("Bienvenue.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Se connecter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Créer un compte/i })).toBeInTheDocument();
  });

  test("submit matricule vide → erreur de format, pas de navigation", async () => {
    render(<LoginScreen {...props} />);
    fireEvent.submit(screen.getByRole("button", { name: /Se connecter/i }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/M \+ 6 chiffres/));
    expect(props.onLoggedIn).not.toHaveBeenCalled();
  });

  test("le lien « mot de passe oublié » déclenche le callback", () => {
    render(<LoginScreen {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Mot de passe oublié/i }));
    expect(props.onGoToForgot).toHaveBeenCalled();
  });
});
