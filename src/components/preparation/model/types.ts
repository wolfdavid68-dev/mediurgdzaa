import type { DrugPrep, PrepRecipe } from "../../PrepBlock.parts";
import type { PseEntry } from "../../PseBlock.parts";
import type { Drug } from "../../../types/data";

export type PreparationPopulation = "adulte" | "enfant";

export type PreparationStep = {
  title: string;
  detail: string;
  result: string;
  phaseDose?: boolean;
  doseSummary?: string;
  volumeRole?: NonNullable<PrepRecipe["calculated_volume_role"]>;
};

export type PreparationMetric = {
  label: string;
  value: string;
  note: string;
  kind?: "dose" | "volume" | "administration";
  control?: PreparationControl;
};

export type PreparationNumericControl = {
  kind: "pse" | "recipe";
  value: number;
  unit?: string;
  result?: string;
  steps?: number[];
  step?: number;
  min?: number;
  max?: number;
};

export type PreparationControl =
  | PreparationNumericControl
  | {
      kind: "age";
      value: "lt6" | "gte6" | null;
      options: Array<{ value: "lt6" | "gte6"; label: string }>;
    };

export type PreparationMode = {
  title: string;
  detail: string;
};

export type PreparationModel = {
  activeRecipe: PrepRecipe | null;
  modes: PreparationMode[];
  recipes: PrepRecipe[];
  metrics: [PreparationMetric, PreparationMetric, PreparationMetric];
  steps: PreparationStep[];
  notes: string[];
  controls: string[];
  context: string;
  canValidate: boolean;
  validationReason: string | null;
  hasPreparation: boolean;
  hasDetailedCalculation: boolean;
  isPse: boolean;
  pseSteps: number[];
  programmedRateMlH: number | null;
};

export type BuildPreparationModelArgs = {
  drug: Drug;
  prep: DrugPrep | null;
  pse: PseEntry | null;
  population: PreparationPopulation;
  weight: string;
  recipeIndex: number;
  pseInput: number;
  recipeInput?: number | null;
  ageBand?: "lt6" | "gte6" | null;
  monitoringLabel: string;
};
