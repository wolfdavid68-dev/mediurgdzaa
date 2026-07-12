import EcgDiagnostic from "./EcgDiagnostic";
import EcgReader from "./EcgReader";

const ProtocolEcgView = ({ onDrugSearch }: { onDrugSearch: (name: string) => void }) => (
  <>
    <div className="ecg-reader-shell">
      <EcgReader onDrugSearch={onDrugSearch} />
    </div>
    <EcgDiagnostic />
  </>
);

export default ProtocolEcgView;
