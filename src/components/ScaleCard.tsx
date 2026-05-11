import { useState } from "react";

// Affiche une échelle clinique interactive (Glasgow, RASS, Cushman...).
// L'état des sélections est local — pas de persistence entre ouvertures :
// un score ne représente jamais un patient passé, toujours « ici et maintenant ».
//
// Deux types de comportement selon scale.type :
// - "sum"         : N items indépendants, chacun a un score, total = somme
// - "single-pick" : une seule option à choisir dans la liste, total = ce score

const ScaleCard = ({ scale }) => {
  // Pour "sum" : map item index → score sélectionné (ou undefined)
  // Pour "single-pick" : un seul score sélectionné (ou null)
  const [sumSelections, setSumSelections] = useState({});
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
    setPickedScore(null);
  };

  return (
    <div className="scale-card">
      <header className="scale-header">
        <span className="scale-icon" aria-hidden="true">
          {scale.icon}
        </span>
        <div className="scale-title-block">
          <h3 className="scale-title">{scale.nom}</h3>
          <p className="scale-description">{scale.description}</p>
        </div>
      </header>

      {isSum ? (
        <div className="scale-items">
          {scale.items.map((item, i) => (
            <div key={i} className="scale-item">
              <div className="scale-item-label">{item.label}</div>
              <div className="scale-item-options">
                {item.options.map((opt) => {
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
            </div>
          ))}
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
                  {opt.description && <span className="scale-pick-desc">{opt.description}</span>}
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
    </div>
  );
};

export default ScaleCard;
