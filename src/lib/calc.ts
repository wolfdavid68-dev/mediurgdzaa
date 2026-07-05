// Pure calculators extracted from DrugCard.js
// Aucun import React, aucun accès DOM/localStorage.
// Toute modification ici doit être validée par calc.test.js.

import { normalize } from "./normalize";
import type { PseFormula } from "../types/data";

export type { PseFormula } from "../types/data";

const KG_MIN = 0;
const KG_MAX = 300;

export function isValidWeight(w: string | number | null | undefined) {
  const kg = parseFloat(String(w));
  return Number.isFinite(kg) && kg > KG_MIN && kg <= KG_MAX;
}

// ── Validation défensive de dose ───────────────────────────────
// Détecte les doses absurdement élevées (typo de virgule dans drugs.js,
// erreur d'unité, etc.) qui pourraient passer silencieusement.
// Seuils volontairement larges — on flag uniquement les valeurs
// manifestement aberrantes (ex: 50 g d'une drogue IV).
const DOSE_DANGER_THRESHOLDS = {
  mg: 50000, // 50 g — au-dessus, c'est forcément une erreur
  µg: 500000, // 500 mg
  mcg: 500000,
  g: 50,
  gouttes: 1000,
  mL: 1000,
  ml: 1000,
  UI: 5000000,
  U: 5000000,
  mmol: 500,
  mEq: 500,
};

type PrepPhaseInput = {
  label: string;
  duree: string;
  dose_kg: number;
  solvant_vol?: number;
};

type PedTableBandInput = {
  kg_min?: number | null;
  kg_max?: number | null;
  mode: "inject" | "dilute";
  preparation: string;
  vol_per_kg: number;
  dose_per_kg?: number;
  dose_unit?: string;
  volume_final?: number;
  solvant?: string;
  admin?: string;
  admin_volume?: number;
  admin_route?: string;
  admin_interval?: string;
  step?: number;
  round_mode?: "up" | "down" | "round";
};

export type PrepFormula = {
  dose_threshold?: number;
  amp_high?: number;
  amp_low?: number;
  vol_high?: number;
  vol_low?: number;
  phases?: PrepPhaseInput[];
  pedTable?: { bandes: PedTableBandInput[] };
  conc_produit?: number;
  dose_kg?: number;
  dose_max_kg?: number;
  unite?: string;
};

// "ok" : dose plausible · "danger" : valeur aberrante (donnée à vérifier)
export function validateDoseValue(numericValue: number, unit: string) {
  if (!Number.isFinite(numericValue)) return "danger";
  if (numericValue < 0) return "danger";
  const key = unit === "ml" ? "mL" : unit; // normalise mL/ml
  const threshold = DOSE_DANGER_THRESHOLDS[key as keyof typeof DOSE_DANGER_THRESHOLDS];
  if (threshold && numericValue > threshold) return "danger";
  return "ok";
}

// ── Dose poids-dépendante (parse un texte de poso) ────────────
export function calcDose(text: string, w: string | number | null | undefined) {
  const kg = parseFloat(String(w));
  if (!kg || kg <= 0 || kg > 300) return null;

  const match = text.match(
    /(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(mg|µg|mcg|mL|ml|gouttes|g|UI|U|mmol|mEq)\/kg(?:\/(min|h|j|24h))?/i
  );
  if (!match) return null;

  const min = parseFloat(match[1].replace(",", "."));
  const max = match[2] ? parseFloat(match[2].replace(",", ".")) : null;
  const unit = match[3];
  const per = match[4] ? `/${match[4]}` : "";

  // Cohérence min/max : si données incohérentes (min > max), c'est un bug
  // dans drugs.js — on flag explicitement plutôt que de calculer faux.
  if (max !== null && min > max) {
    return { value: "⚠ donnée incohérente", capped: false, validation: "danger" };
  }

  let doseMin = +(min * kg).toFixed(2);
  let doseMax = max ? +(max * kg).toFixed(2) : null;

  const maxMatch = text.match(
    /max\s+(\d+(?:[.,]\d+)?)\s*(mg|µg|mcg|mL|ml|gouttes|g|UI|U|mmol|mEq)/i
  );
  let capped = false;
  if (maxMatch && maxMatch[2].toLowerCase() === unit.toLowerCase()) {
    const cap = parseFloat(maxMatch[1].replace(",", "."));
    capped = doseMin > cap || (doseMax !== null && doseMax > cap);
    if (doseMin > cap) doseMin = cap;
    if (doseMax !== null && doseMax > cap) doseMax = cap;
  }

  // Validation finale sur la dose effective (après cap)
  const refValue = doseMax !== null ? doseMax : doseMin;
  const validation = validateDoseValue(refValue, unit);

  return {
    value: (doseMax !== null ? `${doseMin}–${doseMax}` : `${doseMin}`) + ` ${unit}${per}`,
    capped,
    validation,
  };
}

// ── Sévérité contre-indication ────────────────────────────────
export function ciSeverity(text: string) {
  const t = normalize(text);

  if (/\b(absolue?s?)\b/.test(t)) return "abs";
  if (/\b(relative?s?)\b/.test(t)) return "rel";
  if (/\b(precaution|prudence)\b/.test(t)) return "prec";

  if (
    /adapter\s+(la\s+)?dose|reduire\s+(la\s+)?dose|diminuer\s+(la\s+)?dose|surveillance|sujet\s+age|personne\s+age|grossesse|allaitement|insuffisance\s+(renal|hepati)(?!.*sever)|clairance|adapter|titrer/.test(
      t
    )
  )
    return "prec";

  if (
    /allergi|hypersensibil|\bimao\b|porphyri|myastheni|hyperkalie|insuffisance\s+surrenal|brulure(s)?\s+etend|para.{0,4}tetrapleg|hemipleg|deficit\s+moteur|myopathi|dystrophie\s+musc|pseudocholinesteras|epilepsie\s+non\s+control|nouveau.ne|nourrisson|depression\s+respiratoire|glaucome|angle\s+ferme|choc\s+cardiogenique|bloc\s+av|bav\s+(2|3|haut)|pheochromocyt|hyperthermie\s+maligne|crush|hypovolemie\s+severe|intoxication\s+digital|wpw|wolff/.test(
      t
    )
  )
    return "abs";

  if (
    /asthme|bpco|bronchospasme|hypotension|bradycardie|hypothyroid|hyperthyroid|qt\s+long|insuffisance\s+(renal|hepati|cardia).*sever|trouble\s+(coag|conduction)|porphyrie/.test(
      t
    )
  )
    return "rel";

  return null;
}

// ── Débit PSE (mL/h) ──────────────────────────────────────────
// `kg` peut être null/"" pour les unités non poids-dépendantes (mg/h, UI/24h).
export function calcDebit(
  pse: PseFormula,
  dose: string | number | null | undefined,
  kg: string | number | null | undefined
) {
  const d = parseFloat(String(dose));
  if (!d || d <= 0) return null;
  if (pse.factor) return +(d * pse.factor).toFixed(2);
  if (pse.unite === "mg/h") return +(d / pse.conc).toFixed(2);
  if (pse.unite === "UI/24h") return +(d / (pse.conc * 24)).toFixed(2);
  const w = parseFloat(String(kg));
  if (!w || w <= 0) return null;
  let result;
  if (pse.unite === "µg/kg/min") {
    result = (d * w * 60) / pse.conc;
  } else if (pse.unite === "mL/kg/min") {
    // Prescription en débit-volume direct (Octaplex) : mL/h = dose × poids × 60
    result = d * w * 60;
  } else {
    result = (d * w) / pse.conc;
  }
  // Cap absolu en mL/h si défini (ex: Octaplex 480 mL/h = 8 mL/min max)
  if (pse.maxMlH && result > pse.maxMlH) result = pse.maxMlH;
  return +result.toFixed(2);
}

// ── Calcul inverse : mL/h (+ poids) → dose ────────────────────
// Inverse exact de calcDebit. Saisie = débit réellement réglé sur la
// PSE ; sortie = dose pondérale correspondante, selon la dilution.
// Utilisé par le mode "mlh" de PseBlock (entrée mL/h, on déduit la dose).
// `precision` = nb de décimales (défaut 3) ; piloté par `dosePrecision`
// de l'entrée PSE (centième=2 Nora/Adré/Sufenta, dixième=1 Dobu,
// millième=3 Iso) pour coller à la précision de réglage clinique.
export function calcDoseFromRate(
  pse: PseFormula,
  mlh: string | number | null | undefined,
  kg: string | number | null | undefined,
  precision = 3
) {
  const r = parseFloat(String(mlh));
  if (!r || r <= 0) return null;
  if (pse.factor) return +(r / pse.factor).toFixed(precision);
  if (pse.unite === "mg/h") return +(r * pse.conc).toFixed(precision);
  if (pse.unite === "UI/24h") return +(r * pse.conc * 24).toFixed(precision);
  const w = parseFloat(String(kg));
  if (!w || w <= 0) return null;
  let result;
  if (pse.unite === "µg/kg/min") {
    result = (r * pse.conc) / (w * 60);
  } else if (pse.unite === "mL/kg/min") {
    result = r / (w * 60);
  } else {
    result = (r * pse.conc) / w;
  }
  return +result.toFixed(precision);
}

// ── Préparation : seuil dose (Anexate) ────────────────────────
// Renvoie le nombre d'ampoules / volumes selon que le produit final
// franchit ou non `prep.dose_threshold` mg.
export function calcPrepThreshold(
  prep: PrepFormula | null | undefined,
  produitFinalMg: string | number | null | undefined
) {
  const pf = parseFloat(String(produitFinalMg));
  if (!pf || pf <= 0) return null;
  if (prep?.dose_threshold === undefined) return null;
  const isHigh = pf >= prep.dose_threshold;
  return {
    pf,
    ampCount: isHigh ? prep.amp_high : prep.amp_low,
    vol: isHigh ? prep.vol_high : prep.vol_low,
    injectMl: +(pf * 10).toFixed(1),
  };
}

// ── Préparation : table Sufentanil (Vi/Vf par poids) ──────────
// Règle : 1 mL/h = 0,1 µg/kg/h ; Vf = round(500 × Vi / kg)
export function calcPrepSufentaTable(weightKg: string | number | null | undefined) {
  if (!isValidWeight(weightKg)) return null;
  const kg = parseFloat(String(weightKg));
  let vi;
  if (kg < 10) vi = 0.5;
  else if (kg < 30) vi = 1;
  else if (kg < 50) vi = 2;
  else vi = 5;
  const vf = Math.round((500 * vi) / kg);
  return { kg, vi, vf };
}

// ── Préparation : table Noradrénaline (Vi/Vf par poids) ───────
// Règle : 1 mL/h = 0,1 µg/kg/min ; ampoule 2 mg/mL ; Vf = round(2000 × Vi / (6 × kg))
export function calcPrepNoradTable(weightKg: string | number | null | undefined) {
  if (!isValidWeight(weightKg)) return null;
  const kg = parseFloat(String(weightKg));
  let vi;
  if (kg < 42) vi = 2.5;
  else if (kg < 64) vi = 5;
  else vi = 10;
  const vf = Math.round((2000 * vi) / (6 * kg));
  return { kg, vi, vf };
}

// ── Préparation : table Adrénaline (Vi/Vf par poids) ──────────
// Règle : 1 mL/h = 0,1 µg/kg/min ; ampoule 1 mg/mL ; Vf = round(1000 × Vi / (6 × kg))
export function calcPrepAdrenalineTable(weightKg: string | number | null | undefined) {
  if (!isValidWeight(weightKg)) return null;
  const kg = parseFloat(String(weightKg));
  let vi;
  if (kg < 42) vi = 5;
  else if (kg < 64) vi = 10;
  else vi = 20;
  const vf = Math.round((1000 * vi) / (6 * kg));
  return { kg, vi, vf };
}

// ── Préparation : table Dobutamine (Vi/Vf par poids) ──────────
// Règle : 1 mL/h = 1 µg/kg/min ; Dobutrex 12,5 mg/mL ; Vf = round(12500 × Vi / (60 × kg))
export function calcPrepDobutamineTable(weightKg: string | number | null | undefined) {
  if (!isValidWeight(weightKg)) return null;
  const kg = parseFloat(String(weightKg));
  const vi = kg < 58 ? 10 : 20;
  const vf = Math.round((12500 * vi) / (60 * kg));
  return { kg, vi, vf };
}

// ── Préparation : table Isuprel (Vi/Vf par poids) ─────────────
// Règle : 1 mL/h = 0,01 µg/kg/min ; ampoule 0,2 mg/mL ; Vf = round(200 × Vi / (0,6 × kg))
export function calcPrepIsuprelTable(weightKg: string | number | null | undefined) {
  if (!isValidWeight(weightKg)) return null;
  const kg = parseFloat(String(weightKg));
  let vi;
  if (kg < 42) vi = 2.5;
  else if (kg < 64) vi = 5;
  else vi = 10;
  const vf = Math.round((200 * vi) / (0.6 * kg));
  return { kg, vi, vf };
}

// ── Préparation : Octaplex selon INR ──────────────────────────
// AVK : INR 2-3,9 → 25 UI/kg ; INR 4-6 → 35 UI/kg ; INR > 6 → 50 UI/kg max 3000 UI.
// Volume estimé sur la reconstitution usuelle 25 UI/mL.
export function calcPrepOctaplexInr(
  weightKg: string | number | null | undefined,
  inrValue: string | number | null | undefined
) {
  if (!isValidWeight(weightKg)) return null;
  const inr = parseFloat(String(inrValue).replace(",", "."));
  if (!Number.isFinite(inr) || inr < 2) return null;
  const kg = parseFloat(String(weightKg));
  const uiKg = inr < 4 ? 25 : inr <= 6 ? 35 : 50;
  const rawTotalUi = uiKg * kg;
  const capped = uiKg === 50 && rawTotalUi > 3000;
  const totalUi = capped ? 3000 : Math.round(rawTotalUi);
  const volumeMl = +(totalUi / 25).toFixed(1);
  return { kg, inr, uiKg, totalUi, volumeMl, capped };
}

// ── Préparation : phases successives (Hidonac) ────────────────
export function calcPrepSufentaIntranasal(weightKg: string | number | null | undefined) {
  if (!isValidWeight(weightKg)) return null;
  const kg = parseFloat(String(weightKg));
  const cappedKg = Math.min(kg, 100);
  const demiDose = +(0.15 * cappedKg).toFixed(2);
  const dose = +(0.3 * cappedKg).toFixed(2);
  const demiVolume = +(demiDose / 50).toFixed(2);
  const volume = +(dose / 50).toFixed(2);
  const narine1 = volume > 0.5 ? 0.3 : volume;
  const narine2 = volume > 0.5 ? +(volume - 0.3).toFixed(2) : null;
  return { kg, cappedKg, demiDose, dose, demiVolume, volume, narine1, narine2 };
}

export function calcPrepPhases(
  prep: PrepFormula | null | undefined,
  weightKg: string | number | null | undefined
) {
  if (!isValidWeight(weightKg) || !prep?.phases?.length) return null;
  const kg = parseFloat(String(weightKg));
  return prep.phases.map((phase) => {
    const dose = +(phase.dose_kg * kg).toFixed(0);
    const vol = prep.conc_produit ? +(dose / prep.conc_produit).toFixed(1) : null;
    return {
      label: phase.label,
      duree: phase.duree,
      dose,
      vol,
      solvantVol: phase.solvant_vol,
    };
  });
}

// ── Préparation : table pédiatrique (ACR) ─────────────────────
// Renvoie la bande applicable + volumes calculés selon le mode :
// - mode "inject" : volume à injecter = vol_per_kg × kg (avec arrondi optionnel)
// - mode "dilute" : volume médicament = vol_per_kg × kg, complété au volume_final
export function calcPedTable(
  prep: PrepFormula | null | undefined,
  weightKg: string | number | null | undefined
) {
  if (!isValidWeight(weightKg) || !prep?.pedTable?.bandes?.length) return null;
  const kg = parseFloat(String(weightKg));
  const bande = prep.pedTable.bandes.find(
    (b) => (b.kg_min == null || kg >= b.kg_min) && (b.kg_max == null || kg <= b.kg_max)
  );
  if (!bande) return null;

  const roundStep = (val: number, step: number, mode?: string) => {
    const factor = 1 / step;
    if (mode === "down") return Math.floor(val * factor) / factor;
    if (mode === "up") return Math.ceil(val * factor) / factor;
    return Math.round(val * factor) / factor;
  };

  if (bande.mode === "inject") {
    const raw = kg * bande.vol_per_kg;
    const vol = bande.step ? roundStep(raw, bande.step, bande.round_mode) : +raw.toFixed(2);
    return {
      mode: "inject",
      kg,
      preparation: bande.preparation,
      dose: bande.dose_per_kg ? +(bande.dose_per_kg * kg).toFixed(2) : null,
      dose_unit: bande.dose_unit,
      vol_inject: +vol.toFixed(2),
      admin_volume: bande.admin_volume,
      admin_route: bande.admin_route,
      admin_interval: bande.admin_interval,
    };
  }

  if (bande.mode === "dilute") {
    if (typeof bande.volume_final !== "number") return null;
    const raw = kg * bande.vol_per_kg;
    const volMed = roundStep(raw, bande.step || 0.1, bande.round_mode);
    const volSolv = +(bande.volume_final - volMed).toFixed(1);
    return {
      mode: "dilute",
      kg,
      preparation: bande.preparation,
      dose: bande.dose_per_kg ? +(bande.dose_per_kg * kg).toFixed(2) : null,
      dose_unit: bande.dose_unit,
      vol_med: +volMed.toFixed(1),
      vol_solvant: volSolv,
      volume_final: bande.volume_final,
      solvant: bande.solvant,
      admin: bande.admin,
      admin_volume: bande.admin_volume,
      admin_route: bande.admin_route,
      admin_interval: bande.admin_interval,
    };
  }

  return null;
}

// ── Préparation : dose libre (input mg → mL à prélever) ──────
// Utilisé par le panneau « Calcul dose libre » de PrepBlock : on saisit
// une dose en mg et on lit le volume à prélever, indépendamment du poids.
// Renvoie null si dose invalide ou conc_produit absente.
export function calcDoseLibre(
  prep: PrepFormula | null | undefined,
  doseMg: string | number | null | undefined
) {
  const d = parseFloat(String(doseMg));
  if (!d || d <= 0) return null;
  if (!prep?.conc_produit) return null;
  return +(d / prep.conc_produit).toFixed(2);
}

// ── Préparation : dose_kg standard ────────────────────────────
// Renvoie les volumes à prélever / compléter pour une dilution
// dose_kg (+ option dose_max_kg pour les fourchettes).
export function calcPrepDoseKg(
  prep: PrepFormula | null | undefined,
  weightKg: string | number | null | undefined
) {
  if (!isValidWeight(weightKg) || !prep?.dose_kg) return null;
  const kg = parseFloat(String(weightKg));
  const dose = prep.dose_kg * kg;
  const doseMax = prep.dose_max_kg ? prep.dose_max_kg * kg : null;
  const volMin = prep.conc_produit ? +(dose / prep.conc_produit).toFixed(1) : null;
  const volMax = doseMax && prep.conc_produit ? +(doseMax / prep.conc_produit).toFixed(1) : null;
  if (!volMin) return null;
  return {
    kg,
    dose: +dose.toFixed(1),
    doseMax: doseMax !== null ? +doseMax.toFixed(1) : null,
    volMin,
    volMax,
    unite: prep.unite,
  };
}
