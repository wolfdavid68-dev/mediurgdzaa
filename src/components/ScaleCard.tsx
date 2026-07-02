import { useState, type KeyboardEvent } from "react";
import type { ClinicalScale, ScaleItem } from "../types/data";

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

type ScaleCardProps = { scale: ClinicalScale };

const formatWallacePercent = (value: number) =>
  `${Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(".", ",")} %`;

const WALLACE_REGION_INDEX = {
  tete: 0,
  msd: 1,
  msg: 2,
  tra: 3,
  trp: 4,
  mid: 5,
  mig: 6,
  per: 7,
} as const;

type WallaceRegionId = keyof typeof WALLACE_REGION_INDEX;
type WallaceView = "front" | "back";

const WALLACE_REGION_LABEL: Record<WallaceRegionId, string> = {
  tete: "Tête et cou",
  msd: "Membre supérieur droit",
  msg: "Membre supérieur gauche",
  tra: "Tronc antérieur",
  trp: "Tronc postérieur",
  mid: "Membre inférieur droit",
  mig: "Membre inférieur gauche",
  per: "Périnée",
};

const WALLACE_REGION_COLOR: Record<WallaceRegionId, string> = {
  tete: "wallace-dot-head",
  msd: "wallace-dot-arm-r",
  msg: "wallace-dot-arm-l",
  tra: "wallace-dot-trunk-a",
  trp: "wallace-dot-trunk-p",
  mid: "wallace-dot-leg-r",
  mig: "wallace-dot-leg-l",
  per: "wallace-dot-per",
};

const ScaleCard = ({ scale }: ScaleCardProps) => {
  const [open, setOpen] = useState(false);
  const [sumSelections, setSumSelections] = useState<Record<number, number>>({});
  const [variantSelections, setVariantSelections] = useState<Record<number, string>>({});
  const [pickedScore, setPickedScore] = useState<number | null>(null);
  const [wallaceWeight, setWallaceWeight] = useState("");
  const [wallaceView, setWallaceView] = useState<WallaceView>("front");

  const isSum = scale.type === "sum";
  const isWallace = isSum && scale.id === "wallace";

  // Total : null tant qu'aucune réponse en mode "pick" (allAnswered=false).
  // En mode "sum", on commence à 0 et l'interprétation attend allAnswered.
  const total: number | null = isSum
    ? Object.values(sumSelections).reduce((acc, v) => acc + (v as number), 0)
    : pickedScore;

  const allAnswered = isSum
    ? isWallace || scale.items.every((_, i) => typeof sumSelections[i] === "number")
    : pickedScore !== null;

  // total est garanti non-null quand allAnswered=true (allAnswered le vérifie).
  // Le ?? 0 est défensif : strictNullChecks ne peut pas inférer ce lien.
  const totalSafe = total ?? 0;
  const interp = allAnswered ? scale.interpret(totalSafe) : null;

  const reset = () => {
    setSumSelections({});
    setVariantSelections({});
    setPickedScore(null);
    setWallaceWeight("");
  };

  // Pour un item avec variants : on n'autorise le clic sur les options que
  // si un variant a été choisi. Sinon les options ne s'affichent pas.
  const getActiveOptions = (item: ScaleItem, i: number) => {
    if (!item.variants) return item.options;
    const variantId = variantSelections[i];
    if (!variantId) return null;
    const v = item.variants.find((x) => x.id === variantId);
    return v ? v.options : null;
  };

  const parsedWallaceWeight = Number.parseFloat(wallaceWeight.replace(",", "."));
  const parklandVolume =
    Number.isFinite(parsedWallaceWeight) && parsedWallaceWeight > 0 && totalSafe > 0
      ? 4 * parsedWallaceWeight * totalSafe
      : null;
  const cycleWallaceRegion = (index: number) => {
    if (!isWallace) return;
    const item = scale.items[index];
    if (!item?.options || item.options.length === 0) return;
    const currentScore = sumSelections[index] ?? 0;
    const currentIndex = item.options.findIndex((option) => option.score === currentScore);
    const next = item.options[(currentIndex + 1) % item.options.length] ?? item.options[0];
    setSumSelections({ ...sumSelections, [index]: next.score });
  };
  const wallaceRegionClass = (index: number) => {
    const score = sumSelections[index] ?? 0;
    if (score <= 0) return "wallace-zone";
    const maxScore = scale.type === "sum" ? (scale.items[index]?.options?.at(-1)?.score ?? 0) : 0;
    return `wallace-zone ${score >= maxScore ? "wallace-zone-total" : "wallace-zone-partial"}`;
  };
  const wallaceRegionStep = (index: number) => {
    const item = scale.type === "sum" ? scale.items[index] : null;
    const score = sumSelections[index] ?? 0;
    if (!item?.options || score <= 0) return 0;
    const maxScore = item.options.at(-1)?.score ?? 0;
    return score >= maxScore ? 2 : 1;
  };
  const wallaceRegionScoreLabel = (index: number) => {
    const step = wallaceRegionStep(index);
    const score = sumSelections[index] ?? 0;
    if (step === 0) return "0 %";
    return `${formatWallacePercent(score)} · ${step === 2 ? "total" : "1/2"}`;
  };
  const wallaceOptionLabel = (item: ScaleItem, optionIndex: number) => {
    const optionCount = item.options?.length ?? 0;
    if (optionIndex === 0) return "Indemne";
    if (optionCount === 2) return "Atteint";
    if (optionIndex === optionCount - 1) return "Total";
    return "≈ moitié";
  };
  const wallaceRegionProps = (regionId: WallaceRegionId) => {
    const index = WALLACE_REGION_INDEX[regionId];
    const score = sumSelections[index] ?? 0;
    return {
      role: "button",
      tabIndex: 0,
      className: wallaceRegionClass(index),
      "aria-label": `${WALLACE_REGION_LABEL[regionId]} : ${formatWallacePercent(score)}`,
      onClick: () => cycleWallaceRegion(index),
      onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          cycleWallaceRegion(index);
        }
      },
    };
  };

  const renderWallaceBodyView = (view: "front" | "back") => {
    const isFront = view === "front";
    const maskId = isFront ? "wallaceMaskFront" : "wallaceMaskBack";
    return (
      <div className="wallace-body-view wallace-body-view-solo">
        <svg
          viewBox={isFront ? "0 0 296 630" : "0 0 298 630"}
          role="img"
          aria-label={isFront ? "Vue antérieure" : "Vue postérieure"}
        >
          <defs>
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={isFront ? "296" : "298"}
              height="630"
            >
              <image
                href={isFront ? "/wallace-front-mask.png" : "/wallace-back-mask.png"}
                x="0"
                y="0"
                width={isFront ? "296" : "298"}
                height="630"
              />
            </mask>
          </defs>
          <image
            href={isFront ? "/wallace-front-body.png" : "/wallace-back-body.png"}
            x="0"
            y="0"
            width={isFront ? "296" : "298"}
            height="630"
            preserveAspectRatio="xMidYMid meet"
          />
          <g mask={`url(#${maskId})`} className="wallace-zone-layer">
            {isFront ? (
              <>
                <polygon
                  {...wallaceRegionProps("tete")}
                  points="80,0 230,0 230,100 201,114 177,102 153,130 129,102 105,114 80,100"
                />
                <polygon
                  {...wallaceRegionProps("msd")}
                  points="14,100 105,114 97,140 95,210 90,212 86,388 14,388"
                />
                <polygon
                  {...wallaceRegionProps("msg")}
                  points="201,114 292,100 292,388 220,388 216,212 211,210 209,140"
                />
                <polygon
                  {...wallaceRegionProps("tra")}
                  points="105,114 153,130 201,114 209,140 211,210 194,270 166,328 158,322 148,322 140,328 112,270 95,210 97,140"
                />
                <polygon
                  {...wallaceRegionProps("mid")}
                  points="112,272 140,346 151,352 151,610 73,610 77,414 88,334 95,290"
                />
                <polygon
                  {...wallaceRegionProps("mig")}
                  points="194,272 166,346 155,352 155,610 233,610 229,414 218,334 211,290"
                />
                <ellipse {...wallaceRegionProps("per")} cx="153" cy="332" rx="13" ry="15" />
              </>
            ) : (
              <>
                <polygon
                  {...wallaceRegionProps("tete")}
                  points="92,0 192,0 192,98 170,110 142,128 114,110 92,98"
                />
                <polygon
                  {...wallaceRegionProps("msg")}
                  points="8,100 91,114 87,140 87,210 82,212 78,388 8,388"
                />
                <polygon
                  {...wallaceRegionProps("msd")}
                  points="191,114 284,100 284,388 206,388 202,212 197,210 197,140"
                />
                <polygon
                  {...wallaceRegionProps("trp")}
                  points="91,114 142,128 191,114 197,140 197,210 202,270 158,310 142,316 126,310 82,270 87,210 87,140"
                />
                <polygon
                  {...wallaceRegionProps("mig")}
                  points="82,272 126,312 140,318 140,606 68,606 71,416 78,336 87,290"
                />
                <polygon
                  {...wallaceRegionProps("mid")}
                  points="202,272 158,312 144,318 144,606 219,606 215,416 206,336 197,290"
                />
              </>
            )}
          </g>
        </svg>
        <span>{isFront ? "Vue antérieure" : "Vue postérieure"}</span>
      </div>
    );
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
        {allAnswered && interp && (
          <span className="scale-header-score" style={{ background: interp.color }}>
            {isWallace
              ? formatWallacePercent(totalSafe)
              : isSum
                ? totalSafe
                : totalSafe > 0
                  ? `+${totalSafe}`
                  : totalSafe}
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
            <div className="wallace-calculator">
              <div className="wallace-figure" aria-label="Mannequin Wallace interactif">
                <div className="wallace-figure-toolbar">
                  <div className="wallace-view-tabs" aria-label="Vues anatomiques">
                    <button
                      type="button"
                      className={wallaceView === "front" ? "wallace-view-active" : ""}
                      aria-pressed={wallaceView === "front"}
                      onClick={() => setWallaceView("front")}
                    >
                      Antérieure
                    </button>
                    <button
                      type="button"
                      className={wallaceView === "back" ? "wallace-view-active" : ""}
                      aria-pressed={wallaceView === "back"}
                      onClick={() => setWallaceView("back")}
                    >
                      Postérieure
                    </button>
                  </div>
                  <span className="wallace-figure-hint">
                    Cliquer une zone : moitié · total · indemne
                  </span>
                </div>
                <div className="wallace-figure-stage">{renderWallaceBodyView(wallaceView)}</div>
                <div className="wallace-legend" aria-hidden="true">
                  <span>
                    <i className="wallace-legend-dot" />
                    Indemne
                  </span>
                  <span>
                    <i className="wallace-legend-dot wallace-legend-partial" />≈ moitié de la région
                  </span>
                  <span>
                    <i className="wallace-legend-dot wallace-legend-total" />
                    Région en totalité
                  </span>
                </div>
              </div>

              <aside className="wallace-side" aria-label="Résultats Wallace">
                <div className="wallace-summary" aria-live="polite">
                  <span className="wallace-summary-label">Surface brûlée totale (SCB)</span>
                  <strong>{formatWallacePercent(totalSafe)}</strong>
                  <span className="wallace-summary-sub">
                    Surface cutanée brûlée estimée — adulte
                  </span>
                  <span
                    className="scale-badge"
                    style={{ background: scale.interpret(totalSafe).color }}
                  >
                    {scale.interpret(totalSafe).severity}
                  </span>
                </div>

                <section className="wallace-detail" aria-label="Détail par région">
                  <h3>Détail par région</h3>
                  <div className="wallace-rows">
                    {scale.items.map((item, i) => {
                      const currentScore = sumSelections[i] ?? 0;
                      const regionId = (
                        Object.keys(WALLACE_REGION_INDEX) as WallaceRegionId[]
                      ).find((key) => WALLACE_REGION_INDEX[key] === i);
                      const step = wallaceRegionStep(i);
                      return (
                        <div key={item.label} className="wallace-row">
                          <span className="wallace-row-name">
                            {regionId && (
                              <i
                                className={`wallace-region-dot ${WALLACE_REGION_COLOR[regionId]}`}
                                aria-hidden="true"
                              />
                            )}
                            {WALLACE_REGION_LABEL[regionId ?? "tete"] ?? item.label}
                          </span>
                          <span className={`wallace-row-pct wallace-row-pct-${step}`}>
                            {wallaceRegionScoreLabel(i)}
                          </span>
                          <span className="wallace-row-segment">
                            {item.options?.map((opt, optionIndex) => {
                              const selected = currentScore === opt.score;
                              return (
                                <button
                                  key={`${item.label}-${opt.score}-${opt.label}`}
                                  type="button"
                                  className={selected ? `wallace-seg-active-${step}` : ""}
                                  aria-label={opt.label}
                                  title={opt.label}
                                  onClick={() =>
                                    setSumSelections({ ...sumSelections, [i]: opt.score })
                                  }
                                >
                                  {wallaceOptionLabel(item, optionIndex)}
                                </button>
                              );
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="wallace-total-row">
                    <span>Total</span>
                    <strong>{formatWallacePercent(totalSafe)}</strong>
                  </div>
                </section>

                {totalSafe >= 20 && (
                  <div className="wallace-alert" role="status">
                    <strong>Conduite à tenir urgente</strong>
                    <b>SCB ≥ 20 % → remplissage / centre spécialisé</b>
                    <span>
                      Remplissage guidé (formule de Parkland) et avis spécialisé précoce. Réévaluer,
                      analgésie, réchauffement, surveillance rapprochée.
                    </span>
                  </div>
                )}

                <div className="wallace-parkland">
                  <h3>Formule de Parkland (RL — 24 h)</h3>
                  <label htmlFor={`wallace-weight-${scale.id}`}>Poids (kg)</label>
                  <input
                    id={`wallace-weight-${scale.id}`}
                    type="number"
                    min="1"
                    max="300"
                    inputMode="decimal"
                    value={wallaceWeight}
                    onChange={(event) => setWallaceWeight(event.target.value)}
                    placeholder="70"
                  />
                  <p>
                    {parklandVolume === null
                      ? totalSafe > 0
                        ? "Saisir le poids pour calculer le volume de Ringer lactate."
                        : "4 mL × poids × %SCB — saisir le poids."
                      : `${Math.round(parklandVolume).toLocaleString(
                          "fr-FR"
                        )} mL de Ringer lactate / 24 h → ${Math.round(
                          parklandVolume / 2
                        ).toLocaleString("fr-FR")} mL sur les 8 premières heures, puis ${Math.round(
                          parklandVolume / 2
                        ).toLocaleString("fr-FR")} mL sur 16 h.`}
                  </p>
                </div>

                <div className="wallace-note">
                  Règle de Wallace valable chez l'adulte. Chez l'enfant, préférer la table de
                  Lund-Browder. Seules les brûlures du 2e degré et plus sont comptabilisées dans la
                  SCB.
                </div>
              </aside>
            </div>
          ) : isSum ? (
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
                {allAnswered
                  ? isWallace
                    ? formatWallacePercent(totalSafe)
                    : isSum
                      ? totalSafe
                      : totalSafe > 0
                        ? `+${totalSafe}`
                        : totalSafe
                  : "—"}
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
