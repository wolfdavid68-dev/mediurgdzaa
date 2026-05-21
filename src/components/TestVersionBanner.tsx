// Bandeau permanent affiché tout en haut de l'écran tant que les valeurs
// cliniques ne sont pas validées par un référent. Sticky → reste visible
// quand on scrolle. Rendu aussi à l'intérieur du <dialog> ACR (top layer
// natif → invisible derrière sinon). À retirer une fois la base validée.

const TestVersionBanner = () => (
  <div className="test-banner" role="status" aria-live="polite">
    <span className="test-banner-ic" aria-hidden="true">
      🧪
    </span>
    <span className="test-banner-txt">
      <strong>Version test</strong> — Les valeurs affichées sont en cours de validation
    </span>
  </div>
);

export default TestVersionBanner;
