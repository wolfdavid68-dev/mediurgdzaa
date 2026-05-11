import React, { useState, useEffect } from "react";
import { tokenizeProtocolText } from "../lib/protocolText";

const SECTION_META = {
  inclusion:             { label: "Inclusion",     color: "#16a34a", short: "Inclusion" },
  exclusion:             { label: "Exclusion",     color: "#dc2626", short: "Exclusion" },
  gravite:               { label: "Gravité",       color: "#f97316", short: "Gravité"   },
  actions:               { label: "Actions",       color: "#3b82f6", short: "Actions"   },
  surveillance:          { label: "Surveillance",  color: "#06b6d4", short: "Surveil."  },
  recueil:               { label: "Recueil",       color: "#64748b", short: "Recueil"   },
  rythme_choquable:      { label: "Choquable",     color: "#f97316", short: "Choquable" },
  rythme_non_choquable:  { label: "Rythme non choquable", color: "#6b7280", short: "Non choq." },
  reprise:               { label: "Reprise",       color: "#16a34a", short: "Reprise"   },
};

// Médicaments détectables dans les textes de protocoles.
// Ne pas terminer un pattern par un caractère non-word (%, espace) :
// le \b de fin du regex échouerait — utiliser un nom court (« NaCl »
// plutôt que « NaCl 0,9 % »), la recherche normalisée d'App.js fait le reste.
export const DRUG_PATTERNS = [
  "adrénaline", "noradrénaline", "dobutamine",
  "midazolam", "propofol", "kétamine", "étomidate",
  "morphine", "sufentanil", "naloxone",
  "amiodarone", "atropine", "adénosine",
  "terbutaline", "salbutamol", "ipratropium",
  "solumédrol", "méthylprednisolone", "bétaméthasone",
  "diazépam", "clonazépam", "rivotril",
  "paracétamol", "nefopam",
  "acide tranexamique", "exacyl",
  "hydroxocobalamine", "cyanokit",
  "Ringer Lactate", "NaCl", "Glucose",
];

// Rendu JSX d'un texte protocole : doses en gras, médicaments cliquables.
// Le tokenizer pur vit dans src/lib/protocolText.js et est testé en isolation.
const renderText = (text, onDrugSearch) => {
  const tokens = tokenizeProtocolText(text, DRUG_PATTERNS);
  if (tokens.length <= 1) return text;
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.type === "drug") {
          return (
            <button
              key={i}
              className="proto-drug-link"
              onClick={e => { e.stopPropagation(); onDrugSearch(tok.value); }}
            >
              {tok.value}
            </button>
          );
        }
        if (tok.type === "dose") {
          return <strong key={i} className="proto-dose">{tok.value}</strong>;
        }
        return <React.Fragment key={i}>{tok.value}</React.Fragment>;
      })}
    </>
  );
};

const ProtocolCard = ({ protocol: p, onDrugSearch }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  // "shared" / "copied" / null — feedback transitoire après clic partage.
  const [shareState, setShareState] = useState(null);

  useEffect(() => {
    if (open) {
      const idx = p.sections.findIndex(s => s.type === "actions");
      setActiveTab(idx >= 0 ? idx : 0);
    }
  }, [open, p.sections]);

  // Web Share API : permet d'envoyer un protocole à un collègue via WhatsApp,
  // SMS, ou n'importe quelle target système (Android iOS Chrome Safari). Sur
  // desktop sans navigator.share, fallback : copie du résumé dans le presse-papier.
  const handleShare = async (e) => {
    e.stopPropagation();
    const data = {
      title: `MediURG — ${p.titre}`,
      text: `Protocole ${p.code} · ${p.service} · v${p.version}`,
      url: window.location.href,
    };
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(data);
        setShareState("shared");
      } catch {
        // AbortError quand l'user annule la sheet système → on n'affiche rien
        return;
      }
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(`${data.title}\n${data.text}\n${data.url}`);
        setShareState("copied");
      } catch { return; }
    } else { return; }
    setTimeout(() => setShareState(null), 2000);
  };

  const sec = activeTab !== null ? p.sections[activeTab] : null;
  const meta = sec ? (SECTION_META[sec.type] || { color: "#888" }) : null;
  const isActions = sec?.type === "actions" || sec?.type === "rythme_choquable" || sec?.type === "rythme_non_choquable";

  return (
    <div className={`protocol-card ${open ? "protocol-card-open" : ""}`}>
      <button className="protocol-header" onClick={() => setOpen(!open)}>
        <div className="protocol-color-bar" style={{ background: p.couleur }} />
        <div className="protocol-main">
          <div className="protocol-title-row">
            <span className="protocol-icon">{p.icon}</span>
            <span className="protocol-name">{p.titre}</span>
          </div>
          <div className="protocol-meta-row">
            <span className="protocol-code-badge">{p.code}</span>
            <span className="badge badge-svc">{p.service}</span>
            <span className="protocol-version">v{p.version} · {p.valide}</span>
          </div>
        </div>
        <svg className={`chevron ${open ? "chevron-open" : ""}`}
          viewBox="0 0 24 24" width="18" height="18"
          fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="protocol-body">
          <div className="protocol-body-top">
            {p.ref ? (
              <div className="protocol-authors">
                {p.auteurs.join(" · ")}
                <span className="protocol-ref"> — {p.ref}</span>
              </div>
            ) : <span />}
            <button
              type="button"
              className="protocol-share"
              onClick={handleShare}
              aria-label={`Partager le protocole ${p.titre}`}
              title="Partager"
            >
              {shareState === "copied" ? "Copié ✓" : shareState === "shared" ? "✓" : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              )}
            </button>
          </div>

          <div className="proto-tabs">
            {p.sections.map((s, i) => {
              const m = SECTION_META[s.type] || { short: s.titre, color: "#888" };
              const isActive = activeTab === i;
              return (
                <button
                  key={i}
                  className={`proto-tab ${isActive ? "proto-tab-active" : ""}`}
                  style={isActive ? { borderColor: m.color, color: m.color, background: m.color + "18" } : {}}
                  onClick={() => setActiveTab(i)}
                >
                  <span className="proto-tab-dot" style={{ background: m.color }} />
                  {m.short}
                </button>
              );
            })}
          </div>

          {sec && (
            <div className="proto-tab-content">
              <ol className={`proto-items ${isActions ? "proto-items-numbered" : ""}`}>
                {sec.items.map((item, j) => (
                  <li key={j} className={`proto-item proto-item-${sec.type}`}>
                    {isActions
                      ? <span className="proto-item-num" style={{ background: meta.color }}>{j + 1}</span>
                      : <span className="proto-item-bullet" style={{ background: meta.color }} />
                    }
                    <div className="proto-item-content">
                      <span>{renderText(item.text, onDrugSearch || (() => {}))}</span>
                      {item.sub && (
                        <ul className="proto-sub-items">
                          {item.sub.map((s, k) => (
                            <li key={k} className="proto-sub-item">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={meta.color} strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>{renderText(s, onDrugSearch || (() => {}))}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProtocolCard;
