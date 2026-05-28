import { AUTH_STATUS_COPY, logoutAndNotify } from "./authStatusContent";

// Écrans de status post-login : pending (en attente de validation admin)
// et banned (suspendu). L'AuthGate les rend selon `profile.status`.
//
// Volontairement minimalistes : pas d'action utilisateur possible à part
// se déconnecter et contacter l'admin. Pas de bouton « Réessayer » qui
// bouclerait sans rien faire.

type Props = { onLogout: () => void };

export const PendingApprovalScreen = ({ onLogout }: Props) => {
  const handleLogout = async () => {
    await logoutAndNotify(onLogout);
  };
  const copy = AUTH_STATUS_COPY.pending;
  return (
    <div className="auth-stage">
      <div className="auth-bg-decor" aria-hidden="true">
        <div className="auth-bg-glow auth-bg-glow-1" />
        <div className="auth-bg-glow auth-bg-glow-2" />
        <div className="auth-bg-grid" />
      </div>
      <div className="auth-shell auth-shell-single">
        <main className="auth-card auth-card-narrow">
          <div className="auth-status-icon auth-status-icon-pending" aria-hidden="true">
            ⏳
          </div>
          <div className="auth-eyebrow">{copy.eyebrow}</div>
          <h2 className="auth-card-title">{copy.title}</h2>
          <p className="auth-card-sub">{copy.body}</p>
          <p className="auth-card-sub auth-card-sub-mute">{copy.help}</p>
          <button type="button" className="auth-btn-secondary" onClick={handleLogout}>
            Se déconnecter
          </button>
        </main>
      </div>
    </div>
  );
};

type BannedProps = Props & { reason?: string | null };

export const BannedScreen = ({ onLogout, reason }: BannedProps) => {
  const handleLogout = async () => {
    await logoutAndNotify(onLogout);
  };
  const copy = AUTH_STATUS_COPY.banned;
  return (
    <div className="auth-stage">
      <div className="auth-bg-decor" aria-hidden="true">
        <div className="auth-bg-glow auth-bg-glow-1" />
        <div className="auth-bg-glow auth-bg-glow-2" />
        <div className="auth-bg-grid" />
      </div>
      <div className="auth-shell auth-shell-single">
        <main className="auth-card auth-card-narrow">
          <div className="auth-status-icon auth-status-icon-banned" aria-hidden="true">
            ⚠
          </div>
          <div className="auth-eyebrow auth-eyebrow-danger">{copy.eyebrow}</div>
          <h2 className="auth-card-title">{copy.title}</h2>
          <p className="auth-card-sub">{copy.body}</p>
          {reason && (
            <div className="auth-ban-reason">
              <span className="auth-ban-reason-label">Motif</span>
              <span className="auth-ban-reason-value">{reason}</span>
            </div>
          )}
          <button type="button" className="auth-btn-secondary" onClick={handleLogout}>
            Se déconnecter
          </button>
        </main>
      </div>
    </div>
  );
};
