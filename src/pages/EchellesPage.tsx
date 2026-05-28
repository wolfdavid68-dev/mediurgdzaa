import { ErrorBoundary } from "react-error-boundary";
import { SCALES } from "../data/scales";
import ScaleCard from "../components/ScaleCard";
import CardErrorFallback from "../components/CardErrorFallback";
import type { ClinicalScale } from "../types/data";

// Page autonome (3e tab du bottom-nav). Liste les échelles cliniques avec
// chacune son propre calculateur interactif. Lazy-loadée depuis App.tsx :
// les données scales.js (~6 kB) ne pèsent dans le bundle que si l'utilisateur
// ouvre cette tab.
const EchellesPage = () => {
  const scales = SCALES as ClinicalScale[];
  return (
    <div className="echelles-page">
      <p className="echelles-intro">
        Calculateurs interactifs. Sélectionnez chaque item, le score se met à jour en direct. État
        réinitialisé à chaque ouverture (jamais associé à un patient précis).
      </p>
      <div className="echelles-list">
        {scales.map((scale) => (
          <ErrorBoundary key={scale.id} FallbackComponent={CardErrorFallback}>
            <ScaleCard scale={scale} />
          </ErrorBoundary>
        ))}
      </div>
    </div>
  );
};

export default EchellesPage;
