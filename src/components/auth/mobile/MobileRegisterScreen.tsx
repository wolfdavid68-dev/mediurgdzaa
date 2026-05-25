import { useEffect, useState } from "react";
import { useRegisterForm } from "../hooks/useRegisterForm";
import { FONCTIONS, SERVICES } from "../authConstants";
import { EMAIL_DOMAIN, isStudentFunction } from "../../../lib/auth";
import LegalModal from "../../LegalModal";
import CharterModal from "../../CharterModal";
import { ArrowL, Arrow, Check, Spinner, Warn } from "./icons";

// Création de compte — design mobile dédié (header back + barre de
// progression, 2 étapes + écran de confirmation). Recréation fidèle de
// MRegister (design_handoff mobile.jsx). Logique partagée via useRegisterForm.

const STRENGTH_LABELS = ["Très faible", "Faible", "Moyen", "Bon", "Solide", "Excellent"];

type Props = {
  onGoToLogin: () => void;
};

const MobileRegisterScreen = ({ onGoToLogin }: Props) => {
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
    submitStep1,
    submitStep2,
    goBack,
  } = useRegisterForm();
  const [showLegal, setShowLegal] = useState(false);
  const [showCharter, setShowCharter] = useState(false);
  const [shake, setShake] = useState(false);
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
    <div className="m-app">
      <div className="m-stage m-reg">
        <div className="m-bg-glow" aria-hidden="true" />

        <header className="m-top-nav">
          <button
            type="button"
            className="m-back"
            onClick={() => goBack(onGoToLogin)}
            aria-label="Retour"
            disabled={loading || step === 3}
          >
            <ArrowL />
          </button>
          <div className="m-top-title">{step < 3 ? `Inscription · ${step}/2` : "Confirmation"}</div>
          <div style={{ width: 32 }} />
        </header>

        {step < 3 && (
          <div
            className="m-progress"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={2}
          >
            <div className="m-progress-bar" style={{ width: `${(step / 2) * 100}%` }} />
          </div>
        )}

        {step === 1 && (
          <>
            <div className="m-hero m-hero-sm">
              <h2 className="m-h2">Vos informations</h2>
              <p className="m-sub">Tels qu'inscrits sur votre badge professionnel.</p>
            </div>
            <form className={`m-form ${shake ? "m-shake" : ""}`} onSubmit={submitStep1} noValidate>
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
                    value={matriculeDigits}
                    onChange={(e) =>
                      setMatriculeDigits(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="402100"
                  />
                </div>
              </label>
              <div className="m-row-2">
                <label className="m-field">
                  <span className="m-field-lbl">Prénom</span>
                  <div className="m-input-wrap">
                    <input
                      className="m-input"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      autoComplete="given-name"
                      placeholder="Camille"
                    />
                  </div>
                </label>
                <label className="m-field">
                  <span className="m-field-lbl">Nom</span>
                  <div className="m-input-wrap">
                    <input
                      className="m-input"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      autoComplete="family-name"
                      placeholder="Bernard"
                    />
                  </div>
                </label>
              </div>
              <label className="m-field">
                <span className="m-field-lbl">Email</span>
                <div className="m-input-wrap">
                  <input
                    className="m-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder={emailPlaceholder}
                  />
                </div>
              </label>
              <div className="m-row-2">
                <label className="m-field">
                  <span className="m-field-lbl">Fonction</span>
                  <div className="m-input-wrap">
                    <select
                      className="m-input"
                      value={fonction}
                      onChange={(e) => setFonction(e.target.value)}
                    >
                      {FONCTIONS.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="m-field">
                  <span className="m-field-lbl">Service</span>
                  <div className="m-input-wrap">
                    <select
                      className="m-input"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                    >
                      {SERVICES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>
              {error && (
                <div className="m-err" role="alert">
                  <Warn />
                  <span>{error}</span>
                </div>
              )}
              <button type="submit" className="m-btn m-btn-primary">
                Continuer <Arrow />
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="m-hero m-hero-sm">
              <h2 className="m-h2">Mot de passe</h2>
              <p className="m-sub">Au moins 8 caractères, unique à cette plateforme.</p>
            </div>
            <form className={`m-form ${shake ? "m-shake" : ""}`} onSubmit={submitStep2} noValidate>
              <label className="m-field">
                <span className="m-field-lbl">Mot de passe</span>
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
              <label className="m-check">
                <input
                  type="checkbox"
                  checked={acceptCharte}
                  onChange={(e) => setAcceptCharte(e.target.checked)}
                />
                <span>
                  J&apos;accepte la{" "}
                  <button
                    type="button"
                    className="m-legal-link"
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
                    className="m-legal-link"
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
                    Envoyer la demande <Arrow />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {step === 3 && (
          <div className="m-success">
            <div className="m-success-mark">
              <Check size={28} />
            </div>
            <h2 className="m-h2">Demande transmise</h2>
            <p className="m-sub">
              La demande de{" "}
              <b>
                {prenom} {nom}
              </b>{" "}
              (<span className="m-mono">M{matriculeDigits}</span>) est en attente de validation par
              l'administrateur du service.
            </p>
            <div className="m-recap">
              <div>
                <span>Matricule</span>
                <b className="m-mono">M{matriculeDigits}</b>
              </div>
              <div>
                <span>Fonction</span>
                <b>{fonction}</b>
              </div>
              <div>
                <span>Service</span>
                <b>{service}</b>
              </div>
              <div>
                <span>Délai</span>
                <b>&lt; 24 h ouvrées</b>
              </div>
            </div>
            <button type="button" className="m-btn m-btn-primary" onClick={onGoToLogin}>
              Retour à la connexion
            </button>
          </div>
        )}
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

export default MobileRegisterScreen;
