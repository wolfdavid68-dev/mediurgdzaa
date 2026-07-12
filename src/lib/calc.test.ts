import {
  isValidWeight,
  calcDose,
  ciSeverity,
  calcDebit,
  calcDoseFromRate,
  calcPrepThreshold,
  calcPrepSufentaTable,
  calcPrepNoradTable,
  calcPrepAdrenalineTable,
  calcPrepDobutamineTable,
  calcPrepIsuprelTable,
  calcPrepOctaplexInr,
  calcPrepSufentaIntranasal,
  calcPrepPhases,
  calcPrepDoseKg,
  calcPedTable,
  calcDoseLibre,
  validateDoseValue,
} from "./calc";

// ════════════════════════════════════════════════════════════════
// isValidWeight
// ════════════════════════════════════════════════════════════════
describe("isValidWeight", () => {
  test.each([
    [3, true], // nourrisson
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
    expect(isValidWeight(input as string | number)).toBe(expected);
  });
});

// ════════════════════════════════════════════════════════════════
// calcDose — parsing texte poso → dose calculée
// ════════════════════════════════════════════════════════════════
describe("calcDose", () => {
  test("dose simple mg/kg : 0,3 mg/kg pour 70 kg", () => {
    const r = calcDose("ISR : 0,3 mg/kg IV en 30-60 sec", 70);
    expect(r).toEqual({ value: "21 mg", capped: false, validation: "ok" });
  });

  test("dose en fourchette : 1-2,5 mg/kg pour 70 kg", () => {
    const r = calcDose("Induction : 1-2,5 mg/kg IV", 70);
    expect(r).toEqual({ value: "70–175 mg", capped: false, validation: "ok" });
  });

  test("accepte le point décimal aussi : 0.3 mg/kg pour 70 kg", () => {
    const r = calcDose("0.3 mg/kg IV", 70);
    expect(r).toEqual({ value: "21 mg", capped: false, validation: "ok" });
  });

  test("dose en µg/kg/min : 0,1 µg/kg/min pour 70 kg", () => {
    const r = calcDose("0,1 µg/kg/min", 70);
    expect(r).toEqual({ value: "7 µg/min", capped: false, validation: "ok" });
  });

  test("cap 'max X mg' déclenché : 1 mg/kg max 100 mg pour 120 kg", () => {
    const r = calcDose("1 mg/kg IV max 100 mg", 120);
    expect(r).toEqual({ value: "100 mg", capped: true, validation: "ok" });
  });

  test("cap 'max X mg' non-déclenché : 1 mg/kg max 100 mg pour 50 kg", () => {
    const r = calcDose("1 mg/kg IV max 100 mg", 50);
    expect(r).toEqual({ value: "50 mg", capped: false, validation: "ok" });
  });

  test("cap dont l'unité diffère est ignoré (ne s'applique pas)", () => {
    // cap exprimé en mL alors que la dose est en mg → cap ignoré
    const r = calcDose("2 mg/kg max 50 mL", 80);
    expect(r).toEqual({ value: "160 mg", capped: false, validation: "ok" });
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
    expect(r).toEqual({ value: "5600 UI", capped: false, validation: "ok" });
  });

  test("dose en gouttes/kg prioritaire sur l'équivalence mg/kg", () => {
    const r = calcDose("Per os : 15 gouttes/kg (= 0,75 mg/kg) — dose max 60 gouttes", 30);
    expect(r).toEqual({ value: "60 gouttes", capped: true, validation: "ok" });
  });
});

// ════════════════════════════════════════════════════════════════
// validateDoseValue — détection des doses aberrantes
// ════════════════════════════════════════════════════════════════
describe("validateDoseValue", () => {
  test("dose plausible mg → ok", () => {
    expect(validateDoseValue(100, "mg")).toBe("ok");
    expect(validateDoseValue(500, "mg")).toBe("ok");
  });

  test("dose négative → danger", () => {
    expect(validateDoseValue(-1, "mg")).toBe("danger");
  });

  test("dose absurde (typo de virgule) → danger", () => {
    // Ex: 25 mg au lieu de 0,25 → ×100 → en pédiatrie sur poso 25 mg/kg : 25 × 70 = 1750
    // OK. Mais si on confond unité (mg vs µg) ou place mal virgule → 51000 mg
    expect(validateDoseValue(51000, "mg")).toBe("danger"); // > 50g d'une drogue IV
    expect(validateDoseValue(60, "g")).toBe("danger"); // 60 g d'une drogue
  });

  test("NaN / valeur non finie → danger", () => {
    expect(validateDoseValue(NaN, "mg")).toBe("danger");
    expect(validateDoseValue(Infinity, "mg")).toBe("danger");
  });

  test("unité inconnue → ok par défaut (pas de seuil défini)", () => {
    expect(validateDoseValue(999999, "comprimé")).toBe("ok");
  });

  test("mL et ml traités pareil", () => {
    expect(validateDoseValue(1500, "ml")).toBe("danger");
    expect(validateDoseValue(1500, "mL")).toBe("danger");
  });
});

describe("calcDose — validation intégrée", () => {
  test("dose normale → validation ok", () => {
    const r = calcDose("1 mg/kg", 70);
    expect(r?.validation).toBe("ok");
  });

  test("dose absurde dans la data (50 mg/kg au lieu de 0,5) sur 80 kg → danger", () => {
    // 50 mg/kg × 80 kg = 4000 mg — pas encore aberrant
    // Mais 700 mg/kg (erreur grossière) × 80 = 56000 mg → danger
    const r = calcDose("700 mg/kg IV", 80);
    expect(r?.validation).toBe("danger");
  });

  test("incohérence min > max dans la data → danger explicite", () => {
    const r = calcDose("5-1 mg/kg IV", 70);
    expect(r?.validation).toBe("danger");
    expect(r?.value).toContain("incohérent");
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

  // ── mL/kg/min + cap maxMlH (Octaplex) ────────────────────
  test("Octaplex (id 73) — mL/kg/min — 0,12 × 50 kg → 360 mL/h (sous cap)", () => {
    const pse = { conc: 1, unite: "mL/kg/min", maxMlH: 480 };
    expect(calcDebit(pse, 0.12, 50)).toBe(360);
  });

  test("Octaplex — 0,12 × 70 kg → 480 mL/h plafonné (8,4 mL/min → 8 mL/min)", () => {
    const pse = { conc: 1, unite: "mL/kg/min", maxMlH: 480 };
    // 0,12 × 70 × 60 = 504 mL/h non plafonné → 480 mL/h plafonné
    expect(calcDebit(pse, 0.12, 70)).toBe(480);
  });

  test("Octaplex — débit faible 0,05 × 60 kg → 180 mL/h (sous cap)", () => {
    const pse = { conc: 1, unite: "mL/kg/min", maxMlH: 480 };
    expect(calcDebit(pse, 0.05, 60)).toBe(180);
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
// calcDoseFromRate — inverse de calcDebit (saisie mL/h → dose)
// ════════════════════════════════════════════════════════════════
describe("calcDoseFromRate", () => {
  test("Adrénaline 200 µg/mL — 2,1 mL/h × 70 kg → 0,1 µg/kg/min", () => {
    const pse = { conc: 200, unite: "µg/kg/min" };
    expect(calcDoseFromRate(pse, 2.1, 70)).toBe(0.1);
  });

  test("conc 1000 µg/mL — 2,1 mL/h × 70 kg → 0,5 µg/kg/min", () => {
    const pse = { conc: 1000, unite: "µg/kg/min" };
    expect(calcDoseFromRate(pse, 2.1, 70)).toBe(0.5);
  });

  test("Noradrénaline 333 µg/mL — 1,26 mL/h × 70 kg → ≈0,1 µg/kg/min", () => {
    const pse = { conc: 333, unite: "µg/kg/min" };
    expect(calcDoseFromRate(pse, 1.26, 70)).toBeCloseTo(0.1, 2);
  });

  test("Sufentanil 5 µg/mL — µg/kg/h — 1 mL/h × 70 kg → 0,071 µg/kg/h", () => {
    const pse = { conc: 5, unite: "µg/kg/h" };
    expect(calcDoseFromRate(pse, 1, 70)).toBe(0.071);
  });

  test("precision : dixième / centième / millième", () => {
    const pse = { conc: 5000, unite: "µg/kg/min" }; // Dobutamine
    expect(calcDoseFromRate(pse, 5, 70, 1)).toBe(6); // 5,95… → 6,0 (dixième)
    const nora = { conc: 333, unite: "µg/kg/min" };
    expect(calcDoseFromRate(nora, 1.26, 70, 2)).toBe(0.1); // centième
    const iso = { conc: 20, unite: "µg/kg/min" };
    expect(calcDoseFromRate(iso, 5, 70, 3)).toBe(0.024); // millième
  });

  test("round-trip : calcDoseFromRate ∘ calcDebit ≈ identité", () => {
    const pse = { conc: 333, unite: "µg/kg/min" };
    const mlh = calcDebit(pse, 0.2, 80);
    expect(calcDoseFromRate(pse, mlh, 80)).toBeCloseTo(0.2, 2);
  });

  test("cas dégénérés → null", () => {
    const pse = { conc: 200, unite: "µg/kg/min" };
    expect(calcDoseFromRate(pse, 0, 70)).toBeNull();
    expect(calcDoseFromRate(pse, -1, 70)).toBeNull();
    expect(calcDoseFromRate(pse, "", 70)).toBeNull();
    expect(calcDoseFromRate(pse, 5, 0)).toBeNull();
    expect(calcDoseFromRate(pse, 5, null)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// calcPedTable — préparation pédiatrique IVD
// ════════════════════════════════════════════════════════════════
describe("calcPedTable", () => {
  test("Adrénaline ACR enfant — 20 kg → 200 µg, 2 mL + 8 mL NaCl, injecter 1 mL", () => {
    const prep = {
      pedTable: {
        bandes: [
          {
            kg_min: 1,
            kg_max: 45,
            mode: "dilute" as const,
            preparation: "Ampoule 5 mg/5 mL (1 mg/mL)",
            vol_per_kg: 0.1,
            dose_per_kg: 10,
            dose_unit: "µg",
            volume_final: 10,
            solvant: "NaCl 0,9%",
            admin: "1 mL IVD toutes les 4 min",
            admin_volume: 1,
            admin_route: "IVD",
            admin_interval: "toutes les 4 min",
          },
        ],
      },
    };

    expect(calcPedTable(prep, 20)).toMatchObject({
      mode: "dilute",
      kg: 20,
      dose: 200,
      dose_unit: "µg",
      vol_med: 2,
      vol_solvant: 8,
      volume_final: 10,
      admin: "1 mL IVD toutes les 4 min",
      admin_volume: 1,
      admin_route: "IVD",
    });
  });

  test("refuse une dilution dont le volume médicament dépasse le volume final", () => {
    const prep = {
      pedTable: {
        bandes: [
          {
            kg_min: 1,
            kg_max: 40,
            mode: "dilute" as const,
            preparation: "Solution mère 1 mg/mL",
            vol_per_kg: 0.2,
            volume_final: 4,
            solvant: "NaCl 0,9%",
          },
        ],
      },
    };

    expect(calcPedTable(prep, 20)).toMatchObject({ vol_med: 4, vol_solvant: 0 });
    expect(calcPedTable(prep, 20.1)).toBeNull();
    expect(calcPedTable(prep, 40)).toBeNull();
  });

  test("n’extrapole pas entre deux bandes de poids", () => {
    const prep = {
      pedTable: {
        bandes: [
          {
            kg_min: 1,
            kg_max: 30,
            mode: "inject" as const,
            preparation: "Bande basse",
            vol_per_kg: 0.1,
          },
          {
            kg_min: 31,
            kg_max: 55,
            mode: "inject" as const,
            preparation: "Bande haute",
            vol_per_kg: 0.1,
          },
        ],
      },
    };

    expect(calcPedTable(prep, 30)?.preparation).toBe("Bande basse");
    expect(calcPedTable(prep, 30.5)).toBeNull();
    expect(calcPedTable(prep, 31)?.preparation).toBe("Bande haute");
  });
});

// ════════════════════════════════════════════════════════════════
// calcPrepThreshold — Anexate (saisie produit final)
// ════════════════════════════════════════════════════════════════
describe("calcPrepThreshold", () => {
  const prep = {
    dose_threshold: 2,
    amp_low: 4,
    vol_low: 20,
    amp_high: 8,
    vol_high: 40,
  };

  test("dose < seuil (1 mg) → 4 ampoules / 20 mL, injecter 10 mL", () => {
    expect(calcPrepThreshold(prep, 1)).toEqual({
      pf: 1,
      ampCount: 4,
      vol: 20,
      injectMl: 10,
    });
  });

  test("dose = seuil (2 mg) → bascule en 'high'", () => {
    expect(calcPrepThreshold(prep, 2)).toEqual({
      pf: 2,
      ampCount: 8,
      vol: 40,
      injectMl: 20,
    });
  });

  test("dose > seuil (3,5 mg) → 8 ampoules / 40 mL, injecter 35 mL", () => {
    expect(calcPrepThreshold(prep, 3.5)).toEqual({
      pf: 3.5,
      ampCount: 8,
      vol: 40,
      injectMl: 35,
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
    expect(calcPrepSufentaTable(10)!.vi).toBe(1);
  });

  test("poids invalide → null", () => {
    expect(calcPrepSufentaTable(0)).toBeNull();
    expect(calcPrepSufentaTable(400)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// calcPrepNoradTable — Vi/Vf par tranche de poids
// ════════════════════════════════════════════════════════════════
describe("calcPrepNoradTable", () => {
  test("enfant 20 kg → Vi=2,5 mL, Vf=42 mL", () => {
    expect(calcPrepNoradTable(20)).toEqual({ kg: 20, vi: 2.5, vf: 42 });
  });

  test("ado 50 kg → Vi=5 mL, Vf=33 mL", () => {
    expect(calcPrepNoradTable(50)).toEqual({ kg: 50, vi: 5, vf: 33 });
  });

  test("adulte 70 kg → Vi=10 mL, Vf=48 mL", () => {
    expect(calcPrepNoradTable(70)).toEqual({ kg: 70, vi: 10, vf: 48 });
  });

  test("poids invalide → null", () => {
    expect(calcPrepNoradTable(0)).toBeNull();
    expect(calcPrepNoradTable(400)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// Tables Vi/Vf catécholamines main
// ════════════════════════════════════════════════════════════════
describe("tables Vi/Vf catécholamines", () => {
  test("Adrénaline 70 kg → Vi=20 mL, Vf=48 mL", () => {
    expect(calcPrepAdrenalineTable(70)).toEqual({ kg: 70, vi: 20, vf: 48 });
  });

  test("Dobutamine 70 kg → Vi=20 mL, Vf=60 mL", () => {
    expect(calcPrepDobutamineTable(70)).toEqual({ kg: 70, vi: 20, vf: 60 });
  });

  test("Isuprel 70 kg → Vi=10 mL, Vf=48 mL", () => {
    expect(calcPrepIsuprelTable(70)).toEqual({ kg: 70, vi: 10, vf: 48 });
  });
});

// ════════════════════════════════════════════════════════════════
// calcPrepOctaplexInr — dose automatique selon INR
// ════════════════════════════════════════════════════════════════
describe("calcPrepOctaplexInr", () => {
  test("INR 3 à 80 kg → 25 UI/kg = 2000 UI = 80 mL", () => {
    expect(calcPrepOctaplexInr(80, 3)).toEqual({
      kg: 80,
      inr: 3,
      uiKg: 25,
      totalUi: 2000,
      volumeMl: 80,
      capped: false,
    });
  });

  test("INR 5 à 80 kg → 35 UI/kg = 2800 UI = 112 mL", () => {
    expect(calcPrepOctaplexInr(80, 5)).toEqual({
      kg: 80,
      inr: 5,
      uiKg: 35,
      totalUi: 2800,
      volumeMl: 112,
      capped: false,
    });
  });

  test("INR 7 à 80 kg → 50 UI/kg plafonné à 3000 UI", () => {
    expect(calcPrepOctaplexInr(80, 7)).toEqual({
      kg: 80,
      inr: 7,
      uiKg: 50,
      totalUi: 3000,
      volumeMl: 120,
      capped: true,
    });
  });

  test("INR < 2 ou poids invalide → null", () => {
    expect(calcPrepOctaplexInr(80, 1.8)).toBeNull();
    expect(calcPrepOctaplexInr("", 5)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// calcPrepPhases — Hidonac (3 phases)
// ════════════════════════════════════════════════════════════════
describe("calcPrepSufentaIntranasal", () => {
  test("85 kg → dose pleine répartie sur 2 narines", () => {
    expect(calcPrepSufentaIntranasal(85)).toEqual({
      kg: 85,
      cappedKg: 85,
      demiDose: 12.75,
      dose: 25.5,
      demiVolume: 0.26,
      volume: 0.51,
      narine1: 0.3,
      narine2: 0.21,
    });
  });

  test("80 kg → dose pleine sur une seule narine", () => {
    expect(calcPrepSufentaIntranasal(80)).toMatchObject({
      dose: 24,
      volume: 0.48,
      narine1: 0.48,
      narine2: null,
    });
  });

  test("100 kg et plus → ligne plafonnée à 100 kg", () => {
    expect(calcPrepSufentaIntranasal(120)).toMatchObject({
      kg: 120,
      cappedKg: 100,
      dose: 30,
      volume: 0.6,
      narine1: 0.3,
      narine2: 0.3,
    });
  });
});

describe("calcPrepPhases", () => {
  const prep = {
    conc_produit: 200,
    phases: [
      { label: "Phase 1", dose_kg: 150, duree: "60 min", solvant_vol: 500 },
      { label: "Phase 2", dose_kg: 50, duree: "4h", solvant_vol: 500 },
      { label: "Phase 3", dose_kg: 100, duree: "16h", solvant_vol: 1000 },
    ],
  };

  test("70 kg : doses 10500 / 3500 / 7000 mg, volumes 52,5 / 17,5 / 35 mL", () => {
    const r = calcPrepPhases(prep, 70)!;
    expect(r).toHaveLength(3);
    expect(r[0]).toEqual({
      label: "Phase 1",
      duree: "60 min",
      dose: 10500,
      vol: 52.5,
      solvantVol: 500,
    });
    expect(r[1]).toEqual({ label: "Phase 2", duree: "4h", dose: 3500, vol: 17.5, solvantVol: 500 });
    expect(r[2]).toEqual({ label: "Phase 3", duree: "16h", dose: 7000, vol: 35, solvantVol: 1000 });
  });

  test("sans conc_produit → vol = null", () => {
    const r = calcPrepPhases({ phases: prep.phases }, 70)!;
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
      kg: 70,
      dose: 105,
      doseMax: 175,
      volMin: 10.5,
      volMax: 17.5,
      unite: "mg",
    });
  });

  test("dose unique (sans dose_max_kg)", () => {
    const prep = { dose_kg: 1, conc_produit: 10, unite: "mg" };
    expect(calcPrepDoseKg(prep, 70)).toEqual({
      kg: 70,
      dose: 70,
      doseMax: null,
      volMin: 7,
      volMax: null,
      unite: "mg",
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

// ════════════════════════════════════════════════════════════════
// calcDoseLibre — saisie mg → mL à prélever (poids non requis)
// ════════════════════════════════════════════════════════════════
describe("calcDoseLibre", () => {
  test("100 mg / 10 mg/mL → 10 mL", () => {
    expect(calcDoseLibre({ conc_produit: 10 }, 100)).toBe(10);
  });

  test("arrondi à 2 décimales : 5 mg / 3 mg/mL → 1,67 mL", () => {
    expect(calcDoseLibre({ conc_produit: 3 }, 5)).toBe(1.67);
  });

  test("accepte une string (input HTML)", () => {
    expect(calcDoseLibre({ conc_produit: 10 }, "50")).toBe(5);
  });

  test("dose vide ou ≤ 0 → null", () => {
    expect(calcDoseLibre({ conc_produit: 10 }, "")).toBeNull();
    expect(calcDoseLibre({ conc_produit: 10 }, 0)).toBeNull();
    expect(calcDoseLibre({ conc_produit: 10 }, -5)).toBeNull();
  });

  test("conc_produit absente ou nulle → null", () => {
    expect(calcDoseLibre({}, 100)).toBeNull();
    expect(calcDoseLibre({ conc_produit: 0 }, 100)).toBeNull();
    expect(calcDoseLibre(null, 100)).toBeNull();
  });
});
