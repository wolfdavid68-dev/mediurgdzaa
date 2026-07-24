import { useEffect, useState } from "react";
import ModalDialog from "./ModalDialog";

type BriefValues = Record<string, boolean | string>;

type IsrFlashBriefProps = {
  open: boolean;
  patientWeight: string;
  values: BriefValues;
  onValueChange: (key: string, value: boolean | string) => void;
  onClose: () => void;
};

const ROLE_FIELDS = [
  { label: "Leader", source: "Médecin leader", key: "0-0" },
  { label: "Voies aériennes", source: "Opérateur", key: "0-1" },
  { label: "Drogues", source: "IDE thérapeutique", key: "0-5" },
  { label: "Matériel", source: "IDE matériel", key: "0-4" },
] as const;

const PLAN_OPTIONS = [
  "Vidéolaryngoscope + mandrin",
  "Ventilation BAVU + appel renfort",
  "Dispositif supraglottique",
] as const;

export const ISR_BRIEF_KEYS = {
  readyWeight: "__brief-ready-weight",
  readyCapnography: "__brief-ready-capnography",
  readyPlan: "__brief-ready-plan",
  readyDrugs: "__brief-ready-drugs",
  plan: "__brief-plan",
  completedAt: "__brief-completed-at",
  completedSignature: "__brief-completed-signature",
} as const;

const stringValue = (values: BriefValues, key: string): string => {
  const value = values[key];
  return typeof value === "string" ? value : "";
};

const hasText = (value: string): boolean => value.trim().length > 0;

const getDrugSignature = (values: BriefValues): string =>
  JSON.stringify(["5-0", "5-1", "5-2", "5-3"].map((key) => stringValue(values, key).trim()));

const hasValidWeight = (patientWeight: string): boolean => {
  const parsed = Number(patientWeight.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0;
};

const hasCompleteDrugs = (values: BriefValues): boolean =>
  ["5-0", "5-1", "5-2", "5-3"].every((key) => hasText(stringValue(values, key)));

const isIsrBriefReady = (values: BriefValues, patientWeight: string): boolean => {
  const plan = stringValue(values, ISR_BRIEF_KEYS.plan);
  const rolesReady = ROLE_FIELDS.every(({ key }) => hasText(stringValue(values, key)));
  const weightReady =
    hasValidWeight(patientWeight) &&
    stringValue(values, ISR_BRIEF_KEYS.readyWeight) === patientWeight.trim();
  const drugsReady =
    hasCompleteDrugs(values) &&
    stringValue(values, ISR_BRIEF_KEYS.readyDrugs) === getDrugSignature(values);
  const planReady = hasText(plan) && stringValue(values, ISR_BRIEF_KEYS.readyPlan) === plan.trim();

  return (
    rolesReady &&
    weightReady &&
    drugsReady &&
    planReady &&
    values[ISR_BRIEF_KEYS.readyCapnography] === true
  );
};

const getBriefSignature = (values: BriefValues, patientWeight: string): string =>
  JSON.stringify({
    roles: ROLE_FIELDS.map(({ key }) => stringValue(values, key).trim()),
    patientWeight: patientWeight.trim(),
    drugs: getDrugSignature(values),
    plan: stringValue(values, ISR_BRIEF_KEYS.plan).trim(),
    confirmations: [
      stringValue(values, ISR_BRIEF_KEYS.readyWeight),
      values[ISR_BRIEF_KEYS.readyCapnography] === true,
      stringValue(values, ISR_BRIEF_KEYS.readyPlan),
      stringValue(values, ISR_BRIEF_KEYS.readyDrugs),
    ],
  });

export const isIsrBriefComplete = (values: BriefValues, patientWeight: string): boolean =>
  hasText(stringValue(values, ISR_BRIEF_KEYS.completedAt)) &&
  stringValue(values, ISR_BRIEF_KEYS.completedSignature) ===
    getBriefSignature(values, patientWeight) &&
  isIsrBriefReady(values, patientWeight);

const formatCompletedTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const IsrFlashBrief = ({
  open,
  patientWeight,
  values,
  onValueChange,
  onClose,
}: IsrFlashBriefProps) => {
  const briefComplete = isIsrBriefComplete(values, patientWeight);
  const [seconds, setSeconds] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);

  const hypnotic = stringValue(values, "5-0");
  const hypnoticDose = stringValue(values, "5-1");
  const curare = stringValue(values, "5-2");
  const curareDose = stringValue(values, "5-3");
  const plan = stringValue(values, ISR_BRIEF_KEYS.plan);
  const drugsAvailable = hasCompleteDrugs(values);
  const weightAvailable = hasValidWeight(patientWeight);
  const ready = isIsrBriefReady(values, patientWeight);

  const weightConfirmed =
    weightAvailable && stringValue(values, ISR_BRIEF_KEYS.readyWeight) === patientWeight.trim();
  const drugsConfirmed =
    drugsAvailable && stringValue(values, ISR_BRIEF_KEYS.readyDrugs) === getDrugSignature(values);
  const planConfirmed =
    hasText(plan) && stringValue(values, ISR_BRIEF_KEYS.readyPlan) === plan.trim();

  const completedCount =
    ROLE_FIELDS.filter(({ key }) => hasText(stringValue(values, key))).length +
    Number(weightConfirmed) +
    Number(values[ISR_BRIEF_KEYS.readyCapnography] === true) +
    Number(planConfirmed) +
    Number(drugsConfirmed) +
    Number(hasText(plan));
  const remainingCount = 9 - completedCount;

  useEffect(() => {
    if (!open) {
      setTimerRunning(false);
      return;
    }
    setSeconds(30);
    setTimerRunning(!briefComplete);
  }, [open, briefComplete]);

  useEffect(() => {
    if (!open || !timerRunning || seconds <= 0) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, seconds, timerRunning]);

  const handleTimerControl = () => {
    if (seconds === 0 || briefComplete) {
      setSeconds(30);
      setTimerRunning(true);
      return;
    }
    setTimerRunning((current) => !current);
  };

  const handleComplete = () => {
    if (!ready) return;
    const completedAt = new Date().toISOString();
    onValueChange(ISR_BRIEF_KEYS.completedAt, completedAt);
    onValueChange(ISR_BRIEF_KEYS.completedSignature, getBriefSignature(values, patientWeight));
    setTimerRunning(false);
    onClose();
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      closeOnBackdrop={false}
      className="isr-brief-dialog"
      aria-labelledby="isr-brief-title"
    >
      <div className="isr-brief-shell">
        <header className="isr-brief-header">
          <div>
            <p className="isr-brief-kicker">Validation collective</p>
            <h2 id="isr-brief-title">Brief flash · ISR</h2>
            <p>Avant la décision finale Go / No go</p>
          </div>
          <button type="button" className="isr-brief-close" onClick={onClose}>
            Fermer
          </button>
        </header>

        <div className="isr-brief-body">
          <div className="isr-brief-column">
            <section className="isr-brief-timer" aria-label="Minuteur du brief">
              <span className="isr-brief-timer-value" aria-live="off">
                00:{String(seconds).padStart(2, "0")}
              </span>
              <span className="isr-brief-timer-label">Brief de 30 secondes</span>
              <button
                type="button"
                className="isr-brief-timer-control"
                onClick={handleTimerControl}
              >
                {seconds === 0 || briefComplete
                  ? "Recommencer 30 s"
                  : timerRunning
                    ? "Mettre en pause"
                    : "Reprendre"}
              </button>
            </section>

            <section className="isr-brief-section" aria-labelledby="isr-brief-roles">
              <h3 id="isr-brief-roles">
                <span>1</span> Rôles <small>attribués à voix haute</small>
              </h3>
              <div className="isr-brief-role-list">
                {ROLE_FIELDS.map((role) => (
                  <label
                    className="isr-brief-role"
                    htmlFor={`isr-brief-role-${role.key}`}
                    key={role.key}
                  >
                    <span className="isr-brief-visually-hidden">{role.label}</span>
                    <span>
                      <strong>{role.label}</strong>
                      <small>Repris de « {role.source} »</small>
                    </span>
                    <input
                      id={`isr-brief-role-${role.key}`}
                      type="text"
                      value={stringValue(values, role.key)}
                      placeholder="À attribuer"
                      onChange={(event) => onValueChange(role.key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="isr-brief-column">
            <section className="isr-brief-section" aria-labelledby="isr-brief-ready">
              <h3 id="isr-brief-ready">
                <span>2</span> Prêts <small>validés à voix haute</small>
              </h3>

              <div className={`isr-brief-drugs ${drugsAvailable ? "" : "is-missing"}`}>
                <div className="isr-brief-drugs-head">
                  <strong>Drogues prévues</strong>
                  <small>Lecture seule · check-list</small>
                </div>
                <dl>
                  <div>
                    <dt>Hypnotique</dt>
                    <dd>
                      {hypnotic && hypnoticDose
                        ? `${hypnotic} · ${hypnoticDose} mg IV`
                        : "À renseigner"}
                    </dd>
                  </div>
                  <div>
                    <dt>Curare</dt>
                    <dd>
                      {curare && curareDose ? `${curare} · ${curareDose} mg IV` : "À renseigner"}
                    </dd>
                  </div>
                </dl>
                {!drugsAvailable && (
                  <p>Compléter le médicament et la dose dans « Thérapeutiques ».</p>
                )}
              </div>

              <div className="isr-brief-ready-list">
                <label
                  className={`isr-brief-ready-row ${weightAvailable ? "" : "is-unavailable"}`}
                  htmlFor="isr-brief-ready-weight"
                >
                  <span className="isr-brief-visually-hidden">Poids confirmé</span>
                  <span>
                    <strong>Poids confirmé</strong>
                    <small>
                      {weightAvailable
                        ? `${patientWeight} kg · calcul patient`
                        : "Poids patient non renseigné"}
                    </small>
                  </span>
                  <input
                    id="isr-brief-ready-weight"
                    type="checkbox"
                    checked={weightConfirmed}
                    disabled={!weightAvailable}
                    onChange={(event) =>
                      onValueChange(
                        ISR_BRIEF_KEYS.readyWeight,
                        event.target.checked ? patientWeight.trim() : ""
                      )
                    }
                  />
                </label>
                <label className="isr-brief-ready-row" htmlFor="isr-brief-ready-capnography">
                  <span className="isr-brief-visually-hidden">Capnographie branchée</span>
                  <span>
                    <strong>Capnographie branchée</strong>
                    <small>EtCO₂ prêt avant induction</small>
                  </span>
                  <input
                    id="isr-brief-ready-capnography"
                    type="checkbox"
                    checked={values[ISR_BRIEF_KEYS.readyCapnography] === true}
                    onChange={(event) =>
                      onValueChange(ISR_BRIEF_KEYS.readyCapnography, event.target.checked)
                    }
                  />
                </label>
                <label
                  className={`isr-brief-ready-row ${hasText(plan) ? "" : "is-unavailable"}`}
                  htmlFor="isr-brief-ready-plan"
                >
                  <span className="isr-brief-visually-hidden">Plan B annoncé</span>
                  <span>
                    <strong>Plan B annoncé</strong>
                    <small>Alternative comprise par l’équipe</small>
                  </span>
                  <input
                    id="isr-brief-ready-plan"
                    type="checkbox"
                    checked={planConfirmed}
                    disabled={!hasText(plan)}
                    onChange={(event) =>
                      onValueChange(
                        ISR_BRIEF_KEYS.readyPlan,
                        event.target.checked ? plan.trim() : ""
                      )
                    }
                  />
                </label>
                <label
                  className={`isr-brief-ready-row ${drugsAvailable ? "" : "is-unavailable"}`}
                  htmlFor="isr-brief-ready-drugs"
                >
                  <span className="isr-brief-visually-hidden">Drogues + doses vérifiées</span>
                  <span>
                    <strong>Drogues + doses vérifiées</strong>
                    <small>Double lecture à voix haute</small>
                  </span>
                  <input
                    id="isr-brief-ready-drugs"
                    type="checkbox"
                    checked={drugsConfirmed}
                    disabled={!drugsAvailable}
                    onChange={(event) =>
                      onValueChange(
                        ISR_BRIEF_KEYS.readyDrugs,
                        event.target.checked ? getDrugSignature(values) : ""
                      )
                    }
                  />
                </label>
              </div>
            </section>

            <section className="isr-brief-section" aria-labelledby="isr-brief-plan">
              <h3 id="isr-brief-plan">
                <span>3</span> Plan de secours
              </h3>
              <label className="isr-brief-plan" htmlFor="isr-brief-plan-select">
                <span>Alternative annoncée à l’équipe</span>
                <select
                  id="isr-brief-plan-select"
                  value={plan}
                  onChange={(event) => onValueChange(ISR_BRIEF_KEYS.plan, event.target.value)}
                >
                  <option value="">À annoncer</option>
                  {PLAN_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </section>
          </div>
        </div>

        <footer className="isr-brief-footer">
          <div aria-live="polite">
            <strong>
              {ready
                ? "Tous les points sont confirmés"
                : `${remainingCount} élément${remainingCount > 1 ? "s" : ""} à compléter`}
            </strong>
            <span>Le brief ne valide pas automatiquement la décision Go ISR.</span>
          </div>
          <button type="button" disabled={!ready} onClick={handleComplete}>
            Équipe prête — démarrer
          </button>
        </footer>
      </div>
    </ModalDialog>
  );
};

export { formatCompletedTime };
export default IsrFlashBrief;
