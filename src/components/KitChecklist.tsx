import { useEffect, useId, useRef, useState } from "react";
import KitScaleIllustration from "./KitScaleIllustration";
import { safeGetJson, safeRemoveItem, safeSetJson } from "../lib/safeStorage";
import type { ChecklistItem, ChecklistSection } from "../types/data";

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

type Drogue = { nom: string; role?: string };

type Values = Record<string, boolean | string>;
type StoredValues = { ts: number; values: Values };

// Un item est « complété » selon son type : case cochée, choix sélectionné,
// ou champ texte non vide. Une section est complète quand TOUS ses items le
// sont (y compris les champs à saisir).
const itemDone = (item: ChecklistItem, vals: Values, key: string): boolean => {
  const v = vals[key];
  if (item.type === "check") return v === true;
  return typeof v === "string" && v.trim() !== "";
};

const computeSectionProgress = (
  checklist: ChecklistSection[],
  vals: Values
): { total: number; done: number }[] =>
  checklist.map((section, si) => {
    let done = 0;
    section.items.forEach((item, ii) => {
      if (itemDone(item, vals, `${si}-${ii}`)) done++;
    });
    return { total: section.items.length, done };
  });

const computeSectionDone = (checklist: ChecklistSection[], vals: Values): boolean[] =>
  computeSectionProgress(checklist, vals).map((s) => s.total > 0 && s.done === s.total);

const collapsedFromDone = (done: boolean[]): Set<number> =>
  new Set(done.flatMap((d, i) => (d ? [i] : [])));

const loadValues = (kitId: string): Values => {
  const parsed = safeGetJson<StoredValues | null>(storageKey(kitId), null);
  if (!parsed || typeof parsed.ts !== "number" || !parsed.values) {
    safeRemoveItem(storageKey(kitId));
    return {};
  }
  if (Date.now() - parsed.ts > CHECK_MAX_AGE_MS) {
    safeRemoveItem(storageKey(kitId));
    return {};
  }
  return parsed.values;
};

type Props = {
  kitId: string;
  titre: string;
  checklist: ChecklistSection[];
  couleur: string;
  drogues?: Drogue[];
};

const KitChecklist = ({ kitId, titre, checklist, couleur, drogues = [] }: Props) => {
  const sectionIdPrefix = useId();
  // Options d'un menu déroulant : soit explicites (`options`), soit dérivées
  // des drogues du kit dont le rôle contient le mot-clé `from` (ex : tous les
  // « Hypnotique … » / « Curare … » du kit). Sufentanil (« Morphinique ») est
  // donc exclu du déroulant hypnotique/curare.
  const selectOptions = (item: ChecklistItem): string[] => {
    if (item.type !== "select") return [];
    if (item.options?.length) return item.options;
    if (item.from) {
      return drogues.filter((d) => d.role?.includes(item.from as string)).map((d) => d.nom);
    }
    return [];
  };
  const [values, setValues] = useState<Values>(() => loadValues(kitId));

  // Sections repliées. À l'ouverture, les sections déjà complètes (valeurs
  // persistées) démarrent repliées pour réduire le scroll. Ensuite, une
  // section se replie automatiquement quand elle passe à « complète » ;
  // l'utilisateur peut toujours la déplier/replier manuellement.
  const [collapsed, setCollapsed] = useState<Set<number>>(() =>
    collapsedFromDone(computeSectionDone(checklist, values))
  );
  const prevDone = useRef<boolean[]>(computeSectionDone(checklist, values));
  // Section dont un champ texte est en cours de saisie (focus). On NE replie
  // pas cette section tant qu'elle a le focus : sinon, dès la 1ʳᵉ lettre du
  // dernier champ, la section deviendrait complète et se replierait en plein
  // milieu de la frappe (l'input disparaîtrait). Le repli se fait au blur.
  const focusedSection = useRef<number | null>(null);

  useEffect(() => {
    safeSetJson(storageKey(kitId), { ts: Date.now(), values });
  }, [values, kitId]);

  // Auto-repli sur la transition incomplète → complète (uniquement à ce
  // moment-là, pour ne pas re-replier une section que l'utilisateur a
  // rouverte pour la relire). On capture l'état précédent dans une variable
  // locale AVANT de réassigner la ref : l'updater de setCollapsed s'exécute
  // en phase de rendu (différée), donc lire prevDone.current dedans
  // renverrait déjà la nouvelle valeur (race) → aucun repli.
  useEffect(() => {
    const done = computeSectionDone(checklist, values);
    const prev = prevDone.current;
    prevDone.current = done;
    setCollapsed((prevCollapsed) => {
      let next = prevCollapsed;
      done.forEach((d, si) => {
        // Skip la section en cours de saisie → repli reporté au blur.
        if (d && !prev[si] && !next.has(si) && focusedSection.current !== si) {
          if (next === prevCollapsed) next = new Set(prevCollapsed);
          next.add(si);
        }
      });
      return next;
    });
  }, [values, checklist]);

  // Quand un champ texte perd le focus : si sa section est complète, on la
  // replie (le repli avait été reporté pendant la saisie).
  const handleFieldBlur = (si: number) => {
    if (focusedSection.current === si) focusedSection.current = null;
    const done = computeSectionDone(checklist, values);
    if (done[si]) {
      setCollapsed((prev) => (prev.has(si) ? prev : new Set(prev).add(si)));
    }
  };

  const toggleCollapse = (si: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(si)) next.delete(si);
      else next.add(si);
      return next;
    });

  // Valeur lisible d'un item pour l'export (mail / impression).
  const itemValue = (item: ChecklistItem, key: string): string => {
    const v = values[key];
    if (item.type === "check") return v === true ? "OUI" : "—";
    if (item.type === "choice" || item.type === "select") return v ? String(v) : "—";
    const txt = (v as string) || "";
    if (!txt) return "—";
    return item.unit ? `${txt} ${item.unit}` : txt;
  };

  // Représentation texte (mail) : sections + items avec leur état.
  const buildText = (): string => {
    const lines: string[] = [];
    const now = new Date().toLocaleString("fr-FR");
    lines.push(`${titre}`);
    lines.push(`Édité le ${now}`);
    checklist.forEach((section, si) => {
      lines.push("");
      lines.push(`== ${section.titre.toUpperCase()} ==`);
      section.items.forEach((item, ii) => {
        const key = `${si}-${ii}`;
        if (item.type === "check") {
          lines.push(`[${values[key] === true ? "X" : " "}] ${item.label}`);
        } else {
          lines.push(`${item.label} : ${itemValue(item, key)}`);
        }
      });
    });
    lines.push("");
    lines.push("— Édité depuis MediURG. Outil d'aide : ne remplace pas la prescription.");
    return lines.join("\n");
  };

  const onEmail = () => {
    const subject = encodeURIComponent(titre);
    const body = encodeURIComponent(buildText());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const onPrint = () => {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const now = new Date().toLocaleString("fr-FR");
    let body = `<h1>${esc(titre)}</h1><p class="date">Édité le ${esc(now)}</p>`;
    checklist.forEach((section, si) => {
      body += `<h2>${esc(section.titre)}</h2><ul>`;
      section.items.forEach((item, ii) => {
        const key = `${si}-${ii}`;
        if (item.type === "check") {
          const checked = values[key] === true;
          body += `<li class="chk"><span class="box">${checked ? "&#10003;" : ""}</span>${esc(item.label)}</li>`;
        } else {
          body += `<li class="fld"><strong>${esc(item.label)} :</strong> ${esc(itemValue(item, key))}</li>`;
        }
      });
      body += `</ul>`;
    });
    body += `<p class="foot">Édité depuis MediURG — outil d'aide, ne remplace pas la prescription. La prescription officielle prévaut.</p>`;

    const doc =
      `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(titre)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #111; margin: 24px; line-height: 1.4; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .date { font-size: 12px; color: #555; margin: 0 0 14px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #333; border-bottom: 1px solid #999; padding-bottom: 3px; margin: 16px 0 6px; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { font-size: 13px; padding: 3px 0; break-inside: avoid; }
  li.chk { display: flex; align-items: flex-start; gap: 8px; }
  .box { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 15px; height: 15px; border: 1.5px solid #333; border-radius: 3px; font-size: 12px; line-height: 1; margin-top: 1px; }
  li.fld strong { color: #333; }
  .foot { margin-top: 20px; font-size: 10px; color: #777; font-style: italic; border-top: 1px solid #ccc; padding-top: 8px; }
  @media print { body { margin: 12mm; } }
</style></head><body>${body}<script>window.onload=function(){window.print();}</scr` +
      `ipt></body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(doc);
    w.document.close();
  };

  // Progression = tous les items complétés (coches + choix + champs saisis),
  // par section pour l'indicateur local + l'auto-repli.
  const sectionChecks = computeSectionProgress(checklist, values);
  const checkTotal = sectionChecks.reduce((s, c) => s + c.total, 0);
  const checkDone = sectionChecks.reduce((s, c) => s + c.done, 0);
  const pct = checkTotal ? Math.round((checkDone / checkTotal) * 100) : 0;
  const allDone = checkTotal > 0 && checkDone === checkTotal;

  const hasAnyValue = Object.values(values).some((v) => v === true || (typeof v === "string" && v));

  const handleReset = () => {
    if (!hasAnyValue) return;
    if (window.confirm("Réinitialiser toute la check-list (coches + saisies) ?")) {
      setValues({});
      setCollapsed(new Set());
    }
  };

  return (
    <div className="materiel-checklist kit-checklist">
      <div className="materiel-checklist-head">
        <span className={`materiel-progress ${allDone ? "kit-checklist-alldone" : ""}`}>
          {allDone && (
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {checkDone}/{checkTotal} complété{checkDone > 1 ? "s" : ""}
        </span>
        <div className="kit-checklist-actions">
          <button
            type="button"
            className="materiel-reset-btn kit-checklist-act"
            onClick={onPrint}
            title="Imprimer la check-list"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Imprimer
          </button>
          <button
            type="button"
            className="materiel-reset-btn kit-checklist-act"
            onClick={onEmail}
            title="Envoyer la check-list par mail"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 6L2 7" />
            </svg>
            Mail
          </button>
          <button
            type="button"
            className="materiel-reset-btn"
            onClick={handleReset}
            disabled={!hasAnyValue}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <div
        className="kit-checklist-progressbar"
        role="progressbar"
        aria-label={`Progression ${titre}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className="kit-checklist-progressfill"
          style={{ width: `${pct}%`, background: allDone ? "var(--success)" : couleur }}
        />
      </div>

      {checklist.map((section, si) => {
        const sec = sectionChecks[si];
        const secDone = sec.total > 0 && sec.done === sec.total;
        const isCollapsed = collapsed.has(si);
        const contentId = `${sectionIdPrefix}-section-${si}`;
        return (
          <div key={si} className="kit-checklist-section">
            <button
              type="button"
              className={`checklist-section kit-checklist-sechead ${secDone ? "kit-checklist-sec-done" : ""}`}
              onClick={() => toggleCollapse(si)}
              aria-expanded={!isCollapsed}
              aria-controls={contentId}
            >
              <span className="kit-checklist-sectitle">
                <svg
                  className={`kit-checklist-chevron ${isCollapsed ? "" : "kit-checklist-chevron-open"}`}
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {section.titre}
              </span>
              {sec.total > 0 && (
                <span className="kit-checklist-secbadge">
                  {secDone && (
                    <svg
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {sec.done}/{sec.total}
                </span>
              )}
            </button>
            {!isCollapsed && (
              <ul id={contentId} className="checklist">
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
                        <div
                          className="kit-checklist-chips"
                          role="radiogroup"
                          aria-label={item.label}
                        >
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
                                onClick={() =>
                                  setValues((p) => ({ ...p, [key]: active ? "" : opt }))
                                }
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {item.scale && (
                          <KitScaleIllustration
                            scale={item.scale}
                            selected={selected}
                            couleur={couleur}
                          />
                        )}
                      </li>
                    );
                  }
                  if (item.type === "select") {
                    const selected = (values[key] as string) || "";
                    const opts = selectOptions(item);
                    return (
                      <li key={ii} className="kit-checklist-field">
                        <span className="kit-checklist-flabel">{item.label}</span>
                        <select
                          className="kit-checklist-select"
                          value={selected}
                          aria-label={item.label}
                          onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                        >
                          <option value="">— choisir —</option>
                          {opts.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
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
                          aria-label={item.label}
                          value={(values[key] as string) || ""}
                          onFocus={() => {
                            focusedSection.current = si;
                          }}
                          onBlur={() => handleFieldBlur(si)}
                          onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                        />
                        {item.unit && <span className="kit-checklist-unit">{item.unit}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KitChecklist;
