import React, { useState } from "react";

const SECTION_META = {
  inclusion:   { label: "Inclusion",   color: "#16a34a", bg: "inclusion" },
  exclusion:   { label: "Exclusion",   color: "#dc2626", bg: "exclusion" },
  gravite:     { label: "Gravité",     color: "#f97316", bg: "gravite"   },
  actions:     { label: "Actions",     color: "#3b82f6", bg: "actions"   },
  surveillance:{ label: "Surveillance",color: "#06b6d4", bg: "surveillance" },
};

const ProtocolCard = ({ protocol: p }) => {
  const [open, setOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (i) => setOpenSection(openSection === i ? null : i);

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
          <div className="protocol-authors">
            {p.auteurs.join(" · ")}
            {p.ref && <span className="protocol-ref"> — {p.ref}</span>}
          </div>

          <div className="protocol-sections">
            {p.sections.map((sec, i) => {
              const meta = SECTION_META[sec.type] || { label: sec.titre, color: "#888", bg: "default" };
              const isOpen = openSection === i;
              return (
                <div key={i} className={`proto-section proto-section-${sec.type}`}>
                  <button
                    className="proto-section-header"
                    style={{ borderLeftColor: meta.color }}
                    onClick={() => toggleSection(i)}
                  >
                    <span className="proto-section-dot" style={{ background: meta.color }} />
                    <span className="proto-section-title">{sec.titre}</span>
                    <span className="proto-section-count">{sec.items.length}</span>
                    <svg
                      className={`proto-chevron ${isOpen ? "proto-chevron-open" : ""}`}
                      viewBox="0 0 24 24" width="14" height="14"
                      fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isOpen && (
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
                  )}
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
