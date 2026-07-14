import { useState, useEffect, useMemo, useId } from "react";
import type { CSSProperties } from "react";
import {
  BookOpen,
  BriefcaseMedical,
  Check,
  HeartPulse,
  PencilLine,
  ShieldCheck,
  Syringe,
  TestTubes,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { ProtocolRef } from "../lib/crossref";
import { isPreview } from "../lib/featureFlags";
import type { Drug } from "../types/data";
import DrugNote from "./DrugNote";
import { DrugTabContent } from "./DrugCardContent";
import type { PreparationNumericControl } from "./PreparationModel";
import { useResolvedDrugPrep, useResolvedDrugPse } from "./useResolvedPreparation";
import { usePreparationEngine } from "./usePreparationEngine";
import { PreparationDoseStepper } from "./preparation/PreparationDoseStepper";
import {
  CLOSED_PREPARATION_MODEL,
  MONITORING_BADGES,
  MonitoringWaveIcon,
  prepStepDetail,
  TABS,
} from "./preparation/drugCardHelpers";

type DrugCardProps = {
  drug: Drug;
  isFavorite?: boolean;
  patientWeight?: string;
  prepPopulation?: "adulte" | "enfant" | null;
  prepV25Enabled?: boolean;
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
  prepV25Enabled = false,
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
  const [noteContent, setNoteContent] = useState("");
  const [noteEditorRequest, setNoteEditorRequest] = useState(0);
  const [mobileNoteExpanded, setMobileNoteExpanded] = useState(false);
  const [prepWorkflow, setPrepWorkflow] = useState<"prepare" | "control" | "reference">("prepare");
  const [prepRecipeIndex, setPrepRecipeIndex] = useState(0);
  const [prepDose, setPrepDose] = useState(0.5);
  const [prepRecipeInput, setPrepRecipeInput] = useState<number | null>(null);
  const [prepAgeBand, setPrepAgeBand] = useState<"lt6" | "gte6" | null>(null);
  const [prepChecks, setPrepChecks] = useState<boolean[]>([false, false, false, false, false]);
  const [prepVerifiedAt, setPrepVerifiedAt] = useState<string | null>(null);
  const previewMode = isPreview();
  // La surface Prépa Med v2.5 est désormais la fiche publique. Le mode preview
  // ne pilote plus que les overlays de données encore expérimentaux (PSE).
  const prepV25Mode = prepV25Enabled || previewMode;
  const { prep: resolvedPrep, loading: previewPrepLoading } = useResolvedDrugPrep(drug, open);
  const { pse: resolvedPse, loading: previewPseLoading } = useResolvedDrugPse(
    drug.id,
    previewMode,
    open
  );
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
    setPrepRecipeIndex((index) => (index === 0 ? index : 0));
    setPrepRecipeInput(null);
    setPrepAgeBand(null);
    setPrepChecks((checks) =>
      checks.some(Boolean) ? [false, false, false, false, false] : checks
    );
    setPrepVerifiedAt(null);
  }, [drug.id, prepPopulation, weight]);

  useEffect(() => {
    setMobileNoteExpanded(false);
  }, [drug.id]);

  useEffect(() => {
    setPrepChecks((checks) =>
      checks.some(Boolean) ? [false, false, false, false, false] : checks
    );
    setPrepVerifiedAt(null);
  }, [previewPrepLoading, previewPseLoading]);

  const resetPrepVerification = () => {
    setPrepChecks([false, false, false, false, false]);
    setPrepVerifiedAt(null);
  };

  const selectPrepRecipe = (index: number) => {
    if (index === prepRecipeIndex) return;
    setPrepRecipeIndex(index);
    setPrepRecipeInput(null);
    setPrepAgeBand(null);
    resetPrepVerification();
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
      resolvedPrep?.duree,
      ...(resolvedPrep?.etapes || []),
      ...(resolvedPrep?.notes || []),
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
  }, [drug, resolvedPrep]);
  const monitoringLabel = monitoringBadges.map((badge) => badge.label).join(" + ");
  const monitoringCornerLabel = monitoringBadges.map((badge) => badge.label).join("+");
  const monitoringClass = monitoringBadges[0]?.className || "monitor-custom";
  const prepWeight = Number.parseFloat(weight);
  const resolvedPrepPopulation =
    prepPopulation || (Number.isFinite(prepWeight) && prepWeight < 30 ? "enfant" : "adulte");
  const prepClinicalLoading = previewPrepLoading || (previewMode && previewPseLoading);
  const prepData = previewPrepLoading ? null : (resolvedPrep ?? null);
  const pseData = previewMode && previewPseLoading ? null : resolvedPse;
  const { engine: preparationEngine, loading: preparationEngineLoading } = usePreparationEngine(
    open && prepV25Mode
  );
  const preparationModel =
    open && prepV25Mode && preparationEngine
      ? preparationEngine.buildPreparationModel({
          drug,
          prep: prepData,
          pse: pseData,
          population: resolvedPrepPopulation,
          weight,
          recipeIndex: prepRecipeIndex,
          pseInput: prepDose,
          recipeInput: prepRecipeInput,
          ageBand: prepAgeBand,
          monitoringLabel,
        })
      : CLOSED_PREPARATION_MODEL;
  const preparationModes = preparationModel.modes;
  const prepDoseSteps = preparationModel.pseSteps;
  useEffect(() => {
    setPrepRecipeIndex((index) => (index < preparationModes.length ? index : 0));
  }, [preparationModes.length]);
  useEffect(() => {
    if (!preparationEngine) return;
    setPrepDose(preparationEngine.getPreparationPseDefault(resolvedPse, weight, resolvedPrep));
  }, [
    drug.id,
    preparationEngine,
    resolvedPrepPopulation,
    previewPseLoading,
    resolvedPrep,
    resolvedPse,
    weight,
  ]);
  const adjustPrepDose = (direction: -1 | 1) => {
    resetPrepVerification();
    if (!prepDoseSteps.length) {
      setPrepDose((dose) => Math.max(0.01, +(dose + direction * 0.1).toFixed(2)));
      return;
    }
    const nextStep =
      direction < 0
        ? [...prepDoseSteps].reverse().find((step) => step < prepDose)
        : prepDoseSteps.find((step) => step > prepDose);
    if (nextStep !== undefined) setPrepDose(nextStep);
  };
  const adjustPrepRecipeInput = (
    direction: -1 | 1,
    control: { value: number; step?: number; min?: number; max?: number; steps?: number[] }
  ) => {
    resetPrepVerification();
    const allowed = control.steps || [];
    if (allowed.length) {
      const nextStep =
        direction < 0
          ? [...allowed].reverse().find((step) => step < control.value)
          : allowed.find((step) => step > control.value);
      if (nextStep !== undefined) setPrepRecipeInput(nextStep);
      return;
    }
    const step = control.step || 1;
    const next = +(control.value + direction * step).toFixed(4);
    setPrepRecipeInput(Math.min(control.max ?? next, Math.max(control.min ?? 0, next)));
  };
  const setPrepNumericValue = (control: PreparationNumericControl, value: number) => {
    if (control.kind === "pse") {
      setPrepDose(value);
      return;
    }
    setPrepRecipeInput(value);
  };
  const prepStructuredSteps = preparationModel.steps;
  const prepDisplaySteps = prepStructuredSteps.map((step) => ({
    ...step,
    detail: prepStepDetail(step.title, step.detail, step.result),
  }));
  const prepStepNeedsWeight = (step: (typeof prepStructuredSteps)[number]) =>
    /poids requis|\bkg absent\b/i.test(`${step.detail} ${step.result}`);
  const prepPendingWeightCount = prepStructuredSteps.filter(prepStepNeedsWeight).length;
  const prepControlLabels = preparationModel.controls;

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
    setActiveTab(prepV25Mode ? key : activeTab === key ? null : key);

  const openNoteEditor = () => {
    setPrepWorkflow("reference");
    setNoteEditorRequest((request) => request + 1);
  };

  const trimmedNote = noteContent.trim();
  const hasLongMobileNote = trimmedNote.length > 120 || trimmedNote.split("\n").length > 3;

  const renderContent = (tabKey: string) => (
    <DrugTabContent
      tabKey={tabKey}
      drug={drug}
      weight={weight}
      prepPopulation={prepPopulation}
      prepV25Mode={prepV25Mode}
      resolvedPrep={resolvedPrep}
      onNoteChange={setHasNote}
    />
  );

  return (
    <div
      className={`drug-card ${open ? "drug-card-open" : ""} ${
        monitoringBadges.length > 0 ? "drug-card-monitored" : ""
      } ${prepV25Mode ? "drug-card-prep-v25" : ""}`}
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
        <div className={`drug-body ${prepV25Mode ? `prep-workflow-${prepWorkflow}` : ""}`}>
          {prepV25Mode && (
            <>
              <nav className="prep-v25-workflow" aria-label="Étapes de la fiche médicament">
                {[
                  ["prepare", "1", "Préparer", "Recette active"],
                  ["control", "2", "Contrôler", `${prepChecks.filter(Boolean).length} / 5`],
                  ["reference", "i", "Référence", "Fiche clinique"],
                ].map(([key, index, label, detail]) => (
                  <button
                    key={key}
                    type="button"
                    className={prepWorkflow === key ? "is-active" : ""}
                    aria-pressed={prepWorkflow === key}
                    onClick={() => setPrepWorkflow(key as typeof prepWorkflow)}
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
          {prepV25Mode ? (
            <section className="prep-v25-identity" aria-label="Identité clinique">
              <div>
                <strong>DCI</strong>
                <span>{drug.dci}</span>
              </div>
              <div>
                <strong>Surveillance</strong>
                <span className="prep-v25-monitoring">
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

          {prepV25Mode && trimmedNote && (
            <aside className="prep-v25-mobile-note" aria-label="Note personnelle utile">
              <div className="prep-v25-mobile-note-head">
                <span>
                  <PencilLine aria-hidden="true" />
                  <strong>Note personnelle</strong>
                </span>
                <button
                  type="button"
                  aria-label="Modifier la note personnelle"
                  onClick={openNoteEditor}
                >
                  <PencilLine aria-hidden="true" />
                </button>
              </div>
              <p className={mobileNoteExpanded ? "is-expanded" : undefined}>{trimmedNote}</p>
              {hasLongMobileNote && (
                <button
                  type="button"
                  className="prep-v25-mobile-note-more"
                  aria-expanded={mobileNoteExpanded}
                  onClick={() => setMobileNoteExpanded((expanded) => !expanded)}
                >
                  {mobileNoteExpanded ? "Réduire" : "Lire toute la note"}
                </button>
              )}
            </aside>
          )}

          {(prepClinicalLoading || preparationEngineLoading) && (
            <div className="prep-v25-loading" role="status">
              Chargement de la préparation sécurisée…
            </div>
          )}

          {prepV25Mode && !prepClinicalLoading && !preparationEngineLoading && (
            <div className="prep-v25-modes" role="group" aria-label="Modes de préparation">
              {preparationModes.map((mode, index) => (
                <button
                  key={`${mode.title}-${index}`}
                  type="button"
                  className={index === prepRecipeIndex ? "is-active" : ""}
                  aria-label={`${mode.title} — ${mode.detail}`}
                  aria-pressed={index === prepRecipeIndex}
                  onClick={() => selectPrepRecipe(index)}
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
                    <strong className="prep-v25-mode-title">{mode.title}</strong>
                    <small className="prep-v25-mode-detail">{mode.detail}</small>
                  </span>
                  {index === prepRecipeIndex && (
                    <b>
                      <Check />
                    </b>
                  )}
                </button>
              ))}
            </div>
          )}

          {prepV25Mode && !prepClinicalLoading && !preparationEngineLoading && (
            <div
              className="prep-v25-results"
              aria-label="Résultats de préparation"
              aria-live="polite"
            >
              {preparationModel.metrics.map((metric, index) => (
                <div key={`${metric.label}-${index}`}>
                  <span className="prep-v25-result-icon">
                    {index === 0 ? <Syringe /> : index === 1 ? <TestTubes /> : <BriefcaseMedical />}
                  </span>
                  <span>
                    <small>{metric.label}</small>
                    {metric.control?.kind === "age" ? (
                      <div className="prep-v25-age-switch" role="group" aria-label="Tranche d’âge">
                        {metric.control.options.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={metric.control?.value === option.value ? "is-active" : ""}
                            aria-pressed={metric.control?.value === option.value}
                            onClick={() => {
                              resetPrepVerification();
                              setPrepAgeBand(option.value);
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : metric.control ? (
                      <PreparationDoseStepper
                        label={metric.label}
                        displayValue={metric.value}
                        control={metric.control}
                        onDecrease={() =>
                          metric.control?.kind === "pse"
                            ? adjustPrepDose(-1)
                            : metric.control?.kind === "recipe"
                              ? adjustPrepRecipeInput(-1, metric.control)
                              : undefined
                        }
                        onIncrease={() =>
                          metric.control?.kind === "pse"
                            ? adjustPrepDose(1)
                            : metric.control?.kind === "recipe"
                              ? adjustPrepRecipeInput(1, metric.control)
                              : undefined
                        }
                        onEdit={resetPrepVerification}
                        onValueChange={(value) =>
                          metric.control?.kind === "pse" || metric.control?.kind === "recipe"
                            ? setPrepNumericValue(metric.control, value)
                            : undefined
                        }
                      />
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

          {prepV25Mode && !prepClinicalLoading && !preparationEngineLoading && (
            <section
              className="prep-v25-panel prep-v25-prepare"
              aria-labelledby={`${instanceId}-prep-title`}
            >
              <div className="prep-v25-section-head">
                <div>
                  <span id={`${instanceId}-prep-title`}>
                    <ShieldCheck /> Préparation pas à pas
                  </span>
                </div>
                <span className="prep-v25-prep-context">{preparationModel.context}</span>
                <button
                  type="button"
                  className="prep-v25-note-action"
                  aria-label={
                    hasNote ? "Modifier la note personnelle" : "Ajouter une note personnelle"
                  }
                  title={hasNote ? "Modifier la note" : "Ajouter une note"}
                  onClick={openNoteEditor}
                >
                  <PencilLine aria-hidden="true" />
                </button>
              </div>
              {prepPendingWeightCount > 0 && (
                <div className="prep-v25-prep-requirement" role="note">
                  <span aria-hidden="true">
                    <UserRound />
                  </span>
                  <span>
                    <strong>Renseigner le poids patient</strong>
                    <small>
                      Saisir le poids dans le bandeau patient pour calculer automatiquement{" "}
                      {prepPendingWeightCount === 1
                        ? "l’étape pondérale."
                        : `les ${prepPendingWeightCount} étapes pondérales.`}
                    </small>
                  </span>
                </div>
              )}
              <ol className="prep-v25-recipe">
                {prepDisplaySteps.map((step, index) => {
                  const needsWeight = prepStepNeedsWeight(step);
                  return (
                    <li
                      key={`${step.title}-${step.detail}-${index}`}
                      className={needsWeight ? "is-pending" : undefined}
                    >
                      <span>{index + 1}</span>
                      <span>
                        <strong>{step.title}</strong>
                        {step.detail && <small>{step.detail}</small>}
                      </span>
                      <b>{needsWeight ? "À calculer" : step.result}</b>
                    </li>
                  );
                })}
              </ol>
              {preparationModel.notes.length ? (
                <div className="prep-v25-recipe-notes">
                  {preparationModel.notes.map((note) => (
                    <span key={note}>{note}</span>
                  ))}
                </div>
              ) : null}
            </section>
          )}

          {prepV25Mode && !prepClinicalLoading && !preparationEngineLoading && (
            <section
              className="prep-v25-panel prep-v25-control"
              aria-labelledby={`${instanceId}-prep-control-title`}
            >
              <div className="prep-v25-section-head">
                <div className="prep-v25-control-title">
                  <strong id={`${instanceId}-prep-control-title`}>
                    <UsersRound /> Double contrôle
                  </strong>
                  {!prepVerifiedAt && (
                    <small>
                      Vérifier les éléments qui conditionnent le calcul avant administration.
                    </small>
                  )}
                </div>
              </div>
              {prepVerifiedAt ? (
                <div className="prep-v25-verified" role="status">
                  <span>
                    <Check />
                  </span>
                  <div>
                    <strong>Préparation vérifiée</strong>
                    <small>5 / 5 contrôles · {prepVerifiedAt}</small>
                  </div>
                  <button type="button" onClick={() => setPrepVerifiedAt(null)}>
                    Revoir
                  </button>
                </div>
              ) : (
                <>
                  <div className="prep-v25-checks">
                    {prepControlLabels.map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        aria-label={label}
                        aria-pressed={prepChecks[index]}
                        className={prepChecks[index] ? "is-checked" : ""}
                        onClick={() =>
                          setPrepChecks((checks) =>
                            checks.map((checked, checkIndex) =>
                              checkIndex === index ? !checked : checked
                            )
                          )
                        }
                      >
                        <span aria-hidden="true">{prepChecks[index] ? <Check /> : null}</span>
                        <strong>{label}</strong>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!prepChecks.every(Boolean) || !preparationModel.canValidate}
                    className={`prep-v25-validation ${
                      prepChecks.every(Boolean) && preparationModel.canValidate ? "ready" : ""
                    }`}
                    onClick={() => {
                      if (!prepChecks.every(Boolean) || !preparationModel.canValidate) return;
                      setPrepVerifiedAt(
                        new Date().toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      );
                    }}
                  >
                    {prepChecks.every(Boolean)
                      ? preparationModel.canValidate
                        ? "Valider les 5 contrôles"
                        : "Calcul à compléter"
                      : "Préparation à vérifier"}
                  </button>
                  {prepChecks.every(Boolean) && preparationModel.validationReason && (
                    <span className="prep-v25-validation-reason" role="status">
                      {preparationModel.validationReason}
                    </span>
                  )}
                  <span className="prep-v25-check-progress">
                    {prepChecks.filter(Boolean).length} / 5 contrôles
                  </span>
                </>
              )}
            </section>
          )}

          {prepV25Mode && !prepClinicalLoading && !preparationEngineLoading && (
            <section className="prep-v25-panel prep-v25-reference">
              <div className="prep-v25-section-head prep-v25-reference-head">
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
                              background: "color-mix(in srgb, var(--prep-primary) 9%, var(--card))",
                              borderColor: "var(--prep-primary)",
                              color: "var(--prep-primary)",
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
                          style={tab.type === "poso" ? { background: "var(--prep-primary)" } : {}}
                        />
                      )}
                      <span className="tab-label">{tab.label}</span>
                      {ciCount > 0 && <span className="tab-ci-badge">{ciCount}</span>}
                    </button>
                  );
                })}
              </div>
              {activeTab && <div className="tab-content">{renderContent(activeTab)}</div>}
              <DrugNote
                drugId={drug.id}
                onChange={setHasNote}
                onValueChange={setNoteContent}
                openRequest={noteEditorRequest}
              />
            </section>
          )}

          {!prepV25Mode && (
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

          {activeTab && !prepV25Mode && (
            <div className="tab-content">{renderContent(activeTab)}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DrugCard;
