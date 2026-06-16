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
          position: "relative",
          minHeight: 620,
          overflow: "hidden",
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "linear-gradient(135deg, #f8fdff 0%, #eef9fb 100%)",
        }}
      >
        <div style={{ position: "absolute", left: 24, top: 22, color: "#0b2f5f", fontSize: 26, fontWeight: 900 }}>
          Schéma du kit PA
        </div>
        <div style={{ position: "absolute", left: 24, top: 58, color: "#07969b", fontSize: 16, fontWeight: 800 }}>
          Pression artérielle invasive
        </div>

        <div style={{ position: "absolute", left: 54, top: 225, width: 170, height: 118, border: "3px solid #718495", borderRadius: 16, background: "#eef3f7" }}>
          <div style={{ position: "absolute", left: 18, top: 20, width: 108, height: 72, borderRadius: 7, background: "#0c243b" }}>
            <div style={{ position: "absolute", left: 12, top: 36, width: 84, height: 3, background: "#2fd4c8", boxShadow: "22px -14px 0 -1px #2fd4c8, 42px 12px 0 -1px #2fd4c8, 66px -10px 0 -1px #2fd4c8" }} />
            <div style={{ position: "absolute", right: 8, top: 18, color: "#41e0d0", fontSize: 19, fontWeight: 900 }}>120</div>
            <div style={{ position: "absolute", right: 10, top: 44, color: "#41e0d0", fontSize: 19, fontWeight: 900 }}>80</div>
          </div>
          <div style={{ position: "absolute", right: 16, top: 30, width: 18, height: 18, borderRadius: 999, background: "#07969b" }} />
          <div style={{ position: "absolute", right: 16, top: 58, width: 18, height: 18, borderRadius: 999, background: "#f59e0b" }} />
        </div>
        <Label left={40} top={160}>Scope</Label>
        <Line left={112} top={203} width={80} rotate={35} color="#07969b" />
        <Line left={224} top={315} width={292} rotate={25} />
        <Label left={56} top={430}>Câble interface</Label>
        <Line left={190} top={454} width={145} rotate={-8} color="#07969b" />

        <div style={{ position: "absolute", left: 430, top: 86, width: 10, height: 498, borderRadius: 999, background: "#9aa9b5" }} />
        <div style={{ position: "absolute", left: 378, top: 82, width: 116, height: 10, borderRadius: 999, background: "#9aa9b5" }} />

        <div style={{ position: "absolute", left: 498, top: 112, width: 104, height: 166, borderRadius: 48, border: "3px solid #6b7f8f", background: "rgba(255,255,255,.76)" }}>
          <div style={{ position: "absolute", left: 8, right: 8, bottom: 22, height: 70, borderRadius: "0 0 42px 42px", background: "rgba(117,218,231,.55)" }} />
          <div style={{ position: "absolute", left: -8, right: -8, bottom: 42, height: 50, borderRadius: 10, background: "rgba(7,150,155,.82)" }} />
          <div style={{ position: "absolute", left: 25, top: 52, color: "#0b2f5f", fontSize: 18, fontWeight: 900 }}>NaCl</div>
          <div style={{ position: "absolute", left: 24, top: 76, color: "#0b2f5f", fontSize: 18, fontWeight: 900 }}>0,9 %</div>
        </div>
        <Label left={710} top={136}>Poche NaCl 0,9 %</Label>
        <Line left={602} top={164} width={104} color="#07969b" />

        <div style={{ position: "absolute", left: 620, top: 260, width: 46, height: 46, borderRadius: 999, border: "3px solid #6b7f8f", background: "#fff" }}>
          <div style={{ position: "absolute", left: 22, top: 22, width: 20, height: 3, background: "#cf2434", transform: "rotate(-40deg)", transformOrigin: "left center" }} />
        </div>
        <div style={{ position: "absolute", left: 631, top: 306, width: 22, height: 40, borderRadius: 8, background: "#485b68" }} />
        <div style={{ position: "absolute", left: 605, top: 345, width: 72, height: 108, borderRadius: 40, background: "#0b5eaa", border: "3px solid #063b70" }} />
        <Line left={588} top={205} width={92} rotate={70} />
        <Label left={720} top={263}>Manomètre</Label>
        <Line left={666} top={284} width={50} color="#07969b" />
        <Label left={720} top={380}>Manchon de pression<br /><span style={{ fontWeight: 600, fontSize: 12 }}>met la poche sous pression</span></Label>
        <Line left={676} top={399} width={40} color="#07969b" />

        <Line left={550} top={278} width={210} rotate={90} color="#07969b" />
        <div style={{ position: "absolute", left: 520, top: 415, width: 135, height: 120, border: "3px solid #6b7f8f", borderRadius: 17, background: "rgba(255,255,255,.8)" }}>
          <div style={{ position: "absolute", left: 50, top: 22, width: 38, height: 74, borderRadius: 8, border: "3px solid #6b7f8f", background: "#e7eef3" }} />
          <div style={{ position: "absolute", left: 60, top: 42, width: 18, height: 38, borderRadius: 4, background: "#f59e0b" }} />
          <div style={{ position: "absolute", left: 92, top: 46, width: 17, height: 45, borderRadius: 4, background: "#d7e3ea" }} />
        </div>
        <Label left={720} top={482}>Tête de pression (capteur)</Label>
        <Line left={654} top={502} width={62} color="#07969b" />
        <Label left={720} top={548}>Dispositif de rinçage intégré</Label>
        <Line left={654} top={570} width={62} color="#07969b" />

        <Line left={585} top={535} width={260} rotate={13} color="#07969b" />
        <div style={{ position: "absolute", left: 810, top: 562, width: 58, height: 58, borderRadius: 999, border: "5px solid #0b5eaa", background: "#fff" }}>
          <div style={{ position: "absolute", left: 21, top: -23, width: 16, height: 104, borderRadius: 999, background: "#0b5eaa" }} />
          <div style={{ position: "absolute", left: -23, top: 21, width: 104, height: 16, borderRadius: 999, background: "#0b5eaa" }} />
        </div>
        <Line left={868} top={591} width={250} color="#07969b" />
        <div style={{ position: "absolute", left: 1045, top: 578, width: 58, height: 28, borderRadius: 8, border: "3px solid #6b7f8f", background: "#e7eef3" }} />
        <div style={{ position: "absolute", left: 1118, top: 591, width: 105, height: 4, borderRadius: 999, background: "#6b7f8f" }} />
        <div style={{ position: "absolute", left: 1198, top: 585, width: 25, height: 14, background: "#cf2434" }} />
        <Label left={710} top={635}>Robinet 3 voies<br /><span style={{ fontWeight: 600, fontSize: 12 }}>port de prélèvement</span></Label>
        <Line left={840} top={620} width={34} rotate={90} color="#07969b" />
        <Label left={1020} top={635}>Cathéter artériel</Label>
        <Line left={1110} top={620} width={34} rotate={90} color="#07969b" />
      </div>
    </div>
  );
};

const Label = ({ left, top, children }: { left: number; top: number; children: React.ReactNode }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      border: "2px solid #07969b",
      borderRadius: 12,
      padding: "8px 12px",
      background: "#fff",
      color: "#0b2f5f",
      fontWeight: 800,
      fontSize: 14,
      lineHeight: 1.2,
      boxShadow: "0 6px 18px rgba(11, 47, 95, 0.08)",
    }}
  >
    {children}
  </div>
);

const Line = ({ left, top, width, rotate = 0, color = "#8ca0ad" }: { left: number; top: number; width: number; rotate?: number; color?: string }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      height: 6,
      borderRadius: 999,
      background: color,
      transform: `rotate(${rotate}deg)`,
      transformOrigin: "left center",
    }}
  />
);

export default PaPressureSchema;
