const PaPressureSchema = () => {
  return (
    <div className="kit-schema pa-schema-inline">
      <p className="kit-schema-intro">
        Montage restylisé du kit PA : le manchon de pression sert uniquement à mettre la poche de NaCl 0,9 % sous pression. Il ne se raccorde pas à la ligne patient.
      </p>

      <div
        aria-label="Schéma du système de pression artérielle invasive"
        role="img"
        style={{
          width: "100%",
          maxWidth: 430,
          margin: "0 auto",
          overflow: "hidden",
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "linear-gradient(135deg, #f8fdff 0%, #eef9fb 100%)",
          boxShadow: "0 10px 24px rgba(11, 47, 95, 0.08)",
        }}
      >
        <svg viewBox="0 0 360 430" width="100%" height="auto" style={{ display: "block" }}>
          <defs>
            <filter id="pa-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0b2f5f" floodOpacity="0.12" />
            </filter>
            <marker id="pa-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#07969b" />
            </marker>
          </defs>

          <text x="18" y="28" fill="#0b2f5f" fontSize="21" fontWeight="900">
            Schéma du kit PA
          </text>
          <text x="18" y="50" fill="#07969b" fontSize="13" fontWeight="800">
            Pression artérielle invasive
          </text>

          <g filter="url(#pa-soft-shadow)">
            <rect x="16" y="74" width="132" height="86" rx="15" fill="#eef3f7" stroke="#718495" strokeWidth="3" />
            <rect x="38" y="98" width="83" height="44" rx="7" fill="#0c243b" />
            <path d="M48 123 H115 M67 111 H122 M74 134 H124" stroke="#2fd4c8" strokeWidth="3" strokeLinecap="round" />
            <text x="94" y="122" fill="#41e0d0" fontSize="17" fontWeight="900">
              120
            </text>
            <text x="101" y="140" fill="#41e0d0" fontSize="16" fontWeight="900">
              80
            </text>
            <circle cx="129" cy="112" r="9" fill="#07969b" />
            <circle cx="129" cy="136" r="9" fill="#f59e0b" />
          </g>
          <SchemaLabel x={25} y={64} width={76} text="Scope" />
          <SchemaLabel x={30} y={176} width={104} text="Câble interface" small />
          <path d="M126 162 C153 176 165 194 174 216" stroke="#07969b" strokeWidth="5" strokeLinecap="round" fill="none" markerEnd="url(#pa-arrow)" />

          <g filter="url(#pa-soft-shadow)">
            <path d="M250 67 H292 A19 19 0 0 1 311 86 V148 A31 31 0 0 1 280 179 A31 31 0 0 1 249 148 V68 Z" fill="rgba(255,255,255,.85)" stroke="#6b7f8f" strokeWidth="3" />
            <path d="M253 129 H307 V149 A27 27 0 0 1 280 176 A27 27 0 0 1 253 149 Z" fill="rgba(117,218,231,.55)" />
            <rect x="242" y="120" width="76" height="32" rx="8" fill="rgba(7,150,155,.82)" />
            <text x="263" y="103" fill="#0b2f5f" fontSize="16" fontWeight="900">
              NaCl
            </text>
            <text x="260" y="121" fill="#0b2f5f" fontSize="15" fontWeight="900">
              0,9 %
            </text>
          </g>
          <SchemaLabel x={212} y={28} width={126} text="Poche NaCl 0,9 %" />

          <g filter="url(#pa-soft-shadow)">
            <circle cx="279" cy="209" r="21" fill="#fff" stroke="#6b7f8f" strokeWidth="3" />
            <path d="M280 209 l14 -12" stroke="#cf2434" strokeWidth="3" strokeLinecap="round" />
            <rect x="268" y="229" width="22" height="36" rx="7" fill="#485b68" />
            <rect x="247" y="260" width="64" height="72" rx="30" fill="#0b5eaa" stroke="#063b70" strokeWidth="3" />
          </g>
          <SchemaLabel x={202} y={337} width={142} text="Manchon de pression" small />
          <text x="216" y="365" fill="#0b2f5f" fontSize="11" fontWeight="700">
            met la poche sous pression
          </text>
          <path d="M279 179 V205" stroke="#8ca0ad" strokeWidth="5" strokeLinecap="round" />

          <path d="M248 296 C224 286 217 274 214 257" stroke="#07969b" strokeWidth="5" strokeLinecap="round" fill="none" markerEnd="url(#pa-arrow)" />
          <g filter="url(#pa-soft-shadow)">
            <rect x="114" y="222" width="112" height="74" rx="14" fill="rgba(255,255,255,.9)" stroke="#6b7f8f" strokeWidth="3" />
            <rect x="157" y="237" width="32" height="44" rx="6" fill="#e7eef3" stroke="#6b7f8f" strokeWidth="3" />
            <rect x="163" y="249" width="14" height="27" rx="4" fill="#f59e0b" />
            <rect x="191" y="252" width="15" height="29" rx="4" fill="#d7e3ea" />
          </g>
          <SchemaLabel x={83} y={306} width={174} text="Tête de pression / capteur" />
          <text x="103" y="334" fill="#0b2f5f" fontSize="11" fontWeight="700">
            dispositif de rinçage intégré
          </text>

          <path d="M170 296 V356" stroke="#07969b" strokeWidth="5" strokeLinecap="round" markerEnd="url(#pa-arrow)" />
          <g filter="url(#pa-soft-shadow)">
            <circle cx="170" cy="367" r="25" fill="#fff" stroke="#0b5eaa" strokeWidth="5" />
            <path d="M170 327 V407 M130 367 H210" stroke="#0b5eaa" strokeWidth="10" strokeLinecap="round" />
          </g>
          <SchemaLabel x={22} y={352} width={102} text="Robinet 3 voies" small />
          <path d="M195 384 C226 395 251 396 279 388" stroke="#07969b" strokeWidth="5" strokeLinecap="round" fill="none" markerEnd="url(#pa-arrow)" />
          <rect x="283" y="374" width="44" height="18" rx="6" fill="#e7eef3" stroke="#6b7f8f" strokeWidth="3" />
          <path d="M327 383 H347" stroke="#6b7f8f" strokeWidth="4" strokeLinecap="round" />
          <path d="M341 379 h13 v8 h-13 z" fill="#cf2434" />
          <SchemaLabel x={219} y={399} width={124} text="Cathéter artériel" small />
        </svg>
      </div>
    </div>
  );
};

const SchemaLabel = ({ x, y, width, text, small = false }: { x: number; y: number; width: number; text: string; small?: boolean }) => (
  <g>
    <rect x={x} y={y} width={width} height={small ? 28 : 30} rx="10" fill="#fff" stroke="#07969b" strokeWidth="2" />
    <text x={x + width / 2} y={y + (small ? 18 : 20)} textAnchor="middle" fill="#0b2f5f" fontSize={small ? 11 : 12} fontWeight="800">
      {text}
    </text>
  </g>
);

export default PaPressureSchema;
