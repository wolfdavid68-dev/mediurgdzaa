import { useMemo, lazy, Suspense, useState } from "react";
import ProtocolCard from "../components/ProtocolCard";
import { PROTOCOLS } from "../data/protocols";
import { PREP_KITS } from "../data/prepKits";

// Sous-onglets lourds : lazy par-dessus, leur data se charge avec eux.
const IncompatibilityList = lazy(() => import("../components/IncompatibilityList"));
const PrepKitCard         = lazy(() => import("../components/PrepKitCard"));

// Page Protocoles avec ses 3 sous-onglets (PISU, Incompatibilités, Kits).
// Imports data en interne → quand App.jsx la lazy-load, PROTOCOLS et
// PREP_KITS sortent du bundle initial (gain ~100 kB).
const ProtocolesPage = ({ protoCategory, changeProtoCategory, onDrugSearch }) => {
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
          Incompatibilité Médicamenteuse
        </button>
        <button
          className={`proto-category-tab ${protoCategory === "kits" ? "proto-category-active" : ""}`}
          onClick={() => changeProtoCategory("kits")}
        >
          Kits de préparation
          <span className="proto-category-count">{PREP_KITS.length}</span>
        </button>
      </div>

      {protoCategory === "incompatibilites" && (
        <Suspense fallback={null}>
          <IncompatibilityList />
        </Suspense>
      )}

      {protoCategory === "kits" && (
        <Suspense fallback={null}>
          <div className="protocol-list">
            {PREP_KITS.map((k) => (
              <PrepKitCard key={k.id} kit={k} />
            ))}
          </div>
        </Suspense>
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
              <ProtocolCard key={p.id} protocol={p} onDrugSearch={onDrugSearch} />
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default ProtocolesPage;
