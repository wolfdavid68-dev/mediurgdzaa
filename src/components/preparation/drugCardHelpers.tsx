import type { Drug } from "../../types/data";
import type { PreparationModel } from "../PreparationModel";

export const TABS = [
  { key: "poso", label: "Posologie", type: "poso" },
  { key: "indic", label: "Indications", type: "info" },
  { key: "ci", label: "Contre-ind.", type: "ci" },
  { key: "ei", label: "Effets indés.", type: "danger" },
  { key: "cond", label: "Conditionnements", type: "neutral" },
];

export const MONITORING_BADGES = [
  {
    label: "Scope",
    className: "monitor-scope",
    pattern:
      /sous scope|surveillance scop|scope|monitorage ecg|surveillance ecg|surveillance cardiaque/i,
  },
  {
    label: "ECG",
    className: "monitor-ecg",
    pattern: /ecg obligatoire|ecg long|electrocardioscope|électrocardioscope/i,
  },
  {
    label: "Capno",
    className: "monitor-capno",
    pattern: /capno|etco2|etco₂/i,
  },
];

// Une fiche repliée n'affiche aucune donnée du modèle de préparation. Ce
// modèle parcourt pourtant de nombreuses variantes cliniques ; le construire
// pour les 80+ cartes au premier rendu pénalisait inutilement l'ouverture de
// l'application. Cette valeur neutre garde les effets/hooks stables jusqu'à
// l'ouverture effective de la fiche.
const EMPTY_PREPARATION_METRIC = { label: "", value: "", note: "" };
export const CLOSED_PREPARATION_MODEL: PreparationModel = {
  activeRecipe: null,
  modes: [],
  recipes: [],
  metrics: [EMPTY_PREPARATION_METRIC, EMPTY_PREPARATION_METRIC, EMPTY_PREPARATION_METRIC],
  steps: [],
  notes: [],
  controls: [],
  context: "",
  canValidate: false,
  validationReason: null,
  hasPreparation: false,
  hasDetailedCalculation: false,
  isPse: false,
  pseSteps: [],
  programmedRateMlH: null,
};

export const MonitoringWaveIcon = () => (
  <svg viewBox="0 0 34 14" aria-hidden="true" className="monitor-wave">
    <path d="M1 8h6l3-6 5 11 4-8h5l2-3 3 6h4" />
  </svg>
);

const normalizePrepDuplicateText = (value: string | undefined | null) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[→⇒]/g, " ")
    .replace(/[—–-]/g, " ")
    .replace(/[,;:()=]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const collectPrepDuplicateTexts = (prep: Drug["prep"]): string[] => {
  if (!prep) return [];
  const out: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string" && value.trim()) out.push(value);
  };

  [
    prep.solvant,
    prep.conc_finale,
    prep.duree,
    prep.stabilite,
    prep.debit,
    prep.prelever_label,
    prep.fd_prelever,
    prep.calc_titre,
    ...(prep.etapes || []),
    ...(prep.notes || []),
    ...(prep.duplicate_posology || []),
  ].forEach(push);

  prep.preparations?.forEach((recipe) => {
    [
      recipe.titre,
      recipe.tag,
      recipe.prelever,
      recipe.completer,
      recipe.concentration,
      recipe.rate_label,
      recipe.rate_value,
      recipe.note,
      ...(recipe.etapes || []),
      ...(recipe.notes || []),
      ...(recipe.duplicate_posology || []),
    ].forEach(push);
    recipe.rows?.forEach((row) => push(`${row.label} ${row.value}`));
    recipe.phase_doses?.forEach((phase) => push(phase.label));
    if (recipe.dose_based_dilution) {
      push(recipe.dose_based_dilution.below_or_equal);
      push(recipe.dose_based_dilution.above);
    }
  });

  return out.map(normalizePrepDuplicateText).filter((text) => text.length >= 12);
};

export const isPosoDuplicateOfPrep = (line: string, prepTexts: string[]) => {
  const normalized = normalizePrepDuplicateText(line);
  if (normalized.length < 12 || /^voies? /.test(normalized)) return false;
  return prepTexts.some((prepText) => {
    if (prepText === normalized) return true;
    return (
      Math.min(prepText.length, normalized.length) >= 24 &&
      (prepText.includes(normalized) || normalized.includes(prepText))
    );
  });
};

const normalizePrepPresentationText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[→⇒]/g, " ")
    .replace(/[^a-z0-9µ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const prepStepDetail = (title: string, detail: string, result: string) => {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withoutRepeatedAction = detail
    .replace(new RegExp(`^\\s*${escapedTitle}\\s*[:—–-]\\s*`, "i"), "")
    .trim();

  return normalizePrepPresentationText(withoutRepeatedAction) ===
    normalizePrepPresentationText(result)
    ? ""
    : withoutRepeatedAction;
};
