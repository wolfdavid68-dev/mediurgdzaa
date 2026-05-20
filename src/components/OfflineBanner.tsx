// Banner discret affiché sous le header quand le device est hors-ligne.
// Le badge "Offline" dans AppHeader reste (vu d'un coup d'œil), mais ce
// banner explique ce qui est réellement indisponible (analyse ECG IA + auth)
// — utile en stress quand on s'apprête à utiliser une feature qui requiert
// le réseau alors qu'on est en SMUR avec une mauvaise 4G.

const OfflineBanner = ({ isOnline }: { isOnline: boolean }) => {
  if (isOnline) return null;
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span className="offline-banner-ic" aria-hidden="true">
        ⚠
      </span>
      <span className="offline-banner-txt">
        Hors ligne — médicaments, protocoles et calculs restent dispo. L'analyse ECG par photo et la
        connexion admin ne fonctionnent pas.
      </span>
    </div>
  );
};

export default OfflineBanner;
