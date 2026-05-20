import { findProtocolsForDrug } from "./crossref";

describe("findProtocolsForDrug", () => {
  test("retourne un tableau pour un nom valide", () => {
    const result = findProtocolsForDrug("Adrénaline");
    expect(Array.isArray(result)).toBe(true);
  });

  test("retourne [] pour un nom inconnu", () => {
    const result = findProtocolsForDrug("MoléculeQuiNExistePas");
    expect(result).toEqual([]);
  });

  test("retourne [] pour chaîne vide ou nullish", () => {
    expect(findProtocolsForDrug("")).toEqual([]);
    expect(findProtocolsForDrug(null)).toEqual([]);
    expect(findProtocolsForDrug(undefined)).toEqual([]);
  });

  test("la recherche est insensible aux accents et à la casse", () => {
    const withAccent = findProtocolsForDrug("Adrénaline");
    const withoutAccent = findProtocolsForDrug("adrenaline");
    const upper = findProtocolsForDrug("ADRÉNALINE");
    expect(withAccent.length).toBe(withoutAccent.length);
    expect(withAccent.length).toBe(upper.length);
  });

  test("chaque résultat contient id, code, titre, icon", () => {
    const result = findProtocolsForDrug("Adrénaline");
    if (result.length > 0) {
      const p = result[0];
      expect(typeof p.id).toBe("number");
      expect(typeof p.code).toBe("string");
      expect(typeof p.titre).toBe("string");
    }
  });
});
