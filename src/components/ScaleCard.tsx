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
type WallaceProfileKey = "adulte" | "enfant5ans" | "bebe";

const WALLACE_REGION_IDS = Object.keys(WALLACE_REGION_INDEX) as WallaceRegionId[];

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

const LUND_BROWDER_PROFILES: Record<
  WallaceProfileKey,
  {
    label: string;
    summary: string;
    alertThreshold: number;
    values: {
      head: number;
      arm: number;
      trunkFront: number;
      trunkBack: number;
      leg: number;
      perineum: number;
    };
  }
> = {
  adulte: {
    label: "Adulte",
    summary: "Wallace adulte",
    alertThreshold: 20,
    values: {
      head: 9,
      arm: 9,
      trunkFront: 18,
      trunkBack: 18,
      leg: 18,
      perineum: 1,
    },
  },
  enfant5ans: {
    label: "Enfant 5 ans",
    summary: "Lund-Browder 5 ans",
    alertThreshold: 10,
    values: {
      head: 13,
      arm: 9,
      trunkFront: 18,
      trunkBack: 18,
      leg: 15.5,
      perineum: 1,
    },
  },
  bebe: {
    label: "Bébé",
    summary: "Lund-Browder nourrisson",
    alertThreshold: 10,
    values: {
      head: 19,
      arm: 9,
      trunkFront: 18,
      trunkBack: 18,
      leg: 13.5,
      perineum: 1,
    },
  },
};

const ScaleCard = ({ scale }: ScaleCardProps) => {
  const [open, setOpen] = useState(false);
  const [sumSelections, setSumSelections] = useState<Record<number, number>>({});
  const [variantSelections, setVariantSelections] = useState<Record<number, string>>({});
  const [pickedScore, setPickedScore] = useState<number | null>(null);
  const [wallaceWeight, setWallaceWeight] = useState("");
  const [wallaceView, setWallaceView] = useState<WallaceView>("front");
  const [wallaceProfile, setWallaceProfile] = useState<WallaceProfileKey>("adulte");

  const isSum = scale.type === "sum";
  const isWallace = isSum && scale.id === "wallace";
  const wallaceCurrentProfile = LUND_BROWDER_PROFILES[wallaceProfile];

  const wallaceRegionIdFromIndex = (index: number) => WALLACE_REGION_IDS[index] ?? null;
  const wallaceRegionBasePercent = (regionId: WallaceRegionId) => {
    const { values } = wallaceCurrentProfile;
    if (regionId === "tete") return values.head;
    if (regionId === "msd" || regionId === "msg") return values.arm;
    if (regionId === "tra") return values.trunkFront;
    if (regionId === "trp") return values.trunkBack;
    if (regionId === "mid" || regionId === "mig") return values.leg;
    return values.perineum;
  };
  const wallaceStepOptions = (regionId: WallaceRegionId) =>
    regionId === "per" ? [0, 2] : [0, 1, 2];
  const wallaceStepScore = (index: number, step: number) => {
    const regionId = wallaceRegionIdFromIndex(index);
    if (!regionId || step <= 0) return 0;
    const regionPercent = wallaceRegionBasePercent(regionId);
    return step >= 2 ? regionPercent : regionPercent / 2;
  };
  const interpretWallace = (value: number) => {
    if (wallaceProfile === "adulte") return scale.interpret(value);
    if (value < 5) return { severity: "Brûlure localisée enfant (< 5 %)", color: "#16a34a" };
    if (value < 10) return { severity: "Brûlure étendue enfant (5-9 %)", color: "#f97316" };
    return { severity: "Brûlure grave enfant (≥ 10 %) — avis spécialisé", color: "#dc2626" };
  };

  // Total : null tant qu'aucune réponse en mode "pick" (allAnswered=false).
  // En mode Wallace, sumSelections stocke un état 0/1/2, recalculé selon le profil.
  const total: number | null = isWallace
    ? Object.entries(sumSelections).reduce(
        (acc, [index, step]) => acc + wallaceStepScore(Number(index), step as number),
        0
      )
    : isSum
      ? Object.values(sumSelections).reduce((acc, v) => acc + (v as number), 0)
      : pickedScore;

  const allAnswered = isSum
    ? isWallace || scale.items.every((_, i) => typeof sumSelections[i] === "number")
    : pickedScore !== null;

  // total est garanti non-null quand allAnswered=true (allAnswered le vérifie).
  // Le ?? 0 est défensif : strictNullChecks ne peut pas inférer ce lien.
  const totalSafe = total ?? 0;
  const interp = allAnswered
    ? isWallace
      ? interpretWallace(totalSafe)
      : scale.interpret(totalSafe)
    : null;

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
    const regionId = wallaceRegionIdFromIndex(index);
    if (!regionId) return;
    const steps = wallaceStepOptions(regionId);
    const currentStep = sumSelections[index] ?? 0;
    const currentIndex = steps.indexOf(currentStep);
    const next = steps[(currentIndex + 1) % steps.length] ?? 0;
    setSumSelections({ ...sumSelections, [index]: next });
  };
  const wallaceRegionClass = (index: number) => {
    const step = wallaceRegionStep(index);
    if (step <= 0) return "wallace-zone";
    return `wallace-zone ${step >= 2 ? "wallace-zone-total" : "wallace-zone-partial"}`;
  };
  const wallaceRegionStep = (index: number) => {
    const step = sumSelections[index] ?? 0;
    if (step <= 0) return 0;
    return step >= 2 ? 2 : 1;
  };
  const wallaceRegionScoreLabel = (index: number) => {
    const step = wallaceRegionStep(index);
    const score = wallaceStepScore(index, step);
    if (step === 0) return "0 %";
    return `${formatWallacePercent(score)} · ${step === 2 ? "total" : "1/2"}`;
  };
  const wallaceOptionLabel = (regionId: WallaceRegionId, step: number) => {
    if (step === 0) return "Indemne";
    if (regionId === "per") return "Atteint";
    if (step >= 2) return "Total";
    return "≈ moitié";
  };
  const wallaceOptionFullLabel = (regionId: WallaceRegionId, step: number) => {
    if (step === 0) return "Indemne";
    const score = wallaceStepScore(WALLACE_REGION_INDEX[regionId], step);
    const formatted = formatWallacePercent(score);
    if (regionId === "per") return `Atteint (${formatted})`;
    if (step >= 2) return `${regionId === "tete" ? "Totale" : "Total"} (${formatted})`;
    if (regionId === "tra") return `Thorax ou abdomen (${formatted})`;
    if (regionId === "trp") return `Haut ou bas du dos (${formatted})`;
    return `Une face (${formatted})`;
  };
  const wallaceRegionProps = (regionId: WallaceRegionId) => {
    const index = WALLACE_REGION_INDEX[regionId];
    const score = wallaceStepScore(index, wallaceRegionStep(index));
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
                  <div className="wallace-mode-tabs" aria-label="Profil patient">
                    {(Object.keys(LUND_BROWDER_PROFILES) as WallaceProfileKey[]).map(
                      (profileKey) => (
                        <button
                          key={profileKey}
                          type="button"
                          className={wallaceProfile === profileKey ? "wallace-mode-active" : ""}
                          aria-pressed={wallaceProfile === profileKey}
                          onClick={() => setWallaceProfile(profileKey)}
                        >
                          {LUND_BROWDER_PROFILES[profileKey].label}
                        </button>
                      )
                    )}
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
              </div>

              <aside className="wallace-side" aria-label="Résultats Wallace">
                <div className="wallace-summary" aria-live="polite">
                  <span className="wallace-summary-label">Surface brûlée totale (SCB)</span>
                  <strong>{formatWallacePercent(totalSafe)}</strong>
                  <span className="wallace-summary-sub">
                    {wallaceCurrentProfile.summary} — surface cutanée brûlée estimée
                  </span>
                  <span className="scale-badge" style={{ background: interp?.color }}>
                    {interp?.severity}
                  </span>
                </div>

                <section className="wallace-detail" aria-label="Détail par région">
                  <h3>Détail par région</h3>
                  <div className="wallace-rows">
                    {scale.items.map((item, i) => {
                      const currentStep = sumSelections[i] ?? 0;
                      const regionId = wallaceRegionIdFromIndex(i);
                      const step = wallaceRegionStep(i);
                      if (!regionId) return null;
                      return (
                        <div key={item.label} className="wallace-row">
                          <span className="wallace-row-name">
                            <i
                              className={`wallace-region-dot ${WALLACE_REGION_COLOR[regionId]}`}
                              aria-hidden="true"
                            />
                            {WALLACE_REGION_LABEL[regionId] ?? item.label}
                          </span>
                          <span className={`wallace-row-pct wallace-row-pct-${step}`}>
                            {wallaceRegionScoreLabel(i)}
                          </span>
                          <span className="wallace-row-segment">
                            {wallaceStepOptions(regionId).map((optionStep) => {
                              const selected = currentStep === optionStep;
                              const fullLabel = wallaceOptionFullLabel(regionId, optionStep);
                              return (
                                <button
                                  key={`${item.label}-${optionStep}`}
                                  type="button"
                                  className={selected ? `wallace-seg-active-${step}` : ""}
                                  aria-label={fullLabel}
                                  title={fullLabel}
                                  onClick={() =>
                                    setSumSelections({ ...sumSelections, [i]: optionStep })
                                  }
                                >
                                  {wallaceOptionLabel(regionId, optionStep)}
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

                {totalSafe >= wallaceCurrentProfile.alertThreshold && (
                  <div className="wallace-alert" role="status">
                    <strong>Conduite à tenir urgente</strong>
                    <b>
                      SCB ≥ {wallaceCurrentProfile.alertThreshold} % → remplissage / centre
                      spécialisé
                    </b>
                    <span>
                      Remplissage guidé (formule de Parkland) et avis spécialisé précoce. Réévaluer,
                      analgésie, réchauffement, surveillance rapprochée.
                    </span>
                  </div>
                )}

                <div className="wallace-note">
                  Mode adulte : règle des 9 de Wallace. Modes enfant : estimation Lund-Browder
                  simplifiée selon l'âge. Seules les brûlures du 2e degré et plus sont
                  comptabilisées dans la SCB.
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
