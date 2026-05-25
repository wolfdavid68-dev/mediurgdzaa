import { useEffect, useState } from "react";
import MatriculeInput from "./MatriculeInput";
import { useRegisterForm } from "./hooks/useRegisterForm";
import { FONCTIONS, SERVICES } from "./authConstants";
import { EMAIL_DOMAIN, isStudentFunction } from "../../lib/auth";
import LegalModal from "../LegalModal";
import CharterModal from "../CharterModal";

// Création de compte en 2 étapes + confirmation.
// Cf. design_handoff_sau_mulhouse pour la fidélité visuelle.
// Logique partagée avec le mobile via useRegisterForm.

type Props = {
  onGoToLogin: () => void;
};

const RegisterScreen = ({ onGoToLogin }: Props) => {
  const {
    step,
    matriculeDigits,
    setMatriculeDigits,
    prenom,
    setPrenom,
    nom,
    setNom,
    email,
    setEmail,
    fonction,
    setFonction,
    service,
    setService,
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    acceptCharte,
    setAcceptCharte,
    loading,
    error,
    errorNonce,
    strength,
    submitStep1: onSubmitStep1,
    submitStep2: onSubmitStep2,
    goBack,
  } = useRegisterForm();
  const [shake, setShake] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showCharter, setShowCharter] = useState(false);
  const emailPlaceholder = isStudentFunction(fonction)
    ? "prenom.nom@exemple.fr"
    : `prenom.nom${EMAIL_DOMAIN}`;

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
        <main className="auth-card auth-card-wide">
          <div className="auth-card-head-row">
            <button
              type="button"
              className="auth-back"
              onClick={() => goBack(onGoToLogin)}
              aria-label="Retour"
            >
              ←
            </button>
            <div className="auth-card-step">Inscription · {step === 3 ? "✓" : `${step}/2`}</div>
          </div>

          {step !== 3 && (
            <div
              className="auth-progress"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={2}
            >
              <div className="auth-progress-fill" style={{ width: step === 1 ? "50%" : "100%" }} />
            </div>
          )}

          {step === 1 && (
            <>
              <div className="auth-eyebrow">Étape 1 — Vos informations</div>
              <h2 className="auth-card-title">Créer un compte</h2>
              <p className="auth-card-sub">
                Ta demande sera transmise à l'administrateur du service pour validation.
              </p>

              <form onSubmit={onSubmitStep1} className="auth-form" noValidate>
                <label className="auth-field" htmlFor="register-matricule">
                  <span className="auth-field-label">Matricule</span>
                  <MatriculeInput
                    id="register-matricule"
                    value={matriculeDigits}
                    onChange={setMatriculeDigits}
                    autoFocus
                    disabled={loading}
                  />
                </label>

                <div className="auth-field-row">
                  <label className="auth-field">
                    <span className="auth-field-label">Prénom</span>
                    <input
                      type="text"
                      className="auth-input"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="auth-field">
                    <span className="auth-field-label">Nom</span>
                    <input
                      type="text"
                      className="auth-input"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      autoComplete="family-name"
                    />
                  </label>
                </div>

                <div className="auth-field-row">
                  <label className="auth-field">
                    <span className="auth-field-label">Fonction</span>
                    <select
                      className="auth-input"
                      value={fonction}
                      onChange={(e) => setFonction(e.target.value)}
                    >
                      {FONCTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="auth-field">
                    <span className="auth-field-label">Service</span>
                    <select
                      className="auth-input"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                    >
                      {SERVICES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="auth-field">
                  <span className="auth-field-label">Email</span>
                  <input
                    type="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={emailPlaceholder}
                    autoComplete="email"
                  />
                </label>

                {error && (
                  <div className="auth-error" role="alert">
                    {error}
                  </div>
                )}

                <button type="submit" className="auth-btn-primary">
                  Continuer →
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <div className="auth-eyebrow">Étape 2 — Mot de passe</div>
              <h2 className="auth-card-title">Sécuriser le compte</h2>
              <p className="auth-card-sub">Choisis un mot de passe d'au moins 8 caractères.</p>

              <form onSubmit={onSubmitStep2} className="auth-form" noValidate>
                <label className="auth-field">
                  <span className="auth-field-label">Mot de passe</span>
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

                <label className="auth-checkbox">
                  <input
                    type="checkbox"
                    checked={acceptCharte}
                    onChange={(e) => setAcceptCharte(e.target.checked)}
                  />
                  <span>
                    J&apos;accepte la{" "}
                    <button
                      type="button"
                      className="auth-legal-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowCharter(true);
                      }}
                    >
                      charte d&apos;utilisation
                    </button>{" "}
                    et la{" "}
                    <button
                      type="button"
                      className="auth-legal-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowLegal(true);
                      }}
                    >
                      politique de confidentialité
                    </button>
                    .
                  </span>
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
                    "Envoyer la demande"
                  )}
                </button>
              </form>
            </>
          )}

          {step === 3 && (
            <div className="auth-success">
              <div className="auth-success-icon" aria-hidden="true">
                ✓
              </div>
              <h2 className="auth-card-title">Demande transmise</h2>
              <p className="auth-card-sub">
                Ta demande a bien été envoyée à l'administrateur du service. Tu recevras une
                confirmation dès qu'elle aura été validée.
              </p>
              <dl className="auth-recap">
                <div>
                  <dt>Matricule</dt>
                  <dd className="mono">M{matriculeDigits}</dd>
                </div>
                <div>
                  <dt>Fonction</dt>
                  <dd>{fonction}</dd>
                </div>
                <div>
                  <dt>Service</dt>
                  <dd>{service}</dd>
                </div>
                <div>
                  <dt>Délai</dt>
                  <dd>&lt; 24 h ouvrées</dd>
                </div>
              </dl>
              <button type="button" className="auth-btn-primary" onClick={onGoToLogin}>
                Retour à la connexion
              </button>
            </div>
          )}
        </main>
      </div>

      <LegalModal open={showLegal} onClose={() => setShowLegal(false)} />
      <CharterModal
        open={showCharter}
        onAccept={() => {
          setAcceptCharte(true);
          setShowCharter(false);
        }}
        onClose={() => setShowCharter(false)}
      />
    </div>
  );
};

export default RegisterScreen;
