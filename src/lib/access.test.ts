import { describe, expect, test } from "vitest";
import { getPreviewAccessMode } from "./access";

describe("getPreviewAccessMode", () => {
  test("hors preview, tout le monde garde l'accès complet", () => {
    expect(getPreviewAccessMode({ fonction: "Médecin urgentiste" }, false)).toBe("full");
    expect(getPreviewAccessMode({ fonction: "Aide-soignant" }, false)).toBe("full");
  });

  test("médecin, interne et pharmacienne voient seulement les médicaments en preview", () => {
    expect(getPreviewAccessMode({ fonction: "Médecin urgentiste" }, true)).toBe("medicaments");
    expect(getPreviewAccessMode({ fonction: "Interne" }, true)).toBe("medicaments");
    expect(getPreviewAccessMode({ fonction: "Pharmacienne" }, true)).toBe("medicaments");
  });

  test("AS et étudiant AS voient seulement le tutorat en preview", () => {
    expect(getPreviewAccessMode({ fonction: "Aide-soignant" }, true)).toBe("tutorat");
    expect(getPreviewAccessMode({ fonction: "Étudiant aide-soignant" }, true)).toBe("tutorat");
    expect(getPreviewAccessMode({ fonction: "Étudiant AS" }, true)).toBe("tutorat");
  });

  test("les autres fonctions gardent l'accès complet en preview", () => {
    expect(getPreviewAccessMode({ fonction: "Infirmier" }, true)).toBe("full");
  });
});
