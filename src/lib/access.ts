import type { Profile } from "./auth";
import { isAsFunction, isMedicalFunction, isStudentFunction } from "./auth";

export type PreviewAccessMode = "full" | "medicaments" | "tutorat";

export const getPreviewAccessMode = (
  profile: Pick<Profile, "fonction"> | null,
  preview: boolean
): PreviewAccessMode => {
  if (!preview || !profile) return "full";

  const fonction = profile.fonction;
  if (isMedicalFunction(fonction)) return "medicaments";
  if (isAsFunction(fonction) || isStudentFunction(fonction)) return "tutorat";
  return "full";
};
