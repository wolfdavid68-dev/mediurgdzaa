import { act, renderHook, waitFor } from "@testing-library/react";

// On garde la vraie validation (isValidMatricule) et on mocke seulement
// login() pour ne pas toucher Supabase.
const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));
vi.mock("../../../lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/auth")>();
  return { ...actual, login: loginMock };
});

import { useLoginForm } from "./useLoginForm";

describe("useLoginForm", () => {
  beforeEach(() => loginMock.mockReset());

  test("matricule invalide → erreur, errorNonce++, login non appelé", async () => {
    const onLoggedIn = vi.fn();
    const { result } = renderHook(() => useLoginForm(onLoggedIn));
    act(() => {
      result.current.setMatriculeDigits("123"); // 3 chiffres → invalide
      result.current.setPassword("secret");
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.error).toMatch(/M \+ 6 chiffres/);
    expect(result.current.errorNonce).toBe(1);
    expect(loginMock).not.toHaveBeenCalled();
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  test("mot de passe vide → erreur dédiée", async () => {
    const { result } = renderHook(() => useLoginForm(vi.fn()));
    act(() => result.current.setMatriculeDigits("402100"));
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.error).toBe("Mot de passe requis");
    expect(loginMock).not.toHaveBeenCalled();
  });

  test("identifiants valides + login ok → onLoggedIn appelé", async () => {
    loginMock.mockResolvedValue({ ok: true });
    const onLoggedIn = vi.fn();
    const { result } = renderHook(() => useLoginForm(onLoggedIn));
    act(() => {
      result.current.setMatriculeDigits("402100");
      result.current.setPassword("secret");
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(loginMock).toHaveBeenCalledWith("M402100", "secret");
    await waitFor(() => expect(onLoggedIn).toHaveBeenCalled());
  });

  test("login en échec → message d'erreur du backend", async () => {
    loginMock.mockResolvedValue({ ok: false, error: "Matricule inconnu" });
    const onLoggedIn = vi.fn();
    const { result } = renderHook(() => useLoginForm(onLoggedIn));
    act(() => {
      result.current.setMatriculeDigits("402100");
      result.current.setPassword("secret");
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.error).toBe("Matricule inconnu");
    expect(onLoggedIn).not.toHaveBeenCalled();
  });
});
