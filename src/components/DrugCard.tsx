import { useState, useEffect, useMemo, useId } from "react";
import type { CSSProperties } from "react";
import {
  BookOpen,
  BriefcaseMedical,
  Check,
  HeartPulse,
  ShieldCheck,
  Syringe,
  TestTubes,
  UserRound,
  UsersRound,
} from "lucide-react";
import { calcDose, ciSeverity } from "../lib/calc";
import type { ProtocolRef } from "../lib/crossref";
import { isPreview } from "../lib/featureFlags";
import type { Drug } from "../types/data";
import DrugNote from "./DrugNote";
import PrepBlock from "./PrepBlock";
import PseBlock from "./PseBlock";
import { buildPrepMedPreviewModel, getPreviewPseDefault } from "./PrepMedPreviewModel";
import { useResolvedDrugPrep, useResolvedDrugPse } from "./useResolvedPreparation";

const TABS = [
  { key: "poso", label: "Posologie", type: "poso" },
  { key: "indic", label: "Indications", type: "info" },
  { key: "ci", label: "Contre-ind.", type: "ci" },
  { key: "ei", label: "Effets indés.", type: "danger" },
  { key: "cond", label: "Conditionnements", type: "neutral" },
];

const MONITORING_BADGES = [
  {
    label: "Scope",
    className: "monitor-scope",
    pattern:
      /sous scope|surveillance scop|scope|monitorage ecg|surveillance ecg|surveillance cardiaque/i,
  },
  {
    label: "ECG",
    className: "monitor-ecg",
    pattern: /ecg obligatoire|ecg long|electrocardioscope|électrocardioscope/i,
  },
  {
    label: "Capno",
    className: "monitor-capno",
    pattern: /capno|etco2|etco₂/i,
  },
];

const MonitoringWaveIcon = () => (
  <svg viewBox="0 0 34 14" aria-hidden="true" className="monitor-wave">
    <path d="M1 8h6l3-6 5 11 4-8h5l2-3 3 6h4" />
  </svg>
);

const normalizePrepDuplicateText = (value: string | undefined | null) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[→⇒]/g, " ")
    .replace(/[—–-]/g, " ")
    .replace(/[,;:()=]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const collectPrepDuplicateTexts = (prep: Drug["prep"]): string[] => {
  if (!prep) return [];
  const out: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string" && value.trim()) out.push(value);
  };

  [
    prep.solvant,
    prep.conc_finale,
    prep.duree,
    prep.stabilite,
    prep.debit,
    prep.prelever_label,
    prep.fd_prelever,
    prep.calc_titre,
    ...(prep.etapes || []),
    ...(prep.notes || []),
    ...(prep.duplicate_posology || []),
  ].forEach(push);

  prep.preparations?.forEach((recipe) => {
    [
      recipe.titre,
      recipe.tag,
      recipe.prelever,
      recipe.completer,
      recipe.concentration,
      recipe.rate_label,
      recipe.rate_value,
      recipe.note,
      ...(recipe.etapes || []),
      ...(recipe.notes || []),
      ...(recipe.duplicate_posology || []),
    ].forEach(push);
    recipe.rows?.forEach((row) => push(`${row.label} ${row.value}`));
    recipe.phase_doses?.forEach((phase) => push(phase.label));
    if (recipe.dose_based_dilution) {
      push(recipe.dose_based_dilution.below_or_equal);
      push(recipe.dose_based_dilution.above);
    }
  });

  return out.map(normalizePrepDuplicateText).filter((text) => text.length >= 12);
};

const isPosoDuplicateOfPrep = (line: string, prepTexts: string[]) => {
  const normalized = normalizePrepDuplicateText(line);
  if (normalized.length < 12 || /^voies? /.test(normalized)) return false;
  return prepTexts.some((prepText) => {
    if (prepText === normalized) return true;
    return (
      Math.min(prepText.length, normalized.length) >= 24 &&
      (prepText.includes(normalized) || normalized.includes(prepText))
    );
  });
};

type DrugCardProps = {
  drug: Drug;
  isFavorite?: boolean;
  patientWeight?: string;
  prepPopulation?: "adulte" | "enfant" | null;
  autoOpen?: boolean;
  onAutoOpen?: () => void;
  onToggleFavorite?: (id: number) => void;
  onOpen?: (id: number) => void;
  onOpenChange?: (key: string, open: boolean) => void;
  onProtocolOpen?: () => void;
};

const DrugCard = ({
  drug,
  isFavorite,
  patientWeight = "",
  prepPopulation,
  autoOpen,
  onAutoOpen,
  onToggleFavorite,
  onOpen,
  onOpenChange,
  onProtocolOpen,
}: DrugCardProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [hasNote, setHasNote] = useState(false);
  const [previewWorkflow, setPreviewWorkflow] = useState<"prepare" | "control" | "reference">(
    "prepare"
  );
  const [previewRecipeIndex, setPreviewRecipeIndex] = useState(0);
  const [previewDose, setPreviewDose] = useState(0.5);
  const [previewRecipeInput, setPreviewRecipeInput] = useState<number | null>(null);
  const [previewAgeBand, setPreviewAgeBand] = useState<"lt6" | "gte6" | null>(null);
  const [previewChecks, setPreviewChecks] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [previewVerifiedAt, setPreviewVerifiedAt] = useState<string | null>(null);
  const previewMode = isPreview();
  const { prep: resolvedPrep, loading: previewPrepLoading } = useResolvedDrugPrep(drug, false);
  const { pse: resolvedPse, loading: previewPseLoading } = useResolvedDrugPse(drug.id, false);
  // Poids partagé : vient du bandeau global (App.tsx → PatientWeightBanner) via
  // le prop. Plus d'input local dans la fiche (évite le doublon avec le bandeau).
  const weight = patientWeight;
  // Clé d'instance unique : une même drogue peut être rendue 2 fois
  // simultanément (section Récents + liste filtrée). Utiliser drug.id
  // comme clé d'état « ouvert » ferait que le montage de la 2e carte
  // (fermée) efface l'état posé par la 1re. useId garantit une clé par
  // instance de carte.
  const instanceId = useId();

  // Protocoles qui mentionnent cette drogue. Cache global dans crossref.ts
  // — l'appel est instantané après le premier rendu de la session.
  // Chargé à l'ouverture seulement pour ne pas faire dépendre la liste
  // Médicaments du chunk Protocoles tant que la fiche reste repliée.
  const canOpenProtocol = Boolean(onProtocolOpen);
  const [relatedProtocols, setRelatedProtocols] = useState<ProtocolRef[]>([]);
  useEffect(() => {
    if (!open || !canOpenProtocol) {
      setRelatedProtocols([]);
      return;
    }

    let active = true;
    import("../lib/crossref")
      .then(({ findProtocolsForDrug }) => {
        if (active) setRelatedProtocols(findProtocolsForDrug(drug.nom));
      })
      .catch(() => {
        if (active) setRelatedProtocols([]);
      });

    return () => {
      active = false;
    };
  }, [open, canOpenProtocol, drug.nom]);

  useEffect(() => {
    setPreviewRecipeIndex((index) => (index === 0 ? index : 0));
    setPreviewRecipeInput(null);
    setPreviewAgeBand(null);
    setPreviewChecks((checks) =>
      checks.some(Boolean) ? [false, false, false, false, false] : checks
    );
    setPreviewVerifiedAt(null);
  }, [drug.id, prepPopulation, weight]);

  useEffect(() => {
    setPreviewChecks((checks) =>
      checks.some(Boolean) ? [false, false, false, false, false] : checks
    );
    setPreviewVerifiedAt(null);
  }, [previewPrepLoading, previewPseLoading]);

  const resetPreviewVerification = () => {
    setPreviewChecks([false, false, false, false, false]);
    setPreviewVerifiedAt(null);
  };

  const selectPreviewRecipe = (index: number) => {
    if (index === previewRecipeIndex) return;
    setPreviewRecipeIndex(index);
    setPreviewRecipeInput(null);
    setPreviewAgeBand(null);
    resetPreviewVerification();
  };

  const monitoringBadges = useMemo(() => {
    const labels = new Set((drug.monitoring || []).map((item) => item.trim()).filter(Boolean));
    const text = [
      drug.desc,
      ...(drug.indic || []),
      ...(drug.ci || []),
      ...(drug.ei || []),
      ...(drug.cond || []),
      ...(drug.poso?.a || []),
      ...(drug.poso?.p || []),
      drug.prep?.duree,
      ...(drug.prep?.etapes || []),
      ...(drug.prep?.notes || []),
    ]
      .filter(Boolean)
      .join(" ");

    MONITORING_BADGES.forEach((badge) => {
      if (badge.pattern.test(text)) labels.add(badge.label);
    });

    return Array.from(labels).map((label) => {
      const preset = MONITORING_BADGES.find(
        (badge) => badge.label.toLowerCase() === label.toLowerCase()
      );
      return { label, className: preset?.className || "monitor-custom" };
    });
  }, [drug]);
  const monitoringLabel = monitoringBadges.map((badge) => badge.label).join(" + ");
  const monitoringCornerLabel = monitoringBadges.map((badge) => badge.label).join("+");
  const monitoringClass = monitoringBadges[0]?.className || "monitor-custom";
  const previewWeight = Number.parseFloat(weight);
  const previewPopulation =
    prepPopulation || (Number.isFinite(previewWeight) && previewWeight < 30 ? "enfant" : "adulte");
  const previewPrepData = resolvedPrep;
  const previewModel = buildPrepMedPreviewModel({
    drug,
    prep: previewPrepData,
    pse: resolvedPse,
    population: previewPopulation,
    weight,
    recipeIndex: previewRecipeIndex,
    pseInput: previewDose,
    recipeInput: previewRecipeInput,
    ageBand: previewAgeBand,
    monitoringLabel,
  });
  const previewModeCards = previewModel.modes;
  const previewDoseSteps = previewModel.pseSteps;
  useEffect(() => {
    setPreviewRecipeIndex((index) => (index < previewModeCards.length ? index : 0));
  }, [previewModeCards.length]);
  useEffect(() => {
    setPreviewDose(getPreviewPseDefault(resolvedPse, weight, resolvedPrep));
  }, [drug.id, previewPopulation, previewPseLoading, resolvedPrep, resolvedPse, weight]);
  const adjustPreviewDose = (direction: -1 | 1) => {
    resetPreviewVerification();
    if (!previewDoseSteps.length) {
      setPreviewDose((dose) => Math.max(0.01, +(dose + direction * 0.1).toFixed(2)));
      return;
    }
    if (direction > 0 && previewDose < previewDoseSteps[0]) {
      setPreviewDose(previewDoseSteps[0]);
      return;
    }
    const exactIndex = previewDoseSteps.findIndex((step) => step === previewDose);
    const nearestIndex =
      exactIndex >= 0
        ? exactIndex
        : previewDoseSteps.reduce(
            (best, step, index) =>
              Math.abs(step - previewDose) < Math.abs(previewDoseSteps[best] - previewDose)
                ? index
                : best,
            0
          );
    const nextIndex = Math.min(previewDoseSteps.length - 1, Math.max(0, nearestIndex + direction));
    setPreviewDose(previewDoseSteps[nextIndex]);
  };
  const adjustPreviewRecipeInput = (
    direction: -1 | 1,
    control: { value: number; step?: number; min?: number; max?: number; steps?: number[] }
  ) => {
    resetPreviewVerification();
    const allowed = control.steps || [];
    if (allowed.length) {
      if (direction > 0 && control.value < allowed[0]) {
        setPreviewRecipeInput(allowed[0]);
        return;
      }
      const exactIndex = allowed.findIndex((step) => step === control.value);
      const nearestIndex =
        exactIndex >= 0
          ? exactIndex
          : allowed.reduce(
              (best, step, index) =>
                Math.abs(step - control.value) < Math.abs(allowed[best] - control.value)
                  ? index
                  : best,
              0
            );
      const nextIndex = Math.min(allowed.length - 1, Math.max(0, nearestIndex + direction));
      setPreviewRecipeInput(allowed[nextIndex]);
      return;
    }
    const step = control.step || 1;
    const next = +(control.value + direction * step).toFixed(4);
    setPreviewRecipeInput(Math.min(control.max ?? next, Math.max(control.min ?? 0, next)));
  };
  const previewStructuredSteps = previewModel.steps;
  const previewControlLabels = previewModel.controls;

  // onOpen volontairement exclu des deps : addToHistory est recréé à chaque render
  // parent, ce qui relancerait l'effet et écraserait l'onglet sélectionné par l'utilisateur.
  useEffect(() => {
    if (open) {
      setActiveTab("poso");
      if (onOpen) onOpen(drug.id);
    }
  }, [open, drug.id]); // eslint-disable-line

  // Notifie le parent de l'état déployé/replié (App masque la barre de
  // recherche tant qu'au moins une fiche est ouverte). Cleanup au démontage
  // = considéré fermé (ex: la fiche disparaît quand la recherche change).
  useEffect(() => {
    onOpenChange?.(instanceId, open);
    return () => onOpenChange?.(instanceId, false);
  }, [open, instanceId, onOpenChange]);

  // Ouverture pilotée par deep link (?med=… — cf. lib/deepLink.ts) : déploie
  // la fiche puis signale la consommation à App (one-shot — l'utilisateur
  // garde ensuite la main pour refermer sans que le lien se rejoue).
  useEffect(() => {
    if (!autoOpen) return;
    setOpen(true);
    onAutoOpen?.();
  }, [autoOpen, onAutoOpen]);

  const toggleTab = (key: string) =>
    setActiveTab(previewMode ? key : activeTab === key ? null : key);

  const renderList = (items: string[] | undefined) => {
    if (!items || items.length === 0) return <span className="na">Non renseigné</span>;
    return (
      <ul className="item-list">
        {items.map((it: string, i: number) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
  };

  const renderPosoTab = (includePreparation = true, includeNote = true) => {
    // Filtrage des colonnes posologie :
    //  1. Le toggle Adulte/Enfant (prop `prepPopulation`, non-null seulement
    //     quand l'utilisateur l'a actionné) PRIME : « Enfant » masque l'adulte
    //     et inversement, avec repli sur l'autre colonne si la population
    //     demandée n'est pas renseignée.
    //  2. Sinon, filtrage par poids : < 30 kg → pédiatrique · > 70 kg → adulte ·
    //     30–70 kg (inclus) ou pas de poids → les deux. Même logique de repli.
    const kgNum = parseFloat(weight);
    const validKg = kgNum > 0 && kgNum <= 300;
    const hasAdult = !!(drug.poso?.a && drug.poso.a.length);
    const hasPed = !!(drug.poso?.p && drug.poso.p.length);
    const effectivePrep = previewMode ? resolvedPrep : drug.prep;
    const hidePosologyGrid = Boolean(effectivePrep?.hide_poso_when_prepared);
    const prepDuplicateTexts = previewMode ? collectPrepDuplicateTexts(effectivePrep) : [];
    let showAdult = true;
    let showPed = true;
    let posoHint = "";
    if (prepPopulation === "enfant") {
      if (hasPed) {
        showAdult = false;
        posoHint = "Mode enfant — posologie pédiatrique";
      } else {
        showPed = false;
        posoHint = "Pas de posologie pédiatrique — posologie adulte affichée";
      }
    } else if (prepPopulation === "adulte") {
      if (hasAdult) {
        showPed = false;
        posoHint = "Mode adulte — posologie adulte";
      } else {
        showAdult = false;
        posoHint = "Pas de posologie adulte — posologie pédiatrique affichée";
      }
    } else if (validKg && kgNum < 30) {
      if (hasPed) {
        showAdult = false;
        posoHint = "Poids < 30 kg — posologie pédiatrique";
      } else {
        showPed = false;
        posoHint = "Pas de posologie pédiatrique — posologie adulte affichée";
      }
    } else if (validKg && kgNum > 70) {
      if (hasAdult) {
        showPed = false;
        posoHint = "Poids > 70 kg — posologie adulte";
      } else {
        showAdult = false;
        posoHint = "Pas de posologie adulte — posologie pédiatrique affichée";
      }
    }
    const single = showAdult !== showPed;

    const renderPosoLines = (lines: string[] | undefined) => {
      const visibleLines = (lines || []).filter(
        (line) => !isPosoDuplicateOfPrep(line, prepDuplicateTexts)
      );
      return visibleLines.length ? (
        visibleLines.map((p: string, i: number) => {
          const res = calcDose(p, weight);
          return (
            <div key={i} className="poso-item">
              {p}
              {res && (
                <span
                  className={`calc-result ${res.validation === "danger" ? "calc-danger" : res.capped ? "calc-over" : "calc-ok"}`}
                >
                  {res.value}
                  {res.validation === "danger" ? " 🚨 vérifier" : res.capped ? " ⚠ max" : ""}
                </span>
              )}
            </div>
          );
        })
      ) : (
        <span className="na">
          {lines?.length ? "Voir préparation ci-dessous" : "Non renseigné"}
        </span>
      );
    };

    return (
      <>
        {!hidePosologyGrid && (
          <>
            {posoHint && <div className="poso-filter-hint">{posoHint}</div>}
            <div className={`poso-grid ${single ? "poso-grid-single" : ""}`}>
              {showAdult && (
                <div className="poso-box">
                  <div className="poso-title">Adulte</div>
                  {renderPosoLines(drug.poso.a)}
                </div>
              )}
              {showPed && (
                <div className="poso-box">
                  <div className="poso-title">Pédiatrique</div>
                  {renderPosoLines(drug.poso.p)}
                </div>
              )}
            </div>
          </>
        )}

        {includePreparation && (
          <>
            <PrepBlock drug={drug} weight={weight} prepPopulation={prepPopulation} />
            <PseBlock drug={drug} weight={weight} />
          </>
        )}
        {includeNote && <DrugNote drugId={drug.id} onChange={setHasNote} />}
      </>
    );
  };

  const renderContent = (key: string) => {
    if (key === "indic") return renderList(drug.indic);
    if (key === "ci") {
      if (!drug.ci || drug.ci.length === 0) return <span className="na">Non renseigné</span>;
      return (
        <ul className="ci-list">
          {drug.ci.map((it: string, i: number) => {
            const sev = ciSeverity(it);
            return (
              <li key={i} className={`ci-item ${sev ? `ci-item-${sev}` : ""}`}>
                {sev && (
                  <span className={`ci-badge ci-badge-${sev}`}>
                    {sev === "abs" ? "Absolue" : sev === "rel" ? "Relative" : "Précaution"}
                  </span>
                )}
                <span className="ci-text">{it}</span>
              </li>
            );
          })}
        </ul>
      );
    }
    if (key === "ei") return renderList(drug.ei);
    if (key === "cond") {
      if (!drug.cond || drug.cond.length === 0) return <span className="na">Non renseigné</span>;
      return (
        <div className="cond-list">
          {drug.cond.map((c: string, i: number) => (
            <span key={i} className="cond-tag">
              {c}
            </span>
          ))}
        </div>
      );
    }
    if (key === "poso") return renderPosoTab(!previewMode, !previewMode);
    return null;
  };

  return (
    <div
      className={`drug-card ${open ? "drug-card-open" : ""} ${
        monitoringBadges.length > 0 ? "drug-card-monitored" : ""
      } ${previewMode ? "drug-card-preview-v25" : ""}`}
      style={{ "--drug-accent": drug.couleur } as CSSProperties}
    >
      <div className="drug-row">
        <button
          className="drug-header"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`${drug.nom} — ${open ? "replier" : "déployer"} la fiche`}
        >
          <div className="drug-color-bar" style={{ background: drug.couleur }} />
          <div className="drug-main">
            <div className="drug-title-row">
              <span className="drug-icon">{drug.icon}</span>
              <div className="drug-name-block">
                <span className="drug-name-row">
                  <span className="drug-name">{drug.nom}</span>
                  {hasNote && (
                    <span className="note-indicator" title="Note personnelle ajoutée">
                      ✎
                    </span>
                  )}
                </span>
                {drug.commercial && <span className="drug-commercial">{drug.commercial}</span>}
              </div>
            </div>
            <div className="drug-subtitle">
              <span className="badge badge-cat" data-cat={drug.cat}>
                {drug.cat}
              </span>
              {drug.svc.map((s: string) => (
                <span key={s} className="badge badge-svc">
                  {s}
                </span>
              ))}
            </div>
            {drug.classe && <div className="drug-classe">{drug.classe}</div>}
          </div>
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
          {monitoringBadges.length > 0 && (
            <div
              className={`drug-monitor-corner ${monitoringClass}`}
              aria-label={`Surveillance requise : ${monitoringLabel}`}
              title={`Surveillance requise : ${monitoringLabel}`}
            >
              <MonitoringWaveIcon />
              <span>{monitoringCornerLabel}</span>
            </div>
          )}
        </button>
        {onToggleFavorite && (
          <button
            type="button"
            className={`drug-favorite ${isFavorite ? "drug-favorite-active" : ""}`}
            onClick={() => onToggleFavorite(drug.id)}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        )}
      </div>

      {open && (
        <div className={`drug-body ${previewMode ? `preview-workflow-${previewWorkflow}` : ""}`}>
          {previewMode && (
            <>
              <nav className="preview-v25-workflow" aria-label="Étapes de la fiche médicament">
                {[
                  ["prepare", "1", "Préparer", "Recette active"],
                  ["control", "2", "Contrôler", `${previewChecks.filter(Boolean).length} / 5`],
                  ["reference", "i", "Référence", "Fiche clinique"],
                ].map(([key, index, label, detail]) => (
                  <button
                    key={key}
                    type="button"
                    className={previewWorkflow === key ? "is-active" : ""}
                    aria-pressed={previewWorkflow === key}
                    onClick={() => setPreviewWorkflow(key as typeof previewWorkflow)}
                  >
                    <span>{index}</span>
                    <span>
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </span>
                  </button>
                ))}
              </nav>
            </>
          )}
          {previewMode ? (
            <section className="preview-v25-identity" aria-label="Identité clinique">
              <div>
                <strong>DCI</strong>
                <span>{drug.dci}</span>
              </div>
              <div>
                <strong>Surveillance</strong>
                <span className="preview-v25-monitoring">
                  {monitoringBadges.length
                    ? monitoringBadges.map((badge) => badge.label).join(" · ")
                    : "Selon protocole"}
                </span>
              </div>
              <p>{drug.desc}</p>
            </section>
          ) : (
            <>
              <div className="drug-meta">
                <div>
                  <strong>DCI</strong>
                  <span>{drug.dci}</span>
                </div>
                {monitoringBadges.length > 0 && (
                  <div>
                    <strong>Surveillance</strong>
                    <span>{monitoringBadges.map((badge) => badge.label).join(" · ")}</span>
                  </div>
                )}
              </div>
              <p className="drug-desc">{drug.desc}</p>
            </>
          )}

          {previewMode && (
            <div className="preview-v25-modes" role="group" aria-label="Modes de préparation">
              {previewModeCards.map((mode, index) => (
                <button
                  key={`${mode.title}-${index}`}
                  type="button"
                  className={index === previewRecipeIndex ? "is-active" : ""}
                  aria-label={`${mode.title} — ${mode.detail}`}
                  aria-pressed={index === previewRecipeIndex}
                  onClick={() => selectPreviewRecipe(index)}
                >
                  <span>
                    {index % 3 === 0 ? (
                      <HeartPulse />
                    ) : index % 3 === 1 ? (
                      <UserRound />
                    ) : (
                      <TestTubes />
                    )}
                  </span>
                  <span>
                    <strong className="preview-v25-mode-title">{mode.title}</strong>
                    <small className="preview-v25-mode-detail">{mode.detail}</small>
                  </span>
                  {index === previewRecipeIndex && (
                    <b>
                      <Check />
                    </b>
                  )}
                </button>
              ))}
            </div>
          )}

          {previewMode && (
            <div
              className="preview-v25-results"
              aria-label="Résultats de préparation"
              aria-live="polite"
            >
              {previewModel.metrics.map((metric, index) => (
                <div key={`${metric.label}-${index}`}>
                  <span className="preview-v25-result-icon">
                    {index === 0 ? <Syringe /> : index === 1 ? <TestTubes /> : <BriefcaseMedical />}
                  </span>
                  <span>
                    <small>{metric.label}</small>
                    {metric.control?.kind === "age" ? (
                      <div
                        className="preview-v25-age-switch"
                        role="group"
                        aria-label="Tranche d’âge"
                      >
                        {metric.control.options.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={metric.control?.value === option.value ? "is-active" : ""}
                            aria-pressed={metric.control?.value === option.value}
                            onClick={() => {
                              resetPreviewVerification();
                              setPreviewAgeBand(option.value);
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : metric.control ? (
                      <div className="preview-v25-dose-stepper">
                        <button
                          type="button"
                          aria-label={
                            metric.control.kind === "pse"
                              ? "Diminuer le réglage"
                              : "Diminuer la valeur prescrite"
                          }
                          disabled={
                            metric.control.steps?.length
                              ? metric.control.value <= metric.control.steps[0]
                              : metric.control.min !== undefined &&
                                metric.control.value <= metric.control.min
                          }
                          onClick={() =>
                            metric.control?.kind === "pse"
                              ? adjustPreviewDose(-1)
                              : metric.control?.kind === "recipe"
                                ? adjustPreviewRecipeInput(-1, metric.control)
                                : undefined
                          }
                        >
                          −
                        </button>
                        <output>{metric.value}</output>
                        <button
                          type="button"
                          aria-label={
                            metric.control.kind === "pse"
                              ? "Augmenter le réglage"
                              : "Augmenter la valeur prescrite"
                          }
                          disabled={
                            metric.control.steps?.length
                              ? metric.control.value >=
                                metric.control.steps[metric.control.steps.length - 1]
                              : metric.control.max !== undefined &&
                                metric.control.value >= metric.control.max
                          }
                          onClick={() =>
                            metric.control?.kind === "pse"
                              ? adjustPreviewDose(1)
                              : metric.control?.kind === "recipe"
                                ? adjustPreviewRecipeInput(1, metric.control)
                                : undefined
                          }
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <strong>{metric.value}</strong>
                    )}
                    <em>{metric.note}</em>
                  </span>
                </div>
              ))}
            </div>
          )}

          {onProtocolOpen && relatedProtocols.length > 0 && (
            <div className="drug-related">
              <span className="drug-related-label">Utilisée dans</span>
              <div className="drug-related-list">
                {relatedProtocols.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="drug-related-chip"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onProtocolOpen) onProtocolOpen();
                    }}
                  >
                    {p.icon && <span aria-hidden="true">{p.icon}</span>}
                    <span>{p.titre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {previewMode && (
            <section
              className="preview-v25-panel preview-v25-prepare"
              aria-labelledby={`${instanceId}-preview-prep-title`}
            >
              <div className="preview-v25-section-head">
                <div>
                  <span id={`${instanceId}-preview-prep-title`}>
                    <ShieldCheck /> Préparation sécurisée
                  </span>
                </div>
                <span className="preview-v25-prep-context">{previewModel.context}</span>
              </div>
              <ol className="preview-v25-recipe">
                {previewStructuredSteps.map((step, index) => (
                  <li key={`${step.title}-${step.detail}-${index}`}>
                    <span>{index + 1}</span>
                    <span>
                      <strong>{step.title}</strong>
                      <small>{step.detail}</small>
                    </span>
                    <b>{step.result}</b>
                  </li>
                ))}
              </ol>
              {previewModel.notes.length ? (
                <div className="preview-v25-recipe-notes">
                  {previewModel.notes.map((note) => (
                    <span key={note}>{note}</span>
                  ))}
                </div>
              ) : null}
            </section>
          )}

          {previewMode && (
            <section
              className="preview-v25-panel preview-v25-control"
              aria-labelledby={`${instanceId}-preview-control-title`}
            >
              <div className="preview-v25-section-head">
                <div className="preview-v25-control-title">
                  <strong id={`${instanceId}-preview-control-title`}>
                    <UsersRound /> Double contrôle
                  </strong>
                  {!previewVerifiedAt && (
                    <small>
                      Vérifier les éléments qui conditionnent le calcul avant administration.
                    </small>
                  )}
                </div>
              </div>
              {previewVerifiedAt ? (
                <div className="preview-v25-verified" role="status">
                  <span>
                    <Check />
                  </span>
                  <div>
                    <strong>Préparation vérifiée</strong>
                    <small>5 / 5 contrôles · {previewVerifiedAt}</small>
                  </div>
                  <button type="button" onClick={() => setPreviewVerifiedAt(null)}>
                    Revoir
                  </button>
                </div>
              ) : (
                <>
                  <div className="preview-v25-checks">
                    {previewControlLabels.map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        aria-label={label}
                        aria-pressed={previewChecks[index]}
                        className={previewChecks[index] ? "is-checked" : ""}
                        onClick={() =>
                          setPreviewChecks((checks) =>
                            checks.map((checked, checkIndex) =>
                              checkIndex === index ? !checked : checked
                            )
                          )
                        }
                      >
                        <span aria-hidden="true">
                          <Check />
                        </span>
                        <strong>{label}</strong>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!previewChecks.every(Boolean) || !previewModel.canValidate}
                    className={`preview-v25-validation ${
                      previewChecks.every(Boolean) && previewModel.canValidate ? "ready" : ""
                    }`}
                    onClick={() => {
                      if (!previewChecks.every(Boolean) || !previewModel.canValidate) return;
                      setPreviewVerifiedAt(
                        new Date().toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      );
                    }}
                  >
                    {previewChecks.every(Boolean)
                      ? previewModel.canValidate
                        ? "Valider les 5 contrôles"
                        : "Calcul à compléter"
                      : "Préparation à vérifier"}
                  </button>
                  {previewChecks.every(Boolean) && previewModel.validationReason && (
                    <span className="preview-v25-validation-reason" role="status">
                      {previewModel.validationReason}
                    </span>
                  )}
                  <span className="preview-v25-check-progress">
                    {previewChecks.filter(Boolean).length} / 5 contrôles
                  </span>
                </>
              )}
            </section>
          )}

          {previewMode && (
            <section className="preview-v25-panel preview-v25-reference">
              <div className="preview-v25-section-head preview-v25-reference-head">
                <div>
                  <strong>
                    <BookOpen /> Référence clinique
                  </strong>
                  <small>Informations complémentaires, après sécurisation de la préparation.</small>
                </div>
              </div>
              <div className="tabs-row">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.key;
                  const isCi = tab.key === "ci";
                  const ciCount = isCi && drug.ci && drug.ci.length > 0 ? drug.ci.length : 0;
                  return (
                    <button
                      key={tab.key}
                      className={`tab-btn tab-${tab.type} ${isActive ? "tab-active" : ""}`}
                      aria-pressed={isActive}
                      style={
                        tab.type === "poso" && isActive
                          ? {
                              background:
                                "color-mix(in srgb, var(--preview-primary) 9%, var(--card))",
                              borderColor: "var(--preview-primary)",
                              color: "var(--preview-primary)",
                            }
                          : {}
                      }
                      onClick={() => toggleTab(tab.key)}
                    >
                      {isCi ? (
                        <svg
                          viewBox="0 0 24 24"
                          width="11"
                          height="11"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className="tab-ci-icon"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      ) : (
                        <span
                          className={`dot dot-${tab.type}`}
                          style={
                            tab.type === "poso" ? { background: "var(--preview-primary)" } : {}
                          }
                        />
                      )}
                      <span className="tab-label">{tab.label}</span>
                      {ciCount > 0 && <span className="tab-ci-badge">{ciCount}</span>}
                    </button>
                  );
                })}
              </div>
              {activeTab && <div className="tab-content">{renderContent(activeTab)}</div>}
            </section>
          )}

          {!previewMode && (
            <div className="tabs-row">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                const isCi = tab.key === "ci";
                const ciCount = isCi && drug.ci && drug.ci.length > 0 ? drug.ci.length : 0;
                return (
                  <button
                    key={tab.key}
                    className={`tab-btn tab-${tab.type} ${isActive ? "tab-active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => toggleTab(tab.key)}
                  >
                    <span className={`dot dot-${tab.type}`} />
                    <span className="tab-label">{tab.label}</span>
                    {ciCount > 0 && <span className="tab-ci-badge">{ciCount}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {activeTab && !previewMode && (
            <div className="tab-content">{renderContent(activeTab)}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DrugCard;
