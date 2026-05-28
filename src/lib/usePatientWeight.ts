import { useEffect, useState } from "react";
import { safeGetJson, safeRemoveItem, safeSetJson } from "./safeStorage";

// Poids patient partagé entre toutes les fiches médicament (poso, prep, PSE).
// Persisté en localStorage avec auto-expiration 3 h pour ne pas traîner d'un
// patient à l'autre entre 2 gardes. Au-delà du délai, on repart vierge à la
// prochaine ouverture (lecture protégée par try/catch — quota privé OK).
const WEIGHT_LS_KEY = "mediurg-patient-weight";
const WEIGHT_MAX_AGE_MS = 3 * 60 * 60 * 1000;

type StoredPatientWeight = { ts?: number; kg?: unknown };

const loadPatientWeight = (): string => {
  const parsed = safeGetJson<StoredPatientWeight | null>(WEIGHT_LS_KEY, null);
  if (!parsed || typeof parsed.ts !== "number") return "";
  if (Date.now() - parsed.ts > WEIGHT_MAX_AGE_MS) {
    safeRemoveItem(WEIGHT_LS_KEY);
    return "";
  }
  return typeof parsed.kg === "string" ? parsed.kg : "";
};

export const usePatientWeight = (): [string, (kg: string) => void] => {
  const [weight, setWeight] = useState<string>(() => loadPatientWeight());
  useEffect(() => {
    if (weight) safeSetJson(WEIGHT_LS_KEY, { ts: Date.now(), kg: weight });
    else safeRemoveItem(WEIGHT_LS_KEY);
  }, [weight]);
  return [weight, setWeight];
};
