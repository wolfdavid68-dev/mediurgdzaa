export type PrintValues = Record<string, boolean | string>;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const buildSedationProcedurePrintDoc = (values: PrintValues): string => {
  const now = new Date().toLocaleString("fr-FR");
  const value = (key: string) => {
    const v = values[key];
    return typeof v === "string" && v.trim() ? v.trim() : "";
  };
  const checked = (key: string) => values[key] === true;
  const box = (isChecked = false) => `<span class="box">${isChecked ? "✓" : ""}</span>`;
  const yesNo = (isYes: boolean) => `Oui ${box(isYes)} Non ${box(false)}`;
  const checkline = (isYes: boolean) => `<div class="checkline">${yesNo(isYes)}</div>`;
  const rightCheck = (isYes: boolean) => `<span class="right-check">${yesNo(isYes)}</span>`;
  const blank = (text: string, width = "") =>
    `<span class="blank ${width}">${esc(text)}${text ? "" : "&nbsp;"}</span>`;
  const multiYes = (...keys: string[]) => keys.every((key) => checked(key));
  const anyYes = (...keys: string[]) => keys.some((key) => checked(key));

  const procedure = value("5-2") || "Kétofol : Kétamine puis Propofol";
  const ketamineDose = value("5-3");
  const propofolDose = value("5-4");
  const propofolReserve = value("5-5");
  const procedureDateTime = value("0-6");
  const printedAt = procedureDateTime || now;

  return (
    `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Checklist Kétofol aux urgences</title>
<style>
  :root {
    --navy: #06295c;
    --blue: #0b4b78;
    --teal: #007c89;
    --teal-dark: #006775;
    --line: #8aa5b8;
    --light: #f4f9fb;
    --text: #111827;
    --muted: #4b5563;
  }
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #e5e7eb; font-family: Arial, Helvetica, sans-serif; color: var(--text); }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 8mm; background: #fff; border: 1px solid #d1d5db; }
  .sheet { border: 1.4px solid var(--blue); border-radius: 4px; overflow: hidden; }
  .header { display: grid; grid-template-columns: 1fr 68mm; gap: 7mm; padding: 5mm 5mm 4mm; border-bottom: 1.4px solid var(--blue); }
  .meta { font-size: 8.2pt; text-transform: uppercase; letter-spacing: .2px; color: var(--muted); margin-bottom: 2mm; }
  .meta strong { color: var(--blue); }
  h1 { margin: 0; color: var(--navy); font-size: 24pt; line-height: 1.1; font-weight: 800; }
  .subtitle { margin-top: 3mm; font-size: 9.5pt; color: var(--text); }
  .patient-label { border: 1.4px solid var(--teal); border-radius: 4px; min-height: 27mm; padding: 4mm; text-align: center; color: var(--teal-dark); font-weight: 700; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .main-table td, .main-table th { border: 1px solid var(--line); padding: 2.2mm 2.5mm; vertical-align: middle; font-size: 8.2pt; line-height: 1.25; }
  .main-table th { background: linear-gradient(#f8fbfd, #eef6f9); color: var(--blue); font-weight: 800; text-align: center; font-size: 8.5pt; }
  .item { color: var(--blue); font-weight: 800; }
  .small { font-size: 7.4pt; line-height: 1.2; }
  .italic-note { color: var(--teal-dark); font-style: italic; font-weight: 700; font-size: 7.7pt; line-height: 1.25; margin-top: 2mm; }
  .checkline { display: flex; justify-content: flex-end; align-items: center; gap: 2mm; white-space: nowrap; font-size: 8pt; }
  .box { display: inline-flex; width: 3.2mm; height: 3.2mm; border: 1px solid #111; vertical-align: middle; margin-left: 1mm; align-items: center; justify-content: center; font-size: 7pt; line-height: 1; }
  .blank { display: inline-block; border-bottom: 1px solid #111; min-height: 4mm; vertical-align: baseline; padding: 0 1mm; }
  .w-xs { width: 15mm; }
  .w-sm { width: 24mm; }
  .w-md { width: 36mm; }
  .w-lg { width: 54mm; }
  .w-xl { width: 70mm; }
  .right-check { float: right; margin-left: 3mm; white-space: nowrap; }
  .section-title { color: var(--blue); font-weight: 800; margin-bottom: 2mm; }
  .param-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 5mm; margin-top: 2mm; align-items: center; }
  .param-grid div { white-space: nowrap; }
  .param-grid .checkline { justify-content: flex-start; gap: 1mm; }
  .dose-grid { display: grid; grid-template-columns: auto 1fr auto 1fr auto; gap: 1.5mm; align-items: end; margin: 1.5mm 0; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 9mm; padding: 6mm 0 0; }
  .signature-card { border: 1.4px solid var(--blue); border-radius: 4px; overflow: hidden; }
  .signature-title { background: linear-gradient(90deg, var(--blue), var(--teal)); color: #fff; font-weight: 800; padding: 2.4mm 4mm; font-size: 10.5pt; display: flex; align-items: center; gap: 2.5mm; }
  .signature-icon { width: 6mm; height: 6mm; border-radius: 50%; background: #fff; color: var(--blue); display: inline-flex; justify-content: center; align-items: center; font-size: 10pt; font-weight: 900; }
  .signature-body { padding: 5mm 4mm; font-size: 9.5pt; }
  .signature-row { display: grid; grid-template-columns: 20mm 1fr; align-items: end; gap: 3mm; margin-bottom: 6mm; }
  .signature-row:last-child { margin-bottom: 0; }
  .line { border-bottom: 1px solid #111; min-height: 5mm; padding: 0 2mm 1mm; }
  .footer-space { padding: 0 4mm 4mm; }
  .opposable { margin-top: 5mm; text-align: center; font-size: 7pt; font-style: italic; font-weight: 800; color: #10233d; }
  @media print {
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { margin: 0; border: none; width: auto; min-height: auto; padding: 0; }
    .sheet { page-break-inside: avoid; }
  }
</style></head><body><main class="page">
  <section class="sheet">
    <header class="header">
      <div>
        <div class="meta"><strong>MEDIURG</strong> &nbsp;•&nbsp; SÉDATION PROCÉDURALE &nbsp;•&nbsp; ÉDITÉ LE ${esc(printedAt)}</div>
      <h1>Checklist Kétofol aux urgences</h1>
        <div class="subtitle">Kétamine puis Propofol &nbsp;•&nbsp; Surveillance scopée et capnographie &nbsp;•&nbsp; Document de traçabilité terrain</div>
      </div>
      <div class="patient-label">Étiquette du patient</div>
    </header>
  <table class="main-table" aria-label="Checklist Kétofol aux urgences">
    <colgroup>
      <col style="width: 31%;" />
      <col style="width: 29%;" />
      <col style="width: 40%;" />
    </colgroup>
    <tr>
      <th colspan="2">Identification d'un patient nécessitant une sédation procédurale</th>
      <th>Procédure Kétofol pour : ${blank(value("0-0"), "w-lg")}</th>
    </tr>
    <tr>
      <td class="item">Transfert en box de SAUV ou de zone tiède</td>
      <td></td>
      <td>${checkline(checked("0-2"))}</td>
    </tr>
    <tr>
      <td class="item">Personnel nécessaire</td>
      <td>1 médecin urgentiste sénior<br />+ 1 IDE formée à la SAUV</td>
      <td>${checkline(multiYes("1-0", "1-1"))}</td>
    </tr>
    <tr>
      <td class="item">Mise en place d'une ou deux VVP de bon calibre</td>
      <td>18G – 20G minimum</td>
      <td>Nombre : &nbsp; ${blank(value("1-2") || "1 ou 2", "w-sm")} ${rightCheck(checked("1-3"))}</td>
    </tr>
    <tr>
      <td class="item">Surveillance scopée obligatoire</td>
      <td>FC et PA<br />SpO₂, FR et capnographie</td>
      <td>
        <div class="section-title">Paramètres initiaux :</div>
        <div class="param-grid">
          <div>FC ${blank(value("2-2"), "w-sm")} bpm</div>
          <div>PA ${blank(value("2-3"), "w-sm")} mmHg</div>
          <div>SpO₂ ${blank(value("2-4"), "w-sm")} %</div>
          <div>FR ${blank(value("2-5"), "w-sm")} / min</div>
          <div>EtCO₂ ${blank(value("2-6"), "w-sm")} mmHg</div>
          ${checkline(multiYes("2-0", "2-1"))}
        </div>
      </td>
    </tr>
    <tr>
      <td class="item">Poids exact du patient</td>
      <td>Objectif : posologies adaptées</td>
      <td>Poids : ${blank(value("0-1"), "w-md")} kg</td>
    </tr>
    <tr>
      <td class="item">Explication au patient de la prise en charge</td>
      <td>Bénéfice(s)<br />Risque(s)</td>
      <td>${checkline(multiYes("3-0", "3-1"))}</td>
    </tr>
    <tr>
      <td class="item">Absence de contre-indication(s) au(x) médicament(s) choisi(s)</td>
      <td>Allergie, traitement à risque ou terrain particulier</td>
      <td>${checkline(checked("3-2"))}${blank(value("3-3"), "w-md")}</td>
    </tr>
    <tr>
      <td class="item" rowspan="4">Disponibilité à proximité immédiate du matériel nécessaire à la gestion des principales complications</td>
      <td colspan="2">Vomissements : haricots, antiémétique, aspiration ${rightCheck(checked("4-0"))}</td>
    </tr>
    <tr>
      <td colspan="2">Voies aériennes supérieures : Guedel, BAVU, IOT ${rightCheck(checked("4-1"))}</td>
    </tr>
    <tr>
      <td colspan="2">Mauvaise tolérance hémodynamique : remplissage ${rightCheck(checked("4-2"))}</td>
    </tr>
    <tr>
      <td colspan="2">Aspiration fonctionnelle et matériel d'intubation disponibles ${rightCheck(multiYes("4-3", "4-4"))}</td>
    </tr>
    <tr>
      <td class="item">Pré-oxygénation du patient</td>
      <td>Permet d'éviter la désaturation en cas d'apnée</td>
      <td>${checkline(checked("5-0"))}</td>
    </tr>
    <tr>
      <td class="item">Choix de la thérapeutique médicamenteuse souhaitée</td>
      <td>Besoins ?<br />Histoire clinique ?<br />Antécédents ?</td>
      <td>
        <div class="section-title">Thérapeutique(s) administrée(s) :</div>
        ${esc(procedure)}
        <div class="dose-grid">
          <span>Kétamine :</span>
          ${blank(ketamineDose)}
          <span>mg</span>
          <span>Propofol : ${blank(propofolDose, "w-sm")}</span>
          <span>mg</span>
        </div>
        Réserve Propofol : ${blank(propofolReserve, "w-md")} mg<br />
        Critères : ${blank(value("5-1"), "w-xl")}
      </td>
    </tr>
    <tr>
      <td class="item" rowspan="2">Administration du sédatif pour obtention d'une sédation suffisante</td>
      <td rowspan="2">
        Objectif score de RASS -3 ou -4<br />et/ou score de Ramsay 4 ou 5
        <div class="italic-note">Si besoin pour arriver à cet objectif : bolus supplémentaire<br />si les paramètres hémodynamiques et respiratoires le permettent</div>
      </td>
      <td>Score au moment de l'acte : ${blank(value("6-1"), "w-md")}<br />Objectif : ${blank(value("6-0"), "w-md")}</td>
    </tr>
    <tr>
      <td>Thérapeutique et posologie : ${blank(value("6-3"), "w-md")} ${rightCheck(checked("6-2"))}</td>
    </tr>
    <tr>
      <td class="item">Réalisation de l'acte nécessitant la sédation procédurale</td>
      <td></td>
      <td>${checkline(checked("7-0"))}</td>
    </tr>
    <tr>
      <td class="item">Gestion des complications</td>
      <td>Doivent toutes être connues et maîtrisées par le médecin qui les utilise.</td>
      <td>Événement(s) indésirable(s) : ${blank(value("7-1"), "w-md")} ${rightCheck(Boolean(value("7-1")))}<br />Gestion : ${blank(value("7-2"), "w-xl")}</td>
    </tr>
    <tr>
      <td class="item">Surveillance scopée pendant 1h minimum après la fin de l'acte jusqu'à score de RASS 0 et/ou score de Ramsay 2</td>
      <td></td>
      <td>Score au moment du transfert/RAD : ${blank(value("7-4"), "w-md")} ${rightCheck(anyYes("7-3", "7-5"))}</td>
    </tr>
  </table>
  </section>
  <section class="footer-space">
    <div class="signatures">
      <div class="signature-card">
        <div class="signature-title"><span class="signature-icon">⚕</span>Médecin</div>
        <div class="signature-body">
          <div class="signature-row"><div>Nom</div><div class="line">${esc(value("0-4"))}</div></div>
          <div class="signature-row"><div>Signature</div><div class="line"></div></div>
        </div>
      </div>
      <div class="signature-card">
        <div class="signature-title"><span class="signature-icon">✚</span>IDE SA</div>
        <div class="signature-body">
          <div class="signature-row"><div>Nom</div><div class="line">${esc(value("0-5"))}</div></div>
          <div class="signature-row"><div>Signature</div><div class="line"></div></div>
        </div>
      </div>
    </div>
    <div class="opposable">SEULE LA VERSION ÉLECTRONIQUE EST OPPOSABLE</div>
  </section>
</main><script>window.onload=function(){window.print();}</scr` + `ipt></body></html>`
  );
};

export const buildIsrPrintDoc = (values: PrintValues): string => {
  const now = new Date().toLocaleString("fr-FR");
  const value = (key: string) => {
    const v = values[key];
    return typeof v === "string" && v.trim() ? v.trim() : "";
  };
  const checked = (key: string) => values[key] === true;
  const hasChoice = (key: string, option: string) =>
    value(key)
      .split(",")
      .map((v) => v.trim())
      .includes(option);
  const box = (active = false) => `<span class="box">${active ? "✓" : ""}</span>`;
  const yn = (active: boolean) => `<span class="yn">NON ${box(false)} OUI ${box(active)}</span>`;
  const line = (text = "", wide = false) =>
    `<span class="${wide ? "line wide" : "line"}">${esc(text)}${text ? "" : "&nbsp;"}</span>`;
  const option = (label: string, active = false) => `${box(active)} ${esc(label)}`;
  const row = (label: string, content: string) =>
    `<div class="row"><span class="label">${esc(label)}</span><span>${content}</span></div>`;
  const finalDecision = value("6-6");
  const isNoGo = finalDecision.startsWith("No go");
  const isGo = finalDecision.startsWith("Go ISR");

  return (
    `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Check-list intubation</title>
<style>
  @page { size: A4 landscape; margin: 5mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 7.4px; line-height: 1.1; background: #ececec; }
  .sheet { width: 287mm; margin: 0 auto; padding: 2.5mm; background: #fff; border: 1.2px solid #111; }
  .header { display: grid; grid-template-columns: 1fr 70mm 1.08fr; gap: 3mm; align-items: stretch; border-bottom: 1.2px solid #111; padding: 0 0 2mm; }
  .titleblock { align-self: center; text-align: center; border-left: 1px solid #111; border-right: 1px solid #111; padding: 1.5mm 3mm; }
  .kicker { font-size: 6.8px; text-transform: uppercase; letter-spacing: .12em; color: #555; font-weight: 700; }
  h1 { margin: .8mm 0 .4mm; font-size: 15px; letter-spacing: .04em; text-transform: uppercase; }
  .subhead { font-size: 7.2px; color: #333; }
  .identity { display: grid; gap: 1.3mm; font-size: 7.8px; }
  .identity .line { min-width: 30mm; }
  .patient { border: 1.2px solid #111; display: flex; align-items: flex-start; justify-content: center; padding-top: 2.4mm; font-weight: 700; min-height: 23mm; background: #fafafa; }
  .grid { display: table; width: 100%; table-layout: fixed; border-spacing: 2.5mm 0; margin: 2.5mm -2.5mm 0; }
  .col { display: table-cell; width: 33.333%; vertical-align: top; padding: 0 0 0 0; }
  .panel { border: 1px solid #222; border-radius: 1mm; overflow: hidden; break-inside: avoid; }
  .col .panel + .panel { margin-top: 1.7mm; }
  .title { position: relative; background: #444; color: #fff; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; padding: 1.35mm 5mm 1.35mm 2mm; font-size: 7.8px; }
  .title::after { content: ""; position: absolute; right: -1px; top: 0; border-top: 4.8mm solid transparent; border-bottom: 4.8mm solid transparent; border-left: 4.8mm solid #444; transform: translateX(100%); }
  .body { padding: 1.5mm 1.9mm; display: grid; gap: .8mm; }
  .row { display: grid; grid-template-columns: minmax(24mm, 1fr) auto; gap: 1.4mm; align-items: baseline; min-height: 2.8mm; }
  .row.stack { display: block; }
  .label { font-weight: 600; }
  .muted { color: #333; font-style: italic; }
  .box { display: inline-flex; width: 2.8mm; height: 2.8mm; border: 1px solid #111; align-items: center; justify-content: center; font-size: 7px; line-height: 1; margin: 0 .6mm; vertical-align: -0.45mm; }
  .yn { white-space: nowrap; font-weight: 600; }
  .line { display: inline-block; min-width: 18mm; border-bottom: 1px dotted #222; min-height: 2.7mm; padding: 0 .8mm; }
  .wide { min-width: 38mm; }
  .two { display: grid; grid-template-columns: 1fr 36mm; gap: 2mm; }
  .checks { display: flex; flex-wrap: wrap; gap: .8mm 1.6mm; }
  .vent { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1mm; }
  .comment-lines span { display: block; border-bottom: 1px solid #222; height: 4.2mm; }
  .decision { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; padding-top: .8mm; }
  .decision-choice { border: 1px solid #111; padding: 1.3mm 1.6mm; min-height: 11mm; display: grid; grid-template-columns: 4mm 1fr; gap: 1.4mm; align-items: start; background: #fafafa; }
  .decision-choice strong { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: .04em; }
  .decision-choice span { display: block; margin-top: .7mm; color: #333; }
  .decision-note { margin-top: 1.2mm; padding-top: 1mm; border-top: 1px solid #aaa; font-weight: 600; }
  .trace { display: block; }
  .footer { padding-top: 1.6mm; text-align: center; font-size: 6.6px; font-style: italic; font-weight: 700; }
  @media screen { body { padding: 6mm 0; } .sheet { box-shadow: 0 0 0 1px #c8c8c8, 0 8px 26px rgba(0,0,0,.18); } }
  @media print { body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .sheet { width: 100%; box-shadow: none; page-break-inside: avoid; } .panel { break-inside: avoid; page-break-inside: avoid; } }
</style></head><body><main class="sheet">
  <header class="header">
    <div class="identity">
      <div><strong>Médecin leader (resp. SAUV) :</strong> ${line(value("0-0"), true)}</div>
      <div><strong>Opérateur :</strong> ${line(value("0-1"), true)}</div>
      <div><strong>Aide opérateur / observateur :</strong> ${line(value("0-2"), true)}</div>
      <div><strong>Indication :</strong> ${line(value("0-6"), true)}</div>
      <div class="muted">MediURG · ISR · Édité le ${esc(now)}</div>
    </div>
    <div class="titleblock">
      <div class="kicker">Séquence rapide</div>
      <h1>Check-list intubation</h1>
      <div class="subhead">Évaluation · Préparation · Induction · Post-intubation</div>
    </div>
    <div class="two">
      <div class="identity">
        <div><strong>IPA / IDE leader :</strong> ${line(value("0-3"), true)}</div>
        <div><strong>IDE matériel :</strong> ${line(value("0-4"), true)}</div>
        <div><strong>IDE thérapeutiques :</strong> ${line(value("0-5"), true)}</div>
      </div>
      <div class="patient">Étiquette patient</div>
    </div>
  </header>
  <section class="grid">
    <div class="col">
      <section class="panel">
        <div class="title">Évaluation initiale</div>
        <div class="body">
          ${row("Les critères d'intubation sont réunis ?", yn(checked("1-0")))}
          ${row("Absence de contre-indication à la Célocurine ?", yn(checked("1-1")))}
          <div class="muted">(allergie, hyperkaliémie, brûlure, insuffisance rénale)</div>
        </div>
      </section>
      <section class="panel">
        <div class="title">Critères prédictifs de complications</div>
        <div class="body">
          <div class="row stack"><span class="label">Score de Mallampati :</span>
            <div class="checks">${["I", "II", "III", "IV"].map((o) => option(`Classe ${o}`, value("2-0") === o)).join(" ")}</div>
          </div>
          <div class="row stack"><span class="label">Score de Cormack :</span>
            <div class="checks">${["I", "II", "III", "IV"].map((o) => option(`Grade ${o}`, value("2-1") === o)).join(" ")}</div>
          </div>
          ${row("Risque d'inhalation ?", yn(Boolean(value("2-2"))))}
          <div class="checks">${option("Dernier repas < 6h", value("2-2") === "Repas < 6h")} ${option("Dernier repas > 6h", value("2-2") === "Repas > 6h")}</div>
          ${row("Allergie connue :", line(value("2-3"), true))}
        </div>
      </section>
      <section class="panel">
        <div class="title">Préparation du patient & matériel</div>
        <div class="body">
          ${row("Position du patient adaptée ?", yn(checked("3-0")))}
          ${row("Patient pré-oxygéné ?", yn(checked("3-1")))}
          <div class="checks">${["Optiflow", "MHC", "VNI"].map((o) => option(o, value("3-2") === o)).join(" ")}</div>
          ${row("Monitoré : ECG, SpO₂, EtCO₂, FR ?", yn(checked("3-3")))}
          ${row("2 VVP de bon calibre fonctionnelles ?", yn(checked("3-4")))}
          ${row("Aspiration + sonde branchée ?", yn(checked("3-5")))}
          ${row("BAVU complet raccordé à l'O₂ ?", yn(checked("3-6")))}
          ${row("Sonde IOT :", line(value("3-7")))}
          ${row("Sonde lubrifiée, mandrin, ballonnet testé ?", yn(checked("3-8")))}
          ${row("Respirateur complet et réglé ?", yn(checked("3-9")))}
          <div class="vent">
            <span>FiO₂ : ${line(value("3-10"))}</span>
            <span>VT : ${line(value("3-11"))}</span>
            <span>FR : ${line(value("3-12"))}</span>
            <span>PEP : ${line(value("3-13"))}</span>
          </div>
        </div>
      </section>
    </div>
    <div class="col">
      <section class="panel">
        <div class="title">Technique d'intubation</div>
        <div class="body">
          <div class="row stack"><span class="label">Technique prévue en première intention :</span>
            <div class="checks">
              ${option("Vidéolaryngoscope", hasChoice("4-0", "Vidéolaryngoscope"))}
              ${option("Mandrin semi-rigide", hasChoice("4-0", "Mandrin semi-rigide"))}
              ${option("Laryngoscopie directe", hasChoice("4-0", "Laryngoscopie directe"))}
            </div>
          </div>
          <div class="row stack"><span class="label">Matériel d'intubation difficile à proximité :</span>
            <div class="checks">${option("Kit de crico", checked("4-1"))} ${option("Cook/Eichmann", checked("4-1"))} ${option("Supraglottique", checked("4-1"))} ${option("Fibroscope", checked("4-1"))}</div>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="title">Thérapeutiques</div>
        <div class="body">
          ${row("Hypnotique envisagé :", line(value("5-0"), true))}
          ${row("Dose d'hypnotique :", `${line(value("5-1"))} mg`)}
          ${row("Curare envisagé :", line(value("5-2"), true))}
          ${row("Dose de curare :", `${line(value("5-3"))} mg`)}
          ${row("Sédation au PSE préparée ?", yn(checked("5-4")))}
          ${row("Support vasopresseur préparé ?", yn(checked("5-5")))}
        </div>
      </section>
      <section class="panel">
        <div class="title">Contrôle ultime & décision</div>
        <div class="body">
          ${row("Déroulé et alternatives expliqués à l'équipe ?", yn(checked("6-0")))}
          ${row("2e opérateur expérimenté à proximité ?", yn(checked("6-1")))}
          <div class="vent">
            <span>FC : ${line(value("6-2"))}</span>
            <span>PA/PAM : ${line(value("6-3"))}</span>
            <span>SpO₂ : ${line(value("6-4"))}</span>
            <span>FR : ${line(value("6-5"))}</span>
          </div>
          <div class="decision">
            <div class="decision-choice">${box(isNoGo)}<div><strong>No go</strong><span>Reporter / optimiser</span></div></div>
            <div class="decision-choice">${box(isGo)}<div><strong>Go ISR</strong><span>Intubation validée</span></div></div>
          </div>
          <div class="decision-note">Décision finale : ${line(finalDecision, true)}</div>
        </div>
      </section>
      <section class="panel">
        <div class="title">Commentaire(s)</div>
        <div class="body comment-lines"><span></span><span></span><span></span><span></span></div>
      </section>
    </div>
    <div class="col">
      <section class="panel">
        <div class="title">Post-intubation</div>
        <div class="body">
          ${row("Sonde d'intubation fixée ?", yn(checked("7-0")))}
          ${row("Position à la commissure des lèvres :", `${line(value("7-1"))} cm`)}
          ${row("Valeur de la capnographie :", `${line(value("7-2"))} mmHg`)}
          ${row("Pression du ballonnet contrôlée ?", yn(checked("7-3")))}
          ${row("Respirateur adéquat ?", yn(checked("7-4")))}
          ${row("Radiographie pulmonaire effectuée ?", yn(checked("7-5")))}
          <div class="checks">${option("KTC", value("7-6") === "KTC")} ${option("KTA", value("7-6") === "KTA")} ${option("Aucun", value("7-6") === "Aucun")}</div>
        </div>
      </section>
      <section class="panel">
        <div class="title">Soins IDE</div>
        <div class="body">
          ${row("Yeux fermés + gel ophtalmique appliqué ?", yn(checked("8-0")))}
          ${row("Sonde gastrique en place ?", yn(checked("8-1")))}
          ${row("Sonde urinaire en place ?", yn(checked("8-2")))}
        </div>
      </section>
      <section class="panel">
        <div class="title">Traçabilité</div>
        <div class="body trace">
          <div>Date et heure de l'intubation : ${line(value("0-7"), true)}</div>
          <div style="margin-top:2mm">Médecin : ${line(value("0-0"), true)}</div>
          <div style="margin-top:2mm">IDE : ${line(value("0-3"), true)}</div>
          <div style="margin-top:2mm">Signature : ${line("", true)}</div>
        </div>
      </section>
    </div>
  </section>
  <div class="footer">SEULE LA VERSION ÉLECTRONIQUE EST OPPOSABLE</div>
</main><script>window.onload=function(){window.print();}</scr` + `ipt></body></html>`
  );
};
