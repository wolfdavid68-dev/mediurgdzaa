// Logo GHR + Urgences côte à côte, séparés d'un filet vertical.
// Port fidèle de MLogo (design_handoff mobile.jsx) : SAU légèrement plus
// grand que GHR (×1.05), séparateur à 66 % de la hauteur.
type Props = { size?: number };

const MobileLogo = ({ size = 42 }: Props) => (
  <div className="m-logo" style={{ height: size }}>
    <img src="/logo-ghr.png" alt="GHR Mulhouse Sud-Alsace" style={{ height: size }} />
    <span className="m-logo-sep" style={{ height: size * 0.66 }} aria-hidden="true" />
    <img src="/logo-sau.png" alt="Urgences Mulhouse" style={{ height: size * 1.05 }} />
  </div>
);

export default MobileLogo;
