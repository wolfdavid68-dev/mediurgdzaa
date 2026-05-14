import { useState, type FormEvent } from "react";
import MatriculeInput from "./MatriculeInput";
import { isValidMatricule, requestPasswordReset } from "../../lib/auth";

// Étape 1 du flow « mot de passe oublié » : l'user saisit son matricule,
// on envoie un mail contenant un lien magique (Supabase recovery). Le clic
// sur le lien réouvre l'app avec un hash `#access_token=...&type=recovery`,
// AuthGate intercepte l'event PASSWORD_RECOVERY et affiche ResetPasswordScreen.
//
// Comportement anti-énumération : le succès est annoncé même si le matricule
// est inconnu (cf. requestPasswordReset).

type Props = {
  onBackToLogin: () => void;
};

const ForgotPasswordScreen = ({ onBackToLogin }: Props) => {
  const [matriculeDigits, setMatriculeDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 400);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const matricule = `M${matriculeDigits}`;
    if (!isValidMatricule(matricule)) {
      setError("Format attendu : M + 6 chiffres (ex : M402100)");
      triggerShake();
      return;
    }
    setLoading(true);
    const result = await requestPasswordReset(matricule);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      triggerShake();
      return;
    }
    setSent(true);
  };

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

              <form onSubmit={onSubmit} className="auth-form" noValidate>
                <label className="auth-field">
                  <span className="auth-field-label">Matricule</span>
                  <MatriculeInput
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
