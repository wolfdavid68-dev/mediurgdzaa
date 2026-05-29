import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  getAdminMfaStatus,
  startAdminMfaEnrollment,
  verifyAdminMfaCode,
  type AdminMfaEnrollment,
  type AdminMfaStatus,
} from "../../lib/auth";

type Props = {
  children: ReactNode;
  currentUserName: string;
  onExitAdmin: () => void;
};

const AdminMfaGate = ({ children, currentUserName, onExitAdmin }: Props) => {
  const [status, setStatus] = useState<AdminMfaStatus | null>(null);
  const [enrollment, setEnrollment] = useState<AdminMfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadStatus = async () => {
    setLoading(true);
    setError(null);
    const result = await getAdminMfaStatus();
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      setStatus(null);
      return;
    }
    setStatus(result.data);
  };

  useEffect(() => {
    reloadStatus();
  }, []);

  const beginEnrollment = async () => {
    setBusy(true);
    setError(null);
    const result = await startAdminMfaEnrollment();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEnrollment(result.data);
    setCode("");
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    const factorId = enrollment?.factorId ?? (status?.state === "challenge" ? status.factorId : "");
    if (!factorId) return;

    setBusy(true);
    setError(null);
    const result = await verifyAdminMfaCode(factorId, code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus({ state: "verified" });
    setEnrollment(null);
    setCode("");
  };

  if (status?.state === "verified") return <>{children}</>;

  return (
    <div className="auth-stage">
      <div className="auth-bg-decor" aria-hidden="true">
        <div className="auth-bg-glow auth-bg-glow-1" />
        <div className="auth-bg-glow auth-bg-glow-2" />
        <div className="auth-bg-grid" />
      </div>
      <main className="auth-card auth-card-narrow admin-mfa-card">
        <div className="auth-card-head-row">
          <img src="/logo-sau.png" alt="" width={40} height={40} className="auth-logo" />
          <div className="auth-card-step">Admin MFA</div>
        </div>
        <div className="auth-eyebrow">Console d'administration</div>
        <h2 className="auth-card-title">Double vérification</h2>
        <p className="auth-card-sub">
          {currentUserName}, l'accès admin nécessite un code temporaire.
        </p>

        {loading && (
          <div className="auth-loading auth-loading-inline">
            <span className="auth-spinner" aria-hidden="true" />
            <span>Vérification MFA...</span>
          </div>
        )}

        {!loading && status?.state === "enroll" && !enrollment && (
          <div className="admin-mfa-panel">
            <p className="auth-card-sub auth-card-sub-mute">
              Scanne un QR code avec une application d'authentification avant d'ouvrir la console.
            </p>
            <button
              type="button"
              className="auth-btn-primary"
              onClick={beginEnrollment}
              disabled={busy}
            >
              {busy ? "Préparation..." : "Configurer le MFA admin"}
            </button>
          </div>
        )}

        {enrollment && (
          <form className="auth-form admin-mfa-panel" onSubmit={submitCode}>
            <img className="admin-mfa-qr" src={enrollment.qrCode} alt="QR code MFA admin" />
            {enrollment.secret && (
              <p className="admin-mfa-secret mono">Secret manuel : {enrollment.secret}</p>
            )}
            <label className="auth-field">
              <span className="auth-field-label">Code à 6 chiffres</span>
              <input
                className="auth-input mono"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            <button type="submit" className="auth-btn-primary" disabled={busy || code.length !== 6}>
              {busy ? "Validation..." : "Activer et ouvrir la console"}
            </button>
          </form>
        )}

        {!loading && status?.state === "challenge" && !enrollment && (
          <form className="auth-form admin-mfa-panel" onSubmit={submitCode}>
            <p className="auth-card-sub auth-card-sub-mute">
              Facteur vérifié : {status.label}. Saisis le code de ton application.
            </p>
            <label className="auth-field">
              <span className="auth-field-label">Code à 6 chiffres</span>
              <input
                className="auth-input mono"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            <button type="submit" className="auth-btn-primary" disabled={busy || code.length !== 6}>
              {busy ? "Vérification..." : "Ouvrir la console"}
            </button>
          </form>
        )}

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <button type="button" className="auth-btn-secondary" onClick={onExitAdmin}>
          Retour à l'application
        </button>
      </main>
    </div>
  );
};

export default AdminMfaGate;
