import { normalize } from "./normalize";

describe("normalize — comparaison insensible casse + diacritiques", () => {
  test("minuscule la chaîne", () => {
    expect(normalize("ABCDef")).toBe("abcdef");
  });

  test("supprime les accents français", () => {
    expect(normalize("Adrénaline")).toBe("adrenaline");
    expect(normalize("Méthylprednisolone")).toBe("methylprednisolone");
    expect(normalize("Étomidate")).toBe("etomidate");
    expect(normalize("Sufentanil® 5 µg")).toBe("sufentanil® 5 µg");
  });

  test("le ç et autres diacritiques composés", () => {
    expect(normalize("français")).toBe("francais");
    expect(normalize("Noël")).toBe("noel");
  });

  test("conserve les caractères non latins (µ, ®, %, espaces)", () => {
    expect(normalize("µg/kg/min")).toBe("µg/kg/min");
    expect(normalize("Cyanokit® 5 g")).toBe("cyanokit® 5 g");
  });

  test("idempotent : normalize(normalize(s)) === normalize(s)", () => {
    const inputs = ["Adrénaline", "MÉTHYL", "Énoxaparine"];
    inputs.forEach(s => {
      expect(normalize(normalize(s))).toBe(normalize(s));
    });
  });

  test("entrées vides / falsy → chaîne vide", () => {
    expect(normalize("")).toBe("");
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
  });

  test("recherche : 'adre' contient le préfixe d'une drogue normalisée", () => {
    // C'est exactement le cas d'usage d'App.js et data.test.js
    expect(normalize("Adrénaline").includes(normalize("adre"))).toBe(true);
    expect(normalize("Solumédrol").includes(normalize("solu"))).toBe(true);
  });
});
