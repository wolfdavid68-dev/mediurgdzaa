import { useEffect, useState } from "react";
import MatriculeInput from "./MatriculeInput";
import { useForgotPasswordForm } from "./hooks/useForgotPasswordForm";

// Étape 1 du flow « mot de passe oublié » : l'user saisit son matricule,
// on envoie un mail contenant un lien magique (Supabase recovery). Le clic
// sur le lien réouvre l'app avec un hash `#access_token=...&type=recovery`,
// AuthGate intercepte l'event PASSWORD_RECOVERY et affiche ResetPasswordScreen.
//
// Comportement anti-énumération : le succès est annoncé même si le matricule
// est inconnu (cf. requestPasswordReset).

type Props = {
  onBackToLogin: () => void;
  // Message à afficher en bandeau au-dessus du formulaire (e.g. retour
  // d'un lien recovery expiré : `#error_code=otp_expired`).
  initialError?: string | null;
};

const ForgotPasswordScreen = ({ onBackToLogin, initialError = null }: Props) => {
  const {
    matriculeDigits,
    setMatriculeDigits,
    loading,
    error,
    errorNonce,
    sent,
    submit: onSubmit,
  } = useForgotPasswordForm();
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (errorNonce === 0) return;
    setShake(true);
    const t = window.setTimeout(() => setShake(false), 400);
    return () => window.clearTimeout(t);
  }, [errorNonce]);

  return (
    <div className="auth-stage">
      <div className="auth-bg-decor" aria-hidden="true">
        <div className="auth-bg-glow auth-bg-glow-1" />
        <div className="auth-bg-glow auth-bg-glow-2" />
        <div className="auth-bg-grid" />
      </div>

      <div className={`auth-shell auth-shell-single ${shake ? "auth-shake" : ""}`}>
        <main className="auth-card auth-card-narrow">
          <div className="auth-card-head-row">
            <button
              type="button"
              className="auth-back"
              onClick={onBackToLogin}
              aria-label="Retour à la connexion"
            >
              ←
            </button>
            <div className="auth-card-step">Mot de passe oublié</div>
          </div>

          {!sent && (
            <>
              <div className="auth-eyebrow">Réinitialisation</div>
              <h2 className="auth-card-title">Renvoi par email</h2>
              <p className="auth-card-sub">
                Saisis ton matricule. Un lien de réinitialisation sera envoyé à l'adresse email
                associée à ton compte.
              </p>

              {initialError && (
                <div className="auth-banner auth-banner-warn" role="alert">
                  <span className="auth-banner-icon" aria-hidden="true">
                    ⚠
                  </span>
                  <span>{initialError}</span>
                </div>
              )}

              <form onSubmit={onSubmit} className="auth-form" noValidate>
                <label className="auth-field" htmlFor="forgot-matricule">
                  <span className="auth-field-label">Matricule</span>
                  <MatriculeInput
                    id="forgot-matricule"
                    value={matriculeDigits}
                    onChange={setMatriculeDigits}
                    autoFocus
                    disabled={loading}
                  />
                </label>

                {error && (
                  <div className="auth-error" role="alert">
                    {error}
                  </div>
                )}

                <button type="submit" className="auth-btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="auth-spinner" aria-hidden="true" /> Envoi…
                    </>
                  ) : (
                    "Envoyer le lien"
                  )}
                </button>

                <button
                  type="button"
                  className="auth-btn-secondary"
                  onClick={onBackToLogin}
                  disabled={loading}
                >
                  Retour à la connexion
                </button>
              </form>
            </>
          )}

          {sent && (
            <div className="auth-success">
              <div className="auth-success-icon" aria-hidden="true">
                ✉
              </div>
              <h2 className="auth-card-title">Email envoyé</h2>
              <p className="auth-card-sub">
                Si ton matricule correspond à un compte actif, un email contenant un lien de
                réinitialisation vient de t'être envoyé. Le lien expire dans 1 heure.
              </p>
              <p className="auth-card-sub auth-card-sub-mute">
                Pense à vérifier ton dossier <em>Spam</em> si tu ne le trouves pas.
              </p>
              <button type="button" className="auth-btn-primary" onClick={onBackToLogin}>
                Retour à la connexion
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;
