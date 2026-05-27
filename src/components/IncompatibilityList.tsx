import { useState } from "react";
import { INCOMPATIBILITIES } from "../data/incompatibilities";
import { normalize } from "../lib/normalize";

const TYPE_META = {
  incompatible: { label: "Incompatible", short: "✕", color: "#dc2626" },
  pH: { label: "Compatible — vigilance pH", short: "pH", color: "#16a34a" },
  compatible: { label: "Compatible validé", short: "✓", color: "#16a34a" },
  unknown: { label: "Non renseigné", short: "?", color: "#64748b" },
};

const DRUG_DISPLAY_OVERRIDES: Record<string, string> = {
  "Norépinéphrine (Noradrénaline®)": "Noradrénaline",
};

const DRUG_SEARCH_ALIASES: Record<string, string[]> = {
  "Norépinéphrine (Noradrénaline®)": [
    "noradrénaline",
    "noradrenaline",
    "norépinéphrine",
    "norepinephrine",
  ],
  "Furosémide (Lasilix®)": ["furosémide", "furosemide", "lasilix", "l'asile", "l asile", "lasile"],
};

type CellInfo = { type: string; note: string };
type Matrix = Record<string, Record<string, CellInfo>>;
type CompatMatrix = Record<string, Record<string, true>>;
type Selected = { drugA: string; drugB: string; type: string; note: string };
type ViewMode = "fiche" | "comparaison" | "matrice";
type IncompatDrug = {
  drug: string;
  short: string;
  color: string;
  items: Array<{ with: string; type: string; note: string }>;
  compatibleWith?: string[];
  solvant?: string;
  exclusif?: boolean;
};

const DRUGS_INCOMPAT = INCOMPATIBILITIES as IncompatDrug[];

const normalizeSearch = (value: string) =>
  normalize(value)
    .replace(/®/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getDrugDisplayName = (drug: string) => DRUG_DISPLAY_OVERRIDES[drug] || drug;

const getDrugSearchText = (entry: IncompatDrug) =>
  normalizeSearch(
    [
      entry.drug,
      entry.short,
      getDrugDisplayName(entry.drug),
      ...(DRUG_SEARCH_ALIASES[entry.drug] || []),
    ].join(" ")
  );

const matchesDrugSearch = (entry: IncompatDrug, query: string) => {
  const q = normalizeSearch(query);
  if (!q) return true;
  return getDrugSearchText(entry).includes(q);
};

const buildMatrix = () => {
  const incomp: Matrix = {};
  const compat: CompatMatrix = {};
  DRUGS_INCOMPAT.forEach((entry) => {
    entry.items.forEach((item) => {
      const target = DRUGS_INCOMPAT.find((d) => d.drug === item.with);
      if (!target) return;
      if (!incomp[entry.drug]) incomp[entry.drug] = {};
      incomp[entry.drug][target.drug] = { type: item.type, note: item.note };
      if (!incomp[target.drug]) incomp[target.drug] = {};
      incomp[target.drug][entry.drug] = { type: item.type, note: item.note };
    });
    (entry.compatibleWith || []).forEach((name: string) => {
      const target = DRUGS_INCOMPAT.find((d) => d.drug === name);
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

const getDrugEntry = (drug: string) => DRUGS_INCOMPAT.find((d) => d.drug === drug);

const getRelation = (drugA: string, drugB: string): Selected => {
  const cell = INCOMP[drugA]?.[drugB];
  if (cell) return { drugA, drugB, type: cell.type, note: cell.note || "" };
  if (COMPAT[drugA]?.[drugB]) return { drugA, drugB, type: "compatible", note: "" };
  return { drugA, drugB, type: "unknown", note: "" };
};

const IncompatibilityList = () => {
  const firstDrug = DRUGS_INCOMPAT[0]?.drug || "";
  const secondDrug = DRUGS_INCOMPAT[1]?.drug || firstDrug;
  const [selected, setSelected] = useState<Selected | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("fiche");
  const [drugSearch, setDrugSearch] = useState("");
  const [focusDrug, setFocusDrug] = useState(firstDrug);
  const [compareA, setCompareA] = useState(firstDrug);
  const [compareB, setCompareB] = useState(secondDrug);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const filteredDrugs = DRUGS_INCOMPAT.filter((entry) => matchesDrugSearch(entry, drugSearch));

  const focusEntry = getDrugEntry(focusDrug);
  const focusedRelations = DRUGS_INCOMPAT.filter((entry) => entry.drug !== focusDrug).reduce(
    (groups, entry) => {
      const relation = getRelation(focusDrug, entry.drug);
      if (relation.type === "incompatible") groups.incompatible.push(relation);
      else if (relation.type === "pH") groups.pH.push(relation);
      else if (relation.type === "compatible") groups.compatible.push(relation);
      else groups.unknown.push(relation);
      return groups;
    },
    {
      incompatible: [] as Selected[],
      pH: [] as Selected[],
      compatible: [] as Selected[],
      unknown: [] as Selected[],
    }
  );
  const compareResult =
    compareA && compareB && compareA !== compareB ? getRelation(compareA, compareB) : null;

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

  const handleSelectDrug = (drug: string) => {
    setFocusDrug(drug);
    setCompareA(drug);
    setSelected(null);
  };

  const handleRelationChip = (relation: Selected) => {
    setCompareA(relation.drugA);
    setCompareB(relation.drugB);
    setSelected(relation.type === "unknown" ? null : relation);
    setViewMode("comparaison");
  };

  const toggleGroup = (type: keyof typeof TYPE_META) => {
    setExpandedGroups((current) => ({ ...current, [type]: !current[type] }));
  };

  const renderRelationChips = (
    title: string,
    relations: Selected[],
    type: keyof typeof TYPE_META
  ) => {
    const meta = TYPE_META[type];
    const isExpanded = expandedGroups[type];
    const visibleLimit = type === "compatible" && !isExpanded ? 0 : 10;
    const visibleRelations = isExpanded ? relations : relations.slice(0, visibleLimit);
    const hiddenCount = Math.max(0, relations.length - visibleRelations.length);

    return (
      <section className={`incompat-relation-group incompat-relation-${type}`}>
        <div className="incompat-relation-title">
          <span className="incompat-relation-dot" style={{ background: meta.color }} />
          <span>{title}</span>
          <strong>{relations.length}</strong>
        </div>
        {relations.length > 0 ? (
          <>
            <div className="incompat-chip-list">
              {visibleRelations.map((relation) => {
                const otherEntry = getDrugEntry(relation.drugB);
                return (
                  <button
                    key={relation.drugB}
                    type="button"
                    className="incompat-relation-chip"
                    onClick={() => handleRelationChip(relation)}
                  >
                    <span className="incompat-chip-mark" style={{ background: meta.color }}>
                      {meta.short}
                    </span>
                    <span>{getDrugDisplayName(otherEntry?.drug || relation.drugB)}</span>
                  </button>
                );
              })}
            </div>
            {relations.length > visibleLimit && (
              <button
                type="button"
                className="incompat-more-button"
                onClick={() => toggleGroup(type)}
              >
                {isExpanded
                  ? "Réduire la liste"
                  : type === "compatible"
                    ? `Afficher les ${hiddenCount} compatibles`
                    : `Afficher ${hiddenCount} autres`}
              </button>
            )}
          </>
        ) : (
          <p className="incompat-empty-line">Aucune entrée.</p>
        )}
      </section>
    );
  };

  const renderCompatibleChips = (compatible: Selected[], pH: Selected[]) => {
    const relations = [...pH, ...compatible];
    const isExpanded = expandedGroups.compatible;
    const visibleRelations = isExpanded ? relations : pH.slice(0, 4);
    const hiddenCount = Math.max(0, relations.length - visibleRelations.length);

    return (
      <section className="incompat-relation-group incompat-relation-compatible">
        <div className="incompat-relation-title">
          <span
            className="incompat-relation-dot"
            style={{ background: TYPE_META.compatible.color }}
          />
          <span>Compatible / vigilance pH</span>
          <strong>{relations.length}</strong>
        </div>
        {relations.length > 0 ? (
          <>
            {visibleRelations.length > 0 && (
              <div className="incompat-chip-list">
                {visibleRelations.map((relation) => {
                  const meta = relation.type === "pH" ? TYPE_META.pH : TYPE_META.compatible;
                  const otherEntry = getDrugEntry(relation.drugB);
                  return (
                    <button
                      key={`${relation.type}-${relation.drugB}`}
                      type="button"
                      className="incompat-relation-chip"
                      onClick={() => handleRelationChip(relation)}
                    >
                      <span className="incompat-chip-mark" style={{ background: meta.color }}>
                        {meta.short}
                      </span>
                      <span>{getDrugDisplayName(otherEntry?.drug || relation.drugB)}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {hiddenCount > 0 && (
              <button
                type="button"
                className="incompat-more-button"
                onClick={() => toggleGroup("compatible")}
              >
                {isExpanded ? "Réduire la liste" : `Afficher les ${hiddenCount} compatibles`}
              </button>
            )}
          </>
        ) : (
          <p className="incompat-empty-line">Aucune entrée.</p>
        )}
      </section>
    );
  };

  return (
    <div className="incompat-wrap">
      <div className="incompat-mode-tabs" role="tablist" aria-label="Vue des incompatibilités">
        <button
          type="button"
          className={viewMode === "fiche" ? "incompat-mode-active" : ""}
          onClick={() => setViewMode("fiche")}
        >
          Fiche
        </button>
        <button
          type="button"
          className={viewMode === "comparaison" ? "incompat-mode-active" : ""}
          onClick={() => setViewMode("comparaison")}
        >
          Comparer
        </button>
        <button
          type="button"
          className={viewMode === "matrice" ? "incompat-mode-active" : ""}
          onClick={() => setViewMode("matrice")}
        >
          Matrice
        </button>
      </div>

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

      {viewMode === "fiche" && (
        <div className="incompat-focus-view">
          <div className="incompat-focus-side">
            <label className="incompat-search-label" htmlFor="incompat-drug-search">
              Rechercher un médicament
            </label>
            <input
              id="incompat-drug-search"
              className="incompat-search-input"
              value={drugSearch}
              onChange={(event) => setDrugSearch(event.target.value)}
              placeholder="Noradrénaline, furosémide, Lasilix..."
            />

            <div className="incompat-drug-picker" aria-label="Médicament sélectionné">
              {filteredDrugs.map((entry: IncompatDrug) => (
                <button
                  key={entry.drug}
                  type="button"
                  className={entry.drug === focusDrug ? "incompat-drug-active" : ""}
                  style={{ borderColor: entry.drug === focusDrug ? entry.color : undefined }}
                  onClick={() => handleSelectDrug(entry.drug)}
                  title={entry.drug}
                >
                  <span className="incompat-drug-dot" style={{ background: entry.color }} />
                  <span>{getDrugDisplayName(entry.drug)}</span>
                </button>
              ))}
            </div>

            <div className="incompat-focus-card">
              <div className="incompat-focus-head">
                <div>
                  <span className="incompat-focus-kicker">Fiche médicament</span>
                  <h3>{getDrugDisplayName(focusDrug)}</h3>
                </div>
                {focusEntry?.exclusif && <span className="incompat-excl-badge">voie dédiée</span>}
              </div>
              {focusEntry?.solvant && (
                <div className="incompat-solvant-strip">Solvant : {focusEntry.solvant}</div>
              )}
              <div
                className={`incompat-priority-strip ${
                  focusedRelations.incompatible.length > 0
                    ? "incompat-priority-danger"
                    : "incompat-priority-ok"
                }`}
              >
                <strong>
                  {focusedRelations.incompatible.length > 0
                    ? `${focusedRelations.incompatible.length} association(s) à éviter`
                    : "Aucune incompatibilité documentée"}
                </strong>
                <span>
                  {focusedRelations.pH.length > 0
                    ? `${focusedRelations.pH.length} compatibilité(s) avec vigilance pH.`
                    : "Pas de vigilance pH signalée dans la fiche."}
                </span>
              </div>
              <div className="incompat-score-row" aria-label="Résumé des interactions">
                <div className="incompat-score incompat-score-red">
                  <strong>{focusedRelations.incompatible.length}</strong>
                  <span>incompatibles</span>
                </div>
                <div className="incompat-score incompat-score-green">
                  <strong>{focusedRelations.compatible.length + focusedRelations.pH.length}</strong>
                  <span>compatibles / pH</span>
                </div>
                <div className="incompat-score incompat-score-grey">
                  <strong>{focusedRelations.unknown.length}</strong>
                  <span>non renseignés</span>
                </div>
              </div>
            </div>
          </div>

          <div className="incompat-relations-panel">
            {renderRelationChips(
              "Incompatible avec",
              focusedRelations.incompatible,
              "incompatible"
            )}
            {renderCompatibleChips(focusedRelations.compatible, focusedRelations.pH)}
          </div>
        </div>
      )}

      {viewMode === "comparaison" && (
        <div className="incompat-compare-view">
          <div className="incompat-compare-selects">
            <label>
              Médicament A
              <select value={compareA} onChange={(event) => setCompareA(event.target.value)}>
                {DRUGS_INCOMPAT.map((entry) => (
                  <option key={entry.drug} value={entry.drug}>
                    {getDrugDisplayName(entry.drug)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Médicament B
              <select value={compareB} onChange={(event) => setCompareB(event.target.value)}>
                {DRUGS_INCOMPAT.map((entry) => (
                  <option key={entry.drug} value={entry.drug}>
                    {getDrugDisplayName(entry.drug)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {compareA === compareB ? (
            <div className="incompat-result incompat-result-unknown">
              Choisir deux médicaments différents.
            </div>
          ) : (
            compareResult &&
            (() => {
              const meta =
                TYPE_META[compareResult.type as keyof typeof TYPE_META] || TYPE_META.unknown;
              return (
                <div className={`incompat-result incompat-result-${compareResult.type}`}>
                  <span className="incompat-result-badge" style={{ background: meta.color }}>
                    {meta.short}
                  </span>
                  <div>
                    <strong>{meta.label}</strong>
                    <span>
                      {getDrugDisplayName(compareResult.drugA)} + {getDrugDisplayName(compareResult.drugB)}
                    </span>
                    {compareResult.note && <p>{compareResult.note}</p>}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      <div
        className={
          viewMode === "matrice"
            ? "incompat-matrix-view"
            : "incompat-matrix-view incompat-matrix-collapsed"
        }
      >
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

        <div className="incompat-matrix-scroll">
          <table className="incompat-matrix">
            <thead>
              <tr>
                <th className="incompat-corner" />
                {DRUGS_INCOMPAT.map((d) => (
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
              {DRUGS_INCOMPAT.map((rowDrug, rowIndex) => (
                <tr key={rowDrug.drug}>
                  <td
                    className="incompat-row-head"
                    style={{ borderLeft: `3px solid ${rowDrug.color}` }}
                  >
                    <span className="incompat-row-name" style={{ color: rowDrug.color }}>
                      {rowDrug.short}
                    </span>
                    <span className="incompat-row-full">{getDrugDisplayName(rowDrug.drug)}</span>
                    {rowDrug.exclusif && <span className="incompat-excl-badge">excl.</span>}
                  </td>
                  {DRUGS_INCOMPAT.map((colDrug, colIndex) => {
                    if (colIndex > rowIndex) {
                      return (
                        <td key={colDrug.drug} className="incompat-cell incompat-cell-upper" />
                      );
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
      </div>

      {selected &&
        (() => {
          const meta = TYPE_META[selected.type as keyof typeof TYPE_META] || TYPE_META.incompatible;
          const entryA = getDrugEntry(selected.drugA);
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
                <strong>{getDrugDisplayName(selected.drugA)}</strong>
                <span className="incompat-detail-plus">+</span>
                <strong>{getDrugDisplayName(selected.drugB)}</strong>
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
                  Solvant {getDrugDisplayName(selected.drugA)} : {entryA.solvant}
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
};

export default IncompatibilityList;
