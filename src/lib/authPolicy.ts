const normalizeFunctionLabel = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const isStudentFunction = (fonction: string): boolean => {
  const normalized = normalizeFunctionLabel(fonction);
  if (["esi", "etudiant ide", "etudiant infirmier", "etudiant as"].includes(normalized)) {
    return true;
  }
  return /\betudiant\b/.test(normalized) && /\b(as|esi|ide|infirmier)\b/.test(normalized);
};

export const isMedicalFunction = (fonction: string): boolean => {
  const normalized = normalizeFunctionLabel(fonction);
  return /\b(medecin|interne|pharmacien|pharmacienne)\b/.test(normalized);
};

export const isAsFunction = (fonction: string): boolean => {
  const normalized = normalizeFunctionLabel(fonction);
  return (
    normalized === "as" ||
    /\baide soignant\b/.test(normalized) ||
    /\baide soignante\b/.test(normalized)
  );
};

export const isIdeFunction = (fonction: string): boolean => {
  const normalized = normalizeFunctionLabel(fonction);
  return (
    normalized === "ide" || /\binfirmier\b/.test(normalized) || /\binfirmiere\b/.test(normalized)
  );
};

export const isCadreFunction = (fonction: string): boolean => {
  const normalized = normalizeFunctionLabel(fonction);
  return /\bcadre\b/.test(normalized);
};

export const isIfsiCadreFunction = (fonction: string): boolean => {
  const normalized = normalizeFunctionLabel(fonction);
  return /\bcadre\b/.test(normalized) && /\bifsi\b/.test(normalized);
};

export const hasAdminAccess = (profile: { role: string; fonction: string }): boolean =>
  profile.role === "admin" ||
  (isCadreFunction(profile.fonction) && !isIfsiCadreFunction(profile.fonction));
