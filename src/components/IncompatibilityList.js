import React, { useState } from "react";
import { INCOMPATIBILITIES } from "../data/incompatibilities";

const TYPE_META = {
  precipitation: { label: "Précipitation", short: "P", color: "#ef4444" },
  inactivation:  { label: "Inactivation",  short: "I", color: "#f97316" },
  incompatible:  { label: "Incompatible",  short: "✕", color: "#6b7280" },
};

// Construit la matrice bidirectionnelle
const buildMatrix = () => {
  const m = {};
  INCOMPATIBILITIES.forEach(entry => {
    if (!m[entry.drug]) m[entry.drug] = {};
    entry.items.forEach(item => {
      const target = INCOMPATIBILITIES.find(d => d.drug === item.with);
      if (!target) return;
      m[entry.drug][target.drug] = { type: item.type, note: item.note };
      if (!m[target.drug]) m[target.drug] = {};
      m[target.drug][entry.drug] = { type: item.type, note: item.note };
    });
  });
  return m;
};

const MATRIX = buildMatrix();

const IncompatibilityList = () => {
  const [selected, setSelected] = useState(null);

  const handleCell = (drugA, drugB) => {
    const cell = MATRIX[drugA]?.[drugB];
    if (!cell) return;
    if (selected && selected.drugA === drugA && selected.drugB === drugB) {
      setSelected(null);
    } else {
      setSelected({ drugA, drugB, ...cell });
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
                  const cell = MATRIX[rowDrug.drug]?.[colDrug.drug];
                  if (!cell) {
                    return <td key={colDrug.drug} className="incompat-cell incompat-cell-empty" />;
                  }
                  const meta = TYPE_META[cell.type] || TYPE_META.incompatible;
                  const isSelected = selected?.drugA === rowDrug.drug && selected?.drugB === colDrug.drug;
                  return (
                    <td
                      key={colDrug.drug}
                      className={`incompat-cell incompat-cell-hit ${isSelected ? "incompat-cell-selected" : ""}`}
                      style={{ background: meta.color + "28", borderColor: meta.color + "44" }}
                      onClick={() => handleCell(rowDrug.drug, colDrug.drug)}
                    >
                      <span style={{ color: meta.color, fontWeight: 800 }}>{meta.short}</span>
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
            {selected.note && <div className="incompat-detail-note">{selected.note}</div>}
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
