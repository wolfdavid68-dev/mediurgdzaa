import { useState } from "react";

// Tableau diagnostique ECG (source : SMUR Sélestat).
// Sélecteur interactif en haut + tableau de référence PDF en dessous.

type Fc = ">100" | "60-100" | "<60";
type R = "Régulier" | "Irrégulier";
type Q = "Fins" | "Larges";
type P = "Oui" | "Non";

type Row = {
  fc: Fc;
  r: R;
  q: Q;
  p: P;
  dx: string;
  alt?: string;
};

const ROWS: Row[] = [
  // FC > 100
  { fc: ">100", r: "Régulier", q: "Fins", p: "Oui", dx: "Tachycardie sinusale ou tachy atriale" },
  { fc: ">100", r: "Régulier", q: "Fins", p: "Non", dx: "Tachycardie de Bouveret" },
  { fc: ">100", r: "Régulier", q: "Larges", p: "Oui", dx: "Tachycardie sinusale + BB" },
  { fc: ">100", r: "Régulier", q: "Larges", p: "Non", dx: "TV" },
  { fc: ">100", r: "Irrégulier", q: "Fins", p: "Oui", dx: "Tachycardie sinusale + ESSV" },
  { fc: ">100", r: "Irrégulier", q: "Fins", p: "Non", dx: "TACFA" },
  { fc: ">100", r: "Irrégulier", q: "Larges", p: "Oui", dx: "Tachycardie sinusale + BB + ESSV" },
  { fc: ">100", r: "Irrégulier", q: "Larges", p: "Non", dx: "TACFA + BB" },
  // 60 < FC < 100
  { fc: "60-100", r: "Régulier", q: "Fins", p: "Oui", dx: "RSN" },
  { fc: "60-100", r: "Régulier", q: "Fins", p: "Non", dx: "Rythme jonctionnel" },
  { fc: "60-100", r: "Régulier", q: "Larges", p: "Oui", dx: "Rythme sinusal + BB" },
  {
    fc: "60-100",
    r: "Régulier",
    q: "Larges",
    p: "Non",
    dx: "Rythme idioventriculaire accéléré",
  },
  { fc: "60-100", r: "Irrégulier", q: "Fins", p: "Oui", dx: "Rythme sinusal + ESSV" },
  { fc: "60-100", r: "Irrégulier", q: "Fins", p: "Non", dx: "ACFA" },
  { fc: "60-100", r: "Irrégulier", q: "Larges", p: "Oui", dx: "Rythme sinusal + BB + ESSV" },
  { fc: "60-100", r: "Irrégulier", q: "Larges", p: "Non", dx: "ACFA + BB" },
  // FC < 60
  { fc: "<60", r: "Régulier", q: "Fins", p: "Oui", dx: "Bradycardie sinusale" },
  { fc: "<60", r: "Régulier", q: "Fins", p: "Non", dx: "Bradycardie jonctionnelle" },
  { fc: "<60", r: "Régulier", q: "Larges", p: "Oui", dx: "Bradycardie sinusale + BB" },
  { fc: "<60", r: "Régulier", q: "Larges", p: "Non", dx: "Rythme idioventriculaire" },
  {
    fc: "<60",
    r: "Irrégulier",
    q: "Fins",
    p: "Oui",
    dx: "Bradycardie sinusale + ESSV",
    alt: "Bloc II ou III si P > QRS (ondes P isolées)",
  },
  { fc: "<60", r: "Irrégulier", q: "Fins", p: "Non", dx: "BACFA" },
  {
    fc: "<60",
    r: "Irrégulier",
    q: "Larges",
    p: "Oui",
    dx: "Bradycardie sinusale + BB + ES",
    alt: "BAV III si P > QRS (ondes P isolées)",
  },
  { fc: "<60", r: "Irrégulier", q: "Larges", p: "Non", dx: "BACFA + BB" },
];

const X = ({ kind }: { kind: "fc" | "r" | "q" | "p" }) => (
  <span className={`ecg-x ecg-x-${kind}`}>×</span>
);

const EcgDiagnostic = () => {
  const [fc, setFc] = useState<Fc | null>(null);
  const [r, setR] = useState<R | null>(null);
  const [q, setQ] = useState<Q | null>(null);
  const [p, setP] = useState<P | null>(null);

  const reset = () => {
    setFc(null);
    setR(null);
    setQ(null);
    setP(null);
  };

  const matchIdx = ROWS.findIndex(
    (row) => row.fc === fc && row.r === r && row.q === q && row.p === p
  );
  const match = matchIdx >= 0 ? ROWS[matchIdx] : null;
  const allSelected = fc && r && q && p;

  // Surligne aussi les lignes partiellement compatibles avec les sélections faites
  const rowMatchesPartial = (row: Row) =>
    (!fc || row.fc === fc) && (!r || row.r === r) && (!q || row.q === q) && (!p || row.p === p);

  return (
    <div className="ecg-wrap">
      {/* Sélecteur interactif */}
      <div className="ecg-picker">
        <div className="ecg-picker-row">
          <div className="ecg-picker-label">FC</div>
          <div className="ecg-picker-chips">
            {(["<60", "60-100", ">100"] as Fc[]).map((v) => (
              <button
                key={v}
                className={`ecg-pchip ecg-pchip-fc ${fc === v ? "ecg-pchip-on" : ""}`}
                onClick={() => setFc(fc === v ? null : v)}
              >
                {v === "<60" ? "< 60" : v === "60-100" ? "60–100" : "> 100"}
              </button>
            ))}
          </div>
        </div>
        <div className="ecg-picker-row">
          <div className="ecg-picker-label">Rythme</div>
          <div className="ecg-picker-chips">
            {(["Régulier", "Irrégulier"] as R[]).map((v) => (
              <button
                key={v}
                className={`ecg-pchip ecg-pchip-r ${r === v ? "ecg-pchip-on" : ""}`}
                onClick={() => setR(r === v ? null : v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="ecg-picker-row">
          <div className="ecg-picker-label">QRS</div>
          <div className="ecg-picker-chips">
            {(["Fins", "Larges"] as Q[]).map((v) => (
              <button
                key={v}
                className={`ecg-pchip ecg-pchip-q ${q === v ? "ecg-pchip-on" : ""}`}
                onClick={() => setQ(q === v ? null : v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="ecg-picker-row">
          <div className="ecg-picker-label">Ondes P</div>
          <div className="ecg-picker-chips">
            {(["Oui", "Non"] as P[]).map((v) => (
              <button
                key={v}
                className={`ecg-pchip ecg-pchip-p ${p === v ? "ecg-pchip-on" : ""}`}
                onClick={() => setP(p === v ? null : v)}
              >
                P : {v}
              </button>
            ))}
          </div>
        </div>

        {(fc || r || q || p) && (
          <button className="ecg-reset" onClick={reset}>
            Réinitialiser
          </button>
        )}
      </div>

      {/* Résultat */}
      {allSelected && match && (
        <div className="ecg-result">
          <div className="ecg-result-label">Diagnostic</div>
          <div className="ecg-result-dx">{match.dx}</div>
          {match.alt && <div className="ecg-result-alt">{match.alt}</div>}
        </div>
      )}

      <div className="ecg-scroll-hint">↔ Tableau de référence (faites défiler ↔)</div>

      <div className="ecg-matrix-scroll">
        <table className="ecg-matrix">
          <thead>
            <tr className="ecg-h1">
              <th colSpan={3} className="ecg-grp ecg-grp-fc">
                Fréquence ?
              </th>
              <th colSpan={2} className="ecg-grp ecg-grp-r">
                Rythme ?
              </th>
              <th colSpan={2} className="ecg-grp ecg-grp-q">
                QRS ?
              </th>
              <th colSpan={2} className="ecg-grp ecg-grp-p">
                Ondes P ?
              </th>
              <th rowSpan={2} className="ecg-grp ecg-grp-dx">
                Diagnostic
              </th>
            </tr>
            <tr className="ecg-h2">
              <th>&lt; 60</th>
              <th>60–100</th>
              <th>&gt; 100</th>
              <th>Rég.</th>
              <th>Irrég.</th>
              <th>Fins</th>
              <th>Larges</th>
              <th>Oui</th>
              <th>Non</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => {
              const isExactMatch = match === row;
              const isPartial = !isExactMatch && (fc || r || q || p) && rowMatchesPartial(row);
              const isDim = (fc || r || q || p) && !isExactMatch && !isPartial;
              const isNewFcGroup = i === 0 || ROWS[i - 1].fc !== row.fc;
              return (
                <tr
                  key={i}
                  className={[
                    isExactMatch ? "ecg-row-match" : "",
                    isPartial ? "ecg-row-partial" : "",
                    isDim ? "ecg-row-dim" : "",
                    isNewFcGroup ? "ecg-row-newgrp" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td className="ecg-cell">{row.fc === "<60" && <X kind="fc" />}</td>
                  <td className="ecg-cell">{row.fc === "60-100" && <X kind="fc" />}</td>
                  <td className="ecg-cell">{row.fc === ">100" && <X kind="fc" />}</td>
                  <td className="ecg-cell">{row.r === "Régulier" && <X kind="r" />}</td>
                  <td className="ecg-cell">{row.r === "Irrégulier" && <X kind="r" />}</td>
                  <td className="ecg-cell">{row.q === "Fins" && <X kind="q" />}</td>
                  <td className="ecg-cell">{row.q === "Larges" && <X kind="q" />}</td>
                  <td className="ecg-cell">{row.p === "Oui" && <X kind="p" />}</td>
                  <td className="ecg-cell">{row.p === "Non" && <X kind="p" />}</td>
                  <td className="ecg-dx">
                    <div>{row.dx}</div>
                    {row.alt && <div className="ecg-dx-alt">{row.alt}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ecg-remarques">
        <div className="ecg-remarques-title">Remarques</div>
        <div className="ecg-remarque">
          <span className="ecg-remarque-bullet">▸</span>
          <span>
            <strong>Ligne isoélectrique en toit d'usine</strong> = FLUTTER AURICULAIRE
          </span>
        </div>
        <div className="ecg-remarque">
          <span className="ecg-remarque-bullet">▸</span>
          <span>
            <strong>Ondes P isolées</strong> = BAV II ou III
          </span>
        </div>
        <div className="ecg-remarque">
          <span className="ecg-remarque-bullet">▸</span>
          <span>
            <strong>Rythme régulier + P devant QRS + PR allongé</strong> = BAV I
          </span>
        </div>
      </div>
    </div>
  );
};

export default EcgDiagnostic;
