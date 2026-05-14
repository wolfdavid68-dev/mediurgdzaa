import { useState } from "react";
import { INCOMPATIBILITIES } from "../data/incompatibilities";

const TYPE_META = {
  incompatible: { label: "Incompatible", short: "✕", color: "#dc2626" },
  pH: { label: "Compatible — vigilance pH", short: "pH", color: "#16a34a" },
  compatible: { label: "Compatible validé", short: "✓", color: "#16a34a" },
};

type CellInfo = { type: string; note: string };
type Matrix = Record<string, Record<string, CellInfo>>;
type CompatMatrix = Record<string, Record<string, true>>;

const buildMatrix = () => {
  const incomp: Matrix = {};
  const compat: CompatMatrix = {};
  INCOMPATIBILITIES.forEach((entry: any) => {
    entry.items.forEach((item: any) => {
      const target = INCOMPATIBILITIES.find((d: any) => d.drug === item.with);
      if (!target) return;
      if (!incomp[entry.drug]) incomp[entry.drug] = {};
      incomp[entry.drug][target.drug] = { type: item.type, note: item.note };
      if (!incomp[target.drug]) incomp[target.drug] = {};
      incomp[target.drug][entry.drug] = { type: item.type, note: item.note };
    });
    (entry.compatibleWith || []).forEach((name: string) => {
      const target = INCOMPATIBILITIES.find((d: any) => d.drug === name);
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

type Selected = { drugA: string; drugB: string; type: string; note: string };

const IncompatibilityList = () => {
  const [selected, setSelected] = useState<Selected | null>(null);

  const handleCell = (drugA: string, drugB: string) => {
    if (drugA === drugB) return;
    if (selected?.drugA === drugA && selected?.drugB === drugB) {
      setSelected(null);
      return;
    }
    const cell = INCOMP[drugA]?.[drugB];
    const isCompat = COMPAT[drugA]?.[drugB];
    if (!cell && !isCompat) return;
    const type = cell ? cell.type : "compatible";
    setSelected({ drugA, drugB, type, note: cell?.note || "" });
  };

  return (
    <div className="incompat-wrap">
      {/* Légende */}
      <div className="incompat-legend">
        <span className="incompat-legend-item">
          <span className="incompat-legend-swatch" style={{ background: "#dc2626" }} />
          Incompatibilité (Rouge)
        </span>
        <span className="incompat-legend-item">
          <span className="incompat-legend-swatch" style={{ background: "#16a34a" }} />
          Compatibilité (Vert) / pH
        </span>
        <span className="incompat-legend-item">
          <span className="incompat-legend-swatch incompat-legend-swatch-empty" />
          Pas de données (Blanc)
        </span>
      </div>

      {/* Scroll hint */}
      <div className="incompat-scroll-hint">
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        Faites défiler horizontalement pour voir toute la table
      </div>

      {/* Matrice */}
      <div className="incompat-matrix-scroll">
        <table className="incompat-matrix">
          <thead>
            <tr>
              <th className="incompat-corner" />
              {INCOMPATIBILITIES.map((d) => (
                <th key={d.drug} className="incompat-col-head">
                  <span className="incompat-col-dot" style={{ background: d.color }} />
                  <span className="incompat-col-label" style={{ color: d.color }}>
                    {d.short}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INCOMPATIBILITIES.map((rowDrug, rowIndex) => (
              <tr key={rowDrug.drug}>
                <td
                  className="incompat-row-head"
                  style={{ borderLeft: `3px solid ${rowDrug.color}` }}
                >
                  <span className="incompat-row-name" style={{ color: rowDrug.color }}>
                    {rowDrug.short}
                  </span>
                  <span className="incompat-row-full">{rowDrug.drug}</span>
                  {rowDrug.exclusif && <span className="incompat-excl-badge">excl.</span>}
                </td>
                {INCOMPATIBILITIES.map((colDrug, colIndex) => {
                  // Triangle supérieur masqué
                  if (colIndex > rowIndex) {
                    return <td key={colDrug.drug} className="incompat-cell incompat-cell-upper" />;
                  }
                  if (rowDrug.drug === colDrug.drug) {
                    return <td key={colDrug.drug} className="incompat-cell incompat-cell-self" />;
                  }
                  const cell = INCOMP[rowDrug.drug]?.[colDrug.drug];
                  const isCompat = COMPAT[rowDrug.drug]?.[colDrug.drug];
                  const isSelected =
                    selected?.drugA === rowDrug.drug && selected?.drugB === colDrug.drug;

                  if (cell) {
                    const cellColor = cell.type === "pH" ? "#16a34a" : "#dc2626";
                    return (
                      <td
                        key={colDrug.drug}
                        className={`incompat-cell incompat-cell-hit ${isSelected ? "incompat-cell-selected" : ""}`}
                        style={{
                          background: cellColor + "cc",
                          textAlign: "center",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                        onClick={() => handleCell(rowDrug.drug, colDrug.drug)}
                      >
                        {cell.type === "pH" ? "pH" : ""}
                      </td>
                    );
                  }
                  if (isCompat) {
                    return (
                      <td
                        key={colDrug.drug}
                        className={`incompat-cell incompat-cell-hit ${isSelected ? "incompat-cell-selected" : ""}`}
                        style={{ background: "#16a34acc" }}
                        onClick={() => handleCell(rowDrug.drug, colDrug.drug)}
                      />
                    );
                  }
                  return <td key={colDrug.drug} className="incompat-cell incompat-cell-nodata" />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Détail au tap */}
      {selected &&
        (() => {
          const meta = TYPE_META[selected.type as keyof typeof TYPE_META] || TYPE_META.incompatible;
          const entryA = INCOMPATIBILITIES.find((d: any) => d.drug === selected.drugA);
          return (
            <div
              className="incompat-detail"
              style={{ borderColor: meta.color, background: meta.color + "14" }}
            >
              <button
                type="button"
                className="incompat-detail-close"
                onClick={() => setSelected(null)}
                aria-label="Fermer le détail"
              >
                ✕
              </button>
              <div className="incompat-detail-title">
                <span className="incompat-detail-badge" style={{ background: meta.color }}>
                  {meta.short}
                </span>
                <strong>{selected.drugA}</strong>
                <span className="incompat-detail-plus">+</span>
                <strong>{selected.drugB}</strong>
              </div>
              <div className="incompat-detail-type" style={{ color: meta.color }}>
                {meta.label}
              </div>
              {selected.note && <div className="incompat-detail-note">{selected.note}</div>}
              {entryA?.solvant && (
                <div className="incompat-detail-solvant">
                  <svg
                    viewBox="0 0 24 24"
                    width="13"
                    height="13"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
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
