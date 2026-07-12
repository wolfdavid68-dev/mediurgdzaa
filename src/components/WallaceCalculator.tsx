import { useEffect, useState, type KeyboardEvent } from "react";
import type { ClinicalScale } from "../types/data";

export const formatWallacePercent = (value: number) =>
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
    values: { head: 9, arm: 9, trunkFront: 18, trunkBack: 18, leg: 18, perineum: 1 },
  },
  enfant5ans: {
    label: "Enfant 5 ans",
    summary: "Lund-Browder 5 ans",
    alertThreshold: 10,
    values: { head: 13, arm: 9, trunkFront: 18, trunkBack: 18, leg: 15.5, perineum: 1 },
  },
  bebe: {
    label: "Bébé",
    summary: "Lund-Browder nourrisson",
    alertThreshold: 10,
    values: { head: 19, arm: 9, trunkFront: 18, trunkBack: 18, leg: 13.5, perineum: 1 },
  },
};

export type WallaceResult = {
  total: number;
  interpretation: { severity: string; color: string };
};

type WallaceCalculatorProps = {
  scale: Extract<ClinicalScale, { type: "sum" }>;
  onResultChange: (result: WallaceResult) => void;
};

const WallaceCalculator = ({ scale, onResultChange }: WallaceCalculatorProps) => {
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [weight, setWeight] = useState("");
  const [view, setView] = useState<WallaceView>("front");
  const [profile, setProfile] = useState<WallaceProfileKey>("adulte");
  const currentProfile = LUND_BROWDER_PROFILES[profile];

  const regionIdFromIndex = (index: number) => WALLACE_REGION_IDS[index] ?? null;
  const regionBasePercent = (regionId: WallaceRegionId) => {
    const { values } = currentProfile;
    if (regionId === "tete") return values.head;
    if (regionId === "msd" || regionId === "msg") return values.arm;
    if (regionId === "tra") return values.trunkFront;
    if (regionId === "trp") return values.trunkBack;
    if (regionId === "mid" || regionId === "mig") return values.leg;
    return values.perineum;
  };
  const stepOptions = (regionId: WallaceRegionId) => (regionId === "per" ? [0, 2] : [0, 1, 2]);
  const stepScore = (index: number, step: number) => {
    const regionId = regionIdFromIndex(index);
    if (!regionId || step <= 0) return 0;
    const percent = regionBasePercent(regionId);
    return step >= 2 ? percent : percent / 2;
  };
  const regionStep = (index: number) => {
    const step = selections[index] ?? 0;
    if (step <= 0) return 0;
    return step >= 2 ? 2 : 1;
  };
  const total = Object.entries(selections).reduce(
    (sum, [index, step]) => sum + stepScore(Number(index), step),
    0
  );
  const interpretation =
    profile === "adulte"
      ? scale.interpret(total)
      : total < 5
        ? { severity: "Brûlure localisée enfant (< 5 %)", color: "#16a34a" }
        : total < 10
          ? { severity: "Brûlure étendue enfant (5-9 %)", color: "#f97316" }
          : { severity: "Brûlure grave enfant (≥ 10 %) — avis spécialisé", color: "#dc2626" };
  const interpretationSeverity = interpretation.severity;
  const interpretationColor = interpretation.color;

  useEffect(() => {
    onResultChange({
      total,
      interpretation: { severity: interpretationSeverity, color: interpretationColor },
    });
  }, [interpretationColor, interpretationSeverity, onResultChange, total]);

  const cycleRegion = (index: number) => {
    const regionId = regionIdFromIndex(index);
    if (!regionId) return;
    const steps = stepOptions(regionId);
    const currentIndex = steps.indexOf(selections[index] ?? 0);
    setSelections((current) => ({
      ...current,
      [index]: steps[(currentIndex + 1) % steps.length] ?? 0,
    }));
  };
  const regionClass = (index: number) => {
    const step = regionStep(index);
    if (step <= 0) return "wallace-zone";
    return `wallace-zone ${step >= 2 ? "wallace-zone-total" : "wallace-zone-partial"}`;
  };
  const regionScoreLabel = (index: number) => {
    const step = regionStep(index);
    if (step === 0) return "0 %";
    return `${formatWallacePercent(stepScore(index, step))} · ${step === 2 ? "total" : "1/2"}`;
  };
  const optionLabel = (regionId: WallaceRegionId, step: number) => {
    if (step === 0) return "Indemne";
    if (regionId === "per") return "Atteint";
    return step >= 2 ? "Total" : "≈ moitié";
  };
  const optionFullLabel = (regionId: WallaceRegionId, step: number) => {
    if (step === 0) return "Indemne";
    const formatted = formatWallacePercent(stepScore(WALLACE_REGION_INDEX[regionId], step));
    if (regionId === "per") return `Atteint (${formatted})`;
    if (step >= 2) return `${regionId === "tete" ? "Totale" : "Total"} (${formatted})`;
    if (regionId === "tra") return `Thorax ou abdomen (${formatted})`;
    if (regionId === "trp") return `Haut ou bas du dos (${formatted})`;
    return `Une face (${formatted})`;
  };
  const regionProps = (regionId: WallaceRegionId) => {
    const index = WALLACE_REGION_INDEX[regionId];
    return {
      role: "button",
      tabIndex: 0,
      className: regionClass(index),
      "aria-label": `${WALLACE_REGION_LABEL[regionId]} : ${formatWallacePercent(
        stepScore(index, regionStep(index))
      )}`,
      onClick: () => cycleRegion(index),
      onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          cycleRegion(index);
        }
      },
    };
  };

  const renderBodyView = (bodyView: WallaceView) => {
    const isFront = bodyView === "front";
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
                href={isFront ? "/wallace-front-mask.webp" : "/wallace-back-mask.webp"}
                x="0"
                y="0"
                width={isFront ? "296" : "298"}
                height="630"
              />
            </mask>
          </defs>
          <image
            href={isFront ? "/wallace-front-body.webp" : "/wallace-back-body.webp"}
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
                  {...regionProps("tete")}
                  points="80,0 230,0 230,100 201,114 177,102 153,130 129,102 105,114 80,100"
                />
                <polygon
                  {...regionProps("msd")}
                  points="14,100 105,114 97,140 95,210 90,212 86,388 14,388"
                />
                <polygon
                  {...regionProps("msg")}
                  points="201,114 292,100 292,388 220,388 216,212 211,210 209,140"
                />
                <polygon
                  {...regionProps("tra")}
                  points="105,114 153,130 201,114 209,140 211,210 194,270 166,328 158,322 148,322 140,328 112,270 95,210 97,140"
                />
                <polygon
                  {...regionProps("mid")}
                  points="112,272 140,346 151,352 151,610 73,610 77,414 88,334 95,290"
                />
                <polygon
                  {...regionProps("mig")}
                  points="194,272 166,346 155,352 155,610 233,610 229,414 218,334 211,290"
                />
                <ellipse {...regionProps("per")} cx="153" cy="332" rx="13" ry="15" />
              </>
            ) : (
              <>
                <polygon
                  {...regionProps("tete")}
                  points="92,0 192,0 192,98 170,110 142,128 114,110 92,98"
                />
                <polygon
                  {...regionProps("msg")}
                  points="8,100 91,114 87,140 87,210 82,212 78,388 8,388"
                />
                <polygon
                  {...regionProps("msd")}
                  points="191,114 284,100 284,388 206,388 202,212 197,210 197,140"
                />
                <polygon
                  {...regionProps("trp")}
                  points="91,114 142,128 191,114 197,140 197,210 202,270 158,310 142,316 126,310 82,270 87,210 87,140"
                />
                <polygon
                  {...regionProps("mig")}
                  points="82,272 126,312 140,318 140,606 68,606 71,416 78,336 87,290"
                />
                <polygon
                  {...regionProps("mid")}
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

  const parsedWeight = Number.parseFloat(weight.replace(",", "."));
  const parklandVolume =
    Number.isFinite(parsedWeight) && parsedWeight > 0 && total > 0
      ? 4 * parsedWeight * total
      : null;

  return (
    <>
      <div className="wallace-calculator">
        <div className="wallace-figure" aria-label="Mannequin Wallace interactif">
          <div className="wallace-figure-toolbar">
            <div className="wallace-view-tabs" aria-label="Vues anatomiques">
              <button
                type="button"
                className={view === "front" ? "wallace-view-active" : ""}
                aria-pressed={view === "front"}
                onClick={() => setView("front")}
              >
                Antérieure
              </button>
              <button
                type="button"
                className={view === "back" ? "wallace-view-active" : ""}
                aria-pressed={view === "back"}
                onClick={() => setView("back")}
              >
                Postérieure
              </button>
            </div>
            <div className="wallace-mode-tabs" aria-label="Profil patient">
              {(Object.keys(LUND_BROWDER_PROFILES) as WallaceProfileKey[]).map((profileKey) => (
                <button
                  key={profileKey}
                  type="button"
                  className={profile === profileKey ? "wallace-mode-active" : ""}
                  aria-pressed={profile === profileKey}
                  onClick={() => setProfile(profileKey)}
                >
                  {LUND_BROWDER_PROFILES[profileKey].label}
                </button>
              ))}
            </div>
            <span className="wallace-figure-hint">Cliquer une zone : moitié · total · indemne</span>
          </div>
          <div className="wallace-figure-stage">{renderBodyView(view)}</div>
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
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="70"
            />
            <p>
              {parklandVolume === null
                ? total > 0
                  ? "Saisir le poids pour calculer le volume de Ringer lactate."
                  : "4 mL × poids × %SCB — saisir le poids."
                : `${Math.round(parklandVolume).toLocaleString("fr-FR")} mL de Ringer lactate / 24 h → ${Math.round(parklandVolume / 2).toLocaleString("fr-FR")} mL sur les 8 premières heures, puis ${Math.round(parklandVolume / 2).toLocaleString("fr-FR")} mL sur 16 h.`}
            </p>
          </div>
        </div>

        <aside className="wallace-side" aria-label="Résultats Wallace">
          <div className="wallace-summary" aria-live="polite">
            <span className="wallace-summary-label">Surface brûlée totale (SCB)</span>
            <strong>{formatWallacePercent(total)}</strong>
            <span className="wallace-summary-sub">
              {currentProfile.summary} — surface cutanée brûlée estimée
            </span>
            <span className="scale-badge" style={{ background: interpretation.color }}>
              {interpretation.severity}
            </span>
          </div>
          <section className="wallace-detail" aria-label="Détail par région">
            <h3>Détail par région</h3>
            <div className="wallace-rows">
              {scale.items.map((item, index) => {
                const currentStep = selections[index] ?? 0;
                const regionId = regionIdFromIndex(index);
                const step = regionStep(index);
                if (!regionId) return null;
                return (
                  <div key={item.label} className="wallace-row">
                    <span className="wallace-row-name">
                      <i
                        className={`wallace-region-dot ${WALLACE_REGION_COLOR[regionId]}`}
                        aria-hidden="true"
                      />
                      {WALLACE_REGION_LABEL[regionId]}
                    </span>
                    <span className={`wallace-row-pct wallace-row-pct-${step}`}>
                      {regionScoreLabel(index)}
                    </span>
                    <span className="wallace-row-segment">
                      {stepOptions(regionId).map((optionStep) => {
                        const fullLabel = optionFullLabel(regionId, optionStep);
                        return (
                          <button
                            key={`${item.label}-${optionStep}`}
                            type="button"
                            className={
                              currentStep === optionStep ? `wallace-seg-active-${step}` : ""
                            }
                            aria-label={fullLabel}
                            title={fullLabel}
                            onClick={() =>
                              setSelections((current) => ({ ...current, [index]: optionStep }))
                            }
                          >
                            {optionLabel(regionId, optionStep)}
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
              <strong>{formatWallacePercent(total)}</strong>
            </div>
          </section>
          {total >= currentProfile.alertThreshold && (
            <div className="wallace-alert" role="status">
              <strong>Conduite à tenir urgente</strong>
              <b>SCB ≥ {currentProfile.alertThreshold} % → remplissage / centre spécialisé</b>
              <span>
                Remplissage guidé (formule de Parkland) et avis spécialisé précoce. Réévaluer,
                analgésie, réchauffement, surveillance rapprochée.
              </span>
            </div>
          )}
          <div className="wallace-note">
            Mode adulte : règle des 9 de Wallace. Modes enfant : estimation Lund-Browder simplifiée
            selon l'âge. Seules les brûlures du 2e degré et plus sont comptabilisées dans la SCB.
          </div>
        </aside>
      </div>
      <footer className="scale-footer">
        <div className="scale-total">
          <span className="scale-total-label">Total</span>
          <span className="scale-total-value">{formatWallacePercent(total)}</span>
          <span className="scale-badge" style={{ background: interpretation.color }}>
            {interpretation.severity}
          </span>
        </div>
        <button
          type="button"
          className="scale-reset"
          onClick={() => {
            setSelections({});
            setWeight("");
          }}
        >
          Réinitialiser
        </button>
      </footer>
    </>
  );
};

export default WallaceCalculator;
