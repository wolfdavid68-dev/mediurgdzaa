import { useState, useEffect, useMemo, useId } from "react";
import { calcDose, ciSeverity } from "../lib/calc";
import type { ProtocolRef } from "../lib/crossref";
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

type DrugCardProps = {
  drug: Drug;
  isFavorite?: boolean;
  patientWeight?: string;
  prepPopulation?: "adulte" | "enfant" | null;
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
  onToggleFavorite,
  onOpen,
  onOpenChange,
  onProtocolOpen,
}: DrugCardProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [hasNote, setHasNote] = useState(false);
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

  const toggleTab = (key: string) => setActiveTab(activeTab === key ? null : key);

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

  const renderPosoTab = () => {
    // Filtrage des colonnes posologie selon le poids saisi :
    //  < 30 kg → pédiatrique · > 70 kg → adulte · 30–70 kg (inclus) ou pas de
    //  poids → les deux. Repli : si la colonne pertinente n'est pas renseignée
    //  pour ce médicament, on affiche l'autre (mieux que « Non renseigné »).
    const kgNum = parseFloat(weight);
    const validKg = kgNum > 0 && kgNum <= 300;
    const hasAdult = !!(drug.poso?.a && drug.poso.a.length);
    const hasPed = !!(drug.poso?.p && drug.poso.p.length);
    let showAdult = true;
    let showPed = true;
    let posoHint = "";
    if (validKg && kgNum < 30) {
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

    const renderPosoLines = (lines: string[] | undefined) =>
      lines && lines.length ? (
        lines.map((p: string, i: number) => {
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
        <span className="na">Non renseigné</span>
      );

    return (
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

        <PrepBlock drug={drug} weight={weight} prepPopulation={prepPopulation} />
        <PseBlock drug={drug} weight={weight} />
        <DrugNote drugId={drug.id} onChange={setHasNote} />
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
    if (key === "poso") return renderPosoTab();
    return null;
  };

  return (
    <div className={`drug-card ${open ? "drug-card-open" : ""}`}>
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
        <div className="drug-body">
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
        </div>
      )}
    </div>
  );
};

export default DrugCard;
