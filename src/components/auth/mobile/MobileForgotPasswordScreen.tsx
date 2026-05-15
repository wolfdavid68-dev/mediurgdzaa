import { useEffect, useState, type FormEvent } from "react";
import { isValidMatricule, requestPasswordReset } from "../../../lib/auth";
import { ArrowL, Arrow, Check, Spinner, Warn } from "./icons";

// « Mot de passe oublié » — design mobile dédié (header back + hero).
// Étape 1 du flow recovery : saisie matricule → email lien magique.
// Anti-énumération : succès annoncé même si matricule inconnu.

type Props = {
  onBackToLogin: () => void;
  initialError?: string | null;
};

const MobileForgotPasswordScreen = ({ onBackToLogin, initialError = null }: Props) => {
  const [digits, setDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [shake, setShake] = useState(false);
  const [errorNonce, setErrorNonce] = useState(0);

  useEffect(() => {
    if (errorNonce === 0) return;
    setShake(true);
    const t = window.setTimeout(() => setShake(false), 400);
    return () => window.clearTimeout(t);
  }, [errorNonce]);

  const fail = (msg: string) => {
    setError(msg);
    setErrorNonce((n) => n + 1);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const matricule = `M${digits}`;
    if (!isValidMatricule(matricule)) {
      fail("Format attendu : M + 6 chiffres (ex : M402100)");
      return;
    }
    setLoading(true);
    const result = await requestPasswordReset(matricule);
    setLoading(false);
    if (!result.ok) {
      fail(result.error);
      return;
    }
    setSent(true);
  };

  return (
    <div className="m-app">
      <div className="m-stage m-reg">
        <div className="m-bg-glow" aria-hidden="true" />

        <header className="m-top-nav">
          <button
            type="button"
            className="m-back"
            onClick={onBackToLogin}
            aria-label="Retour à la connexion"
            disabled={loading}
          >
            <ArrowL />
          </button>
          <div className="m-top-title">Mot de passe oublié</div>
          <div style={{ width: 32 }} />
        </header>

        {!sent && (
          <>
            <div className="m-hero m-hero-sm">
              <div className="m-eyebrow">Réinitialisation</div>
              <h2 className="m-h2">Renvoi par email</h2>
              <p className="m-sub">
                Saisis ton matricule. Un lien de réinitialisation sera envoyé à l'adresse email
                associée à ton compte.
              </p>
            </div>

            {initialError && (
              <div className="m-banner" role="alert">
                <Warn />
                <span>{initialError}</span>
              </div>
            )}

            <form className={`m-form ${shake ? "m-shake" : ""}`} onSubmit={onSubmit} noValidate>
              <label className="m-field">
                <span className="m-field-lbl">Matricule</span>
                <div className="m-input-wrap m-mono">
                  <span className="m-prefix" aria-hidden="true">
                    M
                  </span>
                  <input
                    className="m-input"
                    inputMode="numeric"
                    aria-label="Matricule professionnel (6 chiffres)"
                    value={digits}
                    onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="402100"
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
                    <Spinner /> Envoi…
                  </>
                ) : (
                  <>
                    Envoyer le lien <Arrow />
                  </>
                )}
              </button>
              <button
                type="button"
                className="m-btn m-btn-ghost"
                onClick={onBackToLogin}
                disabled={loading}
              >
                Retour à la connexion
              </button>
            </form>
          </>
        )}

        {sent && (
          <div className="m-success">
            <div className="m-success-mark">
              <Check size={28} />
            </div>
            <h2 className="m-h2">Email envoyé</h2>
            <p className="m-sub">
              Si ton matricule correspond à un compte actif, un email contenant un lien de
              réinitialisation vient de t'être envoyé. Le lien expire dans 1 heure. Pense à vérifier
              ton dossier <em>Spam</em>.
            </p>
            <button type="button" className="m-btn m-btn-primary" onClick={onBackToLogin}>
              Retour à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileForgotPasswordScreen;
