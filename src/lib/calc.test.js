import {
  isValidWeight,
  calcDose,
  ciSeverity,
  calcDebit,
  calcPrepThreshold,
  calcPrepSufentaTable,
  calcPrepPhases,
  calcPrepDoseKg,
} from "./calc";

// ════════════════════════════════════════════════════════════════
// isValidWeight
// ════════════════════════════════════════════════════════════════
describe("isValidWeight", () => {
  test.each([
    [3, true],   // nourrisson
    [10, true],
    [70, true],
    [300, true], // borne haute incluse
    [0, false],
    [-5, false],
    [301, false],
    ["", false],
    [null, false],
    [undefined, false],
    ["abc", false],
  ])("isValidWeight(%p) = %p", (input, expected) => {
    expect(isValidWeight(input)).toBe(expected);
  });
});

// ════════════════════════════════════════════════════════════════
// calcDose — parsing texte poso → dose calculée
// ════════════════════════════════════════════════════════════════
describe("calcDose", () => {
  test("dose simple mg/kg : 0,3 mg/kg pour 70 kg", () => {
    const r = calcDose("ISR : 0,3 mg/kg IV en 30-60 sec", 70);
    expect(r).toEqual({ value: "21 mg", capped: false });
  });

  test("dose en fourchette : 1-2,5 mg/kg pour 70 kg", () => {
    const r = calcDose("Induction : 1-2,5 mg/kg IV", 70);
    expect(r).toEqual({ value: "70–175 mg", capped: false });
  });

  test("accepte le point décimal aussi : 0.3 mg/kg pour 70 kg", () => {
    const r = calcDose("0.3 mg/kg IV", 70);
    expect(r).toEqual({ value: "21 mg", capped: false });
  });

  test("dose en µg/kg/min : 0,1 µg/kg/min pour 70 kg", () => {
    const r = calcDose("0,1 µg/kg/min", 70);
    expect(r).toEqual({ value: "7 µg/min", capped: false });
  });

  test("cap 'max X mg' déclenché : 1 mg/kg max 100 mg pour 120 kg", () => {
    const r = calcDose("1 mg/kg IV max 100 mg", 120);
    expect(r).toEqual({ value: "100 mg", capped: true });
  });

  test("cap 'max X mg' non-déclenché : 1 mg/kg max 100 mg pour 50 kg", () => {
    const r = calcDose("1 mg/kg IV max 100 mg", 50);
    expect(r).toEqual({ value: "50 mg", capped: false });
  });

  test("cap dont l'unité diffère est ignoré (ne s'applique pas)", () => {
    // cap exprimé en mL alors que la dose est en mg → cap ignoré
    const r = calcDose("2 mg/kg max 50 mL", 80);
    expect(r).toEqual({ value: "160 mg", capped: false });
  });

  test("texte sans pattern dose/kg → null", () => {
    expect(calcDose("Voies : VVP ou VVC", 70)).toBeNull();
  });

  test("poids invalide → null", () => {
    expect(calcDose("0,3 mg/kg", 0)).toBeNull();
    expect(calcDose("0,3 mg/kg", -5)).toBeNull();
    expect(calcDose("0,3 mg/kg", 400)).toBeNull(); // > 300
    expect(calcDose("0,3 mg/kg", "")).toBeNull();
  });

  test("dose en UI/kg : 70 UI/kg pour 80 kg", () => {
    const r = calcDose("Bolus 70 UI/kg", 80);
    expect(r).toEqual({ value: "5600 UI", capped: false });
  });
});

// ════════════════════════════════════════════════════════════════
// ciSeverity — classification absolue / relative / précaution
// ════════════════════════════════════════════════════════════════
describe("ciSeverity", () => {
  test("marqueur explicite 'absolue' prioritaire", () => {
    expect(ciSeverity("CI absolue : grossesse")).toBe("abs");
  });

  test("marqueur explicite 'relative' prioritaire", () => {
    expect(ciSeverity("CI relative : insuffisance hépatique sévère")).toBe("rel");
  });

  test("marqueur explicite 'précaution' prioritaire", () => {
    expect(ciSeverity("Précaution chez le sujet âgé")).toBe("prec");
  });

  test("allergie → absolue", () => {
    expect(ciSeverity("Allergie aux huiles de soja ou d'œuf")).toBe("abs");
  });

  test("hypersensibilité → absolue", () => {
    expect(ciSeverity("Hypersensibilité au produit")).toBe("abs");
  });

  test("myasthénie → absolue", () => {
    expect(ciSeverity("Myasthénie")).toBe("abs");
  });

  test("insuffisance surrénalienne → absolue", () => {
    expect(ciSeverity("Insuffisance surrénalienne connue")).toBe("abs");
  });

  test("hypotension → relative", () => {
    expect(ciSeverity("Hypotension non corrigée")).toBe("rel");
  });

  test("asthme → relative", () => {
    expect(ciSeverity("Asthme sévère")).toBe("rel");
  });

  test("adapter la dose → précaution", () => {
    expect(ciSeverity("Adapter la dose chez l'insuffisant rénal modéré")).toBe("prec");
  });

  test("texte non clinique → null", () => {
    expect(ciSeverity("Aucune particulière")).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// calcDebit — débit PSE en mL/h (cas réels tirés de pse.js)
// ════════════════════════════════════════════════════════════════
describe("calcDebit", () => {
  // ── µg/kg/min : adrénaline, noradrénaline, dobutamine ─────
  test("Adrénaline (id 13) — 0,1 µg/kg/min × 70 kg → 2,1 mL/h", () => {
    const pse = { conc: 200, unite: "µg/kg/min" };
    expect(calcDebit(pse, 0.1, 70)).toBe(2.1);
  });

  test("Adrénaline pédiatrique — 0,1 µg/kg/min × 10 kg → 0,3 mL/h", () => {
    const pse = { conc: 200, unite: "µg/kg/min" };
    expect(calcDebit(pse, 0.1, 10)).toBe(0.3);
  });

  test("Noradrénaline (id 17) — 0,1 µg/kg/min × 70 kg → 1,26 mL/h", () => {
    const pse = { conc: 333, unite: "µg/kg/min" };
    expect(calcDebit(pse, 0.1, 70)).toBe(1.26);
  });

  test("Dobutamine (id 15) — 5 µg/kg/min × 70 kg → 4,2 mL/h", () => {
    const pse = { conc: 5000, unite: "µg/kg/min" };
    expect(calcDebit(pse, 5, 70)).toBe(4.2);
  });

  // ── mg/kg/h : propofol, midazolam, kétamine, morphine ────
  test("Midazolam (id 3) — 0,1 mg/kg/h × 70 kg → 7 mL/h", () => {
    const pse = { conc: 1, unite: "mg/kg/h" };
    expect(calcDebit(pse, 0.1, 70)).toBe(7);
  });

  test("Propofol (id 1) — 2 mg/kg/h × 70 kg → 14 mL/h", () => {
    const pse = { conc: 10, unite: "mg/kg/h" };
    expect(calcDebit(pse, 2, 70)).toBe(14);
  });

  // ── factor (Sufentanil) : kg ignoré ──────────────────────
  test("Sufentanil (id 5) — factor=10 — 0,5 µg/kg/h → 5 mL/h (poids ignoré)", () => {
    const pse = { conc: 1, unite: "µg/kg/h", factor: 10 };
    expect(calcDebit(pse, 0.5, 70)).toBe(5);
    // poids absent : factor → toujours OK
    expect(calcDebit(pse, 1, null)).toBe(10);
  });

  // ── mg/h sans facteur poids (Anexate) ────────────────────
  test("Anexate (id 29) — mg/h — 0,2 mg/h → 2 mL/h (poids ignoré)", () => {
    const pse = { conc: 0.1, unite: "mg/h" };
    expect(calcDebit(pse, 0.2, null)).toBe(2);
    expect(calcDebit(pse, 0.5, null)).toBe(5);
  });

  // ── UI/kg/h + UI/24h (Héparine) ──────────────────────────
  test("Héparine (id 42) — UI/kg/h — 20 UI/kg/h × 70 kg → 3,36 mL/h", () => {
    const pse = { conc: 416.7, unite: "UI/kg/h" };
    expect(calcDebit(pse, 20, 70)).toBe(3.36);
  });

  test("Héparine extra — UI/24h — 20 000 UI/24h → 2 mL/h (poids ignoré)", () => {
    const pse = { conc: 416.7, unite: "UI/24h" };
    expect(calcDebit(pse, 20000, null)).toBe(2);
  });

  // ── Cas dégénérés ────────────────────────────────────────
  test("dose nulle ou négative → null", () => {
    const pse = { conc: 200, unite: "µg/kg/min" };
    expect(calcDebit(pse, 0, 70)).toBeNull();
    expect(calcDebit(pse, -1, 70)).toBeNull();
    expect(calcDebit(pse, "", 70)).toBeNull();
  });

  test("poids manquant pour unité poids-dépendante → null", () => {
    const pse = { conc: 200, unite: "µg/kg/min" };
    expect(calcDebit(pse, 0.1, 0)).toBeNull();
    expect(calcDebit(pse, 0.1, null)).toBeNull();
    expect(calcDebit(pse, 0.1, "")).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// calcPrepThreshold — Anexate (saisie produit final)
// ════════════════════════════════════════════════════════════════
describe("calcPrepThreshold", () => {
  const prep = {
    dose_threshold: 2,
    amp_low: 4, vol_low: 20,
    amp_high: 8, vol_high: 40,
  };

  test("dose < seuil (1 mg) → 4 ampoules / 20 mL, injecter 10 mL", () => {
    expect(calcPrepThreshold(prep, 1)).toEqual({
      pf: 1, ampCount: 4, vol: 20, injectMl: 10,
    });
  });

  test("dose = seuil (2 mg) → bascule en 'high'", () => {
    expect(calcPrepThreshold(prep, 2)).toEqual({
      pf: 2, ampCount: 8, vol: 40, injectMl: 20,
    });
  });

  test("dose > seuil (3,5 mg) → 8 ampoules / 40 mL, injecter 35 mL", () => {
    expect(calcPrepThreshold(prep, 3.5)).toEqual({
      pf: 3.5, ampCount: 8, vol: 40, injectMl: 35,
    });
  });

  test("produit final invalide → null", () => {
    expect(calcPrepThreshold(prep, 0)).toBeNull();
    expect(calcPrepThreshold(prep, -1)).toBeNull();
    expect(calcPrepThreshold(prep, "")).toBeNull();
  });

  test("prep sans dose_threshold → null", () => {
    expect(calcPrepThreshold({}, 2)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// calcPrepSufentaTable — Vi/Vf par tranche de poids
// ════════════════════════════════════════════════════════════════
describe("calcPrepSufentaTable", () => {
  test("nourrisson 8 kg → Vi=0,5 mL, Vf=31 mL", () => {
    expect(calcPrepSufentaTable(8)).toEqual({ kg: 8, vi: 0.5, vf: 31 });
  });

  test("enfant 20 kg → Vi=1 mL, Vf=25 mL", () => {
    expect(calcPrepSufentaTable(20)).toEqual({ kg: 20, vi: 1, vf: 25 });
  });

  test("ado 40 kg → Vi=2 mL, Vf=25 mL", () => {
    expect(calcPrepSufentaTable(40)).toEqual({ kg: 40, vi: 2, vf: 25 });
  });

  test("adulte 70 kg → Vi=5 mL, Vf=36 mL", () => {
    expect(calcPrepSufentaTable(70)).toEqual({ kg: 70, vi: 5, vf: 36 });
  });

  test("borne basse de tranche : 10 kg → Vi=1 (et non 0,5)", () => {
    expect(calcPrepSufentaTable(10).vi).toBe(1);
  });

  test("poids invalide → null", () => {
    expect(calcPrepSufentaTable(0)).toBeNull();
    expect(calcPrepSufentaTable(400)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// calcPrepPhases — Hidonac (3 phases)
// ════════════════════════════════════════════════════════════════
describe("calcPrepPhases", () => {
  const prep = {
    conc_produit: 200,
    phases: [
      { label: "Phase 1", dose_kg: 150, duree: "60 min", solvant_vol: 500 },
      { label: "Phase 2", dose_kg: 50,  duree: "4h",     solvant_vol: 500 },
      { label: "Phase 3", dose_kg: 100, duree: "16h",    solvant_vol: 1000 },
    ],
  };

  test("70 kg : doses 10500 / 3500 / 7000 mg, volumes 52,5 / 17,5 / 35 mL", () => {
    const r = calcPrepPhases(prep, 70);
    expect(r).toHaveLength(3);
    expect(r[0]).toEqual({ label: "Phase 1", duree: "60 min", dose: 10500, vol: 52.5, solvantVol: 500 });
    expect(r[1]).toEqual({ label: "Phase 2", duree: "4h",     dose: 3500,  vol: 17.5, solvantVol: 500 });
    expect(r[2]).toEqual({ label: "Phase 3", duree: "16h",    dose: 7000,  vol: 35,   solvantVol: 1000 });
  });

  test("sans conc_produit → vol = null", () => {
    const r = calcPrepPhases({ phases: prep.phases }, 70);
    expect(r[0].vol).toBeNull();
  });

  test("poids invalide → null", () => {
    expect(calcPrepPhases(prep, 0)).toBeNull();
    expect(calcPrepPhases(prep, "")).toBeNull();
  });

  test("prep sans phases → null", () => {
    expect(calcPrepPhases({ conc_produit: 200 }, 70)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// calcPrepDoseKg — propofol-like (dose_kg + dose_max_kg)
// ════════════════════════════════════════════════════════════════
describe("calcPrepDoseKg", () => {
  test("Propofol — 1,5–2,5 mg/kg × 70 kg → 105–175 mg, 10,5–17,5 mL", () => {
    const prep = { dose_kg: 1.5, dose_max_kg: 2.5, conc_produit: 10, unite: "mg" };
    expect(calcPrepDoseKg(prep, 70)).toEqual({
      kg: 70, dose: 105, doseMax: 175, volMin: 10.5, volMax: 17.5, unite: "mg",
    });
  });

  test("dose unique (sans dose_max_kg)", () => {
    const prep = { dose_kg: 1, conc_produit: 10, unite: "mg" };
    expect(calcPrepDoseKg(prep, 70)).toEqual({
      kg: 70, dose: 70, doseMax: null, volMin: 7, volMax: null, unite: "mg",
    });
  });

  test("sans conc_produit → null (volume non calculable)", () => {
    expect(calcPrepDoseKg({ dose_kg: 1.5 }, 70)).toBeNull();
  });

  test("sans dose_kg → null", () => {
    expect(calcPrepDoseKg({ conc_produit: 10 }, 70)).toBeNull();
  });

  test("poids invalide → null", () => {
    const prep = { dose_kg: 1.5, conc_produit: 10, unite: "mg" };
    expect(calcPrepDoseKg(prep, 0)).toBeNull();
    expect(calcPrepDoseKg(prep, 400)).toBeNull();
  });
});
