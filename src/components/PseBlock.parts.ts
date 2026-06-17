import type { PseLookupByDrugId, PsePreviewByDrugId } from "../types/data";

// Helpers de calcul purs du bloc PSE (pousse-seringue électrique), extraits de
// PseBlock.tsx pour être testables isolément. Aucun état ni JSX : seulement de
// la logique de débit. Les fonctions calcDebit / calcDoseFromRate (cas
// classique et mode mlh) vivent déjà dans lib/calc et sont testées là-bas ;
// ici on couvre le merge de l'overlay preview et le mode « dose efficace ».

export type PseEntry = NonNullable<PseLookupByDrugId[number]>;

// PSE public, ou PSE + overlay preview (?author=preview) : l'overlay
// remplace/ajoute par id de médicament. La table de base est injectée en
// paramètre (testable sans dépendre de la vraie data PSE).
export const resolvePse = (
  base: PseLookupByDrugId,
  previewPseByDrugId: PsePreviewByDrugId | null
): PseLookupByDrugId => (previewPseByDrugId ? { ...base, ...previewPseByDrugId } : base);

export type EffectivePse = { dose: number; hourlyDose: number; debit: number };

// Mode « dose efficace » (ex. dérivés sanguins) : la saisie est une dose
// efficace ; on en déduit la dose horaire (× fraction, 2/3 par défaut) puis le
// débit PSE (÷ concentration). Renvoie null hors de ce mode ou pour une saisie
// invalide (≤ 0, non numérique).
export const computeEffectivePse = (pse: PseEntry, inputStr: string): EffectivePse | null => {
  if (pse.inputMode !== "effectiveDose") return null;
  const input = parseFloat(inputStr);
  if (!Number.isFinite(input) || input <= 0) return null;
  const dose = input * (pse.effectiveInputConc ?? 1);
  if (!Number.isFinite(dose) || dose <= 0) return null;
  const fraction = pse.effectiveFraction ?? 2 / 3;
  const hourlyDose = +(dose * fraction).toFixed(3);
  const debit = +(hourlyDose / pse.conc).toFixed(2);
  return { dose, hourlyDose, debit };
};
