import { useEffect, useId, useRef, useState } from "react";
import KitScaleIllustration from "./KitScaleIllustration";
import { safeGetJson, safeRemoveItem, safeSetJson } from "../lib/safeStorage";
import { storageKey } from "../lib/storageKeys";
import type { ChecklistItem, ChecklistSection } from "../types/data";

// Check-list interactive d'un kit (ex : ISR / intubation). Types d'items :
// `check` (case à cocher), `choice` (chips mono-sélection), `multicheck`
// (chips multi-sélection), `text` (saisie libre, unité optionnelle).
// L'état est persisté localement
// par kit, avec auto-expiration ~3 h (comme la check-list matériel) pour ne
// pas traîner les valeurs d'un patient/garde précédent.
//
// Clé localStorage dédiée (mediurg-kit-checklist-{kitId}) — distincte de la
// check-list matériel (mediurg-kit-check-{kitId}) pour éviter toute collision.

const CHECK_MAX_AGE_MS = 3 * 60 * 60 * 1000; // 3 h

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
  const parsed = safeGetJson<StoredValues | null>(storageKey.kitChecklist(kitId), null);
  if (!parsed || typeof parsed.ts !== "number" || !parsed.values) {
    safeRemoveItem(storageKey.kitChecklist(kitId));
    return {};
  }
  if (Date.now() - parsed.ts > CHECK_MAX_AGE_MS) {
    safeRemoveItem(storageKey.kitChecklist(kitId));
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

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const buildSedationProcedurePrintDoc = (values: Values): string => {
  const now = new Date().toLocaleString("fr-FR");
  const value = (key: string) => {
    const v = values[key];
    return typeof v === "string" && v.trim() ? v.trim() : "";
  };
  const checked = (key: string) => values[key] === true;
  const yesNo = (isYes: boolean) =>
    `<span class="yn">Oui <span class="box">${isYes ? "✓" : ""}</span> Non <span class="box"></span></span>`;
  const field = (text: string, fallback = "") =>
    `<span class="field">${esc(text || fallback)}${text ? "" : "&nbsp;"}</span>`;
  const multiYes = (...keys: string[]) => keys.every((key) => checked(key));
  const anyYes = (...keys: string[]) => keys.some((key) => checked(key));

  const procedure = value("5-2") || "Kétofol : Kétamine puis Propofol";
  const ketamineDose = value("5-3");
  const propofolDose = value("5-4");
  const propofolReserve = value("5-5");

  return (
    `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Checklist Kétofol aux urgences</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.22; background: #f2f2f2; }
  .sheet { width: 194mm; min-height: 281mm; margin: 0 auto; padding: 0; display: flex; flex-direction: column; background: #fff; }
  .doc-header { display: grid; grid-template-columns: 1fr 58mm; gap: 0; border: 1.2px solid #111; border-bottom: 0; }
  .top-left { padding: 4mm 5mm 3.5mm; }
  .ref { font-size: 7.5px; color: #333; margin: 0 0 2.5mm; white-space: nowrap; text-transform: uppercase; letter-spacing: .03em; }
  h1 { font-size: 19px; line-height: 1.05; margin: 0; font-weight: 700; }
  .subtitle { margin-top: 2mm; font-size: 9px; color: #333; }
  .patient-wrap { border-left: 1.2px solid #111; padding: 3mm; }
  .patient { height: 25mm; border: 1.4px solid #111; display: flex; align-items: flex-start; justify-content: center; padding-top: 3mm; font-size: 9px; font-weight: 700; background: #fff; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.8px; line-height: 1.14; border: 1.2px solid #111; }
  td, th { border: 0.8px solid #333; padding: 2.5px 4px; vertical-align: middle; }
  .left { width: 30%; text-align: left; font-weight: 700; background: #f0f0f0; }
  .mid { width: 34%; text-align: left; }
  .right { width: 36%; text-align: left; }
  .head { background: #dcdcdc; font-weight: 700; text-align: center; border-top: 1.2px solid #111; border-bottom: 1.2px solid #111; }
  .sub { display: block; border-top: 1px solid #777; margin-top: 2px; padding-top: 2px; }
  .small { font-size: 8px; }
  .italic { font-style: italic; }
  .yn { white-space: nowrap; float: right; margin-left: 4px; }
  .box { display: inline-flex; width: 9px; height: 9px; border: 1px solid #111; align-items: center; justify-content: center; font-size: 8px; line-height: 1; margin: 0 2px; vertical-align: -1px; }
  .field { display: inline-block; min-width: 20mm; border-bottom: 1px solid #111; padding: 0 2px 1px; min-height: 9px; }
  .wide { min-width: 44mm; }
  .line { display: flex; justify-content: space-between; gap: 3mm; margin: 1px 0; }
  .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin-top: 5mm; font-size: 9.5px; }
  .sign { min-height: 23mm; border: 1.1px solid #111; padding: 3mm; }
  .sign-title { margin: -3mm -3mm 3mm; padding: 1.5mm 3mm; font-weight: 700; background: #eeeeee; border-bottom: 1px solid #111; }
  .sign-line { display: grid; grid-template-columns: 18mm 1fr; gap: 3mm; align-items: end; margin-top: 4mm; }
  .sign-fill { border-bottom: 1px solid #111; height: 5mm; }
  .opposable { margin-top: auto; padding-top: 4mm; text-align: center; font-size: 8px; font-style: italic; font-weight: 700; }
  @media screen { body { padding: 10mm 0; } .sheet { box-shadow: 0 0 0 1px #d0d0d0, 0 8px 28px rgba(0,0,0,.18); } }
  @media print { body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .sheet { width: 100%; min-height: auto; box-shadow: none; } }
</style></head><body><main class="sheet">
  <div class="doc-header">
    <div class="top-left">
      <div class="ref">MediURG · Sédation procédurale · Édité le ${esc(now)}</div>
      <h1>Checklist Kétofol aux urgences</h1>
      <div class="subtitle">Kétamine puis Propofol · Surveillance scopée et capnographie · Document de traçabilité terrain</div>
    </div>
    <div class="patient-wrap">
      <div class="patient">Étiquette du patient</div>
    </div>
  </div>
  <table aria-label="Checklist Kétofol aux urgences">
    <tr>
      <td class="head" colspan="2">Identification d'un patient nécessitant une sédation procédurale</td>
      <td class="head">Procédure Kétofol pour : ${field(value("0-0"), "")}</td>
    </tr>
    <tr>
      <td class="left">Transfert en box de SAUV ou de zone tiède</td>
      <td class="mid"></td>
      <td class="right">${yesNo(checked("0-2"))}</td>
    </tr>
    <tr>
      <td class="left">Personnel nécessaire</td>
      <td class="mid">1 médecin urgentiste sénior<br />+ 1 IDE formée à la SAUV</td>
      <td class="right">${yesNo(multiYes("1-0", "1-1"))}</td>
    </tr>
    <tr>
      <td class="left">Mise en place d'une ou deux VVP de bon calibre</td>
      <td class="mid">18G – 20G minimum</td>
      <td class="right">Nombre : ${field(value("1-2"), "1 ou 2")} ${yesNo(checked("1-3"))}</td>
    </tr>
    <tr>
      <td class="left">Surveillance scopée obligatoire</td>
      <td class="mid">FC et PA<br />SpO₂, FR et capnographie</td>
      <td class="right">
        <strong>Paramètres initiaux :</strong><br />
        <span class="line">FC ${field(value("2-2"))} bpm <span>PA ${field(value("2-3"))} mmHg</span></span>
        <span class="line">SpO₂ ${field(value("2-4"))} % <span>FR ${field(value("2-5"))} /min</span></span>
        EtCO₂ ${field(value("2-6"))} mmHg ${yesNo(multiYes("2-0", "2-1"))}
      </td>
    </tr>
    <tr>
      <td class="left">Poids exact du patient</td>
      <td class="mid">Objectif : posologies adaptées</td>
      <td class="right">Poids : ${field(value("0-1"))} kg</td>
    </tr>
    <tr>
      <td class="left">Explication au patient de la prise en charge</td>
      <td class="mid">Bénéfice(s)<br />Risque(s)</td>
      <td class="right">${yesNo(multiYes("3-0", "3-1"))}</td>
    </tr>
    <tr>
      <td class="left">Absence de contre-indication(s) au(x) médicament(s) choisi(s)</td>
      <td class="mid">Allergie, traitement à risque ou terrain particulier</td>
      <td class="right">${yesNo(checked("3-2"))}<br />${field(value("3-3"), " ")}</td>
    </tr>
    <tr>
      <td class="left" rowspan="4">Disponibilité à proximité immédiate du matériel nécessaire à la gestion des principales complications</td>
      <td class="mid">Vomissements : haricots, antiémétique, aspiration</td>
      <td class="right">${yesNo(checked("4-0"))}</td>
    </tr>
    <tr>
      <td class="mid">Voies aériennes supérieures : Guedel, BAVU, IOT</td>
      <td class="right">${yesNo(checked("4-1"))}</td>
    </tr>
    <tr>
      <td class="mid">Mauvaise tolérance hémodynamique : remplissage</td>
      <td class="right">${yesNo(checked("4-2"))}</td>
    </tr>
    <tr>
      <td class="mid">Aspiration fonctionnelle et matériel d'intubation disponibles</td>
      <td class="right">${yesNo(multiYes("4-3", "4-4"))}</td>
    </tr>
    <tr>
      <td class="left">Pré-oxygénation du patient</td>
      <td class="mid">Permet d'éviter la désaturation en cas d'apnée</td>
      <td class="right">${yesNo(checked("5-0"))}</td>
    </tr>
    <tr>
      <td class="left">Choix de la thérapeutique médicamenteuse souhaitée</td>
      <td class="mid">Besoins ?<br />Histoire clinique ?<br />Antécédents ?</td>
      <td class="right">
        <strong>Thérapeutique(s) administrée(s) :</strong><br />
        ${field(procedure, "Kétofol : Kétamine puis Propofol")}<br />
        Kétamine : ${field(ketamineDose)} mg &nbsp; Propofol : ${field(propofolDose)} mg<br />
        Réserve Propofol : ${field(propofolReserve)} mg
        <span class="sub small">Critères : ${esc(value("5-1") || " ")}</span>
      </td>
    </tr>
    <tr>
      <td class="left" rowspan="2">Administration du sédatif pour obtention d'une sédation suffisante</td>
      <td class="mid">Objectif score de RASS -3 ou -4<br />et/ou score de Ramsay 4 ou 5</td>
      <td class="right">Score au moment de l'acte : ${field(value("6-1"))}<br />Objectif : ${field(value("6-0"))}</td>
    </tr>
    <tr>
      <td class="mid italic">Si besoin pour arriver à cet objectif : bolus supplémentaire si les paramètres hémodynamiques et respiratoires le permettent</td>
      <td class="right">${yesNo(checked("6-2"))}<br />Thérapeutique et posologie : ${field(value("6-3"), " ")}</td>
    </tr>
    <tr>
      <td class="left">Réalisation de l'acte nécessitant la sédation procédurale</td>
      <td class="mid"></td>
      <td class="right">${yesNo(checked("7-0"))}</td>
    </tr>
    <tr>
      <td class="left">Gestion des complications</td>
      <td class="mid">Doivent toutes être connues et maîtrisées par le médecin qui les utilise.</td>
      <td class="right">
        Événement(s) indésirable(s) : ${yesNo(Boolean(value("7-1")))}<br />
        ${field(value("7-1"), " ")}<br />
        Gestion : ${field(value("7-2"), " ")}
      </td>
    </tr>
    <tr>
      <td class="left">Surveillance scopée pendant 1h minimum après la fin de l'acte jusqu'à score de RASS 0 et/ou score de Ramsay 2</td>
      <td class="mid"></td>
      <td class="right">${yesNo(anyYes("7-3", "7-5"))}<br />Score au moment du transfert/RAD : ${field(value("7-4"))}</td>
    </tr>
  </table>
  <div class="footer">
    <div class="sign">
      <div class="sign-title">Médecin</div>
      <div class="sign-line"><span>Nom</span><span class="sign-fill"></span></div>
      <div class="sign-line"><span>Signature</span><span class="sign-fill"></span></div>
    </div>
    <div class="sign">
      <div class="sign-title">IDE SA</div>
      <div class="sign-line"><span>Nom</span><span class="sign-fill"></span></div>
      <div class="sign-line"><span>Signature</span><span class="sign-fill"></span></div>
    </div>
  </div>
  <div class="opposable">SEULE LA VERSION ÉLECTRONIQUE EST OPPOSABLE</div>
</main><script>window.onload=function(){window.print();}</scr` + `ipt></body></html>`
  );
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
    safeSetJson(storageKey.kitChecklist(kitId), { ts: Date.now(), values });
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
    if (item.type === "choice" || item.type === "select" || item.type === "multicheck")
      return v ? String(v) : "—";
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
      kitId === "sedation-procedurale"
        ? buildSedationProcedurePrintDoc(values)
        : `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
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
                        {item.hint && <p className="kit-checklist-hint">{item.hint}</p>}
                      </li>
                    );
                  }
                  if (item.type === "multicheck") {
                    const raw = (values[key] as string) || "";
                    const selected = new Set(raw ? raw.split(",") : []);
                    return (
                      <li key={ii} className="kit-checklist-field">
                        <span className="kit-checklist-flabel">{item.label}</span>
                        <div className="kit-checklist-chips" role="group" aria-label={item.label}>
                          {item.options.map((opt) => {
                            const active = selected.has(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                aria-pressed={active}
                                className={`kit-checklist-chip ${active ? "kit-checklist-chip-active" : ""}`}
                                style={active ? { background: couleur, borderColor: couleur } : {}}
                                onClick={() => {
                                  const next = new Set(selected);
                                  if (next.has(opt)) next.delete(opt);
                                  else next.add(opt);
                                  setValues((p) => ({
                                    ...p,
                                    [key]: [...next].join(","),
                                  }));
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
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
