import { describe, expect, test } from "vitest";
import { getPreviewAccessMode } from "./access";

describe("getPreviewAccessMode", () => {
  test("hors preview, les soignants autorisés gardent l'accès complet", () => {
    expect(getPreviewAccessMode({ fonction: "Medecin urgentiste" }, false)).toBe("full");
    expect(getPreviewAccessMode({ fonction: "Infirmier" }, false)).toBe("full");
  });

  test("hors preview, AS et etudiants AS ouvrent le tutorat en main", () => {
    expect(getPreviewAccessMode({ fonction: "Aide-soignant" }, false)).toBe("tutorat");
    expect(getPreviewAccessMode({ fonction: "Etudiant aide-soignant" }, false)).toBe("tutorat");
    expect(getPreviewAccessMode({ fonction: "Etudiant AS" }, false)).toBe("tutorat");
  });

  test("medecin, interne et pharmacienne voient seulement les medicaments en preview", () => {
    expect(getPreviewAccessMode({ fonction: "Medecin urgentiste" }, true)).toBe("medicaments");
    expect(getPreviewAccessMode({ fonction: "Interne" }, true)).toBe("medicaments");
    expect(getPreviewAccessMode({ fonction: "Pharmacienne" }, true)).toBe("medicaments");
  });

  test("AS et etudiants AS voient seulement le tutorat en preview", () => {
    expect(getPreviewAccessMode({ fonction: "Aide-soignant" }, true)).toBe("tutorat");
    expect(getPreviewAccessMode({ fonction: "Etudiant aide-soignant" }, true)).toBe("tutorat");
    expect(getPreviewAccessMode({ fonction: "Etudiant AS" }, true)).toBe("tutorat");
    expect(getPreviewAccessMode({ fonction: "Etudiant infirmier" }, true)).toBe("full");
    expect(getPreviewAccessMode({ fonction: "Etudiant IDE" }, true)).toBe("full");
  });

  test("les IDE gardent l'acces complet en preview", () => {
    expect(getPreviewAccessMode({ fonction: "Infirmier" }, true)).toBe("full");
    expect(getPreviewAccessMode({ fonction: "IDE" }, true)).toBe("full");
  });
});
