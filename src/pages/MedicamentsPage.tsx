import DrugList from "../components/DrugList";
import type { Drug } from "../types/data";

// Page Médicaments — contenu seul (la search bar + filtres restent dans App.tsx,
// dans le header sticky, car couplés au state global `search` qui est aussi
// piloté depuis l'extérieur — `onDrugSearch` de ProtocolesPage / EcgReader /
// AcrModeModal appelle `setSearch(name)`. Découpler nécessiterait un context
// ou ref forwarded ; pas d'intérêt pour l'instant.

type MedicamentsPageProps = {
  filtered: Drug[];
  recentDrugs: Drug[];
  favorites: Set<number>;
  showFavoritesOnly: boolean;
  patientWeight: string;
  prepPopulation?: "adulte" | "enfant" | null;
  prepV25Enabled?: boolean;
  autoOpenDrugId?: number | null;
  onAutoOpenDrug?: () => void;
  onToggleFavorite: (id: number) => void;
  onOpen: (id: number) => void;
  onOpenChange: (key: string, open: boolean) => void;
  onProtocolOpen?: () => void;
};

const MedicamentsPage = ({
  filtered,
  recentDrugs,
  favorites,
  showFavoritesOnly,
  patientWeight,
  prepPopulation,
  prepV25Enabled,
  autoOpenDrugId,
  onAutoOpenDrug,
  onToggleFavorite,
  onOpen,
  onOpenChange,
  onProtocolOpen,
}: MedicamentsPageProps) => {
  if (filtered.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">🔍</div>
        <p>Aucun médicament trouvé</p>
        <small>
          {showFavoritesOnly
            ? "Aucun favori — étoilez un médicament avec ☆"
            : "Essayez un autre terme ou réinitialisez les filtres"}
        </small>
      </div>
    );
  }

  return (
    <>
      {recentDrugs.length > 0 && (
        <div className="recent-section">
          <div className="recent-header">
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Récents</span>
          </div>
          <DrugList
            drugs={recentDrugs}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onOpen={onOpen}
            onOpenChange={onOpenChange}
            onProtocolOpen={onProtocolOpen}
            patientWeight={patientWeight}
            prepPopulation={prepPopulation}
            prepV25Enabled={prepV25Enabled}
          />
        </div>
      )}
      <DrugList
        drugs={filtered}
        favorites={favorites}
        autoOpenDrugId={autoOpenDrugId}
        onAutoOpenDrug={onAutoOpenDrug}
        onToggleFavorite={onToggleFavorite}
        onOpen={onOpen}
        onOpenChange={onOpenChange}
        onProtocolOpen={onProtocolOpen}
        patientWeight={patientWeight}
        prepPopulation={prepPopulation}
        prepV25Enabled={prepV25Enabled}
      />
    </>
  );
};

export default MedicamentsPage;
