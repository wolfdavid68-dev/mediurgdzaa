import React, { useState } from "react";

const SECTION_META = {
  inclusion:             { label: "Critères d'inclusion",      color: "#16a34a" },
  exclusion:             { label: "Critères d'exclusion",      color: "#dc2626" },
  gravite:               { label: "Signes de gravité",         color: "#f97316" },
  actions:               { label: "Actions infirmières",       color: "#3b82f6" },
  surveillance:          { label: "Surveillance",              color: "#06b6d4" },
  recueil:               { label: "Recueil de données",        color: "#64748b" },
  rythme_choquable:      { label: "Rythme choquable",          color: "#f97316" },
  rythme_non_choquable:  { label: "Rythme non choquable",      color: "#6b7280" },
  reprise:               { label: "Reprise d'activité",        color: "#16a34a" },
};

const ProtocolCard = ({ protocol: p }) => {
  const [open, setOpen] = useState(false);

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

          <div className="protocol-sections">
            {p.sections.map((sec, i) => {
              const meta = SECTION_META[sec.type] || { label: sec.titre, color: "#888" };
              return (
                <div key={i} className="proto-section">
                  <div
                    className="proto-section-header"
                    style={{ borderLeftColor: meta.color, background: meta.color + "18" }}
                  >
                    <span className="proto-section-dot" style={{ background: meta.color }} />
                    <span className="proto-section-title" style={{ color: meta.color }}>{sec.titre}</span>
                  </div>

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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtocolCard;
