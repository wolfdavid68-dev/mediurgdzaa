import { useState } from "react";
import { INCOMPATIBILITIES } from "../data/incompatibilities";

type RelationType = "compatible" | "incompatible" | "pH" | "unknown";

type IncompatDrug = {
  drug: string;
  short: string;
  color: string;
  items: Array<{ with: string; type: "incompatible" | "pH"; note: string }>;
  compatibleWith?: string[];
  solvant?: string;
  exclusif?: boolean;
};

type LineId = "proximale" | "mediane2" | "distale" | "mediane1";

type LineState = Record<LineId, string[]>;

const DRUGS_INCOMPAT = INCOMPATIBILITIES as IncompatDrug[];
const CUSTOM_LINE_ITEMS: IncompatDrug[] = [
  {
    drug: "Transfusion générale",
    short: "Transfu",
    color: "#dc2626",
    items: [],
    compatibleWith: [],
  },
];
const SELECTABLE_ITEMS = [...CUSTOM_LINE_ITEMS, ...DRUGS_INCOMPAT];

const LINE_META: Array<{
  id: LineId;
  label: string;
  montage: string;
  role: string;
  note: string;
  couleur: string;
  fond: string;
}> = [
  {
    id: "proximale",
    label: "Proximale",
    montage: "OCTOPUS 4 voies",
    role: "Amines / PSE continus",
    note: "Priorité aux amines et PSE hémodynamiques compatibles.",
    couleur: "#f8fafc",
    fond: "rgba(248, 250, 252, 0.16)",
  },
  {
    id: "mediane2",
    label: "Médiane 2",
    montage: "OCTOPUS 2 voies",
    role: "Voie dédiée / secours",
    note: "À préserver si une perfusion doit rester isolée ou si une voie libre est nécessaire.",
    couleur: "#0891b2",
    fond: "rgba(8, 145, 178, 0.18)",
  },
  {
    id: "distale",
    label: "Distale",
    montage: "OCTOPUS 4 voies",
    role: "Sédation / analgésie",
    note: "Hypnotiques, morphiniques, curares et sédation continue compatibles.",
    couleur: "#ef4444",
    fond: "rgba(239, 68, 68, 0.16)",
  },
  {
    id: "mediane1",
    label: "Médiane 1",
    montage: "Remplissage / transfusion · IVD / miniflac",
    role: "Remplissage / transfusion / antibiotiques",
    note: "Transfusion, remplissage, antibiotiques et traitements courts sur cette section, avec rinçage avant/après.",
    couleur: "#374151",
    fond: "rgba(55, 65, 81, 0.22)",
  },
];

const LINE_LIMITS: Record<LineId, number> = {
  proximale: 4,
  mediane2: 2,
  distale: 4,
  mediane1: 8,
};

const ANTIBIOTIC_PATTERNS =
  /(amoxicilline|aztreonam|aztréonam|cef|céf|cefta|céfta|cefox|céfox|cloxacilline|meropenem|meronem|penicilline|piperacilline|tazobactam|sulbactam|ampicilline|temocilline|témocilline|vancomycine)/i;

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const getDrug = (name: string) => SELECTABLE_ITEMS.find((entry) => entry.drug === name);

const getRelation = (drugA: string, drugB: string): RelationType => {
  const entryA = getDrug(drugA);
  const entryB = getDrug(drugB);
  if (!entryA || !entryB) return "unknown";

  const aToB = entryA.items.find((item) => item.with === drugB);
  const bToA = entryB.items.find((item) => item.with === drugA);
  const incompat = aToB || bToA;
  if (incompat) return incompat.type;

  if (entryA.compatibleWith?.includes(drugB) || entryB.compatibleWith?.includes(drugA)) {
    return "compatible";
  }

  return "unknown";
};

const getLineRelations = (drugs: string[]) => {
  const relations: Array<{ a: string; b: string; type: RelationType }> = [];

  drugs.forEach((drugA, index) => {
    drugs.slice(index + 1).forEach((drugB) => {
      relations.push({ a: drugA, b: drugB, type: getRelation(drugA, drugB) });
    });
  });

  return relations;
};

const getConflictWeight = (drug: string) =>
  DRUGS_INCOMPAT.reduce((score, entry) => {
    if (entry.drug === drug) return score;
    return score + (getRelation(drug, entry.drug) === "incompatible" ? 1 : 0);
  }, 0);

const getDrugProfile = (drug: string) => {
  if (drug === "Transfusion générale") return "transfusion";
  if (getDrug(drug)?.exclusif) return "dedie";
  if (ANTIBIOTIC_PATTERNS.test(drug)) return "antibiotique";
  if (
    [
      "Adrénaline®",
      "Dobutamine®",
      "Norépinéphrine (Noradrénaline®)",
      "Isoprénaline (Isuprel®)",
      "Milrinone (Corotrope®)",
      "Landiolol (Rapibloc®)",
      "Amiodarone (Cordarone®)",
    ].includes(drug)
  ) {
    return "hemodynamique";
  }
  if (
    [
      "Dexmédétomidine (Dexdor®)",
      "Midazolam (Hypnovel®)",
      "Propofol (Diprivan®)",
      "Kétamine®",
      "Morphine®",
      "Rémifentanil (Ultiva®)",
      "Sufentanil®",
      "Cisatracurium (Nimbex®)",
    ].includes(drug)
  ) {
    return "sedation";
  }
  if (
    /(céf|cilline|meropenem|tazobactam|vancomycine|hydrocortisone|oméprazole|naloxone|glucagon|salbutamol)/i.test(
      drug
    )
  ) {
    return "court";
  }
  return "standard";
};

const scoreLine = (drug: string, lineId: LineId) => {
  const profile = getDrugProfile(drug);
  const scores: Record<string, Record<LineId, number>> = {
    dedie: { proximale: -20, mediane2: 30, distale: 18, mediane1: 24 },
    transfusion: { proximale: -30, mediane2: -20, distale: 8, mediane1: 45 },
    antibiotique: { proximale: -12, mediane2: -4, distale: 4, mediane1: 42 },
    hemodynamique: { proximale: 34, mediane2: 12, distale: -6, mediane1: 0 },
    sedation: { proximale: 8, mediane2: 6, distale: 34, mediane1: 6 },
    court: { proximale: -8, mediane2: 0, distale: 12, mediane1: 30 },
    standard: { proximale: 4, mediane2: 10, distale: 6, mediane1: 12 },
  };
  return scores[profile][lineId];
};

const buildProposal = (selectedDrugs: string[]) => {
  const lines: LineState = { proximale: [], mediane2: [], distale: [], mediane1: [] };
  const unplaced: Array<{ drug: string; reason: string }> = [];
  const sorted = [...selectedDrugs].sort((a, b) => {
    const aExclusive = getDrug(a)?.exclusif ? 1 : 0;
    const bExclusive = getDrug(b)?.exclusif ? 1 : 0;
    return bExclusive - aExclusive || getConflictWeight(b) - getConflictWeight(a);
  });

  sorted.forEach((drug) => {
    const entry = getDrug(drug);
    const candidates = LINE_META.map((line) => {
      const current = lines[line.id];
      const currentHasExclusive = current.some((name) => getDrug(name)?.exclusif);
      const relations = current.map((other) => getRelation(drug, other));
      const incompatibleCount = relations.filter((relation) => relation === "incompatible").length;
      const unknownCount = relations.filter((relation) => relation === "unknown").length;
      const phCount = relations.filter((relation) => relation === "pH").length;
      const full = current.length >= LINE_LIMITS[line.id];
      const violatesDedicated = !!entry?.exclusif && current.length > 0;
      const blocked = full || currentHasExclusive || violatesDedicated || incompatibleCount > 0;

      return {
        lineId: line.id,
        blocked,
        score: scoreLine(drug, line.id) - unknownCount * 4 - phCount * 2,
        unknownCount,
        phCount,
      };
    }).sort(
      (a, b) =>
        Number(a.blocked) - Number(b.blocked) ||
        b.score - a.score ||
        a.unknownCount - b.unknownCount ||
        a.phCount - b.phCount
    );

    const selected = candidates.find((candidate) => !candidate.blocked);
    if (selected) {
      lines[selected.lineId].push(drug);
      return;
    }

    unplaced.push({
      drug,
      reason: entry?.exclusif
        ? "voie dédiée indisponible sur ce montage"
        : "aucune lumière libre sans conflit documenté",
    });
  });

  return { lines, unplaced };
};

const relationLabel = {
  compatible: "compatibles",
  incompatible: "incompatibles",
  pH: "vigilance pH",
  unknown: "non renseignés",
};

const KtcLinePlanner = () => {
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [drugSearch, setDrugSearch] = useState("");

  const addDrug = (drug: string) => {
    if (!drug) return;
    setSelectedDrugs((current) => (current.includes(drug) ? current : [...current, drug]));
    setDrugSearch("");
  };

  const removeDrug = (drug: string) => {
    setSelectedDrugs((current) => current.filter((name) => name !== drug));
  };

  const searchTerm = normalizeSearch(drugSearch.trim());
  const filteredDrugs = SELECTABLE_ITEMS.filter((entry) => {
    const haystack = normalizeSearch(`${entry.drug} ${entry.short}`);
    return haystack.includes(searchTerm);
  })
    .filter((entry) => !selectedDrugs.includes(entry.drug))
    .slice(0, 14);
  const proposal = buildProposal(selectedDrugs);

  return (
    <div className="ktc-lines">
      <div className="ktc-lines-head">
        <div>
          <span className="ktc-lines-kicker">Assistant de ligne</span>
          <h3>Médicaments utilisés → proposition KTC</h3>
        </div>
        <button
          type="button"
          className="ktc-lines-reset"
          onClick={() => setSelectedDrugs([])}
          disabled={selectedDrugs.length === 0}
        >
          Effacer
        </button>
      </div>

      <p className="ktc-lines-intro">
        Entrer les médicaments réellement utilisés. L'app les répartit sur les lumières du schéma
        KTC en privilégiant les groupes compatibles ; les médicaments impossibles à placer restent à
        isoler sur une autre voie ou à revalider.
      </p>

      <div className="ktc-picker">
        <label htmlFor="ktc-drug-search">Médicaments à brancher</label>
        <input
          id="ktc-drug-search"
          value={drugSearch}
          onChange={(event) => setDrugSearch(event.target.value)}
          placeholder="Noradrénaline, Hypnovel, Lasilix..."
        />
        <div className="ktc-picker-results">
          {filteredDrugs.map((entry) => (
            <button key={entry.drug} type="button" onClick={() => addDrug(entry.drug)}>
              <span style={{ background: entry.color }} />
              {entry.drug}
            </button>
          ))}
        </div>
      </div>

      <div className="ktc-selected">
        {selectedDrugs.length === 0 ? (
          <span>Aucun médicament saisi pour l'instant.</span>
        ) : (
          selectedDrugs.map((drug) => {
            const entry = getDrug(drug);
            return (
              <button key={drug} type="button" onClick={() => removeDrug(drug)}>
                <span style={{ background: entry?.color || "#64748b" }} />
                {entry?.short || drug}
                <strong>×</strong>
              </button>
            );
          })
        )}
      </div>

      <div className="ktc-lines-grid">
        {LINE_META.map((line) => {
          const drugs = proposal.lines[line.id];
          const relations = getLineRelations(drugs);
          const hasIncompat = relations.some((relation) => relation.type === "incompatible");
          const unknownCount = relations.filter((relation) => relation.type === "unknown").length;
          const phCount = relations.filter((relation) => relation.type === "pH").length;
          const statusClass = hasIncompat
            ? "ktc-line-danger"
            : unknownCount > 0 || phCount > 0
              ? "ktc-line-watch"
              : "ktc-line-ok";
          const statusText = hasIncompat
            ? "Conflit"
            : unknownCount > 0 || phCount > 0
              ? "À vérifier"
              : "Compatible";

          return (
            <section
              key={line.id}
              className={`ktc-line ${statusClass}`}
              style={{ background: line.fond, borderColor: line.couleur }}
            >
              <div className="ktc-line-head">
                <div>
                  <span className="ktc-line-label">
                    <span className="ktc-line-label-dot" style={{ background: line.couleur }} />
                    {line.label}
                  </span>
                  <strong>{line.role}</strong>
                </div>
                <span className="ktc-line-status">{statusText}</span>
              </div>

              <div
                className="ktc-line-mount"
                style={{
                  background: line.id === "proximale" ? "rgba(248, 250, 252, 0.22)" : line.couleur,
                  borderColor: line.couleur,
                  color: "#fff",
                }}
              >
                {line.montage}
              </div>
              <p className="ktc-line-note">{line.note}</p>

              <div className="ktc-line-drugs">
                {drugs.length === 0 ? (
                  <span className="ktc-line-empty">Aucun médicament proposé.</span>
                ) : (
                  drugs.map((drug) => {
                    const entry = getDrug(drug);
                    return (
                      <span key={drug} className="ktc-line-chip">
                        <span
                          className="ktc-line-dot"
                          style={{ background: entry?.color || "#64748b" }}
                        />
                        {entry?.short || drug}
                        {entry?.exclusif && <em>voie dédiée</em>}
                      </span>
                    );
                  })
                )}
              </div>

              {relations.length > 0 && (
                <div className="ktc-line-relations">
                  {relations.map((relation) => (
                    <div key={`${relation.a}-${relation.b}`} className={`ktc-rel-${relation.type}`}>
                      <strong>{relationLabel[relation.type]}</strong>
                      <span>
                        {getDrug(relation.a)?.short || relation.a} +{" "}
                        {getDrug(relation.b)?.short || relation.b}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {proposal.unplaced.length > 0 && (
        <div className="ktc-unplaced">
          <strong>À isoler / revalider</strong>
          {proposal.unplaced.map((item) => (
            <div key={item.drug}>
              <span>{getDrug(item.drug)?.short || item.drug}</span>
              <p>{item.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KtcLinePlanner;
