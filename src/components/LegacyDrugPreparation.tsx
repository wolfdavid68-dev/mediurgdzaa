import type { Drug } from "../types/data";
import "../styles/drug-preparation.css";
import "../styles/pse.css";
import PrepBlock from "./PrepBlock";
import PseBlock from "./PseBlock";

type LegacyDrugPreparationProps = {
  drug: Drug;
  weight: string;
  prepPopulation?: "adulte" | "enfant" | null;
};

const LegacyDrugPreparation = ({ drug, weight, prepPopulation }: LegacyDrugPreparationProps) => (
  <>
    <PrepBlock drug={drug} weight={weight} prepPopulation={prepPopulation} />
    <PseBlock drug={drug} weight={weight} />
  </>
);

export default LegacyDrugPreparation;
