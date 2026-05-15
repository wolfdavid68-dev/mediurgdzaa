import { useState, type FormEvent } from "react";
import { isValidPassword, logout, passwordStrength, updatePassword } from "../../../lib/auth";

// Étape 2 du flow recovery (session PASSWORD_RECOVERY établie), partagée
// par ResetPasswordScreen (desktop) et MobileResetPasswordScreen.
// Après mise à jour : logout + nettoyage du hash (#access_token=...&
// type=recovery) sinon un refresh redéclenche PASSWORD_RECOVERY.

export const useResetPasswordForm = () => {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [errorNonce, setErrorNonce] = useState(0);

  const strength = passwordStrength(password);

  const fail = (msg: string) => {
    setError(msg);
    setErrorNonce((n) => n + 1);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!isValidPassword(password)) {
      fail("Mot de passe trop court (min 8 caractères)");
      return;
    }
    if (password !== passwordConfirm) {
      fail("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    const result = await updatePassword(password);
    if (!result.ok) {
      setLoading(false);
      fail(result.error);
      return;
    }
    await logout();
    setLoading(false);
    setDone(true);
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  return {
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    loading,
    error,
    errorNonce,
    done,
    strength,
    submit,
  };
};
