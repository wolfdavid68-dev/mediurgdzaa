import type { Profile } from "./auth";
import { isAsFunction, isMedicalFunction } from "./auth";

export type PreviewAccessMode = "full" | "medicaments" | "tutorat";

const isAsStudentFunction = (fonction: string): boolean => {
  const normalized = fonction
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return (
    ["etudiant as", "etudiant aide soignant", "etudiant aide soignante"].includes(normalized) ||
    (/\betudiant\b/.test(normalized) &&
      (/\bas\b/.test(normalized) || /\baide soignant/.test(normalized)))
  );
};

export const getPreviewAccessMode = (
  profile: Pick<Profile, "fonction"> | null,
  preview: boolean
): PreviewAccessMode => {
  if (!profile) return "full";

  const fonction = profile.fonction;
  if (isAsFunction(fonction) || isAsStudentFunction(fonction)) return "tutorat";
  if (!preview) return "full";
  if (isMedicalFunction(fonction)) return "medicaments";
  return "full";
};
