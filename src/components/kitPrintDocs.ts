export type PrintValues = Record<string, boolean | string>;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const buildSedationProcedurePrintDoc = (values: PrintValues): string => {
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
  const finalDecision = value("5-6");
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
      <div><strong>Médecin leader (resp. SAUV) :</strong> ${line("", true)}</div>
      <div><strong>Opérateur :</strong> ${line("", true)}</div>
      <div><strong>Aide opérateur / observateur :</strong> ${line("", true)}</div>
      <div><strong>Indication :</strong> ${line("", true)}</div>
      <div class="muted">MediURG · ISR · Édité le ${esc(now)}</div>
    </div>
    <div class="titleblock">
      <div class="kicker">Séquence rapide</div>
      <h1>Check-list intubation</h1>
      <div class="subhead">Évaluation · Préparation · Induction · Post-intubation</div>
    </div>
    <div class="two">
      <div class="identity">
        <div><strong>IPA / IDE leader :</strong> ${line("", true)}</div>
        <div><strong>IDE matériel :</strong> ${line("", true)}</div>
        <div><strong>IDE thérapeutiques :</strong> ${line("", true)}</div>
      </div>
      <div class="patient">Étiquette patient</div>
    </div>
  </header>
  <section class="grid">
    <div class="col">
      <section class="panel">
        <div class="title">Évaluation initiale</div>
        <div class="body">
          ${row("Les critères d'intubation sont réunis ?", yn(checked("0-0")))}
          ${row("Absence de contre-indication à la Célocurine ?", yn(checked("0-1")))}
          <div class="muted">(allergie, hyperkaliémie, brûlure, insuffisance rénale)</div>
        </div>
      </section>
      <section class="panel">
        <div class="title">Critères prédictifs de complications</div>
        <div class="body">
          <div class="row stack"><span class="label">Score de Mallampati :</span>
            <div class="checks">${["I", "II", "III", "IV"].map((o) => option(`Classe ${o}`, value("1-0") === o)).join(" ")}</div>
          </div>
          <div class="row stack"><span class="label">Score de Cormack :</span>
            <div class="checks">${["I", "II", "III", "IV"].map((o) => option(`Grade ${o}`, value("1-1") === o)).join(" ")}</div>
          </div>
          ${row("Risque d'inhalation ?", yn(Boolean(value("1-2"))))}
          <div class="checks">${option("Dernier repas < 6h", value("1-2") === "Repas < 6h")} ${option("Dernier repas > 6h", value("1-2") === "Repas > 6h")}</div>
          ${row("Allergie connue :", line(value("1-3"), true))}
        </div>
      </section>
      <section class="panel">
        <div class="title">Préparation du patient & matériel</div>
        <div class="body">
          ${row("Position du patient adaptée ?", yn(checked("2-0")))}
          ${row("Patient pré-oxygéné ?", yn(checked("2-1")))}
          <div class="checks">${["Optiflow", "MHC", "VNI"].map((o) => option(o, value("2-2") === o)).join(" ")}</div>
          ${row("Monitoré : ECG, SpO₂, EtCO₂, FR ?", yn(checked("2-3")))}
          ${row("2 VVP de bon calibre fonctionnelles ?", yn(checked("2-4")))}
          ${row("Aspiration + sonde branchée ?", yn(checked("2-5")))}
          ${row("BAVU complet raccordé à l'O₂ ?", yn(checked("2-6")))}
          ${row("Sonde IOT :", line(value("2-7")))}
          ${row("Sonde lubrifiée, mandrin, ballonnet testé ?", yn(checked("2-8")))}
          ${row("Respirateur complet et réglé ?", yn(checked("2-9")))}
          <div class="vent">
            <span>FiO₂ : ${line(value("2-10"))}</span>
            <span>VT : ${line(value("2-11"))}</span>
            <span>FR : ${line(value("2-12"))}</span>
            <span>PEP : ${line(value("2-13"))}</span>
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
              ${option("Vidéolaryngoscope", hasChoice("3-0", "Vidéolaryngoscope"))}
              ${option("Mandrin semi-rigide", hasChoice("3-0", "Mandrin semi-rigide"))}
              ${option("Laryngoscopie directe", hasChoice("3-0", "Laryngoscopie directe"))}
            </div>
          </div>
          <div class="row stack"><span class="label">Matériel d'intubation difficile à proximité :</span>
            <div class="checks">${option("Kit de crico", checked("3-1"))} ${option("Cook/Eichmann", checked("3-1"))} ${option("Supraglottique", checked("3-1"))} ${option("Fibroscope", checked("3-1"))}</div>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="title">Thérapeutiques</div>
        <div class="body">
          ${row("Hypnotique envisagé :", line(value("4-0"), true))}
          ${row("Dose d'hypnotique :", `${line(value("4-1"))} mg`)}
          ${row("Curare envisagé :", line(value("4-2"), true))}
          ${row("Dose de curare :", `${line(value("4-3"))} mg`)}
          ${row("Sédation au PSE préparée ?", yn(checked("4-4")))}
          ${row("Support vasopresseur préparé ?", yn(checked("4-5")))}
        </div>
      </section>
      <section class="panel">
        <div class="title">Contrôle ultime & décision</div>
        <div class="body">
          ${row("Déroulé et alternatives expliqués à l'équipe ?", yn(checked("5-0")))}
          ${row("2e opérateur expérimenté à proximité ?", yn(checked("5-1")))}
          <div class="vent">
            <span>FC : ${line(value("5-2"))}</span>
            <span>PA/PAM : ${line(value("5-3"))}</span>
            <span>SpO₂ : ${line(value("5-4"))}</span>
            <span>FR : ${line(value("5-5"))}</span>
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
          ${row("Sonde d'intubation fixée ?", yn(checked("6-0")))}
          ${row("Position à la commissure des lèvres :", `${line(value("6-1"))} cm`)}
          ${row("Valeur de la capnographie :", `${line(value("6-2"))} mmHg`)}
          ${row("Pression du ballonnet contrôlée ?", yn(checked("6-3")))}
          ${row("Respirateur adéquat ?", yn(checked("6-4")))}
          ${row("Radiographie pulmonaire effectuée ?", yn(checked("6-5")))}
          <div class="checks">${option("KTC", value("6-6") === "KTC")} ${option("KTA", value("6-6") === "KTA")} ${option("Aucun", value("6-6") === "Aucun")}</div>
        </div>
      </section>
      <section class="panel">
        <div class="title">Soins IDE</div>
        <div class="body">
          ${row("Yeux fermés + gel ophtalmique appliqué ?", yn(checked("7-0")))}
          ${row("Sonde gastrique en place ?", yn(checked("7-1")))}
          ${row("Sonde urinaire en place ?", yn(checked("7-2")))}
        </div>
      </section>
      <section class="panel">
        <div class="title">Traçabilité</div>
        <div class="body trace">
          <div>Date et heure de l'intubation : ${line()} à ${line()} H</div>
          <div style="margin-top:2mm">Médecin : ${line("", true)}</div>
          <div style="margin-top:2mm">IDE : ${line("", true)}</div>
          <div style="margin-top:2mm">Signature : ${line("", true)}</div>
        </div>
      </section>
    </div>
  </section>
  <div class="footer">SEULE LA VERSION ÉLECTRONIQUE EST OPPOSABLE</div>
</main><script>window.onload=function(){window.print();}</scr` + `ipt></body></html>`
  );
};
