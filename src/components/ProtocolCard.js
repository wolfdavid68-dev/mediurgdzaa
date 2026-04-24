import React, { useState, useEffect } from "react";

const SECTION_META = {
  inclusion:             { label: "Inclusion",     color: "#16a34a", short: "Inclusion" },
  exclusion:             { label: "Exclusion",     color: "#dc2626", short: "Exclusion" },
  gravite:               { label: "Gravité",       color: "#f97316", short: "Gravité"   },
  actions:               { label: "Actions",       color: "#3b82f6", short: "Actions"   },
  surveillance:          { label: "Surveillance",  color: "#06b6d4", short: "Surveil."  },
  recueil:               { label: "Recueil",       color: "#64748b", short: "Recueil"   },
  rythme_choquable:      { label: "Choquable",     color: "#f97316", short: "Choquable" },
  rythme_non_choquable:  { label: "Non choquable", color: "#6b7280", short: "Non choq." },
  reprise:               { label: "Reprise",       color: "#16a34a", short: "Reprise"   },
};

const ProtocolCard = ({ protocol: p }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    if (open) {
      const actionsIdx = p.sections.findIndex(s => s.type === "actions");
      setActiveTab(actionsIdx >= 0 ? actionsIdx : 0);
    }
  }, [open, p.sections]);

  const sec = activeTab !== null ? p.sections[activeTab] : null;
  const meta = sec ? (SECTION_META[sec.type] || { label: sec.titre, color: "#888", short: sec.titre }) : null;

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
        <svg
          className={`chevron ${open ? "chevron-open" : ""}`}
          viewBox="0 0 24 24" width="18" height="18"
          fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="protocol-body">
          {p.ref && (
            <div className="protocol-authors">
              {p.auteurs.join(" · ")}
              <span className="protocol-ref"> — {p.ref}</span>
            </div>
          )}

          {/* Onglets sections */}
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

          {/* Contenu de l'onglet actif */}
          {sec && (
            <div className="proto-tab-content">
              <ul className="proto-items">
                {sec.items.map((item, j) => (
                  <li key={j} className={`proto-item proto-item-${sec.type}`}>
                    <span className="proto-item-bullet" style={{ background: meta.color }} />
                    <div className="proto-item-content">
                      <span>{item.text}</span>
                      {item.sub && (
                        <ul className="proto-sub-items">
                          {item.sub.map((s, k) => (
                            <li key={k} className="proto-sub-item">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke={meta.color} strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProtocolCard;
