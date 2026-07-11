import { computeEffectivePse, resolvePse } from "./PseBlock.parts";
import type { PseEntry } from "./PseBlock.parts";
import type { PseLookupByDrugId, PsePreviewByDrugId } from "../types/data";

// Tests des helpers purs du bloc PSE : merge de l'overlay preview et calcul du
// mode « dose efficace ». (Le calcul de débit classique calcDebit /
// calcDoseFromRate est couvert dans lib/calc.test.)

const entry = (over: Partial<PseEntry>): PseEntry =>
  ({ unite: "mg/h", conc: 1, min: 0, max: 100, steps: [], ...over }) as PseEntry;

describe("resolvePse", () => {
  const base: PseLookupByDrugId = { 1: entry({ conc: 10 }), 2: entry({ conc: 20 }) };

  test("sans overlay → renvoie la table de base inchangée", () => {
    expect(resolvePse(base, null)).toBe(base);
  });

  test("overlay : remplace une entrée existante et en ajoute une nouvelle", () => {
    const preview: PsePreviewByDrugId = { 2: entry({ conc: 99 }), 3: entry({ conc: 30 }) };
    const merged = resolvePse(base, preview);
    expect(merged[1]?.conc).toBe(10); // inchangé
    expect(merged[2]?.conc).toBe(99); // remplacé par l'overlay
    expect(merged[3]?.conc).toBe(30); // ajouté
  });

  test("ne mute pas la table de base", () => {
    resolvePse(base, { 2: entry({ conc: 99 }) });
    expect(base[2]?.conc).toBe(20);
  });

  test("une entrée undefined de l’overlay masque explicitement le PSE public", () => {
    const merged = resolvePse(base, { 2: undefined });
    expect(merged[1]?.conc).toBe(10);
    expect(merged[2]).toBeUndefined();
  });
});

describe("computeEffectivePse", () => {
  const effEntry = (over: Partial<PseEntry> = {}) =>
    entry({ inputMode: "effectiveDose", conc: 2, effectiveInputConc: 10, ...over });

  test("hors mode dose efficace → null", () => {
    expect(computeEffectivePse(entry({ inputMode: "mlh" }), "4")).toBeNull();
    expect(computeEffectivePse(entry({}), "4")).toBeNull();
  });

  test("dose efficace : dose, dose horaire (× fraction) et débit (÷ conc)", () => {
    // input 4 × conc efficace 10 = 40 ; × 2/3 = 26,667 ; / 2 = 13,33
    const res = computeEffectivePse(effEntry(), "4");
    expect(res?.dose).toBe(40);
    expect(res?.hourlyDose).toBe(26.667);
    expect(res?.debit).toBe(13.33);
  });

  test("fraction explicite respectée", () => {
    const res = computeEffectivePse(effEntry({ effectiveFraction: 0.5 }), "4");
    expect(res?.hourlyDose).toBe(20); // 40 × 0,5
    expect(res?.debit).toBe(10); // 20 / 2
  });

  test("effectiveInputConc par défaut = 1", () => {
    const res = computeEffectivePse(
      entry({ inputMode: "effectiveDose", conc: 3, effectiveFraction: 1 }),
      "9"
    );
    expect(res?.dose).toBe(9); // 9 × 1
    expect(res?.debit).toBe(3); // (9 × 1) / 3
  });

  test("saisie invalide (≤ 0 ou non numérique) → null", () => {
    expect(computeEffectivePse(effEntry(), "0")).toBeNull();
    expect(computeEffectivePse(effEntry(), "-5")).toBeNull();
    expect(computeEffectivePse(effEntry(), "")).toBeNull();
    expect(computeEffectivePse(effEntry(), "abc")).toBeNull();
  });
});
