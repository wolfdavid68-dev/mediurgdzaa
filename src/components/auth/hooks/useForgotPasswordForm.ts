import { useState, type FormEvent } from "react";
import { isValidMatricule, requestPasswordReset } from "../../../lib/auth";

// Étape 1 du flow « mot de passe oublié », partagée par
// ForgotPasswordScreen (desktop) et MobileForgotPasswordScreen.
// Anti-énumération : succès annoncé même si le matricule est inconnu
// (cf. requestPasswordReset). `errorNonce` pilote le shake côté UI.

export const useForgotPasswordForm = () => {
  const [matriculeDigits, setMatriculeDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [errorNonce, setErrorNonce] = useState(0);

  const fail = (msg: string) => {
    setError(msg);
    setErrorNonce((n) => n + 1);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    const matricule = `M${matriculeDigits}`;
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

  return {
    matriculeDigits,
    setMatriculeDigits,
    loading,
    error,
    errorNonce,
    sent,
    submit,
  };
};
