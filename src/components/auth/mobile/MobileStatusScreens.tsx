import MobileLogo from "./MobileLogo";
import { Warn } from "./icons";
import { AUTH_STATUS_COPY, logoutAndNotify } from "../authStatusContent";

// Écrans de status post-login en design mobile (carte glass centrée,
// cohérente avec le m-welcome du handoff). La maquette mobile ne spécifie
// pas ces écrans : on réutilise les primitives .m- pour rester homogène.

type Props = { onLogout: () => void };

export const MobilePendingScreen = ({ onLogout }: Props) => {
  const copy = AUTH_STATUS_COPY.pending;
  return (
    <div className="m-app">
      <div className="m-stage m-welcome-stage">
        <div className="m-bg-glow" aria-hidden="true" />
        <div className="m-welcome">
          <MobileLogo size={40} />
          <div className="m-eyebrow m-eyebrow-warn">{copy.eyebrow}</div>
          <h1 className="m-h1 m-h1-sm">{copy.mobileTitle}</h1>
          <p className="m-sub">{copy.mobileBody}</p>
          <button
            type="button"
            className="m-btn m-btn-ghost"
            onClick={() => logoutAndNotify(onLogout)}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

type BannedProps = Props & { reason?: string | null };

export const MobileBannedScreen = ({ onLogout, reason }: BannedProps) => {
  const copy = AUTH_STATUS_COPY.banned;
  return (
    <div className="m-app">
      <div className="m-stage m-welcome-stage">
        <div className="m-bg-glow" aria-hidden="true" />
        <div className="m-welcome">
          <MobileLogo size={40} />
          <div className="m-eyebrow m-eyebrow-danger">{copy.eyebrow}</div>
          <h1 className="m-h1 m-h1-sm">{copy.mobileTitle}</h1>
          <p className="m-sub">{copy.mobileBody}</p>
          {reason && (
            <div className="m-err" role="note">
              <Warn />
              <span>Motif : {reason}</span>
            </div>
          )}
          <button
            type="button"
            className="m-btn m-btn-ghost"
            onClick={() => logoutAndNotify(onLogout)}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};
