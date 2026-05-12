// Overlay préparation rapide d'une drogue ACR (Adré / Cordarone).
// Affiché par-dessus le chrono (position: absolute, z-index plus haut que
// .acr-zoom) pour ne pas perdre le décompte. L'utilisateur peut toujours
// basculer vers la fiche complète si besoin (= ancien comportement).
const AcrPrepOverlay = ({ drugName, content, pediatric, onClose, onOpenFullSheet }) => {
  const data = pediatric ? content.enfant : content.adulte;
  const mode = pediatric ? "Enfant" : "Adulte";
  return (
    <div
      className="acr-prep-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Préparation ${drugName} ${mode}`}
    >
      <div className="acr-prep-header" style={{ background: content.couleur }}>
        <span className="acr-prep-header-title">
          <span aria-hidden="true">{content.icon}</span> {drugName} · {mode}
        </span>
        <button
          type="button"
          className="acr-prep-close"
          onClick={onClose}
          aria-label="Fermer la fiche préparation"
        >
          ×
        </button>
      </div>
      <div className="acr-prep-body">
        <div className="acr-prep-dose">
          <div className="acr-prep-dose-label">Dose</div>
          <div className="acr-prep-dose-value">{data.dose}</div>
          <div
            className={`acr-prep-mode-tag ${data.pure ? "acr-prep-mode-pure" : "acr-prep-mode-dilute"}`}
          >
            {data.pure ? "PUR (sans dilution)" : "DILUER avant injection"}
          </div>
        </div>

        <div className="acr-prep-section">
          <div className="acr-prep-section-title">Préparation</div>
          <ol className="acr-prep-steps">
            {data.etapes.map((step, i) => (
              <li key={i} className="acr-prep-step">
                {step}
              </li>
            ))}
          </ol>
        </div>

        {data.notes && data.notes.length > 0 && (
          <div className="acr-prep-section">
            <div className="acr-prep-section-title">À retenir</div>
            <ul className="acr-prep-notes">
              {data.notes.map((n, i) => (
                <li key={i} className="acr-prep-note">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="acr-prep-footer">
        <button type="button" className="acr-prep-back" onClick={onClose}>
          ← Retour au chrono
        </button>
        {onOpenFullSheet && (
          <button
            type="button"
            className="acr-prep-full"
            onClick={onOpenFullSheet}
            title="Quitter le mode ACR pour voir la fiche complète"
          >
            Fiche complète ↗
          </button>
        )}
      </div>
    </div>
  );
};

export default AcrPrepOverlay;
