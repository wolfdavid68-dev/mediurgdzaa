import { levenshtein, fuzzyIncludes } from "./fuzzy";

describe("levenshtein", () => {
  test("strings identiques → distance 0", () => {
    expect(levenshtein("amiodarone", "amiodarone")).toBe(0);
  });

  test("chaîne vide vs chaîne", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });

  test("substitution simple", () => {
    expect(levenshtein("kitten", "sitten")).toBe(1);
  });

  test("insertion / suppression", () => {
    expect(levenshtein("adrenalin", "adrenaline")).toBe(1);
    expect(levenshtein("amiodaron", "amiodarone")).toBe(1);
  });

  test("erreur classique : permutation de lettres", () => {
    // amidaron → amiodarone : 2 modifs (insert o, insert e)
    expect(levenshtein("amidaron", "amiodarone")).toBe(2);
  });
});

describe("fuzzyIncludes", () => {
  test("requête vide → match (filtre désactivé)", () => {
    expect(fuzzyIncludes("adrenaline", "")).toBe(true);
  });

  test("substring exact → match (cas commun, rapide)", () => {
    expect(fuzzyIncludes("amiodarone 150 mg", "amio")).toBe(true);
    expect(fuzzyIncludes("amiodarone 150 mg", "mg")).toBe(true);
  });

  test("typo 1 char sur requête ≥ 4 chars → match", () => {
    expect(fuzzyIncludes("adrenaline tartrate", "adrenalin")).toBe(true); // missing final e
    expect(fuzzyIncludes("amiodarone", "amidaron")).toBe(true); // 2 typos, q.length=8 → tol=2
  });

  test("typo 2 chars sur requête ≥ 6 chars → match", () => {
    expect(fuzzyIncludes("atropine sulfate", "atrropin")).toBe(true); // q=8, 2 erreurs
  });

  test("requête trop courte (<4) → pas de fuzzy, substring strict", () => {
    expect(fuzzyIncludes("adrenaline", "adr")).toBe(true); // substring OK
    expect(fuzzyIncludes("adrenaline", "afr")).toBe(false); // pas de fuzzy < 4
  });

  test("mot trop différent → no match", () => {
    expect(fuzzyIncludes("paracetamol", "amiodarone")).toBe(false);
  });

  test("séparateurs respectés : tirets et ponctuation découpent en mots", () => {
    expect(fuzzyIncludes("kit-isr · 1mg/kg", "isrr")).toBe(true); // typo sur "isr"
  });
});
