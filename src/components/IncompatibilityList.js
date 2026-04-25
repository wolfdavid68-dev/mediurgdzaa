import React, { useState } from "react";
import { INCOMPATIBILITIES } from "../data/incompatibilities";

const TYPE_META = {
  precipitation: { label: "Précipitation", short: "P",  color: "#ef4444" },
  inactivation:  { label: "Inactivation",  short: "I",  color: "#f97316" },
  incompatible:  { label: "Incompatible",  short: "✕",  color: "#6b7280" },
  pH:            { label: "Incompatibilité pH", short: "pH", color: "#a855f7" },
  compatible:    { label: "Compatible validé", short: "✓",  color: "#16a34a" },
  nodata:        { label: "Données insuffisantes", short: "?",  color: "#3b82f6" },
};

const buildMatrix = () => {
  const incomp = {};
  const compat = {};

  INCOMPATIBILITIES.forEach(entry => {
    // incompatibilités
    entry.items.forEach(item => {
      const target = INCOMPATIBILITIES.find(d => d.drug === item.with);
      if (!target) return;
      if (!incomp[entry.drug]) incomp[entry.drug] = {};
      incomp[entry.drug][target.drug] = { type: item.type, note: item.note };
      if (!incomp[target.drug]) incomp[target.drug] = {};
      incomp[target.drug][entry.drug] = { type: item.type, note: item.note };
    });
    // compatibilités explicites
    (entry.compatibleWith || []).forEach(name => {
      const target = INCOMPATIBILITIES.find(d => d.drug === name);
      if (!target) return;
      if (!compat[entry.drug]) compat[entry.drug] = {};
      compat[entry.drug][target.drug] = true;
      if (!compat[target.drug]) compat[target.drug] = {};
      compat[target.drug][entry.drug] = true;
    });
  });

  return { incomp, compat };
};

const { incomp: INCOMP, compat: COMPAT } = buildMatrix();

const IncompatibilityList = () => {
  const [selected, setSelected] = useState(null);

  const handleCell = (drugA, drugB) => {
    const cell = INCOMP[drugA]?.[drugB];
    const isCompat = COMPAT[drugA]?.[drugB];
    const hasNoData = !cell && !isCompat;
    if (!cell && !isCompat && !hasNoData) return;
    if (selected?.drugA === drugA && selected?.drugB === drugB) {
      setSelected(null);
    } else {
      const cellData = cell || (isCompat ? { type: "compatible", note: "" } : { type: "nodata", note: "" });
      setSelected({ drugA, drugB, ...cellData });
    }
  };

  return (
    <div className="incompat-wrap">
      <div className="incompat-legend">
        {Object.entries(TYPE_META).map(([k, m]) => (
          <span key={k} className="incompat-legend-item">
            <span className="incompat-cell-badge" style={{ background: m.color + "28", color: m.color, borderColor: m.color + "55" }}>
              {m.short}
            </span>
            {m.label}
          </span>
        ))}
      </div>

      <div className="incompat-matrix-scroll">
        <table className="incompat-matrix">
          <thead>
            <tr>
              <th className="incompat-corner" />
              {INCOMPATIBILITIES.map(d => (
                <th key={d.drug} className="incompat-col-head">
                  <div className="incompat-col-label" style={{ color: d.color }}>{d.short}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INCOMPATIBILITIES.map(rowDrug => (
              <tr key={rowDrug.drug}>
                <td className="incompat-row-head" style={{ borderLeft: `3px solid ${rowDrug.color}` }}>
                  {rowDrug.drug}
                  {rowDrug.exclusif && <span className="incompat-excl-badge">voie excl.</span>}
                </td>
                {INCOMPATIBILITIES.map(colDrug => {
                  if (rowDrug.drug === colDrug.drug) {
                    return <td key={colDrug.drug} className="incompat-cell incompat-cell-self">—</td>;
                  }
                  const cell    = INCOMP[rowDrug.drug]?.[colDrug.drug];
                  const isCompat = COMPAT[rowDrug.drug]?.[colDrug.drug];
                  const isSelected = selected?.drugA === rowDrug.drug && selected?.drugB === colDrug.drug;

                  if (cell) {
                    const meta = TYPE_META[cell.type] || TYPE_META.incompatible;
                    return (
                      <td key={colDrug.drug}
                        className={`incompat-cell incompat-cell-hit ${isSelected ? "incompat-cell-selected" : ""}`}
                        style={{ background: meta.color + "28", borderColor: meta.color + "44" }}
                        onClick={() => handleCell(rowDrug.drug, colDrug.drug)}>
                        <span style={{ color: meta.color, fontWeight: 800 }}>{meta.short}</span>
                      </td>
                    );
                  }
                  if (isCompat) {
                    const meta = TYPE_META.compatible;
                    return (
                      <td key={colDrug.drug}
                        className={`incompat-cell incompat-cell-hit ${isSelected ? "incompat-cell-selected" : ""}`}
                        style={{ background: meta.color + "20", borderColor: meta.color + "44" }}
                        onClick={() => handleCell(rowDrug.drug, colDrug.drug)}>
                        <span style={{ color: meta.color, fontWeight: 800 }}>{meta.short}</span>
                      </td>
                    );
                  }
                  const meta = TYPE_META.nodata;
                  return (
                    <td key={colDrug.drug}
                      className={`incompat-cell incompat-cell-nodata ${isSelected ? "incompat-cell-selected" : ""}`}
                      style={{ background: meta.color + "14", borderColor: meta.color + "22" }}
                      onClick={() => handleCell(rowDrug.drug, colDrug.drug)}>
                      <span style={{ color: meta.color, fontSize: "12px", opacity: 0.5 }}>{meta.short}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (() => {
        const meta = TYPE_META[selected.type] || TYPE_META.incompatible;
        const entryA = INCOMPATIBILITIES.find(d => d.drug === selected.drugA);
        return (
          <div className="incompat-detail" style={{ borderColor: meta.color + "66", background: meta.color + "10" }}>
            <button className="incompat-detail-close" onClick={() => setSelected(null)}>✕</button>
            <div className="incompat-detail-title">
              <span className="incompat-cell-badge" style={{ background: meta.color + "28", color: meta.color, borderColor: meta.color + "55" }}>{meta.short}</span>
              <strong>{selected.drugA}</strong>
              <span style={{ color: "var(--text-dim)" }}>+</span>
              <strong>{selected.drugB}</strong>
            </div>
            <div className="incompat-detail-type" style={{ color: meta.color }}>{meta.label}</div>
            {selected.type === "nodata" && (
              <div className="incompat-detail-note" style={{ color: meta.color, fontStyle: "italic" }}>
                Aucune donnée de compatibilité/incompatibilité répertoriée. Consultation clinicale recommandée avant co-administration.
              </div>
            )}
            {selected.note && selected.type !== "nodata" && <div className="incompat-detail-note">{selected.note}</div>}
            {entryA?.solvant && (
              <div className="incompat-detail-solvant">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                Solvant {selected.drugA} : {entryA.solvant}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default IncompatibilityList;
