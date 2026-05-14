import { useState, type FormEvent } from "react";
import MatriculeInput from "./MatriculeInput";
import { login, isValidMatricule } from "../../lib/auth";

// Écran de login — saisie matricule + mot de passe.
// Cf. design_handoff_sau_mulhouse pour la fidélité visuelle.
//
// État : idle | loading | error
// Submit → résolution matricule → email via vue publique → signInWithPassword

type Props = {
  onLoggedIn: () => void;
  onGoToRegister: () => void;
};

const LoginScreen = ({ onLoggedIn, onGoToRegister }: Props) => {
  const [matriculeDigits, setMatriculeDigits] = useState("");
  const [password, setPassword] = useState("");
  const [keepSession, setKeepSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!password) {
      setError("Mot de passe requis");
      triggerShake();
      return;
    }
    setLoading(true);
    const result = await login(matricule, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      triggerShake();
      return;
    }
    // keepSession n'est pas wired à Supabase ici (persistSession est déjà
    // global) — placeholder pour usage futur (logout sur close de tab).
    void keepSession;
    onLoggedIn();
  };

  return (
    <div className="auth-stage">
      <div className="auth-bg-decor" aria-hidden="true">
        <div className="auth-bg-glow auth-bg-glow-1" />
        <div className="auth-bg-glow auth-bg-glow-2" />
        <div className="auth-bg-grid" />
      </div>

      <div className={`auth-shell ${shake ? "auth-shake" : ""}`}>
        {/* Panneau gauche — branding + meta */}
        <aside className="auth-side">
          <div className="auth-logo-row">
            <img src="/logo_urgences_mulhouse_HD_transparent.png" alt="" width={64} height={64} />
          </div>
          <div className="auth-side-eyebrow">SAU · Émile-Muller</div>
          <h1 className="auth-side-title">
            <span className="auth-side-title-dim">Votre espace</span>
            <br />
            <span className="auth-side-title-dim">de travail, toujours</span>
            <br />
            <span className="auth-side-title-strong">à portée de main.</span>
          </h1>
          <p className="auth-side-body">
            MediURG est le livret pharmacologique numérique du SAU de Mulhouse. Accès réservé au
            personnel hospitalier autorisé.
          </p>
          <div className="auth-side-meta">
            <div className="auth-side-meta-row">
              <span className="auth-side-meta-dot auth-side-meta-dot-ok" />
              Système opérationnel
            </div>
            <div className="auth-side-meta-row">73 médicaments référencés · 22 protocoles</div>
          </div>
          <div className="auth-side-foot">MediURG · GHR Mulhouse Sud-Alsace</div>
        </aside>

        {/* Panneau droit — formulaire */}
        <main className="auth-card">
          <div className="auth-eyebrow">Authentification</div>
          <h2 className="auth-card-title">Bienvenue.</h2>
          <p className="auth-card-sub">Connecte-toi avec ton matricule professionnel.</p>

          <form onSubmit={onSubmit} className="auth-form" noValidate>
            <label className="auth-field">
              <span className="auth-field-label">Matricule</span>
              <MatriculeInput
                id="login-matricule"
                value={matriculeDigits}
                onChange={setMatriculeDigits}
                autoFocus
                disabled={loading}
              />
            </label>

            <label className="auth-field">
              <span className="auth-field-label">Mot de passe</span>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
              />
            </label>

            <div className="auth-row-between">
              <label className="auth-checkbox">
                <input
                  type="checkbox"
                  checked={keepSession}
                  onChange={(e) => setKeepSession(e.target.checked)}
                />
                <span>Maintenir la session</span>
              </label>
              <button type="button" className="auth-link" disabled>
                Mot de passe oublié
              </button>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="auth-spinner" aria-hidden="true" /> Vérification…
                </>
              ) : (
                "Se connecter"
              )}
            </button>

            <div className="auth-sep">
              <span>ou</span>
            </div>

            <button
              type="button"
              className="auth-btn-secondary"
              onClick={onGoToRegister}
              disabled={loading}
            >
              Créer un compte
            </button>
          </form>

          <div className="auth-card-foot">Accès réservé au personnel autorisé du SAU.</div>
        </main>
      </div>
    </div>
  );
};

export default LoginScreen;
