import { PREP_KITS } from "../data/prepKits";
import PrepKitCard from "./PrepKitCard";

type ProtocolKitsViewProps = {
  patientWeight: string;
  autoOpenKitId?: string | null;
  autoOpenKitTab?: string | null;
  onAutoOpenKit?: () => void;
};

const ProtocolKitsView = ({
  patientWeight,
  autoOpenKitId,
  autoOpenKitTab,
  onAutoOpenKit,
}: ProtocolKitsViewProps) => (
  <div className="protocol-list">
    {PREP_KITS.map((kit) => (
      <PrepKitCard
        key={kit.id}
        kit={kit}
        patientWeight={patientWeight}
        autoOpen={autoOpenKitId != null && autoOpenKitId === kit.id}
        autoOpenTab={autoOpenKitTab}
        onAutoOpen={onAutoOpenKit}
      />
    ))}
  </div>
);

export default ProtocolKitsView;
