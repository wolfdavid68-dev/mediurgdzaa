// Banner discret affiché sous le header quand le device est hors-ligne.
// Formulation rassurante : on met en avant que le cœur de l'app fonctionne
// hors-ligne (médicaments, protocoles, calculs, check-lists) ; seule
// l'analyse ECG par photo (IA) requiert le réseau. Utile en SMUR avec une
// mauvaise 4G avant de lancer une feature réseau.

const OfflineBanner = ({ isOnline }: { isOnline: boolean }) => {
  if (isOnline) return null;
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span className="offline-banner-ic" aria-hidden="true">
        ⚠
      </span>
      <span className="offline-banner-txt">
        Mode hors-ligne — médicaments, protocoles, calculs et check-lists fonctionnent normalement.
        Seule l'analyse ECG par photo nécessite une connexion.
      </span>
    </div>
  );
};

export default OfflineBanner;
