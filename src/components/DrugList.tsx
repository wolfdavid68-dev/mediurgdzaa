import { ErrorBoundary } from "react-error-boundary";
import DrugCard from "./DrugCard";
import CardErrorFallback from "./CardErrorFallback";
import type { Drug } from "../types/data";

// Chaque DrugCard est isolée dans son propre ErrorBoundary : si une carte crashe
// (data malformée, regex inattendue dans calcDose, etc.), seule cette carte
// affiche le fallback ; toutes les autres restent fonctionnelles. En réa, c'est
// la différence entre « 1 médicament temporairement indisponible » et « l'app
// est dead, je dois la fermer pour la rouvrir ».
type DrugListProps = {
  drugs: Drug[];
  favorites?: Set<number>;
  patientWeight?: string;
  prepPopulation?: "adulte" | "enfant" | null;
  onToggleFavorite?: (id: number) => void;
  onOpen?: (id: number) => void;
  onOpenChange?: (key: string, open: boolean) => void;
  onProtocolOpen?: () => void;
};

const DrugList = ({
  drugs,
  favorites,
  patientWeight,
  prepPopulation,
  onToggleFavorite,
  onOpen,
  onOpenChange,
  onProtocolOpen,
}: DrugListProps) => {
  return (
    <div className="drug-list-grid">
      {drugs.map((drug) => (
        <ErrorBoundary key={drug.id} FallbackComponent={CardErrorFallback}>
          <DrugCard
            drug={drug}
            isFavorite={favorites?.has(drug.id) || false}
            patientWeight={patientWeight}
            prepPopulation={prepPopulation}
            onToggleFavorite={onToggleFavorite}
            onOpen={onOpen}
            onOpenChange={onOpenChange}
            onProtocolOpen={onProtocolOpen}
          />
        </ErrorBoundary>
      ))}
    </div>
  );
};

export default DrugList;
