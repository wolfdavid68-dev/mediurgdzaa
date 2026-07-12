import { useCallback, useEffect, useRef, useState } from "react";
import type { ClinicalScale, ScaleItem } from "../types/data";
import WallaceCalculator, { formatWallacePercent, type WallaceResult } from "./WallaceCalculator";

type ScaleCardProps = {
  scale: ClinicalScale;
  autoOpen?: boolean;
  onAutoOpen?: () => void;
};

const ScaleCard = ({ scale, autoOpen, onAutoOpen }: ScaleCardProps) => {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [sumSelections, setSumSelections] = useState<Record<number, number>>({});
  const [variantSelections, setVariantSelections] = useState<Record<number, string>>({});
  const [pickedScore, setPickedScore] = useState<number | null>(null);
  const [wallaceResult, setWallaceResult] = useState<WallaceResult>(() => ({
    total: 0,
    interpretation: scale.interpret(0),
  }));

  useEffect(() => {
    if (!autoOpen) return;
    setOpen(true);
    onAutoOpen?.();
    cardRef.current?.scrollIntoView({ block: "start" });
  }, [autoOpen, onAutoOpen]);

  const isSum = scale.type === "sum";
  const isWallace = isSum && scale.id === "wallace";
  const total: number | null = isWallace
    ? wallaceResult.total
    : isSum
      ? Object.values(sumSelections).reduce((sum, value) => sum + value, 0)
      : pickedScore;
  const allAnswered = isSum
    ? isWallace || scale.items.every((_, index) => typeof sumSelections[index] === "number")
    : pickedScore !== null;
  const totalSafe = total ?? 0;
  const interpretation = allAnswered
    ? isWallace
      ? wallaceResult.interpretation
      : scale.interpret(totalSafe)
    : null;

  const handleWallaceResult = useCallback((result: WallaceResult) => {
    setWallaceResult(result);
  }, []);

  const reset = () => {
    setSumSelections({});
    setVariantSelections({});
    setPickedScore(null);
  };

  const getActiveOptions = (item: ScaleItem, index: number) => {
    if (!item.variants) return item.options;
    const variantId = variantSelections[index];
    if (!variantId) return null;
    return item.variants.find((variant) => variant.id === variantId)?.options ?? null;
  };

  const formattedScore = isWallace
    ? formatWallacePercent(totalSafe)
    : isSum
      ? totalSafe
      : totalSafe > 0
        ? `+${totalSafe}`
        : totalSafe;

  return (
    <div ref={cardRef} className={`scale-card ${open ? "scale-card-open" : ""}`}>
      <button
        type="button"
        className="scale-header"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="scale-icon" aria-hidden="true">
          {scale.icon}
        </span>
        <div className="scale-title-block">
          <h3 className="scale-title">{scale.nom}</h3>
          {!open && <p className="scale-description">{scale.description}</p>}
        </div>
        {allAnswered && interpretation && (
          <span className="scale-header-score" style={{ background: interpretation.color }}>
            {formattedScore}
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
          {isWallace ? (
            <WallaceCalculator
              scale={scale as Extract<ClinicalScale, { type: "sum" }>}
              onResultChange={handleWallaceResult}
            />
          ) : isSum ? (
            <div className="scale-items">
              {scale.items.map((item, index) => {
                const activeOptions = getActiveOptions(item, index);
                return (
                  <div key={item.label} className="scale-item">
                    <div className="scale-item-label">{item.label}</div>
                    {item.variants && (
                      <div className="scale-variants">
                        {item.variants.map((variant) => {
                          const selected = variantSelections[index] === variant.id;
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              className={`scale-variant ${selected ? "scale-variant-active" : ""}`}
                              onClick={() => {
                                setVariantSelections((current) => ({
                                  ...current,
                                  [index]: variant.id,
                                }));
                                setSumSelections((current) => {
                                  const next = { ...current };
                                  delete next[index];
                                  return next;
                                });
                              }}
                            >
                              {variant.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {activeOptions ? (
                      <div className="scale-item-options">
                        {activeOptions.map((option) => (
                          <button
                            key={option.score}
                            type="button"
                            className={`scale-opt ${
                              sumSelections[index] === option.score ? "scale-opt-active" : ""
                            }`}
                            onClick={() =>
                              setSumSelections((current) => ({
                                ...current,
                                [index]: option.score,
                              }))
                            }
                          >
                            <span className="scale-opt-score">{option.score}</span>
                            <span className="scale-opt-label">{option.label}</span>
                          </button>
                        ))}
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
              {scale.options.map((option) => (
                <button
                  key={option.score}
                  type="button"
                  className={`scale-pick ${
                    pickedScore === option.score ? "scale-pick-active" : ""
                  }`}
                  onClick={() => setPickedScore(option.score)}
                >
                  <span className="scale-pick-score">
                    {option.score > 0 ? `+${option.score}` : option.score}
                  </span>
                  <span className="scale-pick-content">
                    <strong>{option.label}</strong>
                    {option.description && (
                      <span className="scale-pick-desc">{option.description}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!isWallace && (
            <footer className="scale-footer">
              <div className="scale-total">
                <span className="scale-total-label">Total</span>
                <span className="scale-total-value">{allAnswered ? formattedScore : "—"}</span>
                {interpretation && (
                  <span className="scale-badge" style={{ background: interpretation.color }}>
                    {interpretation.severity}
                  </span>
                )}
              </div>
              <button type="button" className="scale-reset" onClick={reset}>
                Réinitialiser
              </button>
            </footer>
          )}
        </>
      )}
    </div>
  );
};

export default ScaleCard;
