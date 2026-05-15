import { useEffect, useState } from "react";
import { useResetPasswordForm } from "../hooks/useResetPasswordForm";
import { Arrow, Check, Spinner, Warn } from "./icons";

// « Nouveau mot de passe » — design mobile dédié. Étape 2 du flow recovery :
// session de récupération établie (PASSWORD_RECOVERY), on demande un nouveau
// mot de passe puis on déconnecte → retour login propre.

const STRENGTH_LABELS = ["Très faible", "Faible", "Moyen", "Bon", "Solide", "Excellent"];

type Props = {
  onDone: () => void;
};

const MobileResetPasswordScreen = ({ onDone }: Props) => {
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
    <div className="m-app">
      <div className="m-stage m-reg">
        <div className="m-bg-glow" aria-hidden="true" />

        <header className="m-top-nav">
          <div style={{ width: 32 }} />
          <div className="m-top-title">Réinitialisation</div>
          <div style={{ width: 32 }} />
        </header>

        {!done && (
          <>
            <div className="m-hero m-hero-sm">
              <div className="m-eyebrow">Réinitialisation</div>
              <h2 className="m-h2">Nouveau mot de passe</h2>
              <p className="m-sub">
                Choisis un nouveau mot de passe d'au moins 8 caractères. Il remplacera l'ancien
                immédiatement.
              </p>
            </div>

            <form className={`m-form ${shake ? "m-shake" : ""}`} onSubmit={onSubmit} noValidate>
              <label className="m-field">
                <span className="m-field-lbl">Nouveau mot de passe</span>
                <div className="m-input-wrap">
                  <input
                    className="m-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </label>
              <div className="m-pw" aria-label={`Force du mot de passe : ${strength}/5`}>
                <div className="m-pw-bars">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className={`m-pw-bar ${i < strength ? "on" : ""}`} />
                  ))}
                </div>
                <span>{password ? STRENGTH_LABELS[strength] : "Saisissez un mot de passe"}</span>
              </div>
              <label className="m-field">
                <span className="m-field-lbl">Confirmer</span>
                <div className="m-input-wrap">
                  <input
                    className="m-input"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </label>

              {error && (
                <div className="m-err" role="alert">
                  <Warn />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="m-btn m-btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner /> Mise à jour…
                  </>
                ) : (
                  <>
                    Mettre à jour <Arrow />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {done && (
          <div className="m-success">
            <div className="m-success-mark">
              <Check size={28} />
            </div>
            <h2 className="m-h2">Mot de passe mis à jour</h2>
            <p className="m-sub">
              Tu peux maintenant te connecter avec ton matricule et ton nouveau mot de passe.
            </p>
            <button type="button" className="m-btn m-btn-primary" onClick={onDone}>
              Retour à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileResetPasswordScreen;
