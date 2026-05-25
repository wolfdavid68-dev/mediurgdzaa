import { act, renderHook } from "@testing-library/react";

const { signupMock } = vi.hoisted(() => ({ signupMock: vi.fn() }));
vi.mock("../../../lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/auth")>();
  return { ...actual, signup: signupMock };
});

import { useRegisterForm } from "./useRegisterForm";

const fillStep1Valid = (r: { current: ReturnType<typeof useRegisterForm> }) => {
  act(() => {
    r.current.setMatriculeDigits("402100");
    r.current.setPrenom("Camille");
    r.current.setNom("Bernard");
    r.current.setEmail("c.bernard@ghrmsa.fr");
  });
};

describe("useRegisterForm", () => {
  beforeEach(() => signupMock.mockReset());

  test("etape 1 invalide (email hors domaine) -> reste etape 1", () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.setMatriculeDigits("402100");
      result.current.setPrenom("Camille");
      result.current.setNom("Bernard");
      result.current.setEmail("camille@gmail.com");
    });
    act(() => result.current.submitStep1());
    expect(result.current.step).toBe(1);
    expect(result.current.error).toMatch(/@ghrmsa\.fr/);
    expect(result.current.errorNonce).toBe(1);
  });

  test("etape 1 etudiant IDE/AS avec email externe -> passe etape 2", () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.setMatriculeDigits("402100");
      result.current.setPrenom("Camille");
      result.current.setNom("Bernard");
      result.current.setFonction("Etudiant infirmier");
      result.current.setEmail("camille.stage@gmail.com");
    });
    act(() => result.current.submitStep1());
    expect(result.current.step).toBe(2);
  });

  test("etape 1 valide -> passe etape 2", () => {
    const { result } = renderHook(() => useRegisterForm());
    fillStep1Valid(result);
    act(() => result.current.submitStep1());
    expect(result.current.step).toBe(2);
  });

  test("etape 2 : mot de passe trop court -> erreur, signup non appele", async () => {
    const { result } = renderHook(() => useRegisterForm());
    fillStep1Valid(result);
    act(() => result.current.submitStep1());
    act(() => {
      result.current.setPassword("court");
      result.current.setPasswordConfirm("court");
      result.current.setAcceptCharte(true);
    });
    await act(async () => {
      await result.current.submitStep2();
    });
    expect(result.current.error).toMatch(/8 caract/);
    expect(signupMock).not.toHaveBeenCalled();
  });

  test("etape 2 : charte non acceptee -> erreur", async () => {
    const { result } = renderHook(() => useRegisterForm());
    fillStep1Valid(result);
    act(() => result.current.submitStep1());
    act(() => {
      result.current.setPassword("motdepasse12");
      result.current.setPasswordConfirm("motdepasse12");
      result.current.setAcceptCharte(false);
    });
    await act(async () => {
      await result.current.submitStep2();
    });
    expect(result.current.error).toMatch(/charte/);
    expect(signupMock).not.toHaveBeenCalled();
  });

  test("etape 2 valide -> signup appele puis etape 3", async () => {
    signupMock.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useRegisterForm());
    fillStep1Valid(result);
    act(() => result.current.submitStep1());
    act(() => {
      result.current.setPassword("motdepasse12");
      result.current.setPasswordConfirm("motdepasse12");
      result.current.setAcceptCharte(true);
    });
    await act(async () => {
      await result.current.submitStep2();
    });
    expect(signupMock).toHaveBeenCalledWith(
      expect.objectContaining({ matricule: "M402100", email: "c.bernard@ghrmsa.fr" })
    );
    expect(result.current.step).toBe(3);
  });

  test("goBack : etape 2 -> etape 1 ; etape 1 -> onExit", () => {
    const { result } = renderHook(() => useRegisterForm());
    fillStep1Valid(result);
    act(() => result.current.submitStep1());
    expect(result.current.step).toBe(2);
    act(() => result.current.goBack(vi.fn()));
    expect(result.current.step).toBe(1);
    const onExit = vi.fn();
    act(() => result.current.goBack(onExit));
    expect(onExit).toHaveBeenCalled();
  });
});
