import { useEffect, useState } from "react";
import { DRUGS } from "../data/drugs";
import KitChecklist from "./KitChecklist";
import KtcLinePlanner from "./KtcLinePlanner";
import type { Drug, PrepKit } from "../types/data";
import { safeGetJson, safeRemoveItem, safeSetJson } from "../lib/safeStorage";
import { storageKey } from "../lib/storageKeys";

const DRUG_BY_ID = new Map(DRUGS.map((drug) => [drug.id, drug]));

// Au-delà de ce délai depuis la dernière coche, la check-list repart vierge
// (évite de garder les coches d'une procédure/patient précédent entre 2 gardes).
const CHECK_MAX_AGE_MS = 3 * 60 * 60 * 1000; // 3 h
type StoredKitChecks = { ts?: number; items?: Record<number, boolean> };

const loadChecked = (kitId: string): Record<number, boolean> => {
  const parsed = safeGetJson<StoredKitChecks | null>(storageKey.kitCheck(kitId), null);
  // Ancien format (objet plat) ou expiré → on repart vierge
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
  const cond = drug.cond?.[0] || null;
  const etapes = drug.prep?.etapes || [];
  return { cond, etapes };
};

const isSectionLabel = (m: string) => {
  const t = m.trim();
  return t.startsWith("—") && t.endsWith("—");
};

// Kits dont le matériel s'affiche en check-list cochable (gestes invasifs)
const CHECKLIST_KIT_IDS = ["drain-thoracique", "pa", "ktc"];

const PrepKitCard = ({ kit }: { kit: PrepKit }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("drogues");
  const [schemaZoom, setSchemaZoom] = useState(false);

  // Onglet « Schéma » : affiché dès que le kit fournit une image de
  // schéma (kit.schema). Public depuis v99 (validé).
  const showSchema = !!kit.schema;
  const showKtcLines = kit.id === "ktc";
  // Onglet « Check-list » : affiché si le kit fournit une check-list
  // interactive (kit.checklist) — ex : check-list intubation du kit ISR.
  const showChecklist = Array.isArray(kit.checklist) && kit.checklist.length > 0;
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(() =>
    loadChecked(kit.id)
  );

  const isChecklist = CHECKLIST_KIT_IDS.includes(kit.id);
  const isRearmementKit = CHECKLIST_KIT_IDS.includes(kit.id);

  useEffect(() => {
    if (!isChecklist) return;
    safeSetJson(storageKey.kitCheck(kit.id), { ts: Date.now(), items: checkedItems });
  }, [checkedItems, isChecklist, kit.id]);
  const checkableCount = kit.materiel.filter((m: string) => !isSectionLabel(m)).length;
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

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
        <svg
          className={`chevron ${open ? "chevron-open" : ""}`}
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="drug-body">
          <p className="drug-desc">{kit.desc}</p>

          <div className="tabs-row">
            <button
              className={`tab-btn tab-poso ${activeTab === "drogues" ? "tab-active" : ""}`}
              style={
                activeTab === "drogues"
                  ? { background: kit.couleur + "25", borderColor: kit.couleur, color: kit.couleur }
                  : {}
              }
              onClick={() => setActiveTab("drogues")}
            >
              <span className="dot dot-poso" style={{ background: kit.couleur }} />
              <span className="tab-label">Médicaments</span>
            </button>
            {!showKtcLines && (
              <button
                className={`tab-btn tab-info ${activeTab === "materiel" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("materiel")}
              >
                <span className="dot dot-info" />
                <span className="tab-label">{isRearmementKit ? "Réarmement" : "Matériel"}</span>
              </button>
            )}
            {showChecklist && (
              <button
                className={`tab-btn tab-ci ${activeTab === "checklist" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("checklist")}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="tab-ci-icon"
                >
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <span className="tab-label">Check-list</span>
              </button>
            )}
            {showSchema && (
              <button
                className={`tab-btn tab-poso ${activeTab === "schema" ? "tab-active" : ""}`}
                style={
                  activeTab === "schema"
                    ? {
                        background: kit.couleur + "25",
                        borderColor: kit.couleur,
                        color: kit.couleur,
                      }
                    : {}
                }
                onClick={() => setActiveTab("schema")}
              >
                <span className="dot dot-poso" style={{ background: kit.couleur }} />
                <span className="tab-label">Schéma</span>
              </button>
            )}
            {showKtcLines && (
              <button
                className={`tab-btn tab-info ${activeTab === "lignes" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("lignes")}
              >
                <span className="dot dot-info" />
                <span className="tab-label">Lignes</span>
              </button>
            )}
            {showKtcLines && (
              <button
                className={`tab-btn tab-info ${activeTab === "materiel" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("materiel")}
              >
                <span className="dot dot-info" />
                <span className="tab-label">Réarmement</span>
              </button>
            )}
            <button
              className={`tab-btn tab-neutral ${activeTab === "sequence" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("sequence")}
            >
              <span className="dot dot-neutral" />
              <span className="tab-label">Séquence</span>
            </button>
            {kit.notes && kit.notes.length > 0 && (
              <button
                className={`tab-btn tab-danger ${activeTab === "notes" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("notes")}
              >
                <span className="dot dot-danger" />
                <span className="tab-label">Notes</span>
              </button>
            )}
          </div>

          <div className="tab-content">
            {activeTab === "drogues" && (
              <div className="prepkit-drugs">
                {kit.drogues.map((d, i: number) => {
                  const drug = d.drugId ? DRUG_BY_ID.get(d.drugId) : undefined;
                  const fromDrug = buildPrepFromDrug(drug);
                  const condText = fromDrug?.cond || null;
                  // Si le kit fournit sa propre prep, elle prime sur les etapes du drug
                  // (sinon on affiche toutes les indications, ex : ACR + Anaphylaxie + PSE pour Adrénaline)
                  const kitPrep = d.prep || null;
                  const etapes =
                    !kitPrep && fromDrug?.etapes && fromDrug.etapes.length > 0
                      ? fromDrug.etapes
                      : null;
                  const fallbackPrep = kitPrep;
                  return (
                    <div
                      key={i}
                      className="prepkit-drug-card"
                      style={{ borderLeftColor: kit.couleur }}
                    >
                      <div className="prepkit-drug-name">{d.nom}</div>
                      <div className="prepkit-drug-role">{d.role}</div>
                      <div className="prepkit-drug-row">
                        <span className="prepkit-drug-label">Dose</span>
                        <span className="prepkit-drug-value">{d.dose}</span>
                      </div>
                      {condText && (
                        <div className="prepkit-drug-row">
                          <span className="prepkit-drug-label">Cond.</span>
                          <span className="prepkit-drug-value">{condText}</span>
                        </div>
                      )}
                      {etapes ? (
                        <div className="prepkit-drug-row">
                          <span className="prepkit-drug-label">Prép.</span>
                          <span className="prepkit-drug-value">
                            <ol style={{ margin: 0, paddingLeft: 16 }}>
                              {etapes.map((step: string, j: number) => (
                                <li key={j}>{step}</li>
                              ))}
                            </ol>
                          </span>
                        </div>
                      ) : fallbackPrep ? (
                        <div className="prepkit-drug-row">
                          <span className="prepkit-drug-label">Prép.</span>
                          <span className="prepkit-drug-value">{fallbackPrep}</span>
                        </div>
                      ) : null}
                      {d.note && (
                        <div className="prepkit-drug-note">
                          <svg
                            viewBox="0 0 24 24"
                            width="11"
                            height="11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {d.note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "materiel" && !isChecklist && (
              <ul className="item-list">
                {kit.materiel.map((m: string, i: number) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}

            {activeTab === "materiel" && isChecklist && (
              <div className="materiel-checklist">
                <div className="materiel-checklist-head">
                  <span className="materiel-progress">
                    {checkedCount}/{checkableCount} coché{checkedCount > 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    className="materiel-reset-btn"
                    onClick={() => setCheckedItems({})}
                    disabled={checkedCount === 0}
                  >
                    Réinitialiser
                  </button>
                </div>
                <ul className="checklist">
                  {kit.materiel.map((m: string, i: number) => {
                    if (isSectionLabel(m)) {
                      return (
                        <li key={i} className="checklist-section">
                          {m.trim().replace(/^—\s*/, "").replace(/\s*—$/, "")}
                        </li>
                      );
                    }
                    const checked = !!checkedItems[i];
                    return (
                      <li key={i} className="checklist-item">
                        <label className={`checklist-label ${checked ? "checklist-checked" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setCheckedItems((prev) => ({ ...prev, [i]: !prev[i] }))}
                          />
                          <span
                            className="checklist-box"
                            style={
                              checked ? { background: kit.couleur, borderColor: kit.couleur } : {}
                            }
                            aria-hidden="true"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="13"
                              height="13"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span className="checklist-text">{m}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {activeTab === "checklist" && kit.checklist && kit.checklist.length > 0 && (
              <KitChecklist
                kitId={kit.id}
                titre={`Check-list — ${kit.nom}`}
                checklist={kit.checklist}
                drogues={kit.drogues}
                couleur={kit.couleur}
              />
            )}

            {activeTab === "sequence" && (
              <ol className="prep-etapes">
                {kit.sequence.map((s: string, i: number) => (
                  <li key={i} className="prep-etape">
                    {s}
                  </li>
                ))}
              </ol>
            )}

            {activeTab === "notes" && kit.notes && (
              <ul className="prep-notes">
                {kit.notes.map((n: string, i: number) => (
                  <li key={i} className="prep-note-item">
                    <svg
                      viewBox="0 0 24 24"
                      width="11"
                      height="11"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    {n}
                  </li>
                ))}
              </ul>
            )}

            {activeTab === "schema" && kit.schema && (
              <div className="kit-schema">
                {kit.schema.intro && <p className="kit-schema-intro">{kit.schema.intro}</p>}
                <button
                  type="button"
                  className="kit-schema-imgbtn"
                  onClick={() => setSchemaZoom(true)}
                  aria-label="Agrandir le schéma"
                >
                  <img src={kit.schema.img} alt={kit.schema.alt} className="kit-schema-img" />
                  <span className="kit-schema-zoomhint">
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
                    </svg>
                    Toucher pour agrandir
                  </span>
                </button>

                <div className="kit-schema-legend">
                  {kit.schema.legende.map((sec, i) => (
                    <div key={i} className="kit-schema-legblock">
                      <div className="kit-schema-legtitle">{sec.titre}</div>
                      <ul className="kit-schema-leglist">
                        {sec.items.map((it, j) => (
                          <li key={j}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {kit.schema.source && <p className="kit-schema-source">{kit.schema.source}</p>}
              </div>
            )}

            {activeTab === "lignes" && showKtcLines && <KtcLinePlanner />}
          </div>
        </div>
      )}

      {schemaZoom && kit.schema && (
        <div
          className="kit-schema-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={kit.schema.alt}
          tabIndex={-1}
          onClick={() => setSchemaZoom(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSchemaZoom(false);
          }}
        >
          <button
            type="button"
            className="kit-schema-lbclose"
            aria-label="Fermer"
            onClick={() => setSchemaZoom(false)}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="kit-schema-lbscroll">
            <img src={kit.schema.img} alt={kit.schema.alt} className="kit-schema-lbimg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PrepKitCard;
