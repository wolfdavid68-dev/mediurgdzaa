import { useEffect, useState } from "react";

// Poids patient partagé entre toutes les fiches médicament (poso, prep, PSE).
// Persisté en localStorage avec auto-expiration 3 h pour ne pas traîner d'un
// patient à l'autre entre 2 gardes. Au-delà du délai, on repart vierge à la
// prochaine ouverture (lecture protégée par try/catch — quota privé OK).
const WEIGHT_LS_KEY = "mediurg-patient-weight";
const WEIGHT_MAX_AGE_MS = 3 * 60 * 60 * 1000;

const loadPatientWeight = (): string => {
  try {
    const raw = localStorage.getItem(WEIGHT_LS_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== "number") return "";
    if (Date.now() - parsed.ts > WEIGHT_MAX_AGE_MS) {
      localStorage.removeItem(WEIGHT_LS_KEY);
      return "";
    }
    return typeof parsed.kg === "string" ? parsed.kg : "";
  } catch {
    return "";
  }
};

export const usePatientWeight = (): [string, (kg: string) => void] => {
  const [weight, setWeight] = useState<string>(() => loadPatientWeight());
  useEffect(() => {
    try {
      if (weight) {
        localStorage.setItem(WEIGHT_LS_KEY, JSON.stringify({ ts: Date.now(), kg: weight }));
      } else {
        localStorage.removeItem(WEIGHT_LS_KEY);
      }
    } catch {
      /* quota / navigation privée : on ignore, la session reste utilisable */
    }
  }, [weight]);
  return [weight, setWeight];
};
