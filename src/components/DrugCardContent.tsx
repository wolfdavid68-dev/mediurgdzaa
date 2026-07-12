import { lazy, Suspense } from "react";
import { calcDose, ciSeverity } from "../lib/calc";
import type { Drug } from "../types/data";
import DrugNote from "./DrugNote";
import { collectPrepDuplicateTexts, isPosoDuplicateOfPrep } from "./preparation/drugCardHelpers";

const LegacyDrugPreparation = lazy(() => import("./LegacyDrugPreparation"));

type DrugPosologyTabProps = {
  drug: Drug;
  weight: string;
  prepPopulation?: "adulte" | "enfant" | null;
  prepV25Mode: boolean;
  resolvedPrep: Drug["prep"];
  includePreparation?: boolean;
  includeNote?: boolean;
  onNoteChange: (hasContent: boolean) => void;
};

const DrugPosologyTab = ({
  drug,
  weight,
  prepPopulation,
  prepV25Mode,
  resolvedPrep,
  includePreparation = true,
  includeNote = true,
  onNoteChange,
}: DrugPosologyTabProps) => {
  const kgNum = parseFloat(weight);
  const validKg = kgNum > 0 && kgNum <= 300;
  const hasAdult = !!(drug.poso?.a && drug.poso.a.length);
  const hasPed = !!(drug.poso?.p && drug.poso.p.length);
  const effectivePrep = prepV25Mode ? resolvedPrep : drug.prep;
  const hidePosologyGrid = Boolean(effectivePrep?.hide_poso_when_prepared);
  const prepDuplicateTexts = prepV25Mode ? collectPrepDuplicateTexts(effectivePrep) : [];
  let showAdult = true;
  let showPed = true;
  let posoHint = "";

  if (prepPopulation === "enfant") {
    if (hasPed) {
      showAdult = false;
      posoHint = "Mode enfant — posologie pédiatrique";
    } else {
      showPed = false;
      posoHint = "Pas de posologie pédiatrique — posologie adulte affichée";
    }
  } else if (prepPopulation === "adulte") {
    if (hasAdult) {
      showPed = false;
      posoHint = "Mode adulte — posologie adulte";
    } else {
      showAdult = false;
      posoHint = "Pas de posologie adulte — posologie pédiatrique affichée";
    }
  } else if (validKg && kgNum < 30) {
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
  const renderPosoLines = (lines: string[] | undefined) => {
    const visibleLines = (lines || []).filter(
      (line) => !isPosoDuplicateOfPrep(line, prepDuplicateTexts)
    );
    return visibleLines.length ? (
      visibleLines.map((posology, index) => {
        const result = calcDose(posology, weight);
        return (
          <div key={index} className="poso-item">
            {posology}
            {result && (
              <span
                className={`calc-result ${
                  result.validation === "danger"
                    ? "calc-danger"
                    : result.capped
                      ? "calc-over"
                      : "calc-ok"
                }`}
              >
                {result.value}
                {result.validation === "danger" ? " 🚨 vérifier" : result.capped ? " ⚠ max" : ""}
              </span>
            )}
          </div>
        );
      })
    ) : (
      <span className="na">{lines?.length ? "Voir préparation ci-dessous" : "Non renseigné"}</span>
    );
  };

  return (
    <>
      {!hidePosologyGrid && (
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
        </>
      )}

      {includePreparation && (
        <Suspense fallback={<div className="prep-v25-loading">Chargement de la préparation…</div>}>
          <LegacyDrugPreparation drug={drug} weight={weight} prepPopulation={prepPopulation} />
        </Suspense>
      )}
      {includeNote && <DrugNote drugId={drug.id} onChange={onNoteChange} />}
    </>
  );
};

type DrugTabContentProps = Omit<DrugPosologyTabProps, "includePreparation" | "includeNote"> & {
  tabKey: string;
};

const renderList = (items: string[] | undefined) =>
  !items?.length ? (
    <span className="na">Non renseigné</span>
  ) : (
    <ul className="item-list">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );

export const DrugTabContent = ({ tabKey, ...posologyProps }: DrugTabContentProps) => {
  const { drug } = posologyProps;
  if (tabKey === "indic") return renderList(drug.indic);
  if (tabKey === "ci") {
    if (!drug.ci?.length) return <span className="na">Non renseigné</span>;
    return (
      <ul className="ci-list">
        {drug.ci.map((item, index) => {
          const severity = ciSeverity(item);
          return (
            <li key={index} className={`ci-item ${severity ? `ci-item-${severity}` : ""}`}>
              {severity && (
                <span className={`ci-badge ci-badge-${severity}`}>
                  {severity === "abs" ? "Absolue" : severity === "rel" ? "Relative" : "Précaution"}
                </span>
              )}
              <span className="ci-text">{item}</span>
            </li>
          );
        })}
      </ul>
    );
  }
  if (tabKey === "ei") return renderList(drug.ei);
  if (tabKey === "cond") {
    if (!drug.cond?.length) return <span className="na">Non renseigné</span>;
    return (
      <div className="cond-list">
        {drug.cond.map((condition, index) => (
          <span key={index} className="cond-tag">
            {condition}
          </span>
        ))}
      </div>
    );
  }
  if (tabKey === "poso") {
    return (
      <DrugPosologyTab
        {...posologyProps}
        includePreparation={!posologyProps.prepV25Mode}
        includeNote={!posologyProps.prepV25Mode}
      />
    );
  }
  return null;
};
