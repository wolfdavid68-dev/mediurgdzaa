import { logout } from "../../../lib/auth";
import MobileLogo from "./MobileLogo";
import { Warn } from "./icons";

// Écrans de status post-login en design mobile (carte glass centrée,
// cohérente avec le m-welcome du handoff). La maquette mobile ne spécifie
// pas ces écrans : on réutilise les primitives .m- pour rester homogène.

type Props = { onLogout: () => void };

const handle = async (onLogout: () => void) => {
  await logout();
  onLogout();
};

export const MobilePendingScreen = ({ onLogout }: Props) => (
  <div className="m-app">
    <div className="m-stage m-welcome-stage">
      <div className="m-bg-glow" aria-hidden="true" />
      <div className="m-welcome">
        <MobileLogo size={40} />
        <div className="m-eyebrow m-eyebrow-warn">En attente de validation</div>
        <h1 className="m-h1 m-h1-sm">Compte non activé.</h1>
        <p className="m-sub">
          Ta demande d'inscription a bien été transmise à l'administrateur du service. Tu recevras
          un email dès qu'elle sera validée — délai habituel : moins de 24 h ouvrées.
        </p>
        <button type="button" className="m-btn m-btn-ghost" onClick={() => handle(onLogout)}>
          Se déconnecter
        </button>
      </div>
    </div>
  </div>
);

type BannedProps = Props & { reason?: string | null };

export const MobileBannedScreen = ({ onLogout, reason }: BannedProps) => (
  <div className="m-app">
    <div className="m-stage m-welcome-stage">
      <div className="m-bg-glow" aria-hidden="true" />
      <div className="m-welcome">
        <MobileLogo size={40} />
        <div className="m-eyebrow m-eyebrow-danger">Compte suspendu</div>
        <h1 className="m-h1 m-h1-sm">Accès révoqué.</h1>
        <p className="m-sub">
          Ton compte a été suspendu par l'administrateur du service. Contacte le cadre de garde ou
          la cellule SI du GHRMSA pour demander un rétablissement.
        </p>
        {reason && (
          <div className="m-err" role="note">
            <Warn />
            <span>Motif : {reason}</span>
          </div>
        )}
        <button type="button" className="m-btn m-btn-ghost" onClick={() => handle(onLogout)}>
          Se déconnecter
        </button>
      </div>
    </div>
  </div>
);
