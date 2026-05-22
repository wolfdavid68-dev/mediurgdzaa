import { useEffect, useState } from "react";

// Check-list interactive d'un kit (ex : ISR / intubation). Trois types
// d'items : `check` (case à cocher), `choice` (options exclusives en chips),
// `text` (saisie libre, unité optionnelle). L'état est persisté localement
// par kit, avec auto-expiration ~3 h (comme la check-list matériel) pour ne
// pas traîner les valeurs d'un patient/garde précédent.
//
// Clé localStorage dédiée (mediurg-kit-checklist-{kitId}) — distincte de la
// check-list matériel (mediurg-kit-check-{kitId}) pour éviter toute collision.

const CHECK_MAX_AGE_MS = 3 * 60 * 60 * 1000; // 3 h
const storageKey = (kitId: string) => `mediurg-kit-checklist-${kitId}`;

type ChecklistItem =
  | { type: "check"; label: string }
  | { type: "choice"; label: string; options: string[] }
  | { type: "text"; label: string; placeholder?: string; unit?: string };

type ChecklistSection = { titre: string; items: ChecklistItem[] };

type Values = Record<string, boolean | string>;

const loadValues = (kitId: string): Values => {
  try {
    const raw = localStorage.getItem(storageKey(kitId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== "number" || !parsed.values) {
      localStorage.removeItem(storageKey(kitId));
      return {};
    }
    if (Date.now() - parsed.ts > CHECK_MAX_AGE_MS) {
      localStorage.removeItem(storageKey(kitId));
      return {};
    }
    return parsed.values;
  } catch {
    return {};
  }
};

type Props = {
  kitId: string;
  checklist: ChecklistSection[];
  couleur: string;
};

const KitChecklist = ({ kitId, checklist, couleur }: Props) => {
  const [values, setValues] = useState<Values>(() => loadValues(kitId));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(kitId), JSON.stringify({ ts: Date.now(), values }));
    } catch {
      /* quota / navigation privée : on ignore, la session reste utilisable */
    }
  }, [values, kitId]);

  // Progression = uniquement les cases à cocher (les saisies/choix ne comptent
  // pas, comme la check-list matériel qui ne compte que les coches).
  let checkTotal = 0;
  let checkDone = 0;
  checklist.forEach((section, si) =>
    section.items.forEach((item, ii) => {
      if (item.type === "check") {
        checkTotal++;
        if (values[`${si}-${ii}`] === true) checkDone++;
      }
    })
  );

  const hasAnyValue = Object.values(values).some((v) => v === true || (typeof v === "string" && v));

  return (
    <div className="materiel-checklist kit-checklist">
      <div className="materiel-checklist-head">
        <span className="materiel-progress">
          {checkDone}/{checkTotal} coché{checkDone > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          className="materiel-reset-btn"
          onClick={() => setValues({})}
          disabled={!hasAnyValue}
        >
          Réinitialiser
        </button>
      </div>

      {checklist.map((section, si) => (
        <div key={si} className="kit-checklist-section">
          <div className="checklist-section">{section.titre}</div>
          <ul className="checklist">
            {section.items.map((item, ii) => {
              const key = `${si}-${ii}`;
              if (item.type === "check") {
                const checked = values[key] === true;
                return (
                  <li key={ii} className="checklist-item">
                    <label className={`checklist-label ${checked ? "checklist-checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setValues((p) => ({ ...p, [key]: !p[key] }))}
                      />
                      <span
                        className="checklist-box"
                        style={checked ? { background: couleur, borderColor: couleur } : {}}
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
                      <span className="checklist-text">{item.label}</span>
                    </label>
                  </li>
                );
              }
              if (item.type === "choice") {
                const selected = (values[key] as string) || "";
                return (
                  <li key={ii} className="kit-checklist-field">
                    <span className="kit-checklist-flabel">{item.label}</span>
                    <div className="kit-checklist-chips" role="radiogroup" aria-label={item.label}>
                      {item.options.map((opt) => {
                        const active = selected === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            className={`kit-checklist-chip ${active ? "kit-checklist-chip-active" : ""}`}
                            style={active ? { background: couleur, borderColor: couleur } : {}}
                            onClick={() => setValues((p) => ({ ...p, [key]: active ? "" : opt }))}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              }
              // text
              return (
                <li key={ii} className="kit-checklist-field">
                  <span className="kit-checklist-flabel">{item.label}</span>
                  <span className="kit-checklist-input-wrap">
                    <input
                      className="kit-checklist-input"
                      type="text"
                      inputMode={item.unit ? "decimal" : "text"}
                      placeholder={item.placeholder || ""}
                      value={(values[key] as string) || ""}
                      onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                    />
                    {item.unit && <span className="kit-checklist-unit">{item.unit}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default KitChecklist;
