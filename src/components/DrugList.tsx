import { ErrorBoundary } from "react-error-boundary";
import DrugCard from "./DrugCard";
import CardErrorFallback from "./CardErrorFallback";

// Chaque DrugCard est isolée dans son propre ErrorBoundary : si une carte crashe
// (data malformée, regex inattendue dans calcDose, etc.), seule cette carte
// affiche le fallback ; toutes les autres restent fonctionnelles. En réa, c'est
// la différence entre « 1 médicament temporairement indisponible » et « l'app
// est dead, je dois la fermer pour la rouvrir ».
const DrugList = ({ drugs, favorites, onToggleFavorite, onOpen }) => {
  return (
    <div className="drug-list-grid">
      {drugs.map((drug) => (
        <ErrorBoundary key={drug.id} FallbackComponent={CardErrorFallback}>
          <DrugCard
            drug={drug}
            isFavorite={favorites?.has(drug.id) || false}
            onToggleFavorite={onToggleFavorite}
            onOpen={onOpen}
          />
        </ErrorBoundary>
      ))}
    </div>
  );
};

export default DrugList;
