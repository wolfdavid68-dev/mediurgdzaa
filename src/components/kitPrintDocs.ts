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
  body { margin: 0; background: #e5e7eb; font-family: system-ui, sans-serif; color: var(--text); }
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
  const yn = (active: boolean) => `NON ${box(false)} OUI ${box(active)}`;
  const line = (text = "", width = "") =>
    `<span class="write-line ${width}">${esc(text)}${text ? "" : "&nbsp;"}</span>`;
  const traceLine = (text = "") => `<span class="line">${esc(text)}${text ? "" : "&nbsp;"}</span>`;
  const option = (label: string, active = false) =>
    `<span class="option">${box(active)} ${esc(label)}</span>`;
  const row = (label: string, content: string) =>
    `<div class="row"><div class="question">${esc(label)}</div><div class="checks">${content}</div></div>`;
  const fieldRow = (icon: string, label: string, content: string) =>
    `<div class="field-row"><div class="icon">${icon}</div><div class="label">${esc(label)}</div><div>${content}</div></div>`;
  const finalDecision = value("6-6");
  const isNoGo = finalDecision.startsWith("No go");
  const isGo = finalDecision.startsWith("Go ISR");
  const printedAt = value("0-7") || now;

  return (
    `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Check-list intubation</title>
<style>
  :root {
    --navy: #06264f;
    --navy-2: #083a6b;
    --teal: #008894;
    --teal-dark: #006d78;
    --line: #7f96a8;
    --light: #f5f9fb;
    --text: #111827;
    --muted: #4b5563;
  }
  @page { size: A4 landscape; margin: 6mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #e5e7eb; color: var(--text); font-family: system-ui, sans-serif; }
  .page { width: 297mm; min-height: 210mm; margin: 0 auto; padding: 6mm; background: #fff; }
  .document { min-height: 198mm; border: 1.4px solid var(--navy); border-radius: 4px; padding: 4mm; display: flex; flex-direction: column; gap: 3.4mm; }
  .top { display: grid; grid-template-columns: 1.15fr 1.35fr 1.25fr 45mm; gap: 5mm; align-items: stretch; border-bottom: 1.4px solid var(--line); padding-bottom: 3mm; }
  .identity, .staff { display: flex; flex-direction: column; gap: 2.3mm; font-size: 8pt; line-height: 1.2; }
  .field-row { display: grid; grid-template-columns: 7mm auto 1fr; gap: 1.5mm; align-items: end; min-height: 5mm; }
  .icon { color: var(--teal); font-weight: 900; text-align: center; font-size: 11pt; line-height: 1; }
  .label { font-weight: 700; color: var(--navy); white-space: nowrap; }
  .line { display: block; border-bottom: 1px solid #111; min-height: 4mm; padding: 0 .8mm; font-size: 7pt; white-space: nowrap; }
  .operator-name { font-weight: 800; color: var(--navy); border-bottom: 1px solid transparent; min-height: 4mm; }
  .small-meta { margin-top: 1mm; color: var(--muted); font-style: italic; font-size: 7.3pt; }
  .title-block { border-left: 1.2px solid var(--navy); border-right: 1.2px solid var(--navy); text-align: center; padding: 2mm 4mm 1mm; display: flex; flex-direction: column; justify-content: center; }
  .overline { color: var(--teal-dark); letter-spacing: 2px; font-size: 11pt; font-weight: 900; margin-bottom: 1mm; }
  h1 { margin: 0; color: var(--navy); font-size: 28pt; line-height: 1; letter-spacing: .5px; font-weight: 900; }
  .subtitle { margin-top: 2mm; color: #374151; font-size: 10pt; letter-spacing: .2px; }
  .ecg { width: 58mm; margin: 2mm auto 0; color: var(--teal); font-weight: 900; border-top: 1.4px solid var(--teal); position: relative; height: 4mm; }
  .ecg::after { content: "⌁"; position: absolute; left: 50%; top: -4.5mm; transform: translateX(-50%); font-size: 18pt; background: #fff; padding: 0 2mm; line-height: 1; }
  .patient-box { border: 1.4px solid var(--teal); border-radius: 4px; text-align: center; color: var(--teal-dark); font-weight: 800; font-size: 10pt; padding: 4mm 2mm; min-height: 31mm; }
  .main-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3.4mm; flex: 1; }
  .column { display: flex; flex-direction: column; gap: 3mm; }
  .card { border: 1.2px solid var(--line); border-radius: 4px; overflow: hidden; background: #fff; }
  .card-title { background: linear-gradient(90deg, var(--navy), var(--navy-2)); color: #fff; font-weight: 900; font-size: 10.2pt; padding: 2mm 2.6mm; display: flex; align-items: center; gap: 2mm; text-transform: uppercase; letter-spacing: .2px; }
  .card-title .title-icon { color: #8df5ff; font-size: 13pt; line-height: 1; }
  .card-body { padding: 2.5mm 3mm; font-size: 7.8pt; line-height: 1.25; }
  .row { display: grid; grid-template-columns: 1fr auto; gap: 2mm; align-items: center; margin-bottom: 1.7mm; }
  .row:last-child { margin-bottom: 0; }
  .question { font-weight: 700; color: var(--navy); }
  .checks { display: flex; align-items: center; gap: 1.2mm; white-space: nowrap; font-weight: 800; color: #111827; font-size: 7.4pt; }
  .box { display: inline-flex; width: 3.2mm; height: 3.2mm; border: 1px solid #111; background: #fff; vertical-align: middle; align-items: center; justify-content: center; font-size: 7pt; line-height: 1; }
  .hint { color: var(--muted); font-style: italic; font-size: 7.2pt; margin-top: -.7mm; }
  .option-line { display: flex; align-items: center; gap: 2.2mm; flex-wrap: wrap; margin: 1.3mm 0 2mm; }
  .option { display: inline-flex; align-items: center; gap: 1mm; white-space: nowrap; }
  .write-line { display: inline-block; border-bottom: 1px solid #111; min-width: 25mm; min-height: 3.6mm; vertical-align: baseline; padding: 0 .8mm; }
  .write-line.sm { min-width: 17mm; }
  .write-line.md { min-width: 32mm; }
  .write-line.lg { min-width: 52mm; }
  .write-line.xl { min-width: 70mm; }
  .field-inline { display: flex; align-items: end; gap: 1.4mm; flex-wrap: nowrap; margin-bottom: 1.5mm; }
  .field-inline strong { color: var(--navy); }
  .vent-row, .param-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin: 2mm 0; color: var(--muted); }
  .decision-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin: 2mm 0; }
  .decision { border: 1.4px solid var(--teal); border-radius: 3px; min-height: 16mm; padding: 3mm; display: grid; grid-template-columns: auto 1fr; gap: 2mm; align-items: center; }
  .decision-title { color: var(--teal-dark); font-size: 14pt; font-weight: 900; line-height: 1; }
  .decision-sub { color: var(--muted); font-size: 7.2pt; margin-top: 1mm; }
  .comment-lines { display: flex; flex-direction: column; gap: 3.4mm; padding-top: 1mm; }
  .comment-line { border-bottom: 1px solid #111; height: 2.5mm; }
  .trace-lines { display: flex; flex-direction: column; gap: 5mm; padding: 2mm 0; }
  .trace-row { display: grid; grid-template-columns: auto 1fr; gap: 2mm; align-items: end; }
  .footer { text-align: center; font-size: 7pt; font-weight: 800; font-style: italic; color: #374151; margin-top: auto; }
  @media print {
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: auto; min-height: auto; margin: 0; padding: 0; }
    .document { min-height: auto; page-break-inside: avoid; }
    .card { break-inside: avoid; page-break-inside: avoid; }
  }
</style></head><body><main class="page"><section class="document">
  <header class="top">
    <div class="identity">
      ${fieldRow("⚕", "Médecin leader (resp. SAUV) :", traceLine(value("0-0")))}
      ${fieldRow("●", "Opérateur :", `<div class="operator-name">${esc(value("0-1"))}</div>`)}
      ${fieldRow("👥", "Aide opérateur / observateur :", traceLine(value("0-2")))}
      ${fieldRow("▣", "Indication :", traceLine(value("0-6")))}
      <div class="small-meta">MEDIURG · ISR · Édité le ${esc(printedAt)}</div>
    </div>
    <div class="title-block">
      <div class="overline">SÉQUENCE RAPIDE</div>
      <h1>CHECK-LIST INTUBATION</h1>
      <div class="subtitle">Évaluation · Préparation · Induction · Post-intubation</div>
      <div class="ecg"></div>
    </div>
    <div class="staff">
      ${fieldRow("⚕", "IPA / IDE leader :", traceLine(value("0-3")))}
      ${fieldRow("▤", "IDE matériel :", traceLine(value("0-4")))}
      ${fieldRow("💉", "IDE thérapeutiques :", traceLine(value("0-5")))}
    </div>
    <div class="patient-box">Étiquette patient</div>
  </header>
  <section class="main-grid">
    <div class="column">
      <section class="card">
        <div class="card-title"><span class="title-icon">⌕</span>Évaluation initiale</div>
        <div class="card-body">
          ${row("Les critères d'intubation sont réunis ?", yn(checked("1-0")))}
          ${row("Absence de contre-indication à la CAI/curare ?", yn(checked("1-1")))}
          <div class="hint">(allergie, hyperkaliémie, brûlure, insuffisance rénale)</div>
        </div>
      </section>
      <section class="card">
        <div class="card-title"><span class="title-icon">⚠</span>Critères prédictifs de complications</div>
        <div class="card-body">
          <div class="question">Score de Mallampati :</div>
          <div class="option-line">${["I", "II", "III", "IV"].map((o) => option(`Classe ${o}`, value("2-0") === o)).join("")}</div>
          <div class="question">Score de Cormack :</div>
          <div class="option-line">${["I", "II", "III", "IV"].map((o) => option(`Grade ${o}`, value("2-1") === o)).join("")}</div>
          ${row("Risque d'inhalation ?", yn(Boolean(value("2-2"))))}
          <div class="option-line">${option("Dernier repas < 6 h", value("2-2") === "Repas < 6h")}${option("Dernier repas > 6 h", value("2-2") === "Repas > 6h")}</div>
          <div class="field-inline"><strong>Allergie connue :</strong>${line(value("2-3"), "xl")}</div>
        </div>
      </section>
      <section class="card">
        <div class="card-title"><span class="title-icon">♁</span>Préparation du patient & matériel</div>
        <div class="card-body">
          ${row("Position du patient adaptée ?", yn(checked("3-0")))}
          ${row("Patient pré-oxygéné ?", yn(checked("3-1")))}
          <div class="option-line">${["Optiflow", "MHC", "VNI"].map((o) => option(o, value("3-2") === o)).join("")}</div>
          ${row("Monitoré : ECG, SpO₂, EtCO₂, FR ?", yn(checked("3-3")))}
          ${row("2 VVP de bon calibre fonctionnelles ?", yn(checked("3-4")))}
          ${row("Aspiration + sonde branchée ?", yn(checked("3-5")))}
          ${row("BAVU complet raccordé à l'O₂ ?", yn(checked("3-6")))}
          <div class="field-inline"><strong>Sonde IOT :</strong>${line(value("3-7"), "xl")}</div>
          ${row("Sonde lubrifiée, mandrin, ballonnet testé ?", yn(checked("3-8")))}
          ${row("Respirateur complet et réglé ?", yn(checked("3-9")))}
          <div class="vent-row">
            <div>FiO₂ : ${line(value("3-10"), "sm")}</div>
            <div>VT : ${line(value("3-11"), "sm")}</div>
            <div>FR : ${line(value("3-12"), "sm")}</div>
            <div>PEP : ${line(value("3-13"), "sm")}</div>
          </div>
        </div>
      </section>
    </div>
    <div class="column">
      <section class="card">
        <div class="card-title"><span class="title-icon">⌁</span>Technique d'intubation</div>
        <div class="card-body">
          <div class="question">Technique prévue en première intention :</div>
          <div class="option-line">
            ${option("Vidéolaryngoscope", hasChoice("4-0", "Vidéolaryngoscope"))}
            ${option("Mandrin semi-rigide", hasChoice("4-0", "Mandrin semi-rigide"))}
            ${option("Laryngoscopie directe", hasChoice("4-0", "Laryngoscopie directe"))}
          </div>
          <div class="question">Matériel d'intubation difficile à proximité :</div>
          <div class="option-line">${option("Kit de crico", checked("4-1"))}${option("Cook / Éschmann", checked("4-1"))}${option("Supraglottique", checked("4-1"))}${option("Fibroscope", checked("4-1"))}</div>
        </div>
      </section>
      <section class="card">
        <div class="card-title"><span class="title-icon">💉</span>Thérapeutiques</div>
        <div class="card-body">
          <div class="field-inline"><strong>Hypnotique envisagé :</strong>${line(value("5-0"), "xl")}</div>
          <div class="field-inline"><strong>Dose d'hypnotique :</strong>${line(value("5-1"), "xl")}<span>mg</span></div>
          <div class="field-inline"><strong>Curare envisagé :</strong>${line(value("5-2"), "xl")}</div>
          <div class="field-inline"><strong>Dose de curare :</strong>${line(value("5-3"), "xl")}<span>mg</span></div>
          ${row("Sédation au PSE préparée ?", yn(checked("5-4")))}
          ${row("Support vasopresseur préparé ?", yn(checked("5-5")))}
        </div>
      </section>
      <section class="card">
        <div class="card-title"><span class="title-icon">✓</span>Contrôle ultime & décision</div>
        <div class="card-body">
          ${row("Déroulé et alternatives expliqués à l'équipe ?", yn(checked("6-0")))}
          ${row("2e opérateur expérimenté à proximité ?", yn(checked("6-1")))}
          <div class="param-row">
            <div>FC : ${line(value("6-2"), "sm")}</div>
            <div>PA/PAM : ${line(value("6-3"), "sm")}</div>
            <div>SpO₂ : ${line(value("6-4"), "sm")}</div>
            <div>FR : ${line(value("6-5"), "sm")}</div>
          </div>
          <div class="decision-grid">
            <div class="decision">${box(isNoGo)}<div><div class="decision-title">NO GO</div><div class="decision-sub">Reporter / optimiser</div></div></div>
            <div class="decision">${box(isGo)}<div><div class="decision-title">GO ISR</div><div class="decision-sub">Intubation validée</div></div></div>
          </div>
          <div class="field-inline"><strong>Décision finale :</strong>${line(finalDecision, "xl")}</div>
        </div>
      </section>
      <section class="card">
        <div class="card-title"><span class="title-icon">○</span>Commentaire(s)</div>
        <div class="card-body comment-lines"><div class="comment-line"></div><div class="comment-line"></div><div class="comment-line"></div><div class="comment-line"></div><div class="comment-line"></div></div>
      </section>
    </div>
    <div class="column">
      <section class="card">
        <div class="card-title"><span class="title-icon">🫁</span>Post-intubation</div>
        <div class="card-body">
          ${row("Sonde d'intubation fixée ?", yn(checked("7-0")))}
          <div class="field-inline"><strong>Position à la commissure des lèvres :</strong>${line(value("7-1"), "md")}<span>cm</span></div>
          <div class="field-inline"><strong>Valeur de la capnographie :</strong>${line(value("7-2"), "md")}<span>mmHg</span></div>
          ${row("Pression du ballonnet contrôlée ?", yn(checked("7-3")))}
          ${row("Respirateur adéquat ?", yn(checked("7-4")))}
          ${row("Radiographie pulmonaire effectuée ?", yn(checked("7-5")))}
          <div class="option-line">${option("RTC", value("7-6") === "KTC")}${option("RTA", value("7-6") === "KTA")}${option("Aucun", value("7-6") === "Aucun")}</div>
        </div>
      </section>
      <section class="card">
        <div class="card-title"><span class="title-icon">✚</span>Soins IDE</div>
        <div class="card-body">
          ${row("Yeux fermés + gel ophtalmique appliqué ?", yn(checked("8-0")))}
          ${row("Sonde gastrique en place ?", yn(checked("8-1")))}
          ${row("Bande urinaire en place ?", yn(checked("8-2")))}
        </div>
      </section>
      <section class="card">
        <div class="card-title"><span class="title-icon">▣</span>Traçabilité</div>
        <div class="card-body trace-lines">
          <div class="field-inline"><strong>Date et heure de l'intubation :</strong>${line(value("0-7"), "md")}</div>
          <div class="trace-row"><strong>Médecin :</strong>${traceLine(value("0-0"))}</div>
          <div class="trace-row"><strong>IDE :</strong>${traceLine(value("0-3"))}</div>
          <div class="trace-row"><strong>Signature :</strong>${traceLine("")}</div>
        </div>
      </section>
    </div>
  </section>
  <footer class="footer">SEULE LA VERSION ÉLECTRONIQUE EST OPPOSABLE</footer>
</section></main><script>window.onload=function(){window.print();}</scr` + `ipt></body></html>`
  );
};
