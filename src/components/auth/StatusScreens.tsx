import { logout } from "../../lib/auth";

// Écrans de status post-login : pending (en attente de validation admin)
// et banned (suspendu). L'AuthGate les rend selon `profile.status`.
//
// Volontairement minimalistes : pas d'action utilisateur possible à part
// se déconnecter et contacter l'admin. Pas de bouton « Réessayer » qui
// bouclerait sans rien faire.

type Props = { onLogout: () => void };

export const PendingApprovalScreen = ({ onLogout }: Props) => {
  const handleLogout = async () => {
    await logout();
    onLogout();
  };
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
          <div className="auth-eyebrow">En attente de validation</div>
          <h2 className="auth-card-title">Compte non encore activé</h2>
          <p className="auth-card-sub">
            Ta demande d'inscription a bien été transmise à l'administrateur du service. Tu recevras
            un email dès qu'elle sera validée. En attendant, tu ne peux pas accéder à l'application.
          </p>
          <p className="auth-card-sub auth-card-sub-mute">
            Délai habituel : moins de 24 heures ouvrées.
          </p>
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
    await logout();
    onLogout();
  };
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
          <div className="auth-eyebrow auth-eyebrow-danger">Compte suspendu</div>
          <h2 className="auth-card-title">Accès révoqué</h2>
          <p className="auth-card-sub">
            Ton compte a été suspendu par l'administrateur du service. Contacte le cadre de garde ou
            la cellule SI du GHRMSA pour comprendre la raison et demander un rétablissement.
          </p>
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
