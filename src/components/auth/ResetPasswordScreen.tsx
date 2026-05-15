import { useEffect, useState } from "react";
import { useResetPasswordForm } from "./hooks/useResetPasswordForm";

// Étape 2 du flow « mot de passe oublié » : l'user a cliqué sur le lien
// envoyé par mail, Supabase a établi une session de récupération (event
// PASSWORD_RECOVERY) et AuthGate nous a rendus. On demande un nouveau
// mot de passe puis on déconnecte → retour à l'écran login normal.

type Props = {
  onDone: () => void;
};

const ResetPasswordScreen = ({ onDone }: Props) => {
  const {
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    loading,
    error,
    errorNonce,
    done,
    strength,
    submit: onSubmit,
  } = useResetPasswordForm();
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
          {!done && (
            <>
              <div className="auth-eyebrow">Réinitialisation</div>
              <h2 className="auth-card-title">Nouveau mot de passe</h2>
              <p className="auth-card-sub">
                Choisis un nouveau mot de passe d'au moins 8 caractères. Il remplacera l'ancien
                immédiatement.
              </p>

              <form onSubmit={onSubmit} className="auth-form" noValidate>
                <label className="auth-field">
                  <span className="auth-field-label">Nouveau mot de passe</span>
                  <input
                    type="password"
                    className="auth-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    disabled={loading}
                  />
                  <div className="auth-pw-strength" aria-label={`Force : ${strength}/5`}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`auth-pw-bar ${i < strength ? `auth-pw-bar-${strength}` : ""}`}
                      />
                    ))}
                  </div>
                </label>

                <label className="auth-field">
                  <span className="auth-field-label">Confirmer le mot de passe</span>
                  <input
                    type="password"
                    className="auth-input"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
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
                      <span className="auth-spinner" aria-hidden="true" /> Mise à jour…
                    </>
                  ) : (
                    "Mettre à jour le mot de passe"
                  )}
                </button>
              </form>
            </>
          )}

          {done && (
            <div className="auth-success">
              <div className="auth-success-icon" aria-hidden="true">
                ✓
              </div>
              <h2 className="auth-card-title">Mot de passe mis à jour</h2>
              <p className="auth-card-sub">
                Tu peux maintenant te connecter avec ton matricule et ton nouveau mot de passe.
              </p>
              <button type="button" className="auth-btn-primary" onClick={onDone}>
                Retour à la connexion
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
