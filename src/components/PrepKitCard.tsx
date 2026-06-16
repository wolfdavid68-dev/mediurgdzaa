import { useEffect, useState } from "react";
import { DRUGS } from "../data/drugs";
import { safeGetJson, safeRemoveItem, safeSetJson } from "../lib/safeStorage";
import { storageKey } from "../lib/storageKeys";
import type { Drug, PrepKit } from "../types/data";
import KitChecklist from "./KitChecklist";
import KtcLinePlanner from "./KtcLinePlanner";
import PaPressureSchema from "./PaPressureSchema";

const DRUG_BY_ID = new Map(DRUGS.map((drug) => [drug.id, drug]));
const CHECK_MAX_AGE_MS = 3 * 60 * 60 * 1000;
type StoredKitChecks = { ts?: number; items?: Record<number, boolean> };

const CHECKLIST_KIT_IDS = ["drain-thoracique", "pa", "ktc"];

const loadChecked = (kitId: string): Record<number, boolean> => {
  const parsed = safeGetJson<StoredKitChecks | null>(storageKey.kitCheck(kitId), null);
  if (!parsed || typeof parsed.ts !== "number" || !parsed.items) {
    safeRemoveItem(storageKey.kitCheck(kitId));
    return {};
  }
  if (Date.now() - parsed.ts > CHECK_MAX_AGE_MS) {
    safeRemoveItem(storageKey.kitCheck(kitId));
    return {};
  }
  return parsed.items;
};

const buildPrepFromDrug = (drug: Drug | undefined) => {
  if (!drug) return null;
  return { cond: drug.cond?.[0] || null, etapes: drug.prep?.etapes || [] };
};

const isSectionLabel = (m: string) => {
  const t = m.trim();
  return t.startsWith("—") && t.endsWith("—");
};

const PrepKitCard = ({ kit }: { kit: PrepKit }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("drogues");
  const [schemaZoom, setSchemaZoom] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(() => loadChecked(kit.id));

  const showSchema = !!kit.schema || kit.id === "pa";
  const showKtcLines = kit.id === "ktc";
  const showChecklist = Array.isArray(kit.checklist) && kit.checklist.length > 0;
  const isChecklist = CHECKLIST_KIT_IDS.includes(kit.id);
  const isRearmementKit = CHECKLIST_KIT_IDS.includes(kit.id);
  const checkableCount = kit.materiel.filter((m) => !isSectionLabel(m)).length;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  useEffect(() => {
    if (!isChecklist) return;
    safeSetJson(storageKey.kitCheck(kit.id), { ts: Date.now(), items: checkedItems });
  }, [checkedItems, isChecklist, kit.id]);

  return (
    <div className={`drug-card ${open ? "drug-card-open" : ""}`}>
      <button className="drug-header" onClick={() => setOpen(!open)}>
        <div className="drug-color-bar" style={{ background: kit.couleur }} />
        <div className="drug-main">
          <div className="drug-title-row">
            <span className="drug-icon">{kit.icon}</span>
            <span className="drug-name">{kit.nom}</span>
          </div>
          <div className="drug-subtitle">
            <span className="badge badge-cat">{kit.cat}</span>
            <span className="drug-classe">
              {kit.drogues.length} médicament{kit.drogues.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <svg className={`chevron ${open ? "chevron-open" : ""}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="drug-body">
          <p className="drug-desc">{kit.desc}</p>
          <div className="tabs-row">
            <Tab active={activeTab === "drogues"} kind="tab-poso" color={kit.couleur} onClick={() => setActiveTab("drogues")} label="Médicaments" />
            {!showKtcLines && <Tab active={activeTab === "materiel"} kind="tab-info" onClick={() => setActiveTab("materiel")} label={isRearmementKit ? "Réarmement" : "Matériel"} />}
            {showChecklist && <ChecklistTab active={activeTab === "checklist"} onClick={() => setActiveTab("checklist")} />}
            {showSchema && <Tab active={activeTab === "schema"} kind="tab-poso" color={kit.couleur} onClick={() => setActiveTab("schema")} label="Schéma" />}
            {showKtcLines && <Tab active={activeTab === "lignes"} kind="tab-info" onClick={() => setActiveTab("lignes")} label="Lignes" />}
            {showKtcLines && <Tab active={activeTab === "materiel"} kind="tab-info" onClick={() => setActiveTab("materiel")} label="Réarmement" />}
            <Tab active={activeTab === "sequence"} kind="tab-neutral" onClick={() => setActiveTab("sequence")} label="Séquence" />
            {kit.notes && kit.notes.length > 0 && <Tab active={activeTab === "notes"} kind="tab-danger" onClick={() => setActiveTab("notes")} label="Notes" />}
          </div>

          <div className="tab-content">
            {activeTab === "drogues" && <DrugPreparations kit={kit} />}
            {activeTab === "materiel" && !isChecklist && <ul className="item-list">{kit.materiel.map((m, i) => <li key={i}>{m}</li>)}</ul>}
            {activeTab === "materiel" && isChecklist && (
              <MaterialChecklist kit={kit} checkedItems={checkedItems} setCheckedItems={setCheckedItems} checkedCount={checkedCount} checkableCount={checkableCount} />
            )}
            {activeTab === "checklist" && kit.checklist && kit.checklist.length > 0 && (
              <KitChecklist kitId={kit.id} titre={`Check-list — ${kit.nom}`} checklist={kit.checklist} drogues={kit.drogues} couleur={kit.couleur} />
            )}
            {activeTab === "sequence" && <ol className="prep-etapes">{kit.sequence.map((s, i) => <li key={i} className="prep-etape">{s}</li>)}</ol>}
            {activeTab === "notes" && kit.notes && <Notes notes={kit.notes} />}
            {activeTab === "schema" && kit.id === "pa" && <PaPressureSchema />}
            {activeTab === "schema" && kit.id !== "pa" && kit.schema && <SchemaView kit={kit} onZoom={() => setSchemaZoom(true)} />}
            {activeTab === "lignes" && showKtcLines && <KtcLinePlanner />}
          </div>
        </div>
      )}

      {schemaZoom && kit.schema && <SchemaLightbox kit={kit} onClose={() => setSchemaZoom(false)} />}
    </div>
  );
};

const Tab = ({ active, kind, label, onClick, color }: { active: boolean; kind: string; label: string; onClick: () => void; color?: string }) => (
  <button
    className={`tab-btn ${kind} ${active ? "tab-active" : ""}`}
    style={active && color ? { background: `${color}25`, borderColor: color, color } : undefined}
    onClick={onClick}
  >
    <span className={`dot ${kind === "tab-poso" ? "dot-poso" : kind === "tab-info" ? "dot-info" : kind === "tab-danger" ? "dot-danger" : "dot-neutral"}`} style={kind === "tab-poso" && color ? { background: color } : undefined} />
    <span className="tab-label">{label}</span>
  </button>
);

const ChecklistTab = ({ active, onClick }: { active: boolean; onClick: () => void }) => (
  <button className={`tab-btn tab-ci ${active ? "tab-active" : ""}`} onClick={onClick}>
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" className="tab-ci-icon">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
    <span className="tab-label">Check-list</span>
  </button>
);

const DrugPreparations = ({ kit }: { kit: PrepKit }) => (
  <div className="prepkit-drugs">
    {kit.drogues.map((d, i) => {
      const drug = d.drugId ? DRUG_BY_ID.get(d.drugId) : undefined;
      const fromDrug = buildPrepFromDrug(drug);
      const etapes = !d.prep && fromDrug?.etapes && fromDrug.etapes.length > 0 ? fromDrug.etapes : null;
      return (
        <div key={i} className="prepkit-drug-card" style={{ borderLeftColor: kit.couleur }}>
          <div className="prepkit-drug-name">{d.nom}</div>
          <div className="prepkit-drug-role">{d.role}</div>
          <Row label="Dose">{d.dose}</Row>
          {fromDrug?.cond && <Row label="Cond.">{fromDrug.cond}</Row>}
          {etapes ? <Row label="Prép."><ol style={{ margin: 0, paddingLeft: 16 }}>{etapes.map((step, j) => <li key={j}>{step}</li>)}</ol></Row> : d.prep ? <Row label="Prép.">{d.prep}</Row> : null}
          {d.note && <div className="prepkit-drug-note"><InfoIcon />{d.note}</div>}
        </div>
      );
    })}
  </div>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="prepkit-drug-row"><span className="prepkit-drug-label">{label}</span><span className="prepkit-drug-value">{children}</span></div>
);

const MaterialChecklist = ({ kit, checkedItems, setCheckedItems, checkedCount, checkableCount }: { kit: PrepKit; checkedItems: Record<number, boolean>; setCheckedItems: React.Dispatch<React.SetStateAction<Record<number, boolean>>>; checkedCount: number; checkableCount: number }) => (
  <div className="materiel-checklist">
    <div className="materiel-checklist-head">
      <span className="materiel-progress">{checkedCount}/{checkableCount} coché{checkedCount > 1 ? "s" : ""}</span>
      <button type="button" className="materiel-reset-btn" onClick={() => setCheckedItems({})} disabled={checkedCount === 0}>Réinitialiser</button>
    </div>
    <ul className="checklist">
      {kit.materiel.map((m, i) => {
        if (isSectionLabel(m)) return <li key={i} className="checklist-section">{m.trim().replace(/^—\s*/, "").replace(/\s*—$/, "")}</li>;
        const checked = !!checkedItems[i];
        return (
          <li key={i} className="checklist-item">
            <label className={`checklist-label ${checked ? "checklist-checked" : ""}`}>
              <input type="checkbox" checked={checked} onChange={() => setCheckedItems((prev) => ({ ...prev, [i]: !prev[i] }))} />
              <span className="checklist-box" style={checked ? { background: kit.couleur, borderColor: kit.couleur } : {}} aria-hidden="true"><CheckIcon /></span>
              <span className="checklist-text">{m}</span>
            </label>
          </li>
        );
      })}
    </ul>
  </div>
);

const Notes = ({ notes }: { notes: string[] }) => (
  <ul className="prep-notes">{notes.map((n, i) => <li key={i} className="prep-note-item"><WarningIcon />{n}</li>)}</ul>
);

const SchemaView = ({ kit, onZoom }: { kit: PrepKit; onZoom: () => void }) => {
  if (!kit.schema) return null;
  return (
    <div className="kit-schema">
      {kit.schema.intro && <p className="kit-schema-intro">{kit.schema.intro}</p>}
      <button type="button" className="kit-schema-imgbtn" onClick={onZoom} aria-label="Agrandir le schéma">
        <img src={kit.schema.img} alt={kit.schema.alt} className="kit-schema-img" />
        <span className="kit-schema-zoomhint"><ZoomIcon />Toucher pour agrandir</span>
      </button>
      <SchemaLegend kit={kit} />
      {kit.schema.source && <p className="kit-schema-source">{kit.schema.source}</p>}
    </div>
  );
};

const SchemaLegend = ({ kit }: { kit: PrepKit }) => {
  if (!kit.schema) return null;
  return (
    <div className="kit-schema-legend">
      {kit.schema.legende.map((sec, i) => (
        <div key={i} className="kit-schema-legblock"><div className="kit-schema-legtitle">{sec.titre}</div><ul className="kit-schema-leglist">{sec.items.map((it, j) => <li key={j}>{it}</li>)}</ul></div>
      ))}
    </div>
  );
};

const SchemaLightbox = ({ kit, onClose }: { kit: PrepKit; onClose: () => void }) => {
  if (!kit.schema) return null;
  return (
    <div className="kit-schema-lightbox" role="dialog" aria-modal="true" aria-label={kit.schema.alt} tabIndex={-1} onClick={onClose} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <button type="button" className="kit-schema-lbclose" aria-label="Fermer" onClick={onClose}><CloseIcon /></button>
      <div className="kit-schema-lbscroll"><img src={kit.schema.img} alt={kit.schema.alt} className="kit-schema-lbimg" /></div>
    </div>
  );
};

const CheckIcon = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>;
const InfoIcon = () => <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
const WarningIcon = () => <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const ZoomIcon = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" /></svg>;
const CloseIcon = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>;

export default PrepKitCard;
