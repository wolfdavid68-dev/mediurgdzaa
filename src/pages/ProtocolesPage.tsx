import { useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ProtocolCard from "../components/ProtocolCard";
import CardErrorFallback from "../components/CardErrorFallback";
import { PROTOCOLS } from "../data/protocols";
import { PREP_KITS } from "../data/prepKits";

// Tout en import STATIQUE (PAS de lazy). Un chunk lazy peut échouer hors-ligne
// si son hash ne matche pas le précache du SW → crash. Ces sous-onglets doivent
// marcher hors-ligne, donc ils vivent dans le bundle principal (chargé avec
// index.html). Cf. App.tsx.
import IncompatibilityList from "../components/IncompatibilityList";
import PrepKitCard from "../components/PrepKitCard";
import EcgDiagnostic from "../components/EcgDiagnostic";
import EcgReader from "../components/EcgReader";

// Page Protocoles avec ses 3 sous-onglets (PISU, Incompatibilités, Kits).
// Imports data en interne → quand App.jsx la lazy-load, PROTOCOLS et
// PREP_KITS sortent du bundle initial (gain ~100 kB).
type ProtocolesPageProps = {
  protoCategory: string;
  changeProtoCategory: (cat: string) => void;
  onDrugSearch: (name: string) => void;
};

const ProtocolesPage = ({
  protoCategory,
  changeProtoCategory,
  onDrugSearch,
}: ProtocolesPageProps) => {
  const [protoFilter, setProtoFilter] = useState("Tout");

  const filteredProtocols = useMemo(() => {
    if (protoFilter === "Tout") return PROTOCOLS;
    return PROTOCOLS.filter((p) => {
      const isEnfant = p.code.includes("ENF") || p.titre.includes("Enfant");
      const isAdulte = !isEnfant && p.titre.includes("Adulte");
      const isTous = !isEnfant && !isAdulte;
      if (protoFilter === "Enfant") return isEnfant || isTous;
      if (protoFilter === "Adulte") return isAdulte || isTous;
      return true;
    });
  }, [protoFilter]);

  return (
    <>
      <div className="proto-category-bar">
        <button
          className={`proto-category-tab ${protoCategory === "PISU" ? "proto-category-active" : ""}`}
          onClick={() => changeProtoCategory("PISU")}
        >
          PISU
          <span className="proto-category-count">{filteredProtocols.length}</span>
        </button>
        <button
          className={`proto-category-tab ${protoCategory === "incompatibilites" ? "proto-category-active" : ""}`}
          onClick={() => changeProtoCategory("incompatibilites")}
        >
          Incompat.
        </button>
        <button
          className={`proto-category-tab ${protoCategory === "ecg" ? "proto-category-active" : ""}`}
          onClick={() => changeProtoCategory("ecg")}
        >
          ECG
        </button>
        <button
          className={`proto-category-tab ${protoCategory === "kits" ? "proto-category-active" : ""}`}
          onClick={() => changeProtoCategory("kits")}
        >
          Kits
          <span className="proto-category-count">{PREP_KITS.length}</span>
        </button>
      </div>

      {protoCategory === "incompatibilites" && <IncompatibilityList />}

      {protoCategory === "ecg" && (
        <>
          {/* Lecteur ECG (photo → analyse IA) : visible pour tous. Outil
              d'aide à la décision en test, ne remplace pas l'interprétation
              médicale. Nécessite le réseau (analyse) — cf. OfflineBanner. */}
          <div style={{ marginBottom: 16 }}>
            <EcgReader onDrugSearch={onDrugSearch} />
          </div>
          <EcgDiagnostic />
        </>
      )}

      {protoCategory === "kits" && (
        <div className="protocol-list">
          {PREP_KITS.map((k) => (
            <PrepKitCard key={k.id} kit={k} />
          ))}
        </div>
      )}

      {protoCategory === "PISU" && (
        <>
          <div className="proto-filter-bar">
            {["Tout", "Adulte", "Enfant"].map((f) => (
              <button
                key={f}
                className={`proto-filter-chip ${protoFilter === f ? "proto-filter-active" : ""}`}
                onClick={() => setProtoFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="protocol-list">
            {filteredProtocols.map((p) => (
              <ErrorBoundary key={p.id} FallbackComponent={CardErrorFallback}>
                <ProtocolCard protocol={p} onDrugSearch={onDrugSearch} />
              </ErrorBoundary>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default ProtocolesPage;
