import {
  EMAIL_DOMAIN,
  hasAdminAccess,
  isAsFunction,
  isCadreFunction,
  isIdeFunction,
  isMedicalFunction,
  isNetworkError,
  isStudentFunction,
  isValidEmail,
  isValidEmailForFunction,
  isValidMatricule,
  isValidPassword,
  MATRICULE_REGEX,
  passwordStrength,
} from "./auth";

describe("isNetworkError", () => {
  test("messages réseau → true", () => {
    expect(isNetworkError(new Error("TypeError: Failed to fetch"))).toBe(true);
    expect(isNetworkError(new Error("NetworkError when attempting to fetch resource"))).toBe(true);
    expect(isNetworkError(new Error("Load failed"))).toBe(true);
    expect(isNetworkError("request timeout")).toBe(true);
    expect(isNetworkError({ message: "fetch failed" })).toBe(true);
  });

  test("erreurs non réseau → false", () => {
    expect(isNetworkError(new Error("row not found"))).toBe(false);
    expect(isNetworkError({ message: "permission denied" })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe("isValidMatricule", () => {
  test("M + 6 chiffres → valide", () => {
    expect(isValidMatricule("M402100")).toBe(true);
    expect(isValidMatricule("M000000")).toBe(true);
    expect(isValidMatricule("M999999")).toBe(true);
  });

  test("autres formats → invalide", () => {
    expect(isValidMatricule("402100")).toBe(false); // sans M
    expect(isValidMatricule("M40210")).toBe(false); // 5 chiffres
    expect(isValidMatricule("M4021000")).toBe(false); // 7 chiffres
    expect(isValidMatricule("m402100")).toBe(false); // m minuscule
    expect(isValidMatricule("M40210A")).toBe(false); // lettre dans les chiffres
    expect(isValidMatricule("")).toBe(false);
    expect(isValidMatricule("MABCDEF")).toBe(false);
  });

  test("MATRICULE_REGEX exporté pour réutilisation", () => {
    expect(MATRICULE_REGEX).toBeInstanceOf(RegExp);
    expect(MATRICULE_REGEX.test("M123456")).toBe(true);
  });
});

describe("isValidEmail", () => {
  test("email valide @ghrmsa.fr → ok", () => {
    expect(isValidEmail("david.wolf@ghrmsa.fr")).toBe(true);
    expect(isValidEmail("a.b@ghrmsa.fr")).toBe(true);
    expect(isValidEmail("test@GHRMSA.FR")).toBe(true); // majuscules
  });

  test("autre domaine → invalide", () => {
    expect(isValidEmail("david@gmail.com")).toBe(false);
    expect(isValidEmail("david@chu-mulhouse.fr")).toBe(false);
  });

  test("format invalide → invalide", () => {
    expect(isValidEmail("pas-un-email")).toBe(false);
    expect(isValidEmail("@ghrmsa.fr")).toBe(false);
    expect(isValidEmail("david@")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  test("EMAIL_DOMAIN exporté", () => {
    expect(EMAIL_DOMAIN).toBe("@ghrmsa.fr");
  });
});

describe("isValidEmailForFunction", () => {
  test("personnel hors étudiants → domaine @ghrmsa.fr requis", () => {
    expect(isValidEmailForFunction("david.wolf@ghrmsa.fr", "Infirmier")).toBe(true);
    expect(isValidEmailForFunction("david.wolf@gmail.com", "Infirmier")).toBe(false);
  });

  test("étudiants IDE/AS → autre domaine autorisé", () => {
    expect(isStudentFunction("Étudiant infirmier")).toBe(true);
    expect(isStudentFunction("Etudiant IDE")).toBe(true);
    expect(isStudentFunction("Étudiant AS")).toBe(true);
    expect(isValidEmailForFunction("lea.stage@gmail.com", "Étudiant infirmier")).toBe(true);
    expect(isValidEmailForFunction("ines.stage@yahoo.fr", "Étudiant AS")).toBe(true);
  });

  test("format email invalide → refusé même pour étudiant", () => {
    expect(isValidEmailForFunction("pas-un-email", "Étudiant AS")).toBe(false);
  });
});

describe("fonction profile helpers", () => {
  test("classifie le metier depuis fonction, pas depuis role", () => {
    expect(isMedicalFunction("Médecin urgentiste")).toBe(true);
    expect(isMedicalFunction("Interne")).toBe(true);
    expect(isIdeFunction("Infirmier")).toBe(true);
    expect(isIdeFunction("IDE")).toBe(true);
    expect(isAsFunction("Aide-soignant")).toBe(true);
    expect(isStudentFunction("Étudiant infirmier")).toBe(true);
    expect(isStudentFunction("Étudiant AS")).toBe(true);
    expect(isCadreFunction("Cadre de santé")).toBe(true);
  });

  test("l'acces admin reste possible par role admin ou fonction cadre", () => {
    expect(hasAdminAccess({ role: "admin", fonction: "Infirmier" })).toBe(true);
    expect(hasAdminAccess({ role: "user", fonction: "Cadre de santé" })).toBe(true);
    expect(hasAdminAccess({ role: "user", fonction: "Infirmier" })).toBe(false);
  });
});

describe("isValidPassword", () => {
  test("≥ 8 caractères → ok", () => {
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("MotDePasseSolide!")).toBe(true);
  });

  test("< 8 caractères → invalide", () => {
    expect(isValidPassword("1234567")).toBe(false);
    expect(isValidPassword("")).toBe(false);
    expect(isValidPassword("court")).toBe(false);
  });
});

describe("passwordStrength", () => {
  test("vide → 0", () => {
    expect(passwordStrength("")).toBe(0);
  });

  test("longueur seule (≥8) → 1", () => {
    expect(passwordStrength("12345678")).toBe(2); // longueur ≥8 + chiffre
  });

  test("longueur ≥8 + majuscule + chiffre + spécial → 4", () => {
    expect(passwordStrength("Abcdef1!")).toBe(4);
  });

  test("longueur ≥12 + tous critères → 5 (max)", () => {
    expect(passwordStrength("AbcdefGhij1!")).toBe(5);
  });

  test("uniquement minuscules courtes → 0", () => {
    expect(passwordStrength("abc")).toBe(0);
  });

  test("uniquement chiffres ≥12 → longueur8 + chiffre + longueur12 = 3", () => {
    expect(passwordStrength("123456789012")).toBe(3);
  });
});
