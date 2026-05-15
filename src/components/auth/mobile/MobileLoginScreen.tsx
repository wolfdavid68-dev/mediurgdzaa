import { useState, type FormEvent } from "react";
import { login, isValidMatricule } from "../../../lib/auth";
import LegalModal from "../../LegalModal";
import MobileLogo from "./MobileLogo";
import { Arrow, Eye, EyeOff, Spinner, Warn } from "./icons";

// Écran de login — design mobile dédié (hero plein écran, prefix matricule
// figé, boutons full-width). Recréation fidèle de MLogin (design_handoff
// mobile.jsx) branchée sur la vraie auth Supabase via auth.ts.
//
// Différence assumée vs maquette : pas de lien « Accès administrateur » —
// le rôle admin est porté par le compte (post-login), pas un écran séparé.

type Props = {
  onLoggedIn: () => void;
  onGoToRegister: () => void;
  onGoToForgot: () => void;
};

const MobileLoginScreen = ({ onLoggedIn, onGoToRegister, onGoToForgot }: Props) => {
  const [digits, setDigits] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLegal, setShowLegal] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const matricule = `M${digits}`;
    if (!isValidMatricule(matricule)) {
      setError("Format attendu : M + 6 chiffres (ex : M402100)");
      return;
    }
    if (!password) {
      setError("Mot de passe requis");
      return;
    }
    setLoading(true);
    const result = await login(matricule, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onLoggedIn();
  };

  return (
    <div className="m-app">
      <div className="m-stage m-login">
        <div className="m-bg-glow" aria-hidden="true" />

        <header className="m-auth-head">
          <MobileLogo size={42} />
        </header>

        <div className="m-hero">
          <div className="m-eyebrow">SAU · Émile-Muller</div>
          <h1 className="m-h1">
            Votre espace
            <br />
            de travail, toujours
            <br />
            <span className="m-h1-accent">à portée de main.</span>
          </h1>
        </div>

        <form className="m-form" onSubmit={onSubmit} noValidate>
          <label className="m-field">
            <span className="m-field-lbl">Matricule</span>
            <div className="m-input-wrap m-mono">
              <span className="m-prefix" aria-hidden="true">
                M
              </span>
              <input
                className="m-input"
                inputMode="numeric"
                autoComplete="username"
                aria-label="Matricule professionnel (6 chiffres)"
                value={digits}
                onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="402100"
                disabled={loading}
              />
            </div>
          </label>

          <label className="m-field">
            <span className="m-field-lbl">Mot de passe</span>
            <div className="m-input-wrap">
              <input
                className="m-input"
                type={reveal ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                className="m-affix"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {reveal ? <EyeOff /> : <Eye />}
              </button>
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
                <Spinner /> Vérification…
              </>
            ) : (
              <>
                Se connecter <Arrow />
              </>
            )}
          </button>

          <button
            type="button"
            className="m-btn m-btn-ghost"
            onClick={onGoToRegister}
            disabled={loading}
          >
            Créer un compte
          </button>
        </form>

        <footer className="m-foot">
          <button type="button" className="m-link" onClick={onGoToForgot} disabled={loading}>
            Mot de passe oublié ?
          </button>
          <button type="button" className="m-legal-link" onClick={() => setShowLegal(true)}>
            Mentions légales &amp; confidentialité
          </button>
          <span className="m-foot-meta">MediURG · SAU Mulhouse</span>
        </footer>
      </div>

      <LegalModal open={showLegal} onClose={() => setShowLegal(false)} />
    </div>
  );
};

export default MobileLoginScreen;
