// Sous-composants extraits d'AcrTimer pour rendre le composant principal lisible.
// Aucun n'a d'état propre : ils reçoivent toutes les données et callbacks en
// props. Cela facilite leur test isolé et leur compréhension.
//
// Conservés inline dans AcrTimer.tsx (jugés trop petits pour mériter un
// composant) : header (titre/chrono/coach), doses ref, métronome, controls,
// modales (AcrSummary et AcrPrepOverlay sont déjà dans leurs propres fichiers).

import { ACLS_PREP_STEPS, PREP_CONTENT, POST_ROSC_TARGETS } from "./AcrTimer.constants";
import { fmt, stepState } from "./AcrTimer.helpers";

// ─────────────────────────────────────────────────────────────────────────────
// Compteurs de rappel temporel : Analyse DSA (cycle 2 min) et Adrénaline (cycle 4 min).
type CycleCountersProps = {
  running: boolean;
  nextAnalyseIn: number;
  nextAdreIn: number | null;
  lastAdreAt: number | null;
  analyseAlert: boolean;
  adreAlert: boolean;
};

export const AcrCycleCounters = ({
  running,
  nextAnalyseIn,
  nextAdreIn,
  lastAdreAt,
  analyseAlert,
  adreAlert,
}: CycleCountersProps) => (
  <div className="acr-timer-cycles">
    <div className={`acr-cycle ${analyseAlert ? "acr-cycle-alert" : ""}`}>
      <div className="acr-cycle-label">Analyse DSA</div>
      <div className="acr-cycle-value">{running ? fmt(nextAnalyseIn) : "—"}</div>
      <div className="acr-cycle-sub">cycle 2 min</div>
    </div>
    <div className={`acr-cycle ${adreAlert ? "acr-cycle-alert" : ""}`}>
      <div className="acr-cycle-label">Adrénaline</div>
      <div className="acr-cycle-value">
        {lastAdreAt === null ? (
          <span className="acr-cycle-none">après 1re dose</span>
        ) : running && nextAdreIn !== null ? (
          fmt(nextAdreIn)
        ) : (
          "—"
        )}
      </div>
      <div className="acr-cycle-sub">cycle 4 min</div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Panneau guidé qui change selon la phase. 5 sous-vues : empty / rcp / analyse /
// actions / post-rosc.
type Action = { type: string; label: string; done: boolean; hint?: string; [k: string]: any };

type StepPanelProps = {
  running: boolean;
  phase: string;
  currentRhythm: string | null;
  cycle: number;
  pendingActions: Action[];
  nextAnalyseIn: number;
  onRhythm: (r: string) => void;
  onRosc: () => void;
  onReAcr: () => void;
  onSkipToAnalyse: () => void;
  onToggleAction: (idx: number) => void;
  onFinishCycle: () => void;
  onPrepDrug: (name: string) => void;
};

export const AcrStepPanel = ({
  running,
  phase,
  currentRhythm,
  cycle,
  pendingActions,
  nextAnalyseIn,
  onRhythm,
  onRosc,
  onReAcr,
  onSkipToAnalyse,
  onToggleAction,
  onFinishCycle,
  onPrepDrug,
}: StepPanelProps) => (
  <div className="acr-step">
    {!running && (
      <div className="acr-step-empty">
        <strong>Chrono à l'arrêt.</strong> Appuie sur « Démarrer » au début de l'ACR.
      </div>
    )}

    {running && phase === "rcp" && (
      <div className="acr-step-rcp">
        <div className="acr-step-title">RCP en cours</div>
        <div className="acr-step-text">
          Prochaine analyse rythme dans <strong>{fmt(nextAnalyseIn)}</strong>. Le médecin annonce le
          rythme à l'arrêt du MCE.
        </div>
        <button type="button" className="acr-step-link" onClick={onSkipToAnalyse}>
          Analyser maintenant ↗
        </button>
      </div>
    )}

    {running && phase === "analyse" && (
      <div className="acr-step-analyse">
        <div className="acr-step-title acr-step-title-alert">Analyser le rythme</div>
        <div className="acr-step-text">Stop MCE 5 sec, lecture du tracé. Quel rythme ?</div>
        <div className="acr-step-rhythms">
          <button
            type="button"
            className="acr-rhythm-btn acr-rhythm-shock"
            onClick={() => onRhythm("choquable")}
          >
            <span className="acr-rhythm-icon">⚡</span>
            <span className="acr-rhythm-label">Choquable</span>
            <span className="acr-rhythm-sub">FV / TV sans pouls</span>
          </button>
          <button
            type="button"
            className="acr-rhythm-btn acr-rhythm-noshock"
            onClick={() => onRhythm("non_choquable")}
          >
            <span className="acr-rhythm-icon">💚</span>
            <span className="acr-rhythm-label">Non choquable</span>
            <span className="acr-rhythm-sub">Asystole / AESP</span>
          </button>
          <button type="button" className="acr-rhythm-btn acr-rhythm-rosc" onClick={onRosc}>
            <span className="acr-rhythm-icon">❤️</span>
            <span className="acr-rhythm-label">ROSC</span>
            <span className="acr-rhythm-sub">Pouls retrouvé · post-réa</span>
          </button>
        </div>
      </div>
    )}

    {running && phase === "actions" && (
      <div className="acr-step-actions">
        <div className="acr-step-title">
          {currentRhythm === "choquable" ? "⚡ Choquable" : "💚 Non choquable"}
          <span className="acr-step-cycle-label"> · Cycle {cycle}</span>
        </div>
        {pendingActions.length === 0 ? (
          <div className="acr-step-text">
            Pas d'action médicamenteuse suggérée à ce cycle. Reprendre la RCP 2 min.
          </div>
        ) : (
          <ul className="acr-action-list">
            {pendingActions.map((a, i) => {
              const drugName =
                a.type === "adre" ? "Adrénaline" : a.type === "amio" ? "Amiodarone" : null;
              const hasPrep = drugName && !!PREP_CONTENT[drugName];
              return (
                <li key={i} className={`acr-action ${a.done ? "acr-action-done" : ""}`}>
                  <button
                    type="button"
                    className="acr-action-check"
                    onClick={() => onToggleAction(i)}
                    aria-label={a.done ? "Décocher" : "Cocher comme fait"}
                  >
                    {a.done ? "✓" : ""}
                  </button>
                  <div className="acr-action-text">
                    {hasPrep ? (
                      <button
                        type="button"
                        className="acr-action-label acr-action-link"
                        onClick={() => onPrepDrug(drugName!)}
                        title={`Préparation ${drugName}`}
                      >
                        {a.label} <span aria-hidden="true">↗</span>
                      </button>
                    ) : (
                      <div className="acr-action-label">{a.label}</div>
                    )}
                    {a.hint && <div className="acr-action-hint">{a.hint}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <button type="button" className="acr-step-next" onClick={onFinishCycle}>
          Passer au cycle {cycle + 1} →
        </button>
      </div>
    )}

    {running && phase === "post-rosc" && (
      <div className="acr-step-postrosc">
        <div className="acr-step-title acr-step-title-rosc">❤️ ROSC obtenu · Post-réa</div>
        <div className="acr-postrosc-grid">
          {POST_ROSC_TARGETS.map((t, i) => (
            <div key={i} className="acr-postrosc-card">
              <div className="acr-postrosc-icon" aria-hidden="true">
                {t.icon}
              </div>
              <div className="acr-postrosc-cat">{t.cat}</div>
              <div className="acr-postrosc-cible">{t.cible}</div>
              <div className="acr-postrosc-action">{t.action}</div>
            </div>
          ))}
        </div>
        <button type="button" className="acr-step-next acr-step-reacr" onClick={onReAcr}>
          ↻ Re-arrêt — relancer un cycle
        </button>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Causes réversibles (4H/4T en ERC, 5H/5T en ACLS) — collapsible.
type HtCause = { id: string; nom: string; icon: string; action: string };

type HtPanelProps = {
  protocol: string;
  htCauses: HtCause[];
  htChecked: Set<string>;
  htExpanded: boolean;
  htDetail: string | null;
  onToggleExpanded: () => void;
  onToggleHt: (id: string) => void;
  onSetDetail: (id: string | null) => void;
};

export const AcrHTPanel = ({
  protocol,
  htCauses,
  htChecked,
  htExpanded,
  htDetail,
  onToggleExpanded,
  onToggleHt,
  onSetDetail,
}: HtPanelProps) => (
  <div className={`acr-ht ${htExpanded ? "acr-ht-open" : ""}`}>
    <button
      type="button"
      className="acr-ht-toggle"
      onClick={onToggleExpanded}
      aria-expanded={htExpanded}
    >
      <span aria-hidden="true">🔍</span>
      <span className="acr-ht-toggle-label">
        Causes réversibles ({protocol === "acls" ? "5H/5T" : "4H/4T"})
      </span>
      <span className="acr-ht-count">
        {htChecked.size}/{htCauses.length}
      </span>
      <span className="acr-ht-chevron" aria-hidden="true">
        {htExpanded ? "▾" : "▸"}
      </span>
    </button>
    {htExpanded && (
      <div className="acr-ht-body">
        <ul className="acr-ht-list">
          {htCauses.map((c) => {
            const checked = htChecked.has(c.id);
            const open = htDetail === c.id;
            return (
              <li key={c.id} className={`acr-ht-item ${checked ? "acr-ht-item-checked" : ""}`}>
                <button
                  type="button"
                  className="acr-ht-pill"
                  onClick={() => onSetDetail(open ? null : c.id)}
                  title={c.action}
                >
                  <span className="acr-ht-pill-icon" aria-hidden="true">
                    {c.icon}
                  </span>
                  <span className="acr-ht-pill-name">{c.nom}</span>
                  <span className="acr-ht-pill-chevron" aria-hidden="true">
                    {open ? "▾" : "▸"}
                  </span>
                </button>
                <button
                  type="button"
                  className="acr-ht-check"
                  onClick={() => onToggleHt(c.id)}
                  aria-label={checked ? "Décocher" : "Marquer comme vu/exclu"}
                >
                  {checked ? "✓" : ""}
                </button>
                {open && <div className="acr-ht-action">{c.action}</div>}
              </li>
            );
          })}
        </ul>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Tally rapide / éditable. Mode lecture (compacts) ou mode édition (steppers).
// Permet d'ajuster ce qui a déjà été fait par le DSA avant l'arrivée de l'équipe.
type TallyKind = "choc" | "adre" | "amio";

type TallyEditorProps = {
  shocks: number;
  adres: number;
  amios: number;
  historyLength: number;
  editingTally: boolean;
  onSetEditingTally: (v: boolean) => void;
  // Un seul callback : le parent décide (typiquement dispatch ADJUST_TALLY).
  // La logique +/- (label, lastAdreAt, events) vit dans le reducer.
  onAdjustTally: (kind: TallyKind, delta: 1 | -1) => void;
};

export const AcrTallyEditor = ({
  shocks,
  adres,
  amios,
  historyLength,
  editingTally,
  onSetEditingTally,
  onAdjustTally,
}: TallyEditorProps) => (
  <div className={`acr-tally ${editingTally ? "acr-tally-editing" : ""}`}>
    {!editingTally ? (
      <>
        <span>
          <strong>{shocks}</strong> choc{shocks > 1 ? "s" : ""}
        </span>
        <span className="acr-tally-sep">·</span>
        <span>
          <strong>{adres}</strong> adré
        </span>
        <span className="acr-tally-sep">·</span>
        <span>
          <strong>{amios}</strong> cordarone
        </span>
        <span className="acr-tally-sep">·</span>
        <span>
          <strong>{historyLength}</strong> cycle{historyLength > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          className="acr-tally-edit-btn"
          onClick={() => onSetEditingTally(true)}
          title="Préciser ce qui a déjà été fait avant l'arrivée"
        >
          ✏︎ Modifier
        </button>
      </>
    ) : (
      <div className="acr-tally-edit-grid">
        <div className="acr-tally-edit-row">
          <span className="acr-tally-edit-label">Chocs déjà donnés</span>
          <div className="acr-tally-stepper">
            <button
              type="button"
              onClick={() => onAdjustTally("choc", -1)}
              aria-label="Moins un choc"
              disabled={shocks === 0}
            >
              −
            </button>
            <span className="acr-tally-num">{shocks}</span>
            <button
              type="button"
              onClick={() => onAdjustTally("choc", 1)}
              aria-label="Plus un choc"
            >
              +
            </button>
          </div>
        </div>
        <div className="acr-tally-edit-row">
          <span className="acr-tally-edit-label">Adré déjà donnée</span>
          <div className="acr-tally-stepper">
            <button
              type="button"
              onClick={() => onAdjustTally("adre", -1)}
              aria-label="Moins une adrénaline"
              disabled={adres === 0}
            >
              −
            </button>
            <span className="acr-tally-num">{adres}</span>
            <button
              type="button"
              onClick={() => onAdjustTally("adre", 1)}
              aria-label="Plus une adrénaline"
            >
              +
            </button>
          </div>
        </div>
        <div className="acr-tally-edit-row">
          <span className="acr-tally-edit-label">Cordarone déjà donnée</span>
          <div className="acr-tally-stepper">
            <button
              type="button"
              onClick={() => onAdjustTally("amio", -1)}
              aria-label="Moins une cordarone"
              disabled={amios === 0}
            >
              −
            </button>
            <span className="acr-tally-num">{amios}</span>
            <button
              type="button"
              onClick={() => onAdjustTally("amio", 1)}
              aria-label="Plus une cordarone"
            >
              +
            </button>
          </div>
        </div>
        <div className="acr-tally-edit-hint">
          À l'arrivée, ajuste les chocs déjà délivrés par le DSA et toute adré déjà reçue. Le
          prochain choc sera proposé en cohérence (ex : si chocs = 2, le suivant est le 3e →
          suggestion Amio 300 mg).
        </div>
        <button type="button" className="acr-tally-done" onClick={() => onSetEditingTally(false)}>
          Terminé
        </button>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Overlay « zoom préparation DSA » — checklist ACLS High-Performance CPR.
// Affiché en superposition lors des 15 dernières secondes avant l'analyse rythme.
type ZoomOverlayProps = {
  nextAnalyseIn: number;
  onSkip: () => void;
};

export const AcrZoomOverlay = ({ nextAnalyseIn, onSkip }: ZoomOverlayProps) => (
  <div className="acr-zoom" role="alert" aria-live="assertive" aria-label="Préparation analyse DSA">
    <div className="acr-zoom-header">
      <span className="acr-zoom-header-title">⚡ Coach ACR · Préparation DSA</span>
      <button
        type="button"
        className="acr-zoom-skip"
        onClick={onSkip}
        aria-label="Passer à l'analyse maintenant"
      >
        Analyser maintenant ↗
      </button>
    </div>
    <div className="acr-zoom-body">
      <div className="acr-zoom-label">Analyse rythme dans</div>
      <div
        className={`acr-zoom-count ${nextAnalyseIn <= 5 ? "acr-zoom-count-danger" : nextAnalyseIn <= 10 ? "acr-zoom-count-warn" : "acr-zoom-count-info"}`}
        aria-hidden="true"
      >
        {nextAnalyseIn === 0 ? "GO" : nextAnalyseIn}
      </div>
      {nextAnalyseIn > 0 && <div className="acr-zoom-unit">secondes</div>}
      <div className="acr-zoom-bar" aria-hidden="true">
        <div
          className="acr-zoom-bar-fill"
          style={{ width: `${Math.min(100, ((15 - nextAnalyseIn) / 15) * 100)}%` }}
        />
      </div>
    </div>
    <ul className="acr-zoom-checklist">
      {ACLS_PREP_STEPS.map((step, i) => {
        const state = stepState(step, nextAnalyseIn);
        return (
          <li key={i} className={`acr-zoom-step acr-zoom-step-${state}`}>
            <span className="acr-zoom-step-icon" aria-hidden="true">
              {step.icon}
            </span>
            <span className="acr-zoom-step-label">{step.label}</span>
            {state === "done" && (
              <span className="acr-zoom-step-mark" aria-hidden="true">
                ✓
              </span>
            )}
            {state === "active" && <span className="acr-zoom-step-dot" aria-hidden="true" />}
          </li>
        );
      })}
    </ul>
    <div className="acr-zoom-foot">
      ACLS · High-Performance CPR · <em>Charging during compressions</em>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Historique des cycles — collapsible, montré quand au moins 1 cycle est archivé.
type HistoryEntry = {
  cycle: number;
  t: number;
  rhythm: string | null;
  actions: string[];
};

type HistoryProps = {
  history: HistoryEntry[];
  showHistory: boolean;
  onToggleShow: () => void;
};

export const AcrHistory = ({ history, showHistory, onToggleShow }: HistoryProps) => (
  <div className="acr-history">
    <button type="button" className="acr-history-toggle" onClick={onToggleShow}>
      {showHistory ? "▾" : "▸"} Historique ({history.length})
    </button>
    {showHistory && (
      <ul className="acr-history-list">
        {history.map((h) => (
          <li key={h.cycle} className="acr-history-item">
            <span className="acr-history-cycle">C{h.cycle}</span>
            <span className="acr-history-time">{fmt(h.t)}</span>
            <span className={`acr-history-rhythm acr-history-rhythm-${h.rhythm}`}>
              {h.rhythm === "choquable" ? "Choquable" : "Non choquable"}
            </span>
            <span className="acr-history-actions">
              {h.actions.length === 0 ? "—" : h.actions.join(" · ")}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);
