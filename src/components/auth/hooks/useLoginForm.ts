import { useState, type FormEvent } from "react";
import { login, isValidMatricule } from "../../../lib/auth";

// Logique du formulaire de login, partagée par LoginScreen (desktop) et
// MobileLoginScreen. Les deux composants ne diffèrent que par le markup ;
// la validation, l'appel Supabase et la gestion d'erreur vivent ici.
//
// `errorNonce` s'incrémente à chaque échec (validation ou login) : les
// composants l'observent via useEffect pour déclencher l'animation shake
// sans dupliquer la logique.

export const useLoginForm = (onLoggedIn: () => void) => {
  const [matriculeDigits, setMatriculeDigits] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!password) {
      fail("Mot de passe requis");
      return;
    }
    setLoading(true);
    const result = await login(matricule, password);
    setLoading(false);
    if (!result.ok) {
      fail(result.error);
      return;
    }
    onLoggedIn();
  };

  return {
    matriculeDigits,
    setMatriculeDigits,
    password,
    setPassword,
    loading,
    error,
    errorNonce,
    submit,
  };
};
