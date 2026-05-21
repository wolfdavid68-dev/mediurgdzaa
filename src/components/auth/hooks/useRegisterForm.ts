import { useState, type FormEvent } from "react";
import {
  signup,
  isValidMatricule,
  isValidEmail,
  isValidPassword,
  passwordStrength,
} from "../../../lib/auth";
import { FONCTIONS, SERVICES } from "../authConstants";

// Logique du formulaire d'inscription (2 étapes + confirmation), partagée
// par RegisterScreen (desktop) et MobileRegisterScreen. Validation, appel
// signup() Supabase et navigation d'étapes centralisés ici.

export type RegisterStep = 1 | 2 | 3;

export const useRegisterForm = () => {
  const [step, setStep] = useState<RegisterStep>(1);
  const [matriculeDigits, setMatriculeDigits] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [fonction, setFonction] = useState<string>(FONCTIONS[0]);
  const [service, setService] = useState<string>(SERVICES[0]);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [acceptCharte, setAcceptCharte] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorNonce, setErrorNonce] = useState(0);

  const strength = passwordStrength(password);

  const fail = (msg: string) => {
    setError(msg);
    setErrorNonce((n) => n + 1);
  };

  const validateStep1 = (): string | null => {
    if (!isValidMatricule(`M${matriculeDigits}`))
      return "Matricule invalide (format : M + 6 chiffres)";
    if (!prenom.trim()) return "Prénom requis";
    if (!nom.trim()) return "Nom requis";
    if (!isValidEmail(email)) return "Email invalide (doit se terminer par @ghrmsa.fr)";
    return null;
  };

  const submitStep1 = (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    const err = validateStep1();
    if (err) {
      fail(err);
      return;
    }
    setStep(2);
  };

  const submitStep2 = async (e?: FormEvent) => {
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
    if (!acceptCharte) {
      fail("Tu dois accepter la charte d'utilisation");
      return;
    }
    setLoading(true);
    const result = await signup({
      matricule: `M${matriculeDigits}`,
      email: email.trim(),
      password,
      prenom: prenom.trim(),
      nom: nom.trim(),
      fonction,
      service,
    });
    setLoading(false);
    if (!result.ok) {
      fail(result.error);
      return;
    }
    setStep(3);
  };

  // Retour : étape 2 → 1, sinon laisse le composant gérer (retour login).
  const goBack = (onExit: () => void) => {
    setError(null);
    if (step === 2) setStep(1);
    else onExit();
  };

  return {
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
  };
};
