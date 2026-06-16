const PaPressureSchema = () => {
  return (
    <div className="kit-schema pa-schema-inline">
      <p className="kit-schema-intro">
        Montage restylisé du kit PA : le manchon de pression sert uniquement à mettre la poche de NaCl 0,9 % sous pression. Il ne se raccorde pas à la ligne patient.
      </p>

      <div
        aria-label="Schéma simplifié du système de pression artérielle invasive"
        role="img"
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          overflow: "hidden",
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "linear-gradient(135deg, #f8fdff 0%, #eef9fb 100%)",
          boxShadow: "0 10px 24px rgba(11, 47, 95, 0.08)",
        }}
      >
        <svg viewBox="0 0 360 360" width="100%" height="auto" style={{ display: "block" }}>
          <defs>
            <filter id="pa-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0b2f5f" floodOpacity="0.12" />
            </filter>
            <marker id="pa-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#07969b" />
            </marker>
          </defs>

          <text x="18" y="28" fill="#0b2f5f" fontSize="21" fontWeight="900">
            Kit PA invasive
          </text>
          <text x="18" y="50" fill="#07969b" fontSize="13" fontWeight="800">
            Lecture simplifiée — mobile
          </text>

          <g filter="url(#pa-soft-shadow)">
            <rect x="18" y="78" width="126" height="76" rx="14" fill="#eef3f7" stroke="#718495" strokeWidth="3" />
            <rect x="39" y="101" width="74" height="37" rx="7" fill="#0c243b" />
            <path d="M49 124 H108 M63 113 H114 M68 134 H111" stroke="#2fd4c8" strokeWidth="3" strokeLinecap="round" />
            <text x="87" y="123" fill="#41e0d0" fontSize="16" fontWeight="900">
              120
            </text>
            <text x="94" y="139" fill="#41e0d0" fontSize="15" fontWeight="900">
              80
            </text>
            <circle cx="121" cy="112" r="8" fill="#07969b" />
            <circle cx="121" cy="136" r="8" fill="#f59e0b" />
          </g>
          <SchemaPill x={35} y={63} width={92} text="1 Scope" />

          <g filter="url(#pa-soft-shadow)">
            <path d="M252 66 H291 A18 18 0 0 1 309 84 V133 A29 29 0 0 1 280 162 A29 29 0 0 1 251 133 V67 Z" fill="rgba(255,255,255,.9)" stroke="#6b7f8f" strokeWidth="3" />
            <path d="M256 120 H304 V136 A24 24 0 0 1 280 160 A24 24 0 0 1 256 136 Z" fill="rgba(117,218,231,.55)" />
            <rect x="242" y="111" width="76" height="30" rx="8" fill="rgba(7,150,155,.82)" />
            <text x="263" y="99" fill="#0b2f5f" fontSize="16" fontWeight="900">
              NaCl
            </text>
            <text x="262" y="117" fill="#0b2f5f" fontSize="15" fontWeight="900">
              0,9 %
            </text>
          </g>
          <SchemaPill x={224} y={28} width={112} text="2 Poche" />

          <g filter="url(#pa-soft-shadow)">
            <circle cx="280" cy="191" r="19" fill="#fff" stroke="#6b7f8f" strokeWidth="3" />
            <path d="M281 191 l12 -11" stroke="#cf2434" strokeWidth="3" strokeLinecap="round" />
            <rect x="270" y="210" width="20" height="30" rx="7" fill="#485b68" />
            <rect x="248" y="237" width="62" height="63" rx="29" fill="#0b5eaa" stroke="#063b70" strokeWidth="3" />
          </g>
          <SchemaPill x={213} y={306} width={132} text="3 Manchon" />
          <path d="M280 162 V187" stroke="#8ca0ad" strokeWidth="5" strokeLinecap="round" />

          <path d="M248 269 C221 258 205 242 198 222" stroke="#07969b" strokeWidth="5" strokeLinecap="round" fill="none" markerEnd="url(#pa-arrow)" />
          <g filter="url(#pa-soft-shadow)">
            <rect x="94" y="189" width="108" height="72" rx="14" fill="rgba(255,255,255,.92)" stroke="#6b7f8f" strokeWidth="3" />
            <rect x="134" y="205" width="32" height="40" rx="6" fill="#e7eef3" stroke="#6b7f8f" strokeWidth="3" />
            <rect x="141" y="217" width="14" height="24" rx="4" fill="#f59e0b" />
            <rect x="169" y="220" width="15" height="26" rx="4" fill="#d7e3ea" />
          </g>
          <SchemaPill x={74} y={165} width={148} text="4 Capteur" />

          <path d="M148 261 V301" stroke="#07969b" strokeWidth="5" strokeLinecap="round" markerEnd="url(#pa-arrow)" />
          <g filter="url(#pa-soft-shadow)">
            <circle cx="148" cy="314" r="23" fill="#fff" stroke="#0b5eaa" strokeWidth="5" />
            <path d="M148 278 V350 M112 314 H184" stroke="#0b5eaa" strokeWidth="10" strokeLinecap="round" />
          </g>
          <SchemaPill x={18} y={300} width={96} text="5 Robinet" />

          <path d="M171 322 C211 335 244 333 283 318" stroke="#07969b" strokeWidth="5" strokeLinecap="round" fill="none" markerEnd="url(#pa-arrow)" />
          <rect x="284" y="306" width="42" height="18" rx="6" fill="#e7eef3" stroke="#6b7f8f" strokeWidth="3" />
          <path d="M326 315 H346" stroke="#6b7f8f" strokeWidth="4" strokeLinecap="round" />
          <path d="M340 311 h13 v8 h-13 z" fill="#cf2434" />
          <SchemaPill x={217} y={333} width={124} text="6 Cathéter" />
        </svg>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
          gap: 8,
          marginTop: 10,
        }}
      >
        <LegendItem n="1" title="Scope" text="affiche la PA invasive" />
        <LegendItem n="2" title="Poche NaCl" text="dans le manchon, sous pression" />
        <LegendItem n="4" title="Capteur" text="tête de pression + rinçage" />
        <LegendItem n="6" title="Cathéter" text="seule ligne vers le patient" />
      </div>
    </div>
  );
};

const SchemaPill = ({ x, y, width, text }: { x: number; y: number; width: number; text: string }) => (
  <g>
    <rect x={x} y={y} width={width} height="28" rx="10" fill="#fff" stroke="#07969b" strokeWidth="2.5" />
    <text x={x + width / 2} y={y + 18} textAnchor="middle" fill="#0b2f5f" fontSize="12" fontWeight="900">
      {text}
    </text>
  </g>
);

const LegendItem = ({ n, title, text }: { n: string; title: string; text: string }) => (
  <div
    style={{
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
      padding: "8px 10px",
      border: "1px solid var(--border)",
      borderRadius: 10,
      background: "var(--bg-elevated)",
      color: "var(--text)",
      lineHeight: 1.25,
    }}
  >
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        flex: "0 0 22px",
        borderRadius: 999,
        background: "#07969b",
        color: "#fff",
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {n}
    </span>
    <span style={{ minWidth: 0 }}>
      <strong style={{ display: "block", fontSize: 13 }}>{title}</strong>
      <span style={{ display: "block", marginTop: 2, color: "var(--text-dim)", fontSize: 12 }}>{text}</span>
    </span>
  </div>
);

export default PaPressureSchema;
