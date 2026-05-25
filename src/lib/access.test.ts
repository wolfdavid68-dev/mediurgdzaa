import { describe, expect, test } from "vitest";
import { getPreviewAccessMode } from "./access";

describe("getPreviewAccessMode", () => {
  test("hors preview, tout le monde garde l'acces complet", () => {
    expect(getPreviewAccessMode({ fonction: "Medecin urgentiste" }, false)).toBe("full");
    expect(getPreviewAccessMode({ fonction: "Aide-soignant" }, false)).toBe("full");
  });

  test("medecin, interne et pharmacienne voient seulement les medicaments en preview", () => {
    expect(getPreviewAccessMode({ fonction: "Medecin urgentiste" }, true)).toBe("medicaments");
    expect(getPreviewAccessMode({ fonction: "Interne" }, true)).toBe("medicaments");
    expect(getPreviewAccessMode({ fonction: "Pharmacienne" }, true)).toBe("medicaments");
  });

  test("AS et etudiants voient seulement le tutorat en preview", () => {
    expect(getPreviewAccessMode({ fonction: "Aide-soignant" }, true)).toBe("tutorat");
    expect(getPreviewAccessMode({ fonction: "Etudiant aide-soignant" }, true)).toBe("tutorat");
    expect(getPreviewAccessMode({ fonction: "Etudiant AS" }, true)).toBe("tutorat");
    expect(getPreviewAccessMode({ fonction: "Etudiant infirmier" }, true)).toBe("tutorat");
    expect(getPreviewAccessMode({ fonction: "Etudiant IDE" }, true)).toBe("tutorat");
  });

  test("les IDE gardent l'acces complet en preview", () => {
    expect(getPreviewAccessMode({ fonction: "Infirmier" }, true)).toBe("full");
    expect(getPreviewAccessMode({ fonction: "IDE" }, true)).toBe("full");
  });
});
