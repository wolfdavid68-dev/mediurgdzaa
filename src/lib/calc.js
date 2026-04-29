// Pure calculators extracted from DrugCard.js
// Aucun import React, aucun accès DOM/localStorage.
// Toute modification ici doit être validée par calc.test.js.

import { normalize } from "./normalize";

const KG_MIN = 0;
const KG_MAX = 300;

export function isValidWeight(w) {
  const kg = parseFloat(w);
  return Number.isFinite(kg) && kg > KG_MIN && kg <= KG_MAX;
}

// ── Dose poids-dépendante (parse un texte de poso) ────────────
export function calcDose(text, w) {
  const kg = parseFloat(w);
  if (!kg || kg <= 0 || kg > 300) return null;

  const match = text.match(
    /(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(mg|µg|mcg|mL|ml|g|UI|U|mmol|mEq)\/kg(?:\/(min|h|j|24h))?/i
  );
  if (!match) return null;

  const min  = parseFloat(match[1].replace(",", "."));
  const max  = match[2] ? parseFloat(match[2].replace(",", ".")) : null;
  const unit = match[3];
  const per  = match[4] ? `/${match[4]}` : "";

  let doseMin = +(min * kg).toFixed(2);
  let doseMax = max ? +(max * kg).toFixed(2) : null;

  const maxMatch = text.match(/max\s+(\d+(?:[.,]\d+)?)\s*(mg|µg|mcg|mL|ml|g|UI|U|mmol|mEq)/i);
  if (maxMatch && maxMatch[2].toLowerCase() === unit.toLowerCase()) {
    const cap = parseFloat(maxMatch[1].replace(",", "."));
    const capped = doseMin > cap || (doseMax && doseMax > cap);
    if (doseMin > cap) doseMin = cap;
    if (doseMax && doseMax > cap) doseMax = cap;
    if (capped) return { value: (doseMax ? `${doseMin}–${doseMax}` : `${doseMin}`) + ` ${unit}${per}`, capped: true };
  }
  return { value: (doseMax ? `${doseMin}–${doseMax}` : `${doseMin}`) + ` ${unit}${per}`, capped: false };
}

// ── Sévérité contre-indication ────────────────────────────────
export function ciSeverity(text) {
  const t = normalize(text);

  if (/\b(absolue?s?)\b/.test(t)) return "abs";
  if (/\b(relative?s?)\b/.test(t)) return "rel";
  if (/\b(precaution|prudence)\b/.test(t)) return "prec";

  if (/adapter\s+(la\s+)?dose|reduire\s+(la\s+)?dose|diminuer\s+(la\s+)?dose|surveillance|sujet\s+age|personne\s+age|grossesse|allaitement|insuffisance\s+(renal|hepati)(?!.*sever)|clairance|adapter|titrer/.test(t)) return "prec";

  if (/allergi|hypersensibil|\bimao\b|porphyri|myastheni|hyperkalie|insuffisance\s+surrenal|brulure(s)?\s+etend|para.{0,4}tetrapleg|hemipleg|deficit\s+moteur|myopathi|dystrophie\s+musc|pseudocholinesteras|epilepsie\s+non\s+control|nouveau.ne|nourrisson|depression\s+respiratoire|glaucome|angle\s+ferme|choc\s+cardiogenique|bloc\s+av|bav\s+(2|3|haut)|pheochromocyt|hyperthermie\s+maligne|crush|hypovolemie\s+severe|intoxication\s+digital|wpw|wolff/.test(t)) return "abs";

  if (/asthme|bpco|bronchospasme|hypotension|bradycardie|hypothyroid|hyperthyroid|qt\s+long|insuffisance\s+(renal|hepati|cardia).*sever|trouble\s+(coag|conduction)|porphyrie/.test(t)) return "rel";

  return null;
}

// ── Débit PSE (mL/h) ──────────────────────────────────────────
export function calcDebit(pse, dose, kg) {
  const d = parseFloat(dose);
  if (!d || d <= 0) return null;
  if (pse.factor) return +(d * pse.factor).toFixed(2);
  if (pse.unite === "mg/h") return +(d / pse.conc).toFixed(2);
  if (pse.unite === "UI/24h") return +(d / (pse.conc * 24)).toFixed(2);
  const w = parseFloat(kg);
  if (!w || w <= 0) return null;
  if (pse.unite === "µg/kg/min") return +((d * w * 60) / pse.conc).toFixed(2);
  return +((d * w) / pse.conc).toFixed(2);
}

// ── Préparation : seuil dose (Anexate) ────────────────────────
// Renvoie le nombre d'ampoules / volumes selon que le produit final
// franchit ou non `prep.dose_threshold` mg.
export function calcPrepThreshold(prep, produitFinalMg) {
  const pf = parseFloat(produitFinalMg);
  if (!pf || pf <= 0) return null;
  if (prep?.dose_threshold === undefined) return null;
  const isHigh = pf >= prep.dose_threshold;
  return {
    pf,
    ampCount: isHigh ? prep.amp_high : prep.amp_low,
    vol:      isHigh ? prep.vol_high : prep.vol_low,
    injectMl: +(pf * 10).toFixed(1),
  };
}

// ── Préparation : table Sufentanil (Vi/Vf par poids) ──────────
// Règle : 1 mL/h = 0,1 µg/kg/h ; Vf = round(500 × Vi / kg)
export function calcPrepSufentaTable(weightKg) {
  if (!isValidWeight(weightKg)) return null;
  const kg = parseFloat(weightKg);
  let vi;
  if (kg < 10) vi = 0.5;
  else if (kg < 30) vi = 1;
  else if (kg < 50) vi = 2;
  else vi = 5;
  const vf = Math.round((500 * vi) / kg);
  return { kg, vi, vf };
}

// ── Préparation : phases successives (Hidonac) ────────────────
export function calcPrepPhases(prep, weightKg) {
  if (!isValidWeight(weightKg) || !prep?.phases?.length) return null;
  const kg = parseFloat(weightKg);
  return prep.phases.map((phase) => {
    const dose = +(phase.dose_kg * kg).toFixed(0);
    const vol  = prep.conc_produit ? +(dose / prep.conc_produit).toFixed(1) : null;
    return {
      label: phase.label,
      duree: phase.duree,
      dose,
      vol,
      solvantVol: phase.solvant_vol,
    };
  });
}

// ── Préparation : dose_kg standard ────────────────────────────
// Renvoie les volumes à prélever / compléter pour une dilution
// dose_kg (+ option dose_max_kg pour les fourchettes).
export function calcPrepDoseKg(prep, weightKg) {
  if (!isValidWeight(weightKg) || !prep?.dose_kg) return null;
  const kg = parseFloat(weightKg);
  const dose    = prep.dose_kg * kg;
  const doseMax = prep.dose_max_kg ? prep.dose_max_kg * kg : null;
  const volMin  = prep.conc_produit ? +(dose / prep.conc_produit).toFixed(1) : null;
  const volMax  = doseMax && prep.conc_produit ? +(doseMax / prep.conc_produit).toFixed(1) : null;
  if (!volMin) return null;
  return {
    kg,
    dose:    +dose.toFixed(1),
    doseMax: doseMax !== null ? +doseMax.toFixed(1) : null,
    volMin,
    volMax,
    unite: prep.unite,
  };
}
