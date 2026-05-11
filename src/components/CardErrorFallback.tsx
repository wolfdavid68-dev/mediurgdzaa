// Fallback rendu par <ErrorBoundary> de react-error-boundary quand une carte
// (DrugCard, ProtocolCard) lève une exception au render. Cas typique en
// production : un changement de schéma data partiellement déployé, un parsing
// regex inattendu sur une chaîne mal formée. Sans ce filet, une seule entrée
// corrompue blank l'écran entier ; ici, on isole la carte fautive et le reste
// de la liste reste utilisable — critique en réa.
//
// resetErrorBoundary() est passé par react-error-boundary, permet de retry le
// rendu après que l'utilisateur ait fait défiler / changé de page (ex: utile
// si l'erreur dépendait d'un state transitoire).
const CardErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => (
  <div className="card-error" role="alert">
    <div className="card-error-icon" aria-hidden="true">
      ⚠️
    </div>
    <div className="card-error-body">
      <strong>Fiche temporairement indisponible</strong>
      <span className="card-error-message">{error.message || "Erreur de rendu"}</span>
    </div>
    <button type="button" className="card-error-retry" onClick={resetErrorBoundary}>
      Réessayer
    </button>
  </div>
);

export default CardErrorFallback;
