import { useState } from "react";

// Affiche une échelle clinique interactive (Glasgow, RASS, Cushman...).
// L'état des sélections est local — pas de persistence entre ouvertures :
// un score ne représente jamais un patient passé, toujours « ici et maintenant ».
//
// Repliable au clic sur le header (comme DrugCard) — sinon 3 échelles
// totalement étendues sur la même page = écran inutilisable.
//
// Deux types de comportement selon scale.type :
// - "sum"         : N items indépendants, chacun a un score, total = somme
// - "single-pick" : une seule option à choisir dans la liste, total = ce score
//
// Un item de type "sum" peut avoir `variants` au lieu d'`options` : il faut
// alors choisir d'abord un variant (ex: tranche d'âge pour la PA dans Cushman),
// puis l'option dans le barème de ce variant.

const ScaleCard = ({ scale }) => {
  const [open, setOpen] = useState(false);
  const [sumSelections, setSumSelections] = useState({});
  const [variantSelections, setVariantSelections] = useState({});
  const [pickedScore, setPickedScore] = useState(null);

  const isSum = scale.type === "sum";

  const total = isSum
    ? (Object.values(sumSelections) as number[]).reduce((acc, v) => acc + v, 0)
    : pickedScore;

  const allAnswered = isSum
    ? scale.items.every((_, i) => typeof sumSelections[i] === "number")
    : pickedScore !== null;

  const interp = allAnswered ? scale.interpret(total) : null;

  const reset = () => {
    setSumSelections({});
    setVariantSelections({});
    setPickedScore(null);
  };

  // Pour un item avec variants : on n'autorise le clic sur les options que
  // si un variant a été choisi. Sinon les options ne s'affichent pas.
  const getActiveOptions = (item, i) => {
    if (!item.variants) return item.options;
    const variantId = variantSelections[i];
    if (!variantId) return null;
    const v = item.variants.find((x) => x.id === variantId);
    return v ? v.options : null;
  };

  return (
    <div className={`scale-card ${open ? "scale-card-open" : ""}`}>
      <button
        type="button"
        className="scale-header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="scale-icon" aria-hidden="true">
          {scale.icon}
        </span>
        <div className="scale-title-block">
          <h3 className="scale-title">{scale.nom}</h3>
          {!open && <p className="scale-description">{scale.description}</p>}
        </div>
        {allAnswered && (
          <span className="scale-header-score" style={{ background: interp.color }}>
            {isSum ? total : total > 0 ? `+${total}` : total}
          </span>
        )}
        <svg
          className={`chevron ${open ? "chevron-open" : ""}`}
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          <p className="scale-description scale-description-open">{scale.description}</p>

          {isSum ? (
            <div className="scale-items">
              {scale.items.map((item, i) => {
                const activeOptions = getActiveOptions(item, i);
                return (
                  <div key={i} className="scale-item">
                    <div className="scale-item-label">{item.label}</div>

                    {item.variants && (
                      <div className="scale-variants">
                        {item.variants.map((v) => {
                          const selected = variantSelections[i] === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              className={`scale-variant ${selected ? "scale-variant-active" : ""}`}
                              onClick={() => {
                                setVariantSelections({ ...variantSelections, [i]: v.id });
                                // Reset le score de cet item si on change de variant
                                const next = { ...sumSelections };
                                delete next[i];
                                setSumSelections(next);
                              }}
                            >
                              {v.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {activeOptions ? (
                      <div className="scale-item-options">
                        {activeOptions.map((opt) => {
                          const selected = sumSelections[i] === opt.score;
                          return (
                            <button
                              key={opt.score}
                              type="button"
                              className={`scale-opt ${selected ? "scale-opt-active" : ""}`}
                              onClick={() => setSumSelections({ ...sumSelections, [i]: opt.score })}
                            >
                              <span className="scale-opt-score">{opt.score}</span>
                              <span className="scale-opt-label">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="scale-variant-hint">↑ Choisissez d'abord la tranche d'âge.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="scale-pick-list">
              {scale.options.map((opt) => {
                const selected = pickedScore === opt.score;
                return (
                  <button
                    key={opt.score}
                    type="button"
                    className={`scale-pick ${selected ? "scale-pick-active" : ""}`}
                    onClick={() => setPickedScore(opt.score)}
                  >
                    <span className="scale-pick-score">
                      {opt.score > 0 ? `+${opt.score}` : opt.score}
                    </span>
                    <span className="scale-pick-content">
                      <strong>{opt.label}</strong>
                      {opt.description && (
                        <span className="scale-pick-desc">{opt.description}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <footer className="scale-footer">
            <div className="scale-total">
              <span className="scale-total-label">Total</span>
              <span className="scale-total-value">
                {allAnswered ? (isSum ? total : total > 0 ? `+${total}` : total) : "—"}
              </span>
              {interp && (
                <span className="scale-badge" style={{ background: interp.color }}>
                  {interp.severity}
                </span>
              )}
            </div>
            <button type="button" className="scale-reset" onClick={reset}>
              Réinitialiser
            </button>
          </footer>
        </>
      )}
    </div>
  );
};

export default ScaleCard;
