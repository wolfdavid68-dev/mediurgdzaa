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
import { calcDebit, calcDose, ciSeverity } from "../lib/calc";
import { PSE } from "../data/pse";
import type { ProtocolRef } from "../lib/crossref";
import { isPreview } from "../lib/featureFlags";
import type { Drug } from "../types/data";
import DrugNote from "./DrugNote";
import PrepBlock from "./PrepBlock";
import PseBlock from "./PseBlock";

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
  const [previewChecks, setPreviewChecks] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [previewVerifiedAt, setPreviewVerifiedAt] = useState<string | null>(null);
  const previewMode = isPreview();
  const [previewPrep, setPreviewPrep] = useState<Drug["prep"] | null>(null);
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
    if (!previewMode) {
      setPreviewPrep(null);
      return;
    }

    let active = true;
    import("../data/drugs.preview")
      .then(({ DRUGS_PREVIEW }) => {
        const previewByDrugId = DRUGS_PREVIEW as unknown as Partial<
          Record<number, { prep?: Partial<NonNullable<Drug["prep"]>> }>
        >;
        const override = previewByDrugId[drug.id]?.prep;
        if (active) setPreviewPrep(override ? { ...drug.prep, ...override } : null);
      })
      .catch(() => {
        if (active) setPreviewPrep(null);
      });

    return () => {
      active = false;
    };
  }, [previewMode, drug.id, drug.prep]);

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
    setPreviewChecks((checks) =>
      checks.some(Boolean) ? [false, false, false, false, false] : checks
    );
    setPreviewVerifiedAt(null);
  }, [drug.id, prepPopulation]);

  const resetPreviewVerification = () => {
    setPreviewChecks([false, false, false, false, false]);
    setPreviewVerifiedAt(null);
  };

  const selectPreviewRecipe = (index: number) => {
    if (index === previewRecipeIndex) return;
    setPreviewRecipeIndex(index);
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
  const previewPrepData = previewPrep || drug.prep;
  const previewRecipes = (previewPrepData?.preparations || []).filter(
    (recipe) => !recipe.population || recipe.population === previewPopulation
  );
  const activePreviewRecipe = previewRecipes[previewRecipeIndex] || previewRecipes[0];
  const previewPopulationPosology =
    (previewPopulation === "enfant" ? drug.poso?.p : drug.poso?.a) || [];
  const previewFallbackPosology =
    previewPopulationPosology[0] || drug.poso?.a?.[0] || drug.poso?.p?.[0] || "Selon prescription";
  const extractLastVolume = (value?: string) => {
    if (!value) return null;
    const ampouleMatch = value.match(
      /(\d+)\s*ampoules?.*?\d+(?:[,.]\d+)?\s*mg\s*\/\s*(\d+(?:[,.]\d+)?)\s*mL/i
    );
    if (ampouleMatch) {
      const total = Number(ampouleMatch[1]) * Number(ampouleMatch[2].replace(",", "."));
      return `${String(total).replace(".", ",")} mL`;
    }
    const matches = [...value.matchAll(/(\d+(?:[,.]\d+)?)\s*mL/gi)];
    return matches.length ? `${matches[matches.length - 1][1]} mL` : null;
  };
  const productConcentration = previewPrepData?.conc_produit
    ? `${String(previewPrepData.conc_produit).replace(".", ",")} mg/mL`
    : activePreviewRecipe?.concentration ||
      previewPrepData?.conc_finale ||
      drug.cond?.[0] ||
      "Produit vérifié";
  const previewPse = PSE[drug.id];
  const isPseRecipe =
    activePreviewRecipe?.mode === "pse" ||
    /pse|psr/i.test(activePreviewRecipe?.titre || "") ||
    (!activePreviewRecipe && Boolean(previewPse) && Boolean(previewPrepData));
  const isAcrRecipe = /acr/i.test(activePreviewRecipe?.titre || "");
  const previewModeCards = previewRecipes.length
    ? previewRecipes.slice(0, 3).map((recipe, index) => ({
        title: recipe.titre || `Préparation ${index + 1}`,
        detail: recipe.tag || recipe.rate_label || recipe.note || "Protocole actif",
      }))
    : [
        {
          title: isPseRecipe ? "PSE" : previewPopulation === "enfant" ? "Pédiatrique" : "Adulte",
          detail:
            previewPrepData?.conc_finale ||
            previewPrepData?.duree ||
            previewFallbackPosology ||
            "Protocole principal",
        },
      ];
  const previewDoseSteps = (previewPse?.steps || [])
    .filter((step) => step >= previewPse.min && step <= previewPse.max)
    .sort((a, b) => a - b);
  const previewRate = isPseRecipe && previewPse ? calcDebit(previewPse, previewDose, weight) : null;
  const previewDoseLabel = previewDose.toFixed(2).replace(".", ",");
  const previewRateLabel = previewRate === null ? "—" : String(previewRate).replace(".", ",");
  const previewOneMlDose = previewPse?.factor
    ? String(+(1 / previewPse.factor).toFixed(3)).replace(".", ",")
    : null;
  useEffect(() => {
    const defaultDose = previewDoseSteps.includes(0.5)
      ? 0.5
      : previewDoseSteps[0] || previewPse?.min || 0.5;
    setPreviewDose(defaultDose);
  }, [drug.id, previewPopulation]); // eslint-disable-line react-hooks/exhaustive-deps
  const adjustPreviewDose = (direction: -1 | 1) => {
    if (!previewDoseSteps.length) {
      setPreviewDose((dose) => Math.max(0.01, +(dose + direction * 0.1).toFixed(2)));
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
  const rawPreviewSteps = activePreviewRecipe?.etapes || previewPrepData?.etapes || [];
  const genericPreviewDetails = (
    rawPreviewSteps.length
      ? rawPreviewSteps
      : [
          activePreviewRecipe?.prelever || previewPrepData?.fd_prelever,
          activePreviewRecipe?.completer,
          activePreviewRecipe?.rate_value || previewPrepData?.debit,
        ]
  ).filter((step): step is string => Boolean(step));
  const previewStructuredSteps = isPseRecipe
    ? [
        {
          title: "Identifier l’ampoule",
          detail: rawPreviewSteps[0] || activePreviewRecipe?.prelever || "Vérifier le produit",
          result: productConcentration,
        },
        {
          title: `Prélever ${drug.nom.toLocaleLowerCase("fr-FR")}`,
          detail: activePreviewRecipe?.prelever || rawPreviewSteps[1] || "Selon la prescription",
          result: extractLastVolume(activePreviewRecipe?.prelever) || "Selon Rx",
        },
        {
          title: `Compléter avec ${activePreviewRecipe?.solvant || previewPrepData?.solvant || "le solvant"}`,
          detail: activePreviewRecipe?.completer || "Jusqu’au volume final calculé",
          result: previewPrepData?.volume_final
            ? `Vf ${previewPrepData.volume_final} mL`
            : extractLastVolume(activePreviewRecipe?.completer) || "Vf calculé",
        },
        {
          title: "Programmer le PSE",
          detail: activePreviewRecipe?.rate_label || "Débit selon prescription et poids",
          result: activePreviewRecipe?.rate_value || "Selon Rx",
        },
      ]
    : isAcrRecipe
      ? [
          {
            title: "Identifier l’ampoule",
            detail: rawPreviewSteps[0] || "Vérifier le produit et sa concentration",
            result: productConcentration,
          },
          {
            title: "Prélever",
            detail: activePreviewRecipe?.prelever || rawPreviewSteps[1] || "Produit pur",
            result:
              extractLastVolume(activePreviewRecipe?.prelever) ||
              activePreviewRecipe?.tag ||
              "Prêt",
          },
          {
            title: "Injecter",
            detail: rawPreviewSteps[2] || activePreviewRecipe?.tag || "Selon protocole",
            result: activePreviewRecipe?.tag || "Administrer",
          },
          {
            title: "Rincer",
            detail: "Flush NaCl 0,9 % après injection",
            result: "Puis RCP",
          },
        ]
      : genericPreviewDetails.length
        ? genericPreviewDetails.map((detail, index) => ({
            title:
              index === 0
                ? "Identifier le produit"
                : /prélev|prelev/i.test(detail)
                  ? "Prélever"
                  : /dilu|compl|qsp/i.test(detail)
                    ? "Diluer / compléter"
                    : /inject|administr/i.test(detail)
                      ? "Administrer"
                      : /perfus|pse|débit|debit/i.test(detail)
                        ? "Programmer / perfuser"
                        : `Étape ${index + 1}`,
            detail,
            result:
              index === 0
                ? productConcentration
                : extractLastVolume(detail) || activePreviewRecipe?.rate_value || "Conforme",
          }))
        : [
            {
              title: "Identifier le produit",
              detail: drug.cond?.[0] || `${drug.nom} · ${drug.dci}`,
              result: drug.nom,
            },
            {
              title: "Vérifier la prescription",
              detail: previewFallbackPosology,
              result: previewPopulation === "enfant" ? "Enfant" : "Adulte",
            },
            {
              title: "Confirmer l’administration",
              detail: drug.indic?.[0] || drug.desc,
              result: "Selon protocole",
            },
            {
              title: "Administrer et surveiller",
              detail: monitoringLabel
                ? `Surveillance : ${monitoringLabel}`
                : "Surveillance clinique selon prescription",
              result: monitoringLabel || "Surveiller",
            },
          ];
  const previewHasPreparation = Boolean(previewPrepData || activePreviewRecipe);
  const previewProductSource =
    rawPreviewSteps[0] ||
    activePreviewRecipe?.prelever ||
    previewPrepData?.fd_prelever ||
    drug.cond?.[0] ||
    drug.nom;
  const previewProductKind = /ampoule/i.test(previewProductSource)
    ? "Ampoule"
    : /flacon/i.test(previewProductSource)
      ? "Flacon"
      : "Produit";
  const previewAmpoule = (() => {
    const match = previewProductSource.match(/(?:ampoule|flacon)\s+([^()]+)/i);
    return match ? match[1].trim() : previewProductSource;
  })();
  const previewPrelevement =
    extractLastVolume(activePreviewRecipe?.prelever || previewPrepData?.fd_prelever) ||
    previewPrepData?.prelever_label ||
    "Selon prescription";
  const previewVolumeFinal = previewPrepData?.volume_final
    ? `${previewPrepData.volume_final} mL`
    : extractLastVolume(activePreviewRecipe?.completer) || "Selon prescription";
  const previewControlLabels = previewHasPreparation
    ? [
        `Patient et poids : ${weight ? `${weight} kg` : "à confirmer"}`,
        `${previewProductKind} : ${previewAmpoule}`,
        `Volume prélevé : ${previewPrelevement}`,
        `Volume final : ${previewVolumeFinal}`,
        "Voie et tubulure identifiées",
      ]
    : [
        `Patient et poids : ${weight ? `${weight} kg` : "à confirmer"}`,
        `Produit : ${drug.nom}`,
        "Dose ou volume conforme à la prescription",
        "Voie et modalités d’administration vérifiées",
        `Surveillance identifiée${monitoringLabel ? ` : ${monitoringLabel}` : ""}`,
      ];

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
    const effectivePrep = previewMode ? previewPrep || drug.prep : drug.prep;
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
            <div className="preview-v25-modes" aria-label="Modes de préparation">
              {previewModeCards.map((mode, index) => (
                <button
                  key={`${mode.title}-${index}`}
                  type="button"
                  className={index === previewRecipeIndex ? "is-active" : ""}
                  aria-label={`Choisir le mode visuel ${index + 1}`}
                  aria-pressed={index === previewRecipeIndex}
                  onClick={() => selectPreviewRecipe(index)}
                >
                  <span>
                    {index === 0 ? <HeartPulse /> : index === 1 ? <UserRound /> : <TestTubes />}
                  </span>
                  <span>
                    <strong className="preview-v25-mode-title" data-label={mode.title} />
                    <small className="preview-v25-mode-detail" data-label={mode.detail} />
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
            <div className="preview-v25-results" aria-label="Résultats de préparation">
              <div>
                <span className="preview-v25-result-icon">
                  <Syringe />
                </span>
                <span>
                  <small>
                    {isPseRecipe && previewPse
                      ? `Prescription · ${previewPse.unite}`
                      : "Dose / préparation"}
                  </small>
                  {isPseRecipe && previewPse ? (
                    <div className="preview-v25-dose-stepper">
                      <button
                        type="button"
                        aria-label="Diminuer la prescription"
                        onClick={() => adjustPreviewDose(-1)}
                      >
                        −
                      </button>
                      <output data-label={previewDoseLabel} />
                      <button
                        type="button"
                        aria-label="Augmenter la prescription"
                        onClick={() => adjustPreviewDose(1)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <strong data-label={activePreviewRecipe?.tag || previewFallbackPosology} />
                  )}
                  <em
                    data-label={
                      isPseRecipe && previewPse
                        ? `Plage affichée : ${String(previewPse.min).replace(".", ",")} à ${String(previewPse.max).replace(".", ",")}`
                        : previewPopulation === "enfant"
                          ? "Population pédiatrique"
                          : "Population adulte"
                    }
                  />
                </span>
              </div>
              <div>
                <span className="preview-v25-result-icon">
                  <TestTubes />
                </span>
                <span>
                  <small>
                    {isPseRecipe && previewPse ? "Débit PSE calculé" : "Volume à prélever"}
                  </small>
                  <strong
                    data-label={
                      isPseRecipe && previewPse
                        ? `${previewRateLabel} mL/h`
                        : activePreviewRecipe?.prelever ||
                          previewPrepData?.fd_prelever ||
                          drug.cond?.[0] ||
                          "Selon prescription"
                    }
                  />
                  <em
                    data-label={
                      isPseRecipe && previewPse
                        ? "Avec la dilution pondérale"
                        : activePreviewRecipe?.concentration || previewPrepData?.conc_finale || ""
                    }
                  />
                </span>
              </div>
              <div>
                <span className="preview-v25-result-icon">
                  <BriefcaseMedical />
                </span>
                <span>
                  <small>
                    {isPseRecipe && previewPse ? "Repère de concentration" : "Administration"}
                  </small>
                  <strong
                    data-label={
                      isPseRecipe && previewPse
                        ? "1 mL/h"
                        : activePreviewRecipe?.rate_value ||
                          activePreviewRecipe?.duree ||
                          previewPrepData?.duree ||
                          "Selon protocole"
                    }
                  />
                  <em
                    data-label={
                      isPseRecipe && previewPse && previewOneMlDose
                        ? `= ${previewOneMlDose} ${previewPse.unite}`
                        : activePreviewRecipe?.note || previewPrepData?.duree || monitoringLabel
                    }
                  />
                </span>
              </div>
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
            <section className="preview-v25-panel preview-v25-prepare">
              <div className="preview-v25-section-head">
                <div>
                  <span>
                    <ShieldCheck /> Préparation sécurisée
                  </span>
                </div>
                <span
                  className="preview-v25-prep-context"
                  data-label={`${activePreviewRecipe?.titre || drug.nom}${weight ? ` · ${weight} kg` : ""}`}
                />
              </div>
              <ol className="preview-v25-recipe">
                {previewStructuredSteps.map((step, index) => (
                  <li key={`${step.title}-${step.detail}-${index}`}>
                    <span>{index + 1}</span>
                    <span>
                      <strong data-label={step.title} />
                      <small data-label={step.detail} />
                    </span>
                    <b data-label={step.result} />
                  </li>
                ))}
              </ol>
              {activePreviewRecipe?.notes?.length ? (
                <div className="preview-v25-recipe-notes">
                  {activePreviewRecipe.notes.slice(0, 2).map((note) => (
                    <span key={note} data-label={note} />
                  ))}
                </div>
              ) : null}
              <div className="preview-v25-data-engine">
                <PrepBlock drug={drug} weight={weight} prepPopulation={prepPopulation} />
                <PseBlock drug={drug} weight={weight} />
              </div>
            </section>
          )}

          {previewMode && (
            <section className="preview-v25-panel preview-v25-control">
              <div className="preview-v25-section-head">
                <div className="preview-v25-control-title">
                  <strong>
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
                        aria-label={`Contrôle visuel ${index + 1}`}
                        className={previewChecks[index] ? "is-checked" : ""}
                        onClick={() =>
                          setPreviewChecks((checks) =>
                            checks.map((checked, checkIndex) =>
                              checkIndex === index ? !checked : checked
                            )
                          )
                        }
                      >
                        <span>
                          <Check />
                        </span>
                        <strong data-label={label} />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!previewChecks.every(Boolean)}
                    className={`preview-v25-validation ${previewChecks.every(Boolean) ? "ready" : ""}`}
                    onClick={() => {
                      if (!previewChecks.every(Boolean)) return;
                      setPreviewVerifiedAt(
                        new Date().toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      );
                    }}
                  >
                    {previewChecks.every(Boolean)
                      ? "Valider les 5 contrôles"
                      : "Préparation à vérifier"}
                  </button>
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
                              background: drug.couleur + "25",
                              borderColor: drug.couleur,
                              color: drug.couleur,
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
                          style={tab.type === "poso" ? { background: drug.couleur } : {}}
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
